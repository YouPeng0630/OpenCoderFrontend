/**
 * Team Progress Tab Component for Manager
 * 显示团队成员标注进度对比
 */
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Users,
  Loader2,
  TrendingUp,
} from 'lucide-react';
import { getToken } from '@/lib/storage';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface CoderStat {
  coder_id: string;
  coder_name: string;
  coder_email: string;
  total_annotations: number;
  unique_tasks_completed: number;
}

interface TeamData {
  project_id: string;
  team_stats: CoderStat[];
}

interface TeamProgressTabProps {
  projectId: string;
}

export function TeamProgressTab({ projectId }: TeamProgressTabProps) {
  const [loading, setLoading] = useState(true);
  const [teamData, setTeamData] = useState<TeamData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchTeamData = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = getToken();
      if (!token) {
        throw new Error('No authentication token');
      }

      const apiBaseUrl = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(
        `${apiBaseUrl}/api/dashboard/${projectId}/coders?token=${encodeURIComponent(token)}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch team data');
      }

      const data = await response.json();
      
      const teamStats = data.coders.map((coder: any) => ({
        coder_id: coder.coder_id,
        coder_name: coder.name || 'Unknown',
        coder_email: coder.email || '',
        total_annotations: coder.total_annotations || 0,
        unique_tasks_completed: coder.unique_tasks || 0,
      }));

      // 按标注数量排序（降序）
      teamStats.sort((a: CoderStat, b: CoderStat) => b.total_annotations - a.total_annotations);

      setTeamData({
        project_id: projectId,
        team_stats: teamStats
      });
    } catch (err) {
      console.error('Failed to fetch team data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load team data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamData();
  }, [projectId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-sm text-gray-500">Loading team progress...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-sm text-red-600 mb-4">{error}</p>
        </div>
      </div>
    );
  }

  if (!teamData || teamData.team_stats.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-sm text-gray-500">No team data available</p>
      </div>
    );
  }

  const totalAnnotations = teamData.team_stats.reduce((sum, s) => sum + s.total_annotations, 0);

  // 为图表准备数据
  const chartData = teamData.team_stats.map(stat => ({
    name: stat.coder_name,
    annotations: stat.total_annotations,
  }));

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-600" />
            Team Total
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <div className="text-3xl font-bold text-blue-600">{totalAnnotations}</div>
            <p className="text-xs text-muted-foreground">Total Annotations</p>
          </div>
          <div className="pt-2 border-t">
            <p className="text-xs text-gray-600">
              {teamData.team_stats.length} team member{teamData.team_stats.length > 1 ? 's' : ''}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 团队成员对比图 */}
      <Card>
        <CardHeader>
          <CardTitle>Team Comparison</CardTitle>
          <CardDescription>
            Annotations completed by each team member
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={chartData}
              layout="horizontal"
              margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                angle={-45}
                textAnchor="end"
                height={100}
                interval={0}
                tick={{ fontSize: 12 }}
              />
              <YAxis />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="rounded-lg border bg-white p-3 shadow-sm">
                        <div className="text-sm font-medium mb-2">
                          {data.name}
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-gray-500">Annotations:</span>
                            <span className="font-medium">{data.annotations}</span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar
                dataKey="annotations"
                name="Annotations"
                radius={[8, 8, 0, 0]}
                fill="hsl(221, 83%, 53%)"
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
