import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import type { ResourceRequest, AuditLog } from "@prisma/client";
import { ResourceRequestStatus, ResourceRequestType } from "@prisma/client";
import {
  notifyRequestCreated,
  notifyRequestApproved,
  notifyRequestRejected,
  notifyRequestCancelled,
  notifyRequestFulfilled,
} from "@/lib/email";

export type ResourceRequestWithDetails = ResourceRequest & {
  requester: { id: string; email: string; name: string | null };
  approver?: { id: string; email: string; name: string | null } | null;
  instance?: { id: string; name: string; status: string } | null;
};

// Get all resource requests with optional filters
export async function getResourceRequests(options?: {
  status?: ResourceRequestStatus;
  type?: ResourceRequestType;
  requesterId?: string;
  instanceId?: string;
  limit?: number;
}): Promise<ResourceRequestWithDetails[]> {
  const where = {
    status: options?.status,
    type: options?.type,
    requesterId: options?.requesterId,
    instanceId: options?.instanceId,
  };

  const requests = await prisma.resourceRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: options?.limit ?? 100,
    include: {
      requester: {
        select: { id: true, email: true, name: true },
      },
      approvedBy: {
        select: { id: true, email: true, name: true },
      },
      instance: {
        select: { id: true, name: true, status: true },
      },
    },
  });

  return requests;
}

// Get a single resource request by ID
export async function getResourceRequestById(
  id: string
): Promise<ResourceRequestWithDetails | null> {
  const request = await prisma.resourceRequest.findUnique({
    where: { id },
    include: {
      requester: {
        select: { id: true, email: true, name: true },
      },
      approvedBy: {
        select: { id: true, email: true, name: true },
      },
      instance: {
        select: { id: true, name: true, status: true },
      },
    },
  });

  return request;
}

// Create a new resource request
export async function createResourceRequest(data: {
  type?: ResourceRequestType;
  title: string;
  description: string;
  justification: string;
  quantity?: number;
  instanceId?: string;
  config?: Prisma.InputJsonValue;
  requesterId: string;
}): Promise<ResourceRequest> {
  const request = await prisma.resourceRequest.create({
    data: {
      type: data.type ?? ResourceRequestType.OTHER,
      title: data.title,
      description: data.description,
      justification: data.justification,
      quantity: data.quantity ?? 1,
      instanceId: data.instanceId ?? null,
      config: data.config ?? Prisma.JsonNull,
      requesterId: data.requesterId,
      status: ResourceRequestStatus.PENDING,
    },
  });

  // Create audit log
  await createResourceRequestAuditLog({
    action: "CREATE_RESOURCE_REQUEST",
    entityId: request.id,
    userId: data.requesterId,
    details: {
      type: request.type,
      title: request.title,
      justification: request.justification,
    },
  });

  // Send email notification to requester
  const requester = await prisma.user.findUnique({
    where: { id: data.requesterId },
  });
  if (requester) {
    await notifyRequestCreated(request, requester);
    // Update notification timestamp
    await prisma.resourceRequest.update({
      where: { id: request.id },
      data: { requestNotificationSentAt: new Date() },
    });
  }

  return request;
}

// Approve a resource request
export async function approveResourceRequest(
  id: string,
  approverId: string,
  approvalNote?: string
): Promise<ResourceRequest | null> {
  const existingRequest = await prisma.resourceRequest.findUnique({
    where: { id },
    include: {
      requester: true,
    },
  });

  if (!existingRequest) {
    return null;
  }

  if (existingRequest.status !== ResourceRequestStatus.PENDING) {
    throw new Error(
      `Cannot approve request with status ${existingRequest.status}`
    );
  }

  const approver = await prisma.user.findUnique({
    where: { id: approverId },
  });

  const request = await prisma.resourceRequest.update({
    where: { id },
    data: {
      status: ResourceRequestStatus.APPROVED,
      approvedById: approverId,
      approvedAt: new Date(),
      approvalNote: approvalNote ?? null,
    },
  });

  // Create audit log
  await createResourceRequestAuditLog({
    action: "APPROVE_RESOURCE_REQUEST",
    entityId: id,
    userId: approverId,
    details: {
      previousStatus: existingRequest.status,
      newStatus: ResourceRequestStatus.APPROVED,
      approvalNote,
    },
  });

  // Send email notification to requester
  if (existingRequest.requester && approver) {
    await notifyRequestApproved(request, existingRequest.requester, approver);
    // Update notification timestamp
    await prisma.resourceRequest.update({
      where: { id: request.id },
      data: { approvalNotificationSentAt: new Date() },
    });
  }

  return request;
}

// Reject a resource request
export async function rejectResourceRequest(
  id: string,
  approverId: string,
  rejectionReason: string
): Promise<ResourceRequest | null> {
  const existingRequest = await prisma.resourceRequest.findUnique({
    where: { id },
    include: {
      requester: true,
    },
  });

  if (!existingRequest) {
    return null;
  }

  if (existingRequest.status !== ResourceRequestStatus.PENDING) {
    throw new Error(
      `Cannot reject request with status ${existingRequest.status}`
    );
  }

  const approver = await prisma.user.findUnique({
    where: { id: approverId },
  });

  const request = await prisma.resourceRequest.update({
    where: { id },
    data: {
      status: ResourceRequestStatus.REJECTED,
      approvedById: approverId,
      approvedAt: new Date(),
      rejectionReason,
    },
  });

  // Create audit log
  await createResourceRequestAuditLog({
    action: "REJECT_RESOURCE_REQUEST",
    entityId: id,
    userId: approverId,
    details: {
      previousStatus: existingRequest.status,
      newStatus: ResourceRequestStatus.REJECTED,
      rejectionReason,
    },
  });

  // Send email notification to requester
  if (existingRequest.requester && approver) {
    await notifyRequestRejected(request, existingRequest.requester, approver);
    // Update notification timestamp
    await prisma.resourceRequest.update({
      where: { id: request.id },
      data: { rejectionNotificationSentAt: new Date() },
    });
  }

  return request;
}

