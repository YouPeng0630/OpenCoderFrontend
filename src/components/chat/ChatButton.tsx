/**
 * ChatButton Component
 * 浮动聊天按钮 - 用于 Coder 页面
 */

import { useState } from "react";
import { MessageSquare, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChatPanel } from "./ChatPanel";

interface ChatButtonProps {
  projectId: string;
  userId: string;
}

export function ChatButton({ projectId, userId }: ChatButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50 w-[600px] h-[600px]">
        <Card className="h-full flex flex-col">
          <div className="p-3 border-b flex items-center justify-between bg-primary text-white rounded-t-lg">
            <h3 className="font-semibold flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Team Chat
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-white/20 rounded p-1 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <ChatPanel projectId={projectId} userId={userId} />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <Button
      onClick={() => setIsOpen(true)}
      className="fixed bottom-4 right-4 z-50 h-14 w-14 rounded-full shadow-lg"
      size="icon"
    >
      <MessageSquare className="h-6 w-6" />
    </Button>
  );
}
