/**
 * Notifications Service
 * 通知系统 API 调用
 */

interface Notification {
  id: string;
  type: string;
  message: string;
  priority: string;
  from_user_id: string;
  from_user_name: string;
  to_user_id: string;
  project_id: string;
  is_read: boolean;
  created_at: string;
}

interface NotificationsResponse {
  success: boolean;
  notifications: Notification[];
  unread_count: number;
  total_count: number;
}

interface UnreadCountResponse {
  success: boolean;
  unread_count: number;
}

/**
 * 发送通知（手动留言）
 */
export async function sendNotification(
  token: string,
  type: string,
  message: string,
  priority: string = "normal"
) {
  const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
  
  const response = await fetch(
    `${baseURL}/api/notifications/send?token=${encodeURIComponent(token)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type,
        message,
        priority,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Failed to send notification" }));
    throw new Error(error.detail || "Failed to send notification");
  }

  return response.json();
}

/**
 * 获取通知列表
 */
export async function getNotifications(
  token: string,
  unreadOnly: boolean = false
): Promise<NotificationsResponse> {
  const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
  
  const response = await fetch(
    `${baseURL}/api/notifications/list?token=${encodeURIComponent(token)}&unread_only=${unreadOnly}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Failed to fetch notifications" }));
    throw new Error(error.detail || "Failed to fetch notifications");
  }

  return response.json();
}

/**
 * 标记通知为已读
 */
export async function markNotificationRead(token: string, notificationId: string) {
  const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
  
  const response = await fetch(
    `${baseURL}/api/notifications/${notificationId}/mark-read?token=${encodeURIComponent(token)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Failed to mark notification as read" }));
    throw new Error(error.detail || "Failed to mark notification as read");
  }

  return response.json();
}

/**
 * 标记所有通知为已读
 */
export async function markAllNotificationsRead(token: string) {
  const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
  
  const response = await fetch(
    `${baseURL}/api/notifications/mark-all-read?token=${encodeURIComponent(token)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Failed to mark all notifications as read" }));
    throw new Error(error.detail || "Failed to mark all notifications as read");
  }

  return response.json();
}

/**
 * 获取未读通知数量
 */
export async function getUnreadCount(token: string): Promise<number> {
  const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
  
  const response = await fetch(
    `${baseURL}/api/notifications/unread-count?token=${encodeURIComponent(token)}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    return 0; // 静默失败，返回0
  }

  const data: UnreadCountResponse = await response.json();
  return data.unread_count;
}

export type { Notification, NotificationsResponse };
