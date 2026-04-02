/**
 * Email notification service for resource requests
 *
 * This module provides email notification functionality for resource request workflow events.
 * In a production environment, this would integrate with an email service like SendGrid, Mailgun, or SMTP.
 *
 * For development/testing purposes, emails are logged to console instead of being sent.
 */

import type { ResourceRequest, User } from "@prisma/client";
import { ResourceRequestType } from "@prisma/client";

// Email configuration
export const EMAIL_CONFIG = {
  // Enable/disable email sending (set to false for development)
  enabled: process.env.EMAIL_ENABLED === "true",
  // From address for notifications
  fromAddress: process.env.EMAIL_FROM ?? "noreply@clawmemaybe.com",
  // Base URL for links in emails
  baseUrl:
    process.env.EMAIL_BASE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000",
};

// Email notification types
export type EmailNotificationType =
  | "REQUEST_CREATED"
  | "REQUEST_APPROVED"
  | "REQUEST_REJECTED"
  | "REQUEST_CANCELLED"
  | "REQUEST_FULFILLED"
  | "REQUEST_PENDING_REVIEW";

// Email recipient info
export interface EmailRecipient {
  email: string;
  name: string | null;
}

// Email content
export interface EmailContent {
  to: EmailRecipient[];
  subject: string;
  body: string;
  html?: string;
}

/**
 * Send an email notification
 * In development mode, logs the email to console
 * In production, would send via email service
 */
export async function sendEmail(content: EmailContent): Promise<boolean> {
  if (!EMAIL_CONFIG.enabled) {
    // Development mode: log email to console
    console.log("[EMAIL DEBUG] Email would be sent:");
    console.log(
      `  To: ${content.to.map((r) => `${r.name} <${r.email}>`).join(", ")}`
    );
    console.log(`  Subject: ${content.subject}`);
    console.log(`  Body: ${content.body.substring(0, 200)}...`);
    return true;
  }

  // Production mode: integrate with email service
  // This is a placeholder - implement with actual email service
  // Example: SendGrid, Mailgun, AWS SES, SMTP, etc.

  try {
    // Placeholder for actual email sending
    // In production, replace with:
    // await sendgrid.send({...})
    // await mailgun.messages().send({...})
    // await smtp.sendMail({...})

    console.log(
      `[EMAIL] Sent: ${content.subject} to ${content.to.length} recipients`
    );
    return true;
  } catch (error) {
    console.error("[EMAIL] Failed to send email:", error);
    return false;
  }
}

/**
 * Generate email content for resource request notifications
 */
