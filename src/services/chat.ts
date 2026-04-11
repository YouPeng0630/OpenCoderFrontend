/**
 * Chat Service
 * 聊天系统 API 和 WebSocket 管理
 */

interface ChatMember {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar_url?: string;
  online_state: "online" | "offline";
  last_seen?: string;
}

interface Conversation {
  id: string;
  type: "global" | "project_group" | "p2p";
  name?: string;
  participants: Array<{
    id: string;
    name: string;
    avatar_url?: string;
    online_state: boolean;
  }>;
  last_message?: {
    content: string;
    sender_id: string;
    created_at: string;
  };
  updated_at?: string;
}

interface ChatMessage {
  id: string;
  conversation_id: string;
  sender: {
    id: string;
    name: string;
    avatar_url?: string;
  };
  content: string;
  message_type: string;
  read_by: string[];
  created_at: string;
}

interface ConversationsResponse {
  success: boolean;
  conversations: Conversation[];
}

interface MessagesResponse {
  success: boolean;
  messages: ChatMessage[];
  has_more: boolean;
}

interface MembersResponse {
  success: boolean;
  members: ChatMember[];
}

const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

/**
 * 获取会话列表
 */
export async function getConversations(
  token: string,
  projectId?: string
): Promise<ConversationsResponse> {
  let url = `${baseURL}/api/chat/conversations?token=${encodeURIComponent(token)}`;
  if (projectId) {
    url += `&project_id=${projectId}`;
  }

  const response = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Failed to fetch conversations" }));
    throw new Error(error.detail || "Failed to fetch conversations");
  }

  return response.json();
}

/**
 * 获取消息历史
 */
export async function getMessages(
  token: string,
  conversationId: string,
  limit: number = 50,
  beforeTimestamp?: string
): Promise<MessagesResponse> {
  let url = `${baseURL}/api/chat/messages?token=${encodeURIComponent(token)}&conversation_id=${conversationId}&limit=${limit}`;
  if (beforeTimestamp) {
    url += `&before_timestamp=${beforeTimestamp}`;
  }

  const response = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Failed to fetch messages" }));
    throw new Error(error.detail || "Failed to fetch messages");
  }

  return response.json();
}

/**
 * 获取项目成员列表
 */
export async function getChatMembers(
  token: string,
  projectId?: string
): Promise<MembersResponse> {
  let url = `${baseURL}/api/chat/members?token=${encodeURIComponent(token)}`;
  if (projectId) {
    url += `&project_id=${projectId}`;
  }

  const response = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Failed to fetch members" }));
    throw new Error(error.detail || "Failed to fetch members");
  }

  return response.json();
}

/**
 * 创建新对话
 */
export async function createConversation(
  token: string,
  type: "p2p" | "project_group",
  participantIds: string[],
  name?: string
) {
  const params = new URLSearchParams({
    token,
    type,
    ...participantIds.reduce((acc, id, idx) => ({ ...acc, [`participant_ids`]: id }), {}),
  });
  
  if (name) {
    params.append("name", name);
  }

  // 修复：正确处理数组参数
  let url = `${baseURL}/api/chat/conversations/create?token=${encodeURIComponent(token)}&type=${type}`;
  participantIds.forEach(id => {
    url += `&participant_ids=${id}`;
  });
  if (name) {
    url += `&name=${encodeURIComponent(name)}`;
  }

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Failed to create conversation" }));
    throw new Error(error.detail || "Failed to create conversation");
  }

  return response.json();
}

/**
 * 标记消息为已读
 */
export async function markMessageRead(token: string, messageId: string) {
  const response = await fetch(
    `${baseURL}/api/chat/messages/${messageId}/mark-read?token=${encodeURIComponent(token)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Failed to mark message as read" }));
    throw new Error(error.detail || "Failed to mark message as read");
  }

  return response.json();
}

/**
 * WebSocket 连接管理
 */
export class ChatWebSocket {
  private ws: WebSocket | null = null;
  private userId: string;
  private token: string;
  private reconnectInterval: number = 3000;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private onMessageCallback: ((message: any) => void) | null = null;
  private onStatusCallback: ((status: "connected" | "disconnected") => void) | null = null;

  constructor(userId: string, token: string) {
    this.userId = userId;
    this.token = token;
  }

  connect() {
    const wsURL = baseURL.replace("http://", "ws://").replace("https://", "wss://");
    this.ws = new WebSocket(`${wsURL}/ws/chat/${this.userId}?token=${this.token}`);

    this.ws.onopen = () => {
      console.log("✅ WebSocket connected");
      this.onStatusCallback?.("connected");
      
      // 清除重连定时器
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.onMessageCallback?.(data);
      } catch (error) {
        console.error("Failed to parse message:", error);
      }
    };

    this.ws.onclose = () => {
      console.log("❌ WebSocket disconnected");
      this.onStatusCallback?.("disconnected");
      this.scheduleReconnect();
    };

    this.ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    
    this.reconnectTimer = setTimeout(() => {
      console.log("🔄 Reconnecting...");
      this.connect();
    }, this.reconnectInterval);
  }

  sendMessage(conversationId: string, content: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: "send_message",
          conversation_id: conversationId,
          content,
        })
      );
    } else {
      console.error("WebSocket not connected");
    }
  }

  sendTyping(conversationId: string, isTyping: boolean) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: "typing",
          conversation_id: conversationId,
          is_typing: isTyping,
        })
      );
    }
  }

  onMessage(callback: (message: any) => void) {
    this.onMessageCallback = callback;
  }

  onStatusChange(callback: (status: "connected" | "disconnected") => void) {
    this.onStatusCallback = callback;
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export type { ChatMember, Conversation, ChatMessage };
