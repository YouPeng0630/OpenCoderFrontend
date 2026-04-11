/**
 * Conflicts List Component
 * 显示所有有冲突的标注任务
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  CheckCircle,
  Users,
  ArrowRight,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { getToken } from '@/lib/storage';

interface ConflictsListProps {
  projectId: string;
}

interface Conflict {
  task_id: string;
  task_title: string;
  task_type: string;
  payload: any;
  my_annotation: {
    id: string;
    labels: any;
    note: string;
    completed_at: string;
  };
  other_annotation: {
    id: string;
    coder_id: string;
    coder_name: string;
    coder_email: string;
    labels: any;
    note: string;
    completed_at: string;
  };
  comparison: {
    has_conflict: boolean;
    differences: Array<{
      group_id: string;
      value1: string;
      value2: string;
      conflict: boolean;
    }>;
    agreements: Array<{
      group_id: string;
      value: string;
      conflict: boolean;
    }>;
    total_groups: number;
    conflict_count: number;
  };
  has_consensus: boolean;
  consensus_id: string | null;
}

export function ConflictsList({ projectId }: ConflictsListProps) {
  const navigate = useNavigate();
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadConflicts();
  }, [projectId]);

  const loadConflicts = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = getToken();
      if (!token) {
        throw new Error('No authentication token');
      }

      const apiBaseUrl = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(
        `${apiBaseUrl}/api/consensus/${projectId}/my-conflicts?token=${encodeURIComponent(token)}`
      );

      if (!response.ok) {
        throw new Error('Failed to load conflicts');
      }

      const data = await response.json();
      setConflicts(data.conflicts || []);
    } catch (err) {
      console.error('Load conflicts error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load conflicts');
    } finally {
      setLoading(false);
    }
  };

  const handleViewConflict = (taskId: string) => {
    navigate(`/coder/consensus/${taskId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-red-800">{error}</p>
      </div>
    );
  }

  if (conflicts.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Conflicts Found</h3>
            <p className="text-gray-600">
              All annotations are consistent or only one annotation per task.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* 统计信息 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Annotation Conflicts
          </CardTitle>
          <CardDescription>
            {conflicts.length} task{conflicts.length > 1 ? 's' : ''} with conflicting annotations
          </CardDescription>
        </CardHeader>
      </Card>

      {/* 冲突列表 */}
      {conflicts.map((conflict) => {
        // 使用后端返回的 comparison 对象
        const conflictCount = conflict.comparison?.conflict_count || 0;
        const totalGroups = conflict.comparison?.total_groups || 0;

        return (
          <Card key={conflict.task_id} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-3">
                  {/* 任务标题 */}
                  <div>
                    <h3 className="font-semibold text-lg mb-1">
                      {conflict.task_title || 'Untitled Task'}
                    </h3>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{conflict.task_type}</Badge>
                      {conflict.has_consensus && (
                        <Badge variant="default" className="bg-green-500">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Resolved
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Coders 信息 */}
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="h-4 w-4" />
                    <span>
                      You vs {conflict.other_annotation?.coder_name || 'Other coder'}
                    </span>
                  </div>

                  {/* 冲突统计 */}
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      <span className="font-medium text-amber-700">
                        {conflictCount} conflict{conflictCount > 1 ? 's' : ''}
                      </span>
                      <span className="text-gray-500">
                        / {totalGroups} tag group{totalGroups > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 操作按钮 */}
                <Button
                  onClick={() => handleViewConflict(conflict.task_id)}
                  className="flex items-center gap-2"
                >
                  {conflict.has_consensus ? 'View' : 'Resolve'}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
