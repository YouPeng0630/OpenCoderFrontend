/**
 * Coder Consensus Page
 * 显示当前 coder 参与的冲突列表
 */
import { ConflictsList } from '@/components/consensus/ConflictsList';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

export function CoderConsensus() {
  const { user } = useAuth();
  const projectId = user?.project_id;

  if (!projectId) {
    return (
      <div className="p-4">
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Project</h3>
              <p className="text-gray-600">
                You need to be assigned to a project to view conflicts.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Annotation Conflicts</h1>
        <p className="text-gray-600 mt-2">
          Review and resolve conflicts with other coders on annotations
        </p>
      </div>
      <ConflictsList projectId={projectId} />
    </div>
  );
}