// Cancel a resource request (by requester)
export async function cancelResourceRequest(
  id: string,
  requesterId: string
): Promise<ResourceRequest | null> {
  const existingRequest = await prisma.resourceRequest.findUnique({
    where: { id },
    include: {
      requester: true,
    },
  });

  if (!existingRequest) {
    return null;
  }

  // Only the requester can cancel
  if (existingRequest.requesterId !== requesterId) {
    throw new Error("Only the requester can cancel a resource request");
  }

  if (existingRequest.status !== ResourceRequestStatus.PENDING) {
    throw new Error(
      `Cannot cancel request with status ${existingRequest.status}`
    );
  }

  const request = await prisma.resourceRequest.update({
    where: { id },
    data: {
      status: ResourceRequestStatus.CANCELLED,
    },
  });

  // Create audit log
  await createResourceRequestAuditLog({
    action: "CANCEL_RESOURCE_REQUEST",
    entityId: id,
    userId: requesterId,
    details: {
      previousStatus: existingRequest.status,
      newStatus: ResourceRequestStatus.CANCELLED,
    },
  });

  // Send email notification to requester
  if (existingRequest.requester) {
    await notifyRequestCancelled(request, existingRequest.requester);
  }

  return request;
}

// Fulfill a resource request (mark as provisioned)
export async function fulfillResourceRequest(
  id: string,
  fulfilledById: string,
  fulfillmentNote?: string
): Promise<ResourceRequest | null> {
  const existingRequest = await prisma.resourceRequest.findUnique({
    where: { id },
    include: {
      requester: true,
    },
  });

  if (!existingRequest) {
    return null;
  }

  if (existingRequest.status !== ResourceRequestStatus.APPROVED) {
    throw new Error(
      `Cannot fulfill request with status ${existingRequest.status}`
    );
  }

  const fulfiller = await prisma.user.findUnique({
    where: { id: fulfilledById },
  });

  const request = await prisma.resourceRequest.update({
    where: { id },
    data: {
      status: ResourceRequestStatus.FULFILLED,
      fulfilledAt: new Date(),
      fulfilledById: fulfilledById,
      fulfillmentNote: fulfillmentNote ?? null,
    },
  });

  // Create audit log
  await createResourceRequestAuditLog({
    action: "FULFILL_RESOURCE_REQUEST",
    entityId: id,
    userId: fulfilledById,
    details: {
      previousStatus: existingRequest.status,
      newStatus: ResourceRequestStatus.FULFILLED,
      fulfillmentNote,
    },
  });

  // Send email notification to requester
  if (existingRequest.requester && fulfiller) {
    await notifyRequestFulfilled(request, existingRequest.requester, fulfiller);
  }

  return request;
}

// Update a resource request (only pending requests can be updated by requester)
export async function updateResourceRequest(
  id: string,
  data: Partial<{
    title: string;
    description: string;
    justification: string;
    quantity: number;
    config: Prisma.InputJsonValue;
  }>,
  requesterId: string
): Promise<ResourceRequest | null> {
  const existingRequest = await prisma.resourceRequest.findUnique({
    where: { id },
  });

  if (!existingRequest) {
    return null;
  }

  // Only the requester can update
  if (existingRequest.requesterId !== requesterId) {
    throw new Error("Only the requester can update a resource request");
  }

  if (existingRequest.status !== ResourceRequestStatus.PENDING) {
    throw new Error(
      `Cannot update request with status ${existingRequest.status}`
    );
  }

  const request = await prisma.resourceRequest.update({
    where: { id },
    data,
  });

  // Create audit log
  await createResourceRequestAuditLog({
    action: "UPDATE_RESOURCE_REQUEST",
    entityId: id,
    userId: requesterId,
    details: data as Record<string, unknown>,
  });

  return request;
}

// Helper function to create audit log
async function createResourceRequestAuditLog(data: {
  action: string;
  entityId: string;
  userId: string;
  details?: Record<string, unknown>;
}): Promise<AuditLog> {
  return prisma.auditLog.create({
    data: {
      action: data.action,
      entityType: "ResourceRequest",
      entityId: data.entityId,
      userId: data.userId,
      resourceRequestId: data.entityId,
      details: data.details ? JSON.parse(JSON.stringify(data.details)) : null,
    },
  });
}

// Get resource request statistics
export async function getResourceRequestStats(): Promise<{
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  cancelled: number;
  fulfilled: number;
}> {
  const stats = await prisma.resourceRequest.groupBy({
    by: ["status"],
    _count: true,
  });

  const result = {
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    cancelled: 0,
    fulfilled: 0,
  };

  for (const stat of stats) {
    result.total += stat._count;
    switch (stat.status) {
      case ResourceRequestStatus.PENDING:
        result.pending = stat._count;
        break;
      case ResourceRequestStatus.APPROVED:
        result.approved = stat._count;
        break;
      case ResourceRequestStatus.REJECTED:
        result.rejected = stat._count;
        break;
      case ResourceRequestStatus.CANCELLED:
        result.cancelled = stat._count;
        break;
      case ResourceRequestStatus.FULFILLED:
        result.fulfilled = stat._count;
        break;
    }
  }

  return result;
}
