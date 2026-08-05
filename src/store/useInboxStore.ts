import { create } from "zustand";

export interface Conversation {
  id: number;
  display_id: number;
  subject?: string;
  status: "open" | "pending" | "resolved" | "snoozed";
  priority: "low" | "medium" | "high" | "urgent";
  contact?: {
    id: number;
    name: string;
    email?: string;
    phone_number?: string;
  };
  assignee?: {
    id: number;
    name: string;
    email: string;
  };
  inbox?: {
    id: number;
    name: string;
  };
  created_at?: string;
  updated_at?: string;
  unread_count?: number;
}

export interface Message {
  id: number;
  body: string;
  sender_type: "user" | "contact" | "bot";
  sender_id: number;
  created_at?: string;
  conversation_id?: number;
}

interface InboxState {
  selectedConversationId: number | null;
  conversations: Conversation[];
  messages: Record<number, Message[]>;
  typingUsers: Record<number, string[]>;
  setSelectedConversation: (id: number | null) => void;
  setConversations: (convs: Conversation[]) => void;
  setMessages: (conversationId: number, msgs: Message[]) => void;
  appendMessage: (conversationId: number, msg: Message) => void;
  setTyping: (conversationId: number, users: string[]) => void;
}

export const useInboxStore = create<InboxState>((set) => ({
  selectedConversationId: null,
  conversations: [],
  messages: {},
  typingUsers: {},
  setSelectedConversation: (id) => set({ selectedConversationId: id }),
  setConversations: (convs) => set({ conversations: convs }),
  setMessages: (conversationId, msgs) =>
    set((state) => ({
      messages: { ...state.messages, [conversationId]: msgs },
    })),
  appendMessage: (conversationId, msg) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: [...(state.messages[conversationId] ?? []), msg],
      },
    })),
  setTyping: (conversationId, users) =>
    set((state) => ({
      typingUsers: { ...state.typingUsers, [conversationId]: users },
    })),
}));
