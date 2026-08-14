/**
 * Fire-and-forget activity logging to the backend.
 * Failures are swallowed so UX is never blocked.
 */

import { getToken } from "@/lib/storage";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export type ActivityPayload = {
  action: string;
  summary: string;
  projectId?: string | null;
  resourceType?: string;
  resourceId?: string;
  meta?: Record<string, unknown>;
};

export function logActivity(payload: ActivityPayload): void {
  const token = getToken();
  if (!token) return;

  const body = {
    action: payload.action,
    summary: payload.summary,
    project_id: payload.projectId || null,
    resource_type: payload.resourceType || null,
    resource_id: payload.resourceId || null,
    meta: payload.meta || {},
  };

  // Fire and forget
  void fetch(`${API_BASE_URL}/api/activity-logs?token=${encodeURIComponent(token)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    keepalive: true,
  }).catch(() => {
    /* ignore */
  });
}
