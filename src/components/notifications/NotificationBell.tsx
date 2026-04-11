/**
 * NotificationBell Component
 * 通知铃铛组件 - 显示在Manager界面右上角
 */

import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { NotificationList } from "./NotificationList";
import { getUnreadCount } from "@/services/notifications";
import { getToken } from "@/lib/storage";

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  // 获取 token
  useEffect(() => {
    const currentToken = getToken();
    setToken(currentToken);
  }, []);

  // 加载未读数量
  const loadUnreadCount = async () => {
    if (!token) return;
    
    try {
      const count = await getUnreadCount(token);
      setUnreadCount(count);
    } catch (error) {
      console.error("Failed to load unread count:", error);
    }
  };

  // 初始加载和定时刷新
  useEffect(() => {
    if (!token) return;
    
    loadUnreadCount();
    
    // 每30秒刷新一次未读数量
    const interval = setInterval(loadUnreadCount, 30000);
    
    return () => clearInterval(interval);
  }, [token]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0 bg-white border-gray-200" align="end" sideOffset={8}>
        {token && (
          <NotificationList
            token={token}
            onNotificationRead={loadUnreadCount}
            onClose={() => setIsOpen(false)}
          />
        )}
      </PopoverContent>
    </Popover>
  );
}
