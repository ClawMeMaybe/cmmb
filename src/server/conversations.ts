import { prisma } from "@/lib/prisma";
import type {
  ConversationFilters,
  ConversationPagination,
  ConversationListResponse,
  ConversationWithMessages,
  ConversationListItem,
  ConversationExportOptions,
  MessageSearchResponse,
  MessageSearchResult,
  MessageBase,
} from "@/types/conversation";
import type { Conversation, Message } from "@prisma/client";
import {
  ConversationStatus,
  MessageDirection,
  MessageStatus,
} from "@/types/conversation";

// Default pagination values
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * Get paginated list of conversations with filters
 */
export async function getConversations(
  filters: ConversationFilters = {},
  pagination: ConversationPagination = {}
): Promise<ConversationListResponse> {
  const { channelId, contactId, status, search, startDate, endDate, parentId } =
    filters;

  const {
    page = DEFAULT_PAGE,
    limit = DEFAULT_LIMIT,
    sortBy = "lastMessageAt",
    sortOrder = "desc",
  } = pagination;

  const actualLimit = Math.min(limit, MAX_LIMIT);
  const skip = (page - 1) * actualLimit;

  // Build where clause
  const where: Record<string, unknown> = {};

  if (channelId) {
    where.channelId = channelId;
  }

  if (contactId) {
    where.contactId = contactId;
  }

  if (status) {
    where.status = status;
  }

  if (parentId !== undefined) {
    where.parentId = parentId === "null" ? null : parentId;
  }

  if (startDate || endDate) {
    const dateFilter: Record<string, Date> = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate);
    }
    where.lastMessageAt = dateFilter;
  }

  // Search in message content
  if (search) {
    where.messages = {
      some: {
        content: {
          contains: search,
        },
      },
    };
  }

  // Get total count
  const total = await prisma.conversation.count({ where });
  const totalPages = Math.ceil(total / actualLimit);

  // Get conversations with channel info
  const conversationsRaw = await prisma.conversation.findMany({
    where,
    skip,
    take: actualLimit,
    orderBy: {
      [sortBy]: sortOrder,
    },
    include: {
      channel: {
        select: {
          id: true,
          name: true,
          type: true,
        },
      },
    },
  });

  // Get thread count for each conversation and map to ConversationListItem
  const conversations: ConversationListItem[] = await Promise.all(
    conversationsRaw.map(async (conv) => {
      const threadCount = await prisma.conversation.count({
        where: { parentId: conv.id },
      });
      return {
        id: conv.id,
        title: conv.title,
        status: conv.status,
        channelId: conv.channelId,
        contactId: conv.contactId,
        contactName: conv.contactName,
        externalId: conv.externalId,
        parentId: conv.parentId,
        messageCount: conv.messageCount,
        lastMessageAt: conv.lastMessageAt,
        lastMessagePreview: conv.lastMessagePreview,
        metadata: conv.metadata as Record<string, unknown> | null,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
        channel: conv.channel
          ? {
              id: conv.channel.id,
              name: conv.channel.name,
              type: conv.channel.type,
            }
          : undefined,
        threadCount,
      };
    })
  );

  return {
    conversations,
    total,
    page,
    limit: actualLimit,
    totalPages,
  };
}

/**
 * Get a single conversation with messages
 */
