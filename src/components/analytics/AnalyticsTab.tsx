/**
 * Analytics Tab — label distribution + intercoder reliability (tasks with 2+ distinct coders)
 */
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  Users,
  Scale,
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

interface ReliabilityGroupRow {
  group_id: string;
  group_name: string;
  type: string;
  eligible_tasks: number;
  unanimous_tasks: number;
  percent_agreement: number | null;
  mean_pairwise_agreement_percent: number | null;
  two_rater_tasks: number;
  cohens_kappa: number | null;
}

interface IntercoderReliability {
  tasks_with_two_plus_coders: number;
  description: string;
  by_group: ReliabilityGroupRow[];
}

interface ConsensusStatistics {
  total_conflicts: number;
  resolved_conflicts: number;
  unresolved_conflicts: number;
  resolution_rate: number;
}

interface AnalyticsTabProps {
  projectId: string;
}

const COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#f97316',
  '#84cc16',
  '#6366f1',
];

export function AnalyticsTab({ projectId }: AnalyticsTabProps) {
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState<TagStatistics | null>(null);
  const [reliability, setReliability] = useState<IntercoderReliability | null>(null);
  const [consensus, setConsensus] = useState<ConsensusStatistics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = async () => {
    try {
      setRefreshing(true);
      setError(null);

      const token = getToken();
      if (!token) {
        throw new Error('No authentication token');
      }

      const apiBaseUrl = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8000';
      const tagUrl = `${apiBaseUrl}/api/dashboard/${projectId}/analytics/tag-statistics?token=${encodeURIComponent(token)}`;
      const relUrl = `${apiBaseUrl}/api/exports/${projectId}/intercoder-reliability?token=${encodeURIComponent(token)}`;
      const consUrl = `${apiBaseUrl}/api/dashboard/${projectId}/analytics/consensus-statistics?token=${encodeURIComponent(token)}`;

      const [tagRes, relRes, consRes] = await Promise.all([fetch(tagUrl), fetch(relUrl), fetch(consUrl)]);

      if (tagRes.ok) {
        const tagJson = await tagRes.json();
        if (tagJson.success) {
          setStatistics(tagJson.statistics);
        } else {
          setStatistics(null);
        }
      } else {
        setStatistics(null);
      }

      if (relRes.ok) {
        const relJson = await relRes.json();
        if (relJson.success) {
          setReliability(relJson.reliability);
        } else {
          setReliability(null);
        }
      } else {
        setReliability(null);
      }

      if (consRes.ok) {
        const consJson = await consRes.json();
        if (consJson.success) {
          setConsensus(consJson.statistics);
        } else {
          setConsensus(null);
        }
      } else {
        setConsensus(null);
      }

      if (!tagRes.ok && !relRes.ok && !consRes.ok) {
        throw new Error('Failed to load analytics');
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAll();
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

  if (error && !statistics && !reliability) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-[400px]">
          <div className="text-center">
            <p className="text-sm text-red-600 mb-4">❌ {error}</p>
            <Button onClick={fetchAll} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasTagCharts = statistics && statistics.by_group.length > 0;
  const hasReliability =
    reliability &&
    (reliability.tasks_with_two_plus_coders > 0 || reliability.by_group.length > 0);
  const hasConsensus = consensus !== null;

  if (!hasTagCharts && !hasReliability && !hasConsensus) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button onClick={fetchAll} variant="outline" size="sm" disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        <Card>
          <CardContent className="flex items-center justify-center h-[320px]">
            <div className="text-center">
              <Tags className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">No analytics data yet</p>
              <p className="text-xs text-muted-foreground mt-2 max-w-md">
                Label charts need annotations. Intercoder metrics need the same task annotated by at least two
                different coders (latest annotation per coder per task).
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={fetchAll} variant="outline" size="sm" disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue={hasTagCharts ? 'labels' : hasReliability ? 'intercoder' : 'consensus'} className="w-full">
        <TabsList>
          <TabsTrigger value="labels">
            <BarChart3 className="h-4 w-4 mr-2" />
            Label distribution
          </TabsTrigger>
          <TabsTrigger value="intercoder">
            <Users className="h-4 w-4 mr-2" />
            Intercoder reliability
          </TabsTrigger>
          <TabsTrigger value="consensus">
            <Scale className="h-4 w-4 mr-2" />
            Consensus
          </TabsTrigger>
        </TabsList>

        <TabsContent value="labels" className="space-y-6 mt-4">
          {!hasTagCharts && (
            <Card>
              <CardContent className="flex items-center justify-center py-16">
                <p className="text-sm text-muted-foreground">No label distribution data yet.</p>
              </CardContent>
            </Card>
          )}
          {hasTagCharts && statistics && (
            <>
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
            </>
          )}
        </TabsContent>

        <TabsContent value="intercoder" className="space-y-4 mt-4">
          {reliability && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Scale className="h-5 w-5 text-primary" />
                    Intercoder reliability
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-4">
                    <div className="rounded-lg border bg-muted/40 px-4 py-3">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        Tasks (≥2 coders)
                      </p>
                      <p className="text-2xl font-semibold tabular-nums">
                        {reliability.by_group.length > 0 ? reliability.by_group[0].eligible_tasks : 0}
                      </p>
                    </div>
                  </div>

                  {reliability.tasks_with_two_plus_coders === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No tasks have annotations from two or more different coders. Assign the same task to multiple
                      coders and collect labels to see agreement and Cohen&apos;s κ.
                    </p>
                  ) : reliability.by_group.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Multi-coder tasks exist, but no overlapping tag-group labels yet for analysis.
                    </p>
                  ) : (
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tag group</TableHead>
                            <TableHead className="text-right">Agreement %</TableHead>
                            <TableHead className="text-right">Cohen&apos;s κ</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {reliability.by_group.map((row) => (
                            <TableRow key={row.group_id}>
                              <TableCell className="font-medium">{row.group_name}</TableCell>
                              <TableCell className="text-right tabular-nums">
                                {row.percent_agreement != null ? `${row.percent_agreement}%` : '—'}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {row.cohens_kappa != null ? row.cohens_kappa : '—'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="consensus" className="space-y-4 mt-4">
          {consensus && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scale className="h-5 w-5 text-primary" />
                  Consensus Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-lg border bg-muted/40 p-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                      Total Conflicts
                    </p>
                    <p className="text-3xl font-bold tabular-nums text-orange-600">
                      {consensus.total_conflicts}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Tasks with disagreements
                    </p>
                  </div>
                  
                  <div className="rounded-lg border bg-muted/40 p-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                      Resolved Conflicts
                    </p>
                    <p className="text-3xl font-bold tabular-nums text-green-600">
                      {consensus.resolved_conflicts}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Reached consensus
                    </p>
                  </div>
                </div>

                {consensus.total_conflicts === 0 && (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">
                      No annotation conflicts detected. All tasks either have only one annotation or coders are in complete agreement.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
