/**
 * LLM Service - API调用封装
 * 
 * 三个核心功能：
 * 1. 生成周报
 * 2. 生成月报
 * 3. AI标注建议
 */

const API_BASE_URL = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8000';

// ============== 类型定义 ==============

export interface WeeklyReportResponse {
  success: boolean;
  report: {
    title: string;
    period: string;
    summary: string;
    sections: {
      progress: {
        total_annotations: number;
        completion_rate: number;
        description: string;
      };
      team_performance: {
        members: Array<{
          name: string;
          annotations: number;
          performance: string;
        }>;
        top_performer: string;
        description: string;
      };
      highlights: string[];
      issues: string[];
      recommendations: string[];
    };
    conclusion: string;
  };
  metadata: {
    generated_at: string;
    model_used: string;
    cost: number;
  };
}

export interface MonthlyReportResponse {
  success: boolean;
  report: {
    title: string;
    period: string;
    summary: string;
    sections: {
      monthly_progress: {
        total_annotations: number;
        total_tasks: number;
        completion_rate: number;
        trend: string;
        description: string;
      };
      weekly_breakdown: Array<{
        week: string;
        annotations: number;
        highlights: string;
      }>;
      team_performance: {
        overall: string;
        members: Array<{
          name: string;
          annotations: number;
          growth: string;
          performance: string;
        }>;
        top_performer: string;
        most_improved: string;
      };
      quality_metrics: {
        average_quality: number;
        consistency: string;
        issues_count: number;
        description: string;
      };
      achievements: string[];
      challenges: string[];
      next_month_plan: Array<{
        goal: string;
        action: string;
      }>;
    };
    conclusion: string;
  };
  metadata: {
    generated_at: string;
    model_used: string;
    cost: number;
  };
}

export interface AnnotationResponse {
  success: boolean;
  annotation: {
    sentence: string;
    labels: Array<{
      group_id: string;
      group_name: string;
      selected: string[];
      confidence: number;
    }>;
    overall_confidence: number;
    reasoning: string;
  };
  metadata: {
    generated_at: string;
    model_used: string;
    cost: number;
  };
}

export interface TagGroup {
  group_id: string;
  group_name: string;
  type: 'single' | 'multi';
  options: Array<{
    value: string;
    label: string;
  }>;
}

// ============== API Functions ==============

/**
 * 生成周报
 */
export async function generateWeeklyReport(
  projectId: string,
  startDate: string,
  endDate: string,
  token: string
): Promise<WeeklyReportResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/llm/weekly-report?token=${encodeURIComponent(token)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        project_id: projectId,
        start_date: startDate,
        end_date: endDate,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || 'Failed to generate weekly report');
  }

  return response.json();
}

/**
 * 生成月报
 */
export async function generateMonthlyReport(
  projectId: string,
  year: number,
  month: number,
  token: string
): Promise<MonthlyReportResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/llm/monthly-report?token=${encodeURIComponent(token)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        project_id: projectId,
        year,
        month,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || 'Failed to generate monthly report');
  }

  return response.json();
}

/**
 * AI标注建议
 */
export async function getAnnotationSuggestion(
  sentence: string,
  tagGroups: TagGroup[],
  token: string
): Promise<AnnotationResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/llm/annotate?token=${encodeURIComponent(token)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sentence,
        tag_groups: tagGroups,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || 'Failed to get annotation suggestion');
  }

  return response.json();
}

/**
 * 工具函数：获取最近7天的日期范围
 */
export function getLast7Days(): { startDate: string; endDate: string } {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
  };
}

/**
 * 工具函数：获取上个月的年月
 */
export function getLastMonth(): { year: number; month: number } {
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  
  return {
    year: lastMonth.getFullYear(),
    month: lastMonth.getMonth() + 1, // JavaScript月份是0-based
  };
}
