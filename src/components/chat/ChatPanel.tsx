/**
 * ChatPanel Component
 * 聊天面板主组件
 */

import { useState, useEffect, useRef } from "react";
import { Send, Users, Loader2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  getConversations,
  getMessages,
  getChatMembers,
  createConversation,
  ChatWebSocket,
  type Conversation,
  type ChatMessage,
  type ChatMember,
} from "@/services/chat";
import { getToken } from "@/lib/storage";

interface ChatPanelProps {
  projectId: string;
  userId: string;
}

export function ChatPanel({ projectId, userId }: ChatPanelProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [members, setMembers] = useState<ChatMember[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [wsStatus, setWsStatus] = useState<"connected" | "disconnected">("disconnected");
  const [currentTime, setCurrentTime] = useState(Date.now()); // 用于触发时间刷新
  
  const wsRef = useRef<ChatWebSocket | null>(null);
  const selectedConversationRef = useRef<Conversation | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  
  // 保持 ref 同步
  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);
  
  // 自动滚动到底部
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // 定时刷新时间显示（每30秒）
  useEffect(() => {
    const timer = setInterval(() => {
      const newTime = Date.now();
      setCurrentTime(newTime);
    }, 30000); // 每30秒刷新一次

    return () => clearInterval(timer);
  }, []);

  // 初始化 WebSocket
  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const ws = new ChatWebSocket(userId, token);
    wsRef.current = ws;

    ws.onMessage((data) => {
      if (data.type === "new_message") {
        // 收到新消息
        const msg = data.message;
        console.log("📩 Received new message:", msg);
        
        // 使用 ref 获取最新的 selectedConversation
        const currentConv = selectedConversationRef.current;
        if (currentConv && msg.conversation_id === currentConv.id) {
          console.log("✅ Received message for current conversation:", {
            msgId: msg.id,
            sender: msg.sender.id,
            content: msg.content.substring(0, 20)
          });
          
          setMessages((prev) => {
            // 首先检查是否已存在相同 ID 的消息
            const existsById = prev.some(m => m.id === msg.id);
            if (existsById) {
              console.log("⚠️ Message with same ID already exists, skipping");
              return prev;
            }
            
            // 如果是自己发送的消息，尝试查找并替换临时消息
            if (msg.sender.id === userId) {
              console.log("🔍 Looking for temp message to replace. Current messages:", 
                prev.filter(m => m.sender.id === userId).map(m => ({
                  id: m.id,
                  content: m.content.substring(0, 20)
                }))
              );
              
              // 从后往前查找第一个匹配内容的临时消息
              let tempMsgIndex = -1;
              for (let i = prev.length - 1; i >= 0; i--) {
                if (prev[i].id.startsWith('temp-') && prev[i].content === msg.content) {
                  tempMsgIndex = i;
                  break;
                }
              }
              
              if (tempMsgIndex !== -1) {
                console.log("🔄 Replacing temp message with server message at index", tempMsgIndex);
                const newMessages = [...prev];
                newMessages[tempMsgIndex] = msg;
                return newMessages;
              } else {
                // 检查是否已经存在相同内容的消息（可能临时消息已被其他操作替换）
                const hasSimilarMessage = prev.some(m => 
                  m.sender.id === userId && 
                  m.content === msg.content &&
                  !m.id.startsWith('temp-')
                );
                
                if (hasSimilarMessage) {
                  console.log("⚠️ Similar message already exists (non-temp), skipping");
                  return prev;
                }
                
                console.log("⚠️ No matching temp message found, adding as new");
              }
            }
            
            // 添加新消息（其他人的消息，或找不到临时消息的情况）
            console.log("➕ Adding new message to list");
            return [...prev, msg];
          });
        } else {
          console.log("⏭️ Message for different conversation:", msg.conversation_id, "vs", currentConv?.id);
        }
        
        // 更新会话列表
        loadConversations();
      } else if (data.type === "user_status") {
        // 用户状态变化
        loadMembers();
      }
    });

    ws.onStatusChange((status) => {
      setWsStatus(status);
    });

    ws.connect();

    return () => {
      ws.disconnect();
    };
  }, [userId]);

  // 加载会话列表
  const loadConversations = async () => {
    const token = getToken();
    if (!token) return;

    try {
      const response = await getConversations(token, projectId);
      setConversations(response.conversations);
    } catch (error) {
      console.error("Failed to load conversations:", error);
    }
  };

  // 加载成员列表
  const loadMembers = async () => {
    const token = getToken();
    if (!token) return;

    try {
      const response = await getChatMembers(token, projectId);
      setMembers(response.members);
    } catch (error) {
      console.error("Failed to load members:", error);
    }
  };

  // 加载消息
  const loadMessages = async (conversationId: string) => {
    const token = getToken();
    if (!token) return;

    try {
      const response = await getMessages(token, conversationId);
      setMessages(response.messages);
    } catch (error) {
      console.error("Failed to load messages:", error);
    }
  };

  // 初始化
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([loadConversations(), loadMembers()]);
      setLoading(false);
    };
    init();
  }, [projectId]);

  // 选择对话时加载消息
  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  // 发送消息
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !wsRef.current) return;

    setSending(true);
    const messageContent = newMessage;
    const conversationId = selectedConversation.id;
    
    try {
      // 乐观更新：立即显示自己的消息
      const tempMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        conversation_id: conversationId,
        sender: {
          id: userId,
          name: "You",
          avatar_url: undefined
        },
        content: messageContent,
        message_type: "text",
        read_by: [userId],
        created_at: new Date().toISOString()
      };
      
      console.log("📝 Adding temp message:", {
        id: tempMessage.id,
        content: messageContent.substring(0, 20),
        currentMessageCount: messages.length
      });
      
      setMessages((prev) => [...prev, tempMessage]);
      setNewMessage("");
      
      // 发送到服务器
      wsRef.current.sendMessage(conversationId, messageContent);
      console.log("📤 Sent message to server via WebSocket");
    } catch (error) {
      console.error("Failed to send message:", error);
      alert("Failed to send message");
      // 恢复消息内容
      setNewMessage(messageContent);
    } finally {
      setSending(false);
    }
  };

  // 格式化消息时间（使用 currentTime 确保响应式更新）
  const formatMessageTime = (timestamp: string) => {
    // 确保时间戳被解析为 UTC 时间（如果没有 Z 后缀则添加）
    const isoTimestamp = timestamp.endsWith('Z') ? timestamp : timestamp + 'Z';
    const date = new Date(isoTimestamp);
    const now = currentTime; // 使用 state 中的时间
    const diff = now - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (seconds < 30) return "Just now";
    if (seconds < 60) return `${seconds}s ago`;
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  // 开始1v1聊天
  const handleStartP2PChat = async (memberId: string) => {
    const token = getToken();
    if (!token) return;

    try {
      const response = await createConversation(
        token,
        "p2p",
        [userId, memberId]
      );
      
      await loadConversations();
      
      // 选中新创建的对话
      const newConv = conversations.find(c => c.id === response.conversation_id);
      if (newConv) {
        setSelectedConversation(newConv);
      }
    } catch (error) {
      console.error("Failed to create conversation:", error);
      alert("Failed to start chat");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-[600px] gap-4">
      {/* 左侧：会话列表 + 成员列表 */}
      <Card className="w-80 flex flex-col bg-white">
        <div className="p-4 border-b bg-white">
          <h3 className="font-semibold flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Chat
            {wsStatus === "connected" && (
              <Circle className="h-2 w-2 fill-green-500 text-green-500" />
            )}
            {wsStatus === "disconnected" && (
              <Circle className="h-2 w-2 fill-gray-400 text-gray-400" />
            )}
          </h3>
        </div>

        <ScrollArea className="flex-1 bg-white">
          {/* 项目群聊 */}
          <div className="p-2">
            <p className="text-xs font-medium text-gray-500 mb-2 px-2">PROJECT CHAT</p>
            {conversations
              .filter((c) => c.type === "project_group")
              .map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv)}
                  className={`w-full text-left p-3 rounded-lg hover:bg-gray-100 transition-colors ${
                    selectedConversation?.id === conv.id ? "bg-blue-50 border-l-4 border-blue-500" : ""
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-sm">{conv.name || "Project Group"}</p>
                    <Badge variant="secondary" className="text-xs">
                      {conv.participants.length}
                    </Badge>
                  </div>
                  {conv.last_message && (
                    <div className="space-y-0.5">
                      <p className="text-xs text-gray-700 truncate">
                        <span className="font-medium">
                          {conv.last_message.sender_id === userId ? "You" : 
                           members.find(m => m.id === conv.last_message.sender_id)?.name || "Someone"}:
                        </span>{" "}
                        {conv.last_message.content}
                      </p>
                      {conv.last_message.created_at && (
                        <p className="text-xs text-gray-400">
                          {formatMessageTime(conv.last_message.created_at)}
                        </p>
                      )}
                    </div>
                  )}
                  {!conv.last_message && (
                    <p className="text-xs text-gray-400 italic">No messages yet</p>
                  )}
                </button>
              ))}
          </div>

          <Separator className="my-2" />

          {/* 合并的成员/对话列表 */}
          <div className="p-2">
            <p className="text-xs font-medium text-gray-500 mb-2 px-2">DIRECT MESSAGES</p>
            {members
              .filter((m) => m.id !== userId)
              .map((member) => {
                // 查找是否已存在与该成员的对话
                const existingConv = conversations.find(
                  (c) =>
                    c.type === "p2p" &&
                    c.participants.some((p) => p.id === member.id)
                );

                if (existingConv) {
                  // 已有对话：点击打开对话，显示最后消息
                  return (
                    <button
                      key={member.id}
                      onClick={() => setSelectedConversation(existingConv)}
                      className={`w-full text-left p-3 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-3 ${
                        selectedConversation?.id === existingConv.id ? "bg-blue-50 border-l-4 border-blue-500" : ""
                      }`}
                    >
                      <div className="relative flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center font-medium">
                          {member.name[0].toUpperCase()}
                        </div>
                        <Circle
                          className={`h-3 w-3 absolute bottom-0 right-0 ${
                            member.online_state === "online"
                              ? "fill-green-500 text-green-500"
                              : "fill-gray-400 text-gray-400"
                          }`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{member.name}</p>
                        {existingConv.last_message ? (
                          <div className="space-y-0.5">
                            <p className="text-xs text-gray-700 truncate">
                              <span className="font-medium">
                                {existingConv.last_message.sender_id === userId ? "You" : member.name}:
                              </span>{" "}
                              {existingConv.last_message.content}
                            </p>
                            {existingConv.last_message.created_at && (
                              <p className="text-xs text-gray-400">
                                {formatMessageTime(existingConv.last_message.created_at)}
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400 italic">No messages yet</p>
                        )}
                      </div>
                    </button>
                  );
                } else {
                  // 无对话：点击创建新对话，显示角色
                  return (
                    <button
                      key={member.id}
                      onClick={() => handleStartP2PChat(member.id)}
                      className="w-full text-left p-3 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-3"
                    >
                      <div className="relative flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center font-medium">
                          {member.name[0].toUpperCase()}
                        </div>
                        <Circle
                          className={`h-3 w-3 absolute bottom-0 right-0 ${
                            member.online_state === "online"
                              ? "fill-green-500 text-green-500"
                              : "fill-gray-400 text-gray-400"
                          }`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{member.name}</p>
                        <p className="text-xs text-gray-500">{member.role}</p>
                      </div>
                    </button>
                  );
                }
              })}
          </div>
        </ScrollArea>
      </Card>

      {/* 右侧：消息区域 */}
      <Card className="flex-1 flex flex-col bg-white">
        {selectedConversation ? (
          <>
            {/* 消息头部 */}
            <div className="p-4 border-b bg-white">
              <h3 className="font-semibold">
                {selectedConversation.name ||
                  selectedConversation.participants
                    .filter((p) => p.id !== userId)
                    .map((p) => p.name)
                    .join(", ")}
              </h3>
              <p className="text-xs text-gray-500">
                {selectedConversation.participants.length} members
              </p>
            </div>

            {/* 消息列表 */}
            <ScrollArea className="flex-1 p-4 bg-white" style={{ height: "400px" }}>
              <div className="space-y-4">
                {messages.map((msg) => {
                  const isOwn = msg.sender.id === userId;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                    >
                      <div className={`max-w-[70%] ${isOwn ? "order-2" : "order-1"}`}>
                        {!isOwn && (
                          <p className="text-xs text-gray-500 mb-1">{msg.sender.name}</p>
                        )}
                        <div
                          className={`rounded-lg px-4 py-2 ${
                            isOwn
                              ? "bg-blue-500 text-white"
                              : "bg-gray-100 text-gray-900"
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(msg.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* 输入框 */}
            <div className="p-4 border-t bg-white">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={sending || wsStatus !== "connected"}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || sending || wsStatus !== "connected"}
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {wsStatus !== "connected" && (
                <p className="text-xs text-amber-600 mt-2">
                  Reconnecting to chat server...
                </p>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-sm">Select a conversation to start chatting</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