export async function getConversationById(
  id: string,
  options: {
    includeReplies?: boolean;
    messageLimit?: number;
    messageOffset?: number;
  } = {}
): Promise<ConversationWithMessages | null> {
  const {
    includeReplies = true,
    messageLimit = 50,
    messageOffset = 0,
  } = options;

  const conversationRaw = await prisma.conversation.findUnique({
    where: { id },
    include: {
      channel: {
        select: {
          id: true,
          name: true,
          type: true,
        },
      },
      messages: {
        take: messageLimit,
        skip: messageOffset,
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!conversationRaw) {
    return null;
  }

  // Get thread count
  const threadCount = await prisma.conversation.count({
    where: { parentId: id },
  });

  // Map messages to MessageBase format
  const messages: MessageBase[] = conversationRaw.messages.map((msg) => ({
    id: msg.id,
    conversationId: msg.conversationId,
    content: msg.content,
    contentType: msg.contentType,
    direction: msg.direction,
    status: msg.status,
    externalId: msg.externalId,
    senderId: msg.senderId,
    senderName: msg.senderName,
    replyToId: msg.replyToId,
    metadata: msg.metadata as Record<string, unknown> | null,
    sentAt: msg.sentAt,
    deliveredAt: msg.deliveredAt,
    readAt: msg.readAt,
    createdAt: msg.createdAt,
    updatedAt: msg.updatedAt,
  }));

  // If includeReplies, fetch reply data for each message
  if (includeReplies) {
    const messagesWithReplies = await Promise.all(
      messages.map(async (msg) => {
        const replyTo = msg.replyToId
          ? await prisma.message.findUnique({
              where: { id: msg.replyToId },
            })
          : null;

        const replies = await prisma.message.findMany({
          where: { replyToId: msg.id },
          orderBy: { createdAt: "asc" },
        });

        return {
          ...msg,
          replyTo: replyTo
            ? {
                id: replyTo.id,
                conversationId: replyTo.conversationId,
                content: replyTo.content,
                contentType: replyTo.contentType,
                direction: replyTo.direction,
                status: replyTo.status,
                externalId: replyTo.externalId,
                senderId: replyTo.senderId,
                senderName: replyTo.senderName,
                replyToId: replyTo.replyToId,
                metadata: replyTo.metadata as Record<string, unknown> | null,
                sentAt: replyTo.sentAt,
                deliveredAt: replyTo.deliveredAt,
                readAt: replyTo.readAt,
                createdAt: replyTo.createdAt,
                updatedAt: replyTo.updatedAt,
              }
            : null,
          replies: replies.map((r) => ({
            id: r.id,
            conversationId: r.conversationId,
            content: r.content,
            contentType: r.contentType,
            direction: r.direction,
            status: r.status,
            externalId: r.externalId,
            senderId: r.senderId,
            senderName: r.senderName,
            replyToId: r.replyToId,
            metadata: r.metadata as Record<string, unknown> | null,
            sentAt: r.sentAt,
            deliveredAt: r.deliveredAt,
            readAt: r.readAt,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
          })),
        };
      })
    );

    return {
      id: conversationRaw.id,
      title: conversationRaw.title,
      status: conversationRaw.status,
      channelId: conversationRaw.channelId,
      contactId: conversationRaw.contactId,
      contactName: conversationRaw.contactName,
      externalId: conversationRaw.externalId,
      parentId: conversationRaw.parentId,
      messageCount: conversationRaw.messageCount,
      lastMessageAt: conversationRaw.lastMessageAt,
      lastMessagePreview: conversationRaw.lastMessagePreview,
      metadata: conversationRaw.metadata as Record<string, unknown> | null,
      createdAt: conversationRaw.createdAt,
      updatedAt: conversationRaw.updatedAt,
      channel: conversationRaw.channel
        ? {
            id: conversationRaw.channel.id,
            name: conversationRaw.channel.name,
            type: conversationRaw.channel.type,
          }
        : undefined,
      threadCount,
      messages: messagesWithReplies,
    };
  }

  return {
    id: conversationRaw.id,
    title: conversationRaw.title,
    status: conversationRaw.status,
    channelId: conversationRaw.channelId,
    contactId: conversationRaw.contactId,
    contactName: conversationRaw.contactName,
    externalId: conversationRaw.externalId,
    parentId: conversationRaw.parentId,
    messageCount: conversationRaw.messageCount,
    lastMessageAt: conversationRaw.lastMessageAt,
    lastMessagePreview: conversationRaw.lastMessagePreview,
    metadata: conversationRaw.metadata as Record<string, unknown> | null,
    createdAt: conversationRaw.createdAt,
    updatedAt: conversationRaw.updatedAt,
    channel: conversationRaw.channel
      ? {
          id: conversationRaw.channel.id,
          name: conversationRaw.channel.name,
          type: conversationRaw.channel.type,
        }
      : undefined,
    threadCount,
    messages,
  };
}

/**
 * Get message threads for a conversation
 */
export async function getConversationThreads(
  parentId: string
): Promise<ConversationListItem[]> {
  const threadsRaw = await prisma.conversation.findMany({
    where: { parentId },
    orderBy: { lastMessageAt: "desc" },
    include: {
      channel: {
        select: {
          id: true,
          name: true,
          type: true,
        },
      },
    },
  });

  return threadsRaw.map((thread) => ({
    id: thread.id,
    title: thread.title,
    status: thread.status,
    channelId: thread.channelId,
    contactId: thread.contactId,
    contactName: thread.contactName,
    externalId: thread.externalId,
    parentId: thread.parentId,
    messageCount: thread.messageCount,
    lastMessageAt: thread.lastMessageAt,
    lastMessagePreview: thread.lastMessagePreview,
    metadata: thread.metadata as Record<string, unknown> | null,
    createdAt: thread.createdAt,
    updatedAt: thread.updatedAt,
    channel: thread.channel
      ? {
          id: thread.channel.id,
          name: thread.channel.name,
          type: thread.channel.type,
        }
      : undefined,
  }));
}

/**
 * Search messages across conversations
 */
export async function searchMessages(
  query: string,
  filters: ConversationFilters = {},
  pagination: ConversationPagination = {}
): Promise<MessageSearchResponse> {
  const { channelId, contactId, startDate, endDate } = filters;
  const { page = DEFAULT_PAGE, limit = DEFAULT_LIMIT } = pagination;

  const actualLimit = Math.min(limit, MAX_LIMIT);
  const skip = (page - 1) * actualLimit;

  // Build where clause for messages
  const where: Record<string, unknown> = {
    content: {
      contains: query,
    },
  };

  if (startDate || endDate) {
    const dateFilter: Record<string, Date> = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate);
    }
    where.createdAt = dateFilter;
  }

  // Build conversation filter
  const conversationWhere: Record<string, unknown> = {};
  if (channelId) {
    conversationWhere.channelId = channelId;
  }
  if (contactId) {
    conversationWhere.contactId = contactId;
  }

  if (Object.keys(conversationWhere).length > 0) {
    where.conversation = conversationWhere;
  }

  // Get messages with conversation info
  const messagesRaw = await prisma.message.findMany({
    where,
    skip,
    take: actualLimit,
    orderBy: { createdAt: "desc" },
    include: {
      conversation: {
        select: {
          id: true,
          title: true,
          contactName: true,
          channelId: true,
        },
      },
    },
  });

  // Get total count
  const total = await prisma.message.count({ where });

  // Map to search results
  const results: MessageSearchResult[] = messagesRaw.map((msg) => ({
    message: {
      id: msg.id,
      conversationId: msg.conversationId,
      content: msg.content,
      contentType: msg.contentType,
      direction: msg.direction,
      status: msg.status,
      externalId: msg.externalId,
      senderId: msg.senderId,
      senderName: msg.senderName,
      replyToId: msg.replyToId,
      metadata: msg.metadata as Record<string, unknown> | null,
      sentAt: msg.sentAt,
      deliveredAt: msg.deliveredAt,
      readAt: msg.readAt,
      createdAt: msg.createdAt,
      updatedAt: msg.updatedAt,
    },
    conversation: {
      id: msg.conversation.id,
      title: msg.conversation.title,
      contactName: msg.conversation.contactName,
      channelId: msg.conversation.channelId,
    },
  }));

  return {
    results,
    total,
    page,
    limit: actualLimit,
  };
}

/**
 * Export conversation to specified format
 */
export async function exportConversation(
  id: string,
  options: ConversationExportOptions = {}
): Promise<{
  data: string;
  format: string;
  filename: string;
  mimeType: string;
} | null> {
  const {
    format = "json",
    includeMetadata = true,
    includeReplies = true,
  } = options;

  const conversation = await getConversationById(id, {
    includeReplies,
    messageLimit: 1000, // Export all messages
  });

  if (!conversation) {
    return null;
  }

  const filename = `conversation-${id}-${new Date().toISOString().split("T")[0]}`;

  switch (format) {
    case "json":
      return {
        data: JSON.stringify(conversation, null, 2),
        format: "json",
        filename: `${filename}.json`,
        mimeType: "application/json",
      };

    case "csv":
      const csvHeaders = includeMetadata
        ? "Timestamp,Direction,Sender,Status,Content\n"
        : "Timestamp,Direction,Content\n";
      const csvRows = conversation.messages
        .map((msg) => {
          if (includeMetadata) {
            return `${msg.createdAt.toISOString()},${msg.direction},${msg.senderName || msg.senderId || ""},${msg.status},"${msg.content.replace(/"/g, '"')}"`;
          }
          return `${msg.createdAt.toISOString()},${msg.direction},"${msg.content.replace(/"/g, '"')}"`;
        })
        .join("\n");
      return {
        data: csvHeaders + csvRows,
        format: "csv",
        filename: `${filename}.csv`,
        mimeType: "text/csv",
      };

    case "txt":
      const header = includeMetadata
        ? `Conversation: ${conversation.title || conversation.contactName || id}\nChannel: ${conversation.channel?.name || "Unknown"}\nStatus: ${conversation.status}\nMessages: ${conversation.messageCount}\n\n`
        : "";
      const txtMessages = conversation.messages
        .map((msg) => {
          const timestamp = msg.createdAt.toISOString();
          const direction =
            msg.direction === MessageDirection.INBOUND ? "Received" : "Sent";
          if (includeMetadata) {
            return `[${timestamp}] ${direction} (${msg.senderName || "Unknown"}): ${msg.content}`;
          }
          return `[${timestamp}] ${direction}: ${msg.content}`;
        })
        .join("\n");
      return {
        data: header + txtMessages,
        format: "txt",
        filename: `${filename}.txt`,
        mimeType: "text/plain",
      };

    default:
      return null;
  }
}

/**
 * Create a new conversation
 */
export async function createConversation(data: {
  channelId: string;
  title?: string;
  contactId?: string;
  contactName?: string;
  externalId?: string;
  parentId?: string;
  metadata?: Record<string, unknown>;
}): Promise<Conversation> {
  return prisma.conversation.create({
    data: {
      channelId: data.channelId,
      title: data.title,
      contactId: data.contactId,
      contactName: data.contactName,
      externalId: data.externalId,
      parentId: data.parentId,
      metadata: data.metadata
        ? JSON.parse(JSON.stringify(data.metadata))
        : null,
      status: ConversationStatus.ACTIVE,
    },
  });
}

/**
 * Update conversation status
 */
export async function updateConversationStatus(
  id: string,
  status: ConversationStatus
): Promise<Conversation | null> {
  return prisma.conversation.update({
    where: { id },
    data: { status },
  });
}

/**
 * Add a message to a conversation
 */
export async function addMessage(data: {
  conversationId: string;
  content: string;
  contentType?: string;
  direction: MessageDirection;
  senderId?: string;
  senderName?: string;
  replyToId?: string;
  metadata?: Record<string, unknown>;
}): Promise<Message> {
  const message = await prisma.message.create({
    data: {
      conversationId: data.conversationId,
      content: data.content,
      contentType: data.contentType || "text",
      direction: data.direction,
      status:
        data.direction === MessageDirection.OUTBOUND
          ? MessageStatus.PENDING
          : MessageStatus.DELIVERED,
      senderId: data.senderId,
      senderName: data.senderName,
      replyToId: data.replyToId,
      metadata: data.metadata
        ? JSON.parse(JSON.stringify(data.metadata))
        : null,
    },
  });

  // Update conversation stats
  await prisma.conversation.update({
    where: { id: data.conversationId },
    data: {
      messageCount: { increment: 1 },
      lastMessageAt: new Date(),
      lastMessagePreview: data.content.substring(0, 200),
    },
  });

  return message;
}

/**
 * Update message status
 */
export async function updateMessageStatus(
  id: string,
  status: MessageStatus,
  timestamps?: {
    sentAt?: Date;
    deliveredAt?: Date;
    readAt?: Date;
  }
): Promise<Message | null> {
  return prisma.message.update({
    where: { id },
    data: {
      status,
      ...timestamps,
    },
  });
}