export function generateRequestEmailContent(
  type: EmailNotificationType,
  request: ResourceRequest,
  requester: User,
  actor?: User
): EmailContent {
  const requestTypeLabel = getRequestTypeLabel(request.type);
  const requestUrl = `${EMAIL_CONFIG.baseUrl}/resource-requests/${request.id}`;

  switch (type) {
    case "REQUEST_CREATED":
      return {
        to: [{ email: requester.email, name: requester.name }],
        subject: `[ClawMeMaybe] Resource Request Submitted: ${request.title}`,
        body: `
Dear ${requester.name ?? "User"},

Your resource request has been submitted successfully.

Request Details:
- Type: ${requestTypeLabel}
- Title: ${request.title}
- Description: ${request.description}
- Justification: ${request.justification}
- Quantity: ${request.quantity}

Your request is now pending review by an administrator. You will receive a notification when your request is approved or rejected.

View your request: ${requestUrl}

Thank you for using ClawMeMaybe.
        `.trim(),
        html: generateHtmlEmail(
          "Resource Request Submitted",
          requester.name ?? "User",
          `
            <p>Your resource request has been submitted successfully.</p>
            <h3>Request Details:</h3>
            <ul>
              <li><strong>Type:</strong> ${requestTypeLabel}</li>
              <li><strong>Title:</strong> ${request.title}</li>
              <li><strong>Description:</strong> ${request.description}</li>
              <li><strong>Justification:</strong> ${request.justification}</li>
              <li><strong>Quantity:</strong> ${request.quantity}</li>
            </ul>
            <p>Your request is now pending review by an administrator.</p>
            <p><a href="${requestUrl}">View your request</a></p>
          `
        ),
      };

    case "REQUEST_PENDING_REVIEW":
      // This would be sent to admins for new requests
      return {
        to: [], // Admin recipients would be populated from config/database
        subject: `[ClawMeMaybe] New Resource Request Pending Review: ${request.title}`,
        body: `
A new resource request is pending your review.

Request Details:
- ID: ${request.id}
- Type: ${requestTypeLabel}
- Title: ${request.title}
- Requester: ${requester.name ?? requester.email}
- Justification: ${request.justification}

Review the request: ${requestUrl}

Please review and approve or reject this request.
        `.trim(),
        html: generateHtmlEmail(
          "New Resource Request Pending Review",
          "Administrator",
          `
            <p>A new resource request is pending your review.</p>
            <h3>Request Details:</h3>
            <ul>
              <li><strong>ID:</strong> ${request.id}</li>
              <li><strong>Type:</strong> ${requestTypeLabel}</li>
              <li><strong>Title:</strong> ${request.title}</li>
              <li><strong>Requester:</strong> ${requester.name ?? requester.email}</li>
              <li><strong>Justification:</strong> ${request.justification}</li>
            </ul>
            <p><a href="${requestUrl}">Review the request</a></p>
          `
        ),
      };

    case "REQUEST_APPROVED":
      return {
        to: [{ email: requester.email, name: requester.name }],
        subject: `[ClawMeMaybe] Resource Request Approved: ${request.title}`,
        body: `
Dear ${requester.name ?? "User"},

Your resource request has been approved!

Request Details:
- Type: ${requestTypeLabel}
- Title: ${request.title}
- Approved by: ${actor?.name ?? actor?.email ?? "Administrator"}
- Approval note: ${request.approvalNote ?? "No additional notes"}

Your request will now be processed and fulfilled. You will receive a notification when the resource is ready.

View your request: ${requestUrl}

Thank you for using ClawMeMaybe.
        `.trim(),
        html: generateHtmlEmail(
          "Resource Request Approved",
          requester.name ?? "User",
          `
            <p>Your resource request has been <strong>approved</strong>!</p>
            <h3>Request Details:</h3>
            <ul>
              <li><strong>Type:</strong> ${requestTypeLabel}</li>
              <li><strong>Title:</strong> ${request.title}</li>
              <li><strong>Approved by:</strong> ${actor?.name ?? actor?.email ?? "Administrator"}</li>
              <li><strong>Approval note:</strong> ${request.approvalNote ?? "No additional notes"}</li>
            </ul>
            <p>Your request will now be processed and fulfilled.</p>
            <p><a href="${requestUrl}">View your request</a></p>
          `
        ),
      };

    case "REQUEST_REJECTED":
      return {
        to: [{ email: requester.email, name: requester.name }],
        subject: `[ClawMeMaybe] Resource Request Rejected: ${request.title}`,
        body: `
Dear ${requester.name ?? "User"},

Unfortunately, your resource request has been rejected.

Request Details:
- Type: ${requestTypeLabel}
- Title: ${request.title}
- Rejected by: ${actor?.name ?? actor?.email ?? "Administrator"}
- Reason: ${request.rejectionReason ?? "No reason provided"}

If you believe this decision was made in error or would like to submit a revised request, please contact your administrator.

View your request: ${requestUrl}

Thank you for using ClawMeMaybe.
        `.trim(),
        html: generateHtmlEmail(
          "Resource Request Rejected",
          requester.name ?? "User",
          `
            <p>Unfortunately, your resource request has been <strong>rejected</strong>.</p>
            <h3>Request Details:</h3>
            <ul>
              <li><strong>Type:</strong> ${requestTypeLabel}</li>
              <li><strong>Title:</strong> ${request.title}</li>
              <li><strong>Rejected by:</strong> ${actor?.name ?? actor?.email ?? "Administrator"}</li>
              <li><strong>Reason:</strong> ${request.rejectionReason ?? "No reason provided"}</li>
            </ul>
            <p>If you believe this decision was made in error, please contact your administrator.</p>
            <p><a href="${requestUrl}">View your request</a></p>
          `
        ),
      };

    case "REQUEST_CANCELLED":
      return {
        to: [{ email: requester.email, name: requester.name }],
        subject: `[ClawMeMaybe] Resource Request Cancelled: ${request.title}`,
        body: `
Dear ${requester.name ?? "User"},

Your resource request has been cancelled.

Request Details:
- Type: ${requestTypeLabel}
- Title: ${request.title}

If you need to submit a new request, you can do so through the portal.

Thank you for using ClawMeMaybe.
        `.trim(),
        html: generateHtmlEmail(
          "Resource Request Cancelled",
          requester.name ?? "User",
          `
            <p>Your resource request has been <strong>cancelled</strong>.</p>
            <h3>Request Details:</h3>
            <ul>
              <li><strong>Type:</strong> ${requestTypeLabel}</li>
              <li><strong>Title:</strong> ${request.title}</li>
            </ul>
            <p>If you need to submit a new request, you can do so through the portal.</p>
          `
        ),
      };

    case "REQUEST_FULFILLED":
      return {
        to: [{ email: requester.email, name: requester.name }],
        subject: `[ClawMeMaybe] Resource Request Fulfilled: ${request.title}`,
        body: `
Dear ${requester.name ?? "User"},

Your resource request has been fulfilled and is now ready for use!

Request Details:
- Type: ${requestTypeLabel}
- Title: ${request.title}
- Fulfilled by: ${actor?.name ?? actor?.email ?? "Administrator"}
- Note: ${request.fulfillmentNote ?? "No additional notes"}

Your requested resource is now available. Please check the portal for details.

View your request: ${requestUrl}

Thank you for using ClawMeMaybe.
        `.trim(),
        html: generateHtmlEmail(
          "Resource Request Fulfilled",
          requester.name ?? "User",
          `
            <p>Your resource request has been <strong>fulfilled</strong> and is now ready for use!</p>
            <h3>Request Details:</h3>
            <ul>
              <li><strong>Type:</strong> ${requestTypeLabel}</li>
              <li><strong>Title:</strong> ${request.title}</li>
              <li><strong>Fulfilled by:</strong> ${actor?.name ?? actor?.email ?? "Administrator"}</li>
              <li><strong>Note:</strong> ${request.fulfillmentNote ?? "No additional notes"}</li>
            </ul>
            <p>Your requested resource is now available.</p>
            <p><a href="${requestUrl}">View your request</a></p>
          `
        ),
      };

    default:
      throw new Error(`Unknown email notification type: ${type}`);
  }
}

