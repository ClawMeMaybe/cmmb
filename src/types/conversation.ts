// Conversation types for the conversation history viewer

// Re-export Prisma-generated enums
export {
  ConversationStatus,
  MessageDirection,
  MessageStatus,
} from "@prisma/client";

// Import Prisma types for use in server code
export type { Conversation, Message } from "@prisma/client";

// Conversation base type for API responses
export interface ConversationBase {
  id: string;
  title?: string | null;
  status: string;
  channelId: string;
  contactId?: string | null;
  contactName?: string | null;
  externalId?: string | null;
  parentId?: string | null;
  messageCount: number;
  lastMessageAt?: Date | null;
  lastMessagePreview?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

// Conversation with messages for detailed view
export interface ConversationWithMessages extends ConversationBase {
  messages: MessageBase[];
  channel?: {
    id: string;
    name: string;
    type: string;
  };
  threadCount?: number;
}

// Conversation list item for display
export interface ConversationListItem extends ConversationBase {
  channel?: {
    id: string;
    name: string;
    type: string;
  };
  threadCount?: number;
}

// Message base type for API responses
export interface MessageBase {
  id: string;
  conversationId: string;
  content: string;
  contentType: string;
  direction: string;
  status: string;
  externalId?: string | null;
  senderId?: string | null;
  senderName?: string | null;
  replyToId?: string | null;
  metadata?: Record<string, unknown> | null;
  sentAt?: Date | null;
  deliveredAt?: Date | null;
  readAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// Message with reply context
export interface MessageWithReplies extends MessageBase {
  replyTo?: MessageBase | null;
  replies?: MessageBase[];
}

// Conversation query filters
export interface ConversationFilters {
  channelId?: string;
  contactId?: string;
  status?: string;
  search?: string; // Search in message content
  startDate?: string; // ISO date string
  endDate?: string; // ISO date string
  parentId?: string; // For thread filtering
}

// Pagination parameters
export interface ConversationPagination {
  page?: number;
  limit?: number;
  sortBy?: "lastMessageAt" | "createdAt" | "messageCount";
  sortOrder?: "asc" | "desc";
}

// Conversation list response
export interface ConversationListResponse {
  conversations: ConversationListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Export options
export interface ConversationExportOptions {
  format?: "json" | "csv" | "txt";
  includeMetadata?: boolean;
  includeReplies?: boolean;
  startDate?: string;
  endDate?: string;
}

// Export response
export interface ConversationExportResponse {
  data: string;
  format: string;
  filename: string;
  mimeType: string;
}

// Search result for messages
export interface MessageSearchResult {
  message: MessageBase;
  conversation: {
    id: string;
    title?: string | null;
    contactName?: string | null;
    channelId: string;
  };
  relevance?: number;
}

// Message search response
export interface MessageSearchResponse {
  results: MessageSearchResult[];
  total: number;
  page: number;
  limit: number;
}
