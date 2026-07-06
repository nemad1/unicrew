/**
 * Mock data barrel export.
 *
 * Import all mock data from this single entry point:
 *   import { conversations, priyaShahMessages } from "@/lib/mock-data";
 *
 * When wiring up Supabase, replace these exports with async fetchers.
 */

export {
  conversations,
  supervisedConversations,
  ambassadorConversations,
} from "./conversations";

export {
  priyaShahMessages,
  aishaChatMessages,
  supervisedThreadMessages,
  ambassadorChatMessages,
  getMessagesForConversation,
} from "./messages";
