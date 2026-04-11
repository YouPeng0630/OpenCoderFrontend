/**
 * Analytics Tab Component
 * 标签统计和数据可视化
 */
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp,
  Tags,
  Loader2,
  BarChart3,
  PieChart as PieChartIcon,
  RefreshCw,
} from 'lucide-react';
import { getToken } from '@/lib/storage';
import { Button } from '@/components/ui/button';

interface TagData {
  tag_value: string;
  tag_label: string;
  count: number;
}

interface GroupData {
  group_id: string;
  group_name: string;
  type: string;
  total_annotations: number;
  tags: TagData[];
}

interface TagStatistics {
  by_group: GroupData[];
  total_annotations: number;
  unique_tags: number;
  tag_groups_count: number;
}

interface AnalyticsTabProps {
  projectId: string;
}

// 图表颜色
const COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#84cc16', // lime
  '#6366f1', // indigo
];

export function AnalyticsTab({ projectId }: AnalyticsTabProps) {
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState<TagStatistics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStatistics = async () => {
    try {
      setRefreshing(true);
      setError(null);

      const token = getToken();
      if (!token) {
        throw new Error('No authentication token');
      }

      const apiBaseUrl = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(
        `${apiBaseUrl}/api/dashboard/${projectId}/analytics/tag-statistics?token=${encodeURIComponent(token)}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch statistics');
      }

      const result = await response.json();
      if (result.success) {
        setStatistics(result.statistics);
      } else {
        throw new Error('Failed to load statistics');
      }
    } catch (err) {
      console.error('Failed to fetch tag statistics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load statistics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStatistics();
  }, [projectId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-[400px]">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">Loading analytics...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-[400px]">
          <div className="text-center">
            <p className="text-sm text-red-600 mb-4">❌ {error}</p>
            <Button onClick={fetchStatistics} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!statistics || statistics.by_group.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-[400px]">
          <div className="text-center">
            <Tags className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">No annotation data available</p>
            <p className="text-xs text-muted-foreground mt-1">
              Start annotating tasks to see statistics
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* 顶部统计卡片 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Annotations</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.total_annotations}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tag Groups</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.tag_groups_count}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Tags</CardTitle>
            <Tags className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.unique_tags}</div>
          </CardContent>
        </Card>
      </div>

      {/* 按Tag Group展示图表 */}
      {statistics.by_group.map((group, groupIdx) => (
        <Card key={group.group_id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {group.group_name}
                  <Badge variant="secondary">{group.type}</Badge>
                </CardTitle>
                <CardDescription>
                  Total: {group.total_annotations} annotations across {group.tags.length} tags
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="bar" className="w-full">
              <TabsList>
                <TabsTrigger value="bar">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Bar Chart
                </TabsTrigger>
                <TabsTrigger value="pie">
                  <PieChartIcon className="h-4 w-4 mr-2" />
                  Pie Chart
                </TabsTrigger>
              </TabsList>

              <TabsContent value="bar" className="mt-4">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={group.tags}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="tag_label"
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      interval={0}
                    />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" fill={COLORS[groupIdx % COLORS.length]} name="Count" />
                  </BarChart>
                </ResponsiveContainer>
              </TabsContent>

              <TabsContent value="pie" className="mt-4">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={group.tags}
                      dataKey="count"
                      nameKey="tag_label"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={(entry) => `${entry.tag_label}: ${entry.count}`}
                    >
                      {group.tags.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </TabsContent>
            </Tabs>

            {/* 详细数据表格 */}
            <div className="mt-6">
              <h4 className="text-sm font-semibold mb-3">Detailed Statistics</h4>
              <div className="grid gap-2">
                {group.tags.map((tag, idx) => (
                  <div
                    key={tag.tag_value}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                      />
                      <span className="font-medium">{tag.tag_label}</span>
                      <Badge variant="outline" className="text-xs">
                        {tag.tag_value}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-600">
                        {((tag.count / group.total_annotations) * 100).toFixed(1)}%
                      </span>
                      <Badge className="font-semibold">{tag.count}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
