# Frontend Guide - Chatwoot Clone (React + TypeScript)

## Project Setup

### 1. Initialize Vite with React + TypeScript
```bash
cd frontend
npm create vite@latest . --template react-ts
cd ..
```

### 2. Install Dependencies
```bash
npm install axios socket.io-client zustand tailwindcss @headlessui/react @heroicons/react
npm install -D eslint prettier eslint-plugin-react eslint-plugin-react-hooks @types/react-router-dom
```

### 3. Setup Tailwind CSS
```bash
npx tailwindcss init -p
```

**tailwind.config.ts:**
```typescript
import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#3B82F6',
        secondary: '#64748B',
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444',
      },
    },
  },
  plugins: [],
} satisfies Config;
```

---

## Project Structure

```
frontend/
├── src/
│   ├── assets/              # Images, fonts, static files
│   ├── components/          # Reusable UI components
│   │   ├── common/         # Buttons, inputs, modals
│   │   ├── chat/           # Chat-specific components
│   │   └── layout/         # Page layouts, navigation
│   ├── hooks/              # Custom React hooks
│   ├── pages/              # Route-level components
│   ├── services/           # API client, WebSocket service
│   ├── stores/             # Zustand state management
│   ├── types/              # TypeScript interfaces
│   ├── utils/              # Helper functions
│   └── App.tsx            # Main application component
├── public/                # Static assets (favicon, etc)
└── vite.config.ts         # Vite configuration
```

---

## API Client Setup

### Axios Instance with JWT Interceptor

**src/services/apiClient.ts:**
```typescript
import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1',
});

// Request interceptor untuk menambahkan JWT token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor untuk handle error global
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

---

## TypeScript Interfaces

**src/types/index.d.ts:**
```typescript
export interface User {
  id: number;
  email: string;
  name: string | null;
  role: 'admin' | 'agent' | 'viewer';
}

export interface Contact {
  id: number;
  name: string | null;
  email: string | null;
  phone_number: string | null;
  avatar_url: string | null;
}

export interface Conversation {
  id: number;
  display_id: number;
  status: 'open' | 'pending' | 'resolved' | 'snoozed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  subject: string | null;
  contact: Contact;
  assignee?: User;
}

export interface Message {
  id: number;
  body: string;
  message_type: 'text' | 'image' | 'file' | 'audio';
  sender_type: 'user' | 'contact';
  status: 'sending' | 'sent' | 'delivered' | 'read';
  media_url?: string | null;
  created_at: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}
```

---

## Core Components

### ChatWidget.tsx - Embeddable Widget

**src/components/ChatWidget.tsx:**
```typescript
import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Message } from '../types';

interface ChatWidgetProps {
  inboxId: number;
  contact?: Partial<Contact>;
}

export const ChatWidget: React.FC<ChatWidgetProps> = ({ inboxId, contact }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Initialize WebSocket connection
    socketRef.current = io(import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:3000');
    
    socketRef.current.on('new_message', (message: Message) => {
      setMessages(prev => [...prev, message]);
    });

    // Fetch existing messages
    fetchMessages();

    return () => {
      socketRef.current?.disconnect();
    };
  }, [inboxId]);

  const fetchMessages = async () => {
    try {
      const response = await apiClient.get(`/conversations/${inboxId}/messages`);
      setMessages(response.data);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!inputValue.trim()) return;

    try {
      const response = await apiClient.post(`/conversations/${inboxId}/messages`, {
        body: inputValue,
      });
      
      setMessages(prev => [...prev, response.data]);
      setInputValue('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-blue-600 text-white w-14 h-14 rounded-full shadow-lg hover:bg-blue-700"
        >
          Chat
        </button>
      ) : (
        <div className="w-96 h-[500px] bg-white border rounded-lg shadow-xl flex flex-col">
          {/* Header */}
          <div className="bg-blue-600 text-white p-4">
            <h3 className="font-semibold">Live Chat</h3>
            <button onClick={() => setIsOpen(false)} className="text-sm">×</button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {messages.map((msg) => (
              <div key={msg.id} className={`message-bubble ${msg.sender_type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className="bg-gray-100 p-2 rounded-lg">
                  {msg.body}
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(msg.created_at).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="p-4 border-t">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Type a message..."
              className="w-full border rounded px-3 py-2"
            />
          </div>
        </div>
      )}
    </div>
  );
};
```

### ConversationList.tsx - List Conversations

**src/components/ConversationList.tsx:**
```typescript
import React, { useEffect, useState } from 'react';
import { Conversation } from '../types';
import apiClient from '../services/apiClient';

export const ConversationList: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const response = await apiClient.get('/conversations');
      setConversations(response.data);
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-4">Loading...</div>;

  return (
    <div className="overflow-y-auto h-full">
      {conversations.map((conv) => (
        <div key={conv.id} className="border-b p-3 hover:bg-gray-50 cursor-pointer">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="font-medium">{conv.contact?.name || 'Unknown'}</h4>
              <p className="text-sm text-gray-600 line-clamp-1">
                {conv.subject}
              </p>
            </div>
            <span className={`status-badge status-${conv.status}`}>
              {conv.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};
```

---

## State Management with Zustand

**src/stores/authStore.ts:**
```typescript
import { create } from 'zustand';
import apiClient from '../services/apiClient';
import { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  fetchCurrentUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  isLoading: false,

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const response = await apiClient.post('/auth/login', { email, password });
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      set({ user, token, isLoading: false });
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null });
  },

  fetchCurrentUser: async () => {
    if (!localStorage.getItem('token')) return;
    
    try {
      const response = await apiClient.get('/auth/me');
      set({ user: response.data });
    } catch (error) {
      console.error('Failed to fetch current user:', error);
    }
  },
}));
```

---

## WebSocket Service for Real-time Updates

**src/services/websocketService.ts:**
```typescript
import { io, Socket } from 'socket.io-client';
import { Message } from '../types';

class WebsocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Function[]> = new Map();

  connect(token: string) {
    this.socket = io(import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:3000', {
      auth: { token }
    });

    this.socket.on('connect', () => {
      console.log('Connected to WebSocket');
    });

    this.socket.on('message_created', (message: Message) => {
      this.emit('new_message', message);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(callback);
  }

  emit(event: string, data: any) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(cb => cb(data));
    }
  }
}

export default new WebsocketService();
```

---

## Styling Guidelines

### Tailwind CSS Classes untuk Chat Components

```typescript
// Container styles
const containerClasses = "flex flex-col h-full bg-white";

// Message bubbles
const messageClasses = {
  user: "bg-blue-100 ml-auto",
  contact: "bg-gray-100 mr-auto"
};

// Status badges
const statusColors = {
  open: "bg-green-100 text-green-800",
  pending: "bg-yellow-100 text-yellow-800", 
  resolved: "bg-blue-100 text-blue-800"
};
```

---

## Testing Setup (Vitest + React Testing Library)

**vite.config.ts:**
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/setupTests.ts'],
  },
});
```

**src/setupTests.ts:**
```typescript
import '@testing-library/jest-dom';
```

**Contoh Test Component:**
```typescript
// src/components/__tests__/ChatWidget.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatWidget } from '../ChatWidget';

test('renders chat widget button', () => {
  render(<ChatWidget inboxId={1} />);
  expect(screen.getByText('Chat')).toBeInTheDocument();
});

test('opens chat when button clicked', () => {
  render(<ChatWidget inboxId={1} />);
  fireEvent.click(screen.getByText('Chat'));
  expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument();
});
```