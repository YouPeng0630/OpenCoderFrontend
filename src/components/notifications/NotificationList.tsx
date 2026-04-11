/**
 * NotificationList Component
 * 通知列表组件
 */

import { useState, useEffect } from "react";
import { CheckCheck, Trash2, AlertCircle, MessageSquare, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type Notification,
} from "@/services/notifications";

interface NotificationListProps {
  token: string;
  onNotificationRead?: () => void;
  onClose?: () => void;
}

export function NotificationList({
  token,
  onNotificationRead,
  onClose,
}: NotificationListProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const response = await getNotifications(token, filter === "unread");
      setNotifications(response.notifications);
    } catch (error) {
      console.error("Failed to load notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [token, filter]);

  const handleMarkRead = async (notificationId: string) => {
    try {
      await markNotificationRead(token, notificationId);
      await loadNotifications();
      onNotificationRead?.();
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead(token);
      await loadNotifications();
      onNotificationRead?.();
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "all_tasks_completed":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "message":
        return <MessageSquare className="h-5 w-5 text-blue-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "destructive";
      case "normal":
        return "secondary";
      case "low":
        return "outline";
      default:
        return "secondary";
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="w-full bg-white">
      {/* Header */}
      <div className="p-4 border-b bg-white">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-lg">Notifications</h3>
          {notifications.some((n) => !n.is_read) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllRead}
              className="text-xs"
            >
              <CheckCheck className="h-4 w-4 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          <Button
            variant={filter === "all" ? "default" : "ghost"}
            size="sm"
            onClick={() => setFilter("all")}
          >
            All
          </Button>
          <Button
            variant={filter === "unread" ? "default" : "ghost"}
            size="sm"
            onClick={() => setFilter("unread")}
          >
            Unread
          </Button>
        </div>
      </div>

      {/* Notifications List */}
      <ScrollArea className="h-[400px] bg-white">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-500 bg-white">
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500 bg-white">
            {filter === "unread" ? "No unread notifications" : "No notifications yet"}
          </div>
        ) : (
          <div className="divide-y bg-white">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                  !notification.is_read ? "bg-blue-50" : "bg-white"
                }`}
                onClick={() => !notification.is_read && handleMarkRead(notification.id)}
              >
                <div className="flex gap-3">
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="font-medium text-sm">
                        {notification.from_user_name}
                      </p>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {notification.priority !== "normal" && (
                          <Badge variant={getPriorityColor(notification.priority)} className="text-xs">
                            {notification.priority}
                          </Badge>
                        )}
                        {!notification.is_read && (
                          <div className="w-2 h-2 rounded-full bg-blue-500" />
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatTime(notification.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