/**
 * Get human-readable label for request type
 */
function getRequestTypeLabel(type: ResourceRequestType): string {
  switch (type) {
    case ResourceRequestType.INSTANCE_ACCESS:
      return "Instance Access";
    case ResourceRequestType.NEW_INSTANCE:
      return "New Instance";
    case ResourceRequestType.TOKEN_REQUEST:
      return "Token Request";
    case ResourceRequestType.OTHER:
      return "Other";
    default:
      return type;
  }
}

/**
 * Generate HTML email wrapper
 */
function generateHtmlEmail(
  title: string,
  recipientName: string,
  content: string
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #f9f9f9; }
    .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
    a { color: #4F46E5; }
    ul { padding-left: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${title}</h1>
    </div>
    <div class="content">
      <p>Dear ${recipientName},</p>
      ${content}
    </div>
    <div class="footer">
      <p>This is an automated notification from ClawMeMaybe.</p>
      <p>ClawMeMaybe - AI-native Enterprise OpenClaw Management Platform</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Send notification for resource request creation
 */
export async function notifyRequestCreated(
  request: ResourceRequest,
  requester: User
): Promise<boolean> {
  const content = generateRequestEmailContent(
    "REQUEST_CREATED",
    request,
    requester
  );
  return sendEmail(content);
}

/**
 * Send notification for resource request approval
 */
export async function notifyRequestApproved(
  request: ResourceRequest,
  requester: User,
  approver: User
): Promise<boolean> {
  const content = generateRequestEmailContent(
    "REQUEST_APPROVED",
    request,
    requester,
    approver
  );
  return sendEmail(content);
}

/**
 * Send notification for resource request rejection
 */
export async function notifyRequestRejected(
  request: ResourceRequest,
  requester: User,
  approver: User
): Promise<boolean> {
  const content = generateRequestEmailContent(
    "REQUEST_REJECTED",
    request,
    requester,
    approver
  );
  return sendEmail(content);
}

/**
 * Send notification for resource request cancellation
 */
export async function notifyRequestCancelled(
  request: ResourceRequest,
  requester: User
): Promise<boolean> {
  const content = generateRequestEmailContent(
    "REQUEST_CANCELLED",
    request,
    requester
  );
  return sendEmail(content);
}

/**
 * Send notification for resource request fulfillment
 */
export async function notifyRequestFulfilled(
  request: ResourceRequest,
  requester: User,
  fulfiller: User
): Promise<boolean> {
  const content = generateRequestEmailContent(
    "REQUEST_FULFILLED",
    request,
    requester,
    fulfiller
  );
  return sendEmail(content);
}
