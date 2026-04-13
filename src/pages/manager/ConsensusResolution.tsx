/**
 * Consensus Resolution Page
 * 协商解决标注冲突
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  CheckCircle,
  Users,
  ArrowLeft,
  Save,
  Loader2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { getToken } from '@/lib/storage';
import { useAuth } from '@/contexts/AuthContext';

/** Google Drive file id for /preview embed (same file as drive_file_url / drive_view_url). */
function getDriveFileIdForEmbed(image: NonNullable<ConflictDetail['task']['payload']['image']>): string | null {
  if (image.drive_file_id?.trim()) return image.drive_file_id.trim();
  const view = image.drive_view_url;
  const fromView = view?.match(/\/file\/d\/([^/]+)/)?.[1];
  if (fromView) return fromView;
  const u = image.drive_file_url;
  const fromQuery = u?.match(/[?&]id=([^&]+)/)?.[1];
  if (fromQuery) return decodeURIComponent(fromQuery);
  return null;
}

/**
 * URLs to try for <img src>. Order matters:
 * - uc?export=view often returns HTML (virus scan / consent), so it fails as image — put it late.
 * - lh3 + Drive thumbnail API usually return real image bytes for link-shared files.
 */
function getImageSrcCandidates(image: NonNullable<ConflictDetail['task']['payload']['image']>): string[] {
  const id = getDriveFileIdForEmbed(image);
  const out: string[] = [];
  const add = (u?: string | null) => {
    const t = typeof u === 'string' ? u.trim() : '';
    if (t && !out.includes(t)) out.push(t);
  };

  add(image.drive_cdn_url);
  if (id) add(`https://lh3.googleusercontent.com/d/${id}`);
  add(image.drive_thumbnail_url);
  add(image.drive_file_url);
  if (id) {
    add(`https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w2000`);
    add(`https://drive.google.com/uc?export=view&id=${encodeURIComponent(id)}`);
    add(`https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}`);
  }
  return out;
}

/** True when payload carries image fields. */
function getPayloadImage(payload: ConflictDetail['task']['payload']): NonNullable<ConflictDetail['task']['payload']['image']> | null {
  const img = payload?.image;
  if (!img || typeof img !== 'object') return null;
  const anyImg = img as Record<string, unknown>;
  if (
    (typeof anyImg.drive_file_url === 'string' && anyImg.drive_file_url.trim()) ||
    (typeof anyImg.drive_file_id === 'string' && anyImg.drive_file_id.trim()) ||
    (typeof anyImg.drive_view_url === 'string' && anyImg.drive_view_url.trim()) ||
    (typeof anyImg.drive_cdn_url === 'string' && anyImg.drive_cdn_url.trim())
  ) {
    return img as NonNullable<ConflictDetail['task']['payload']['image']>;
  }
  return null;
}

interface Annotation {
  annotation_id: string;
  coder_id: string;
  coder_name: string;
  coder_email: string;
  labels: Record<string, string>;
  note: string;
  completed_at: string;
}

interface TagGroup {
  name: string;
  options: Array<{
    option_id: string;
    label: string;
    order?: number;
    active?: boolean;
  } | string>; // 支持对象和字符串格式
}

interface ConflictDetail {
  task: {
    id: string;
    title: string;
    type: string;
    payload: {
      text?: string;
      url?: string;
      image_url?: string;
      image?: {
        drive_file_id?: string;
        drive_file_url: string;
        drive_cdn_url?: string;
        drive_view_url?: string;
        drive_thumbnail_url?: string;
        original_filename: string;
        file_size: number;
        mime_type: string;
      };
    };
  };
  tag_groups: Record<string, TagGroup>;
  annotations: Annotation[];
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
    conflict_count: number;
  };
}

export function ConsensusResolution() {
  const { taskId } = useParams<{ taskId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const projectId = user?.project_id;

  const [detail, setDetail] = useState<ConflictDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Consensus 选择
  const [consensusLabels, setConsensusLabels] = useState<Record<string, string>>({});
  const [consensusNote, setConsensusNote] = useState('');
  
  // 冲突列表和导航
  const [allConflicts, setAllConflicts] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (projectId) {
      loadAllConflicts();
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId && taskId) {
      loadConflictDetail();
      
      // 更新当前索引
      if (allConflicts.length > 0) {
        const index = allConflicts.indexOf(taskId);
        if (index !== -1) {
          setCurrentIndex(index);
        }
      }
    }
  }, [projectId, taskId, allConflicts]);

  const loadAllConflicts = async () => {
    try {
      const token = getToken();
      if (!token) return;

      const apiBaseUrl = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(
        `${apiBaseUrl}/api/consensus/${projectId}/my-conflicts?token=${encodeURIComponent(token)}`
      );

      if (response.ok) {
        const data = await response.json();
        const conflictIds = data.conflicts.map((c: any) => c.task_id);
        setAllConflicts(conflictIds);
        
        // 找到当前 task 的索引
        const index = conflictIds.indexOf(taskId);
        if (index !== -1) {
          setCurrentIndex(index);
        }
      }
    } catch (err) {
      console.error('Failed to load conflicts list:', err);
    }
  };

  const loadConflictDetail = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = getToken();
      if (!token) {
        throw new Error('No authentication token');
      }

      const apiBaseUrl = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(
        `${apiBaseUrl}/api/consensus/${projectId}/task/${taskId}/detail?token=${encodeURIComponent(token)}`
      );

      if (!response.ok) {
        throw new Error('Failed to load conflict detail');
      }

      const data = await response.json();
      setDetail(data);

      // 初始化 consensus 选择（使用第一个 annotation 的值作为默认）
      if (data.annotations && data.annotations.length > 0) {
        setConsensusLabels(data.annotations[0].labels);
      }
    } catch (err) {
      console.error('Load conflict detail error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load conflict detail');
    } finally {
      setLoading(false);
    }
  };

  const handleConsensusChange = (groupId: string, value: string) => {
    setConsensusLabels((prev) => ({
      ...prev,
      [groupId]: value,
    }));
  };

  const handleSubmitConsensus = async (saveAndNext = false) => {
    if (!detail || !projectId || !taskId) return;

    try {
      setSaving(true);
      setError(null);

      const token = getToken();
      if (!token) {
        throw new Error('No authentication token');
      }

      // 将 labels 转换为字符串格式 "group_id_timestamp:value;..."
      const labelsStr = Object.entries(consensusLabels)
        .map(([groupId, value]) => {
          const timestamp = Date.now();
          return `${groupId}_${timestamp}:${value}`;
        })
        .join(';');

      const apiBaseUrl = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(
        `${apiBaseUrl}/api/consensus/${projectId}/task/${taskId}/resolve?token=${encodeURIComponent(token)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            labels: labelsStr,
            note: consensusNote,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to save consensus');
      }

      setSuccess(true);
      
      // 检测用户角色，决定返回路径
      const isManagerMode = user?.role === 'project-manager';
      const returnPath = isManagerMode ? '/project-manager/dashboard' : `/coder/consensus`;
      
      if (saveAndNext) {
        // 跳转到下一个冲突
        const nextIndex = currentIndex + 1;
        if (nextIndex < allConflicts.length) {
          const nextTaskId = allConflicts[nextIndex];
          // 重置状态
          setConsensusLabels({});
          setConsensusNote('');
          setSuccess(false);
          // 导航到下一个
          const nextPath = isManagerMode 
            ? `/project-manager/consensus/${nextTaskId}` 
            : `/coder/consensus/${nextTaskId}`;
          navigate(nextPath);
        } else {
          // 没有更多冲突了，返回列表
          setTimeout(() => {
            navigate(returnPath);
          }, 1000);
        }
      } else {
        // 保存后返回列表
        setTimeout(() => {
          navigate(returnPath);
        }, 1500);
      }
    } catch (err) {
      console.error('Submit consensus error:', err);
      setError(err instanceof Error ? err.message : 'Failed to save consensus');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error && !detail) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-red-800">{error}</p>
      </div>
    );
  }

  if (!detail) return null;

  return (
    <div className="space-y-6">
      {/* 顶部导航 */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => {
            const isManagerMode = user?.role === 'project-manager';
            const returnPath = isManagerMode ? '/project-manager/dashboard' : '/coder/consensus';
            navigate(returnPath);
          }}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Conflicts
        </Button>
        
        {allConflicts.length > 0 && (
          <Badge variant="secondary" className="text-sm">
            Conflict {currentIndex + 1} of {allConflicts.length}
          </Badge>
        )}
      </div>

      {/* 错误/成功提示 */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-800">Consensus saved successfully!</p>
        </div>
      )}

      {/* 任务内容 */}
      <Card>
        <CardHeader>
          <CardTitle>Task Content</CardTitle>
          <CardDescription>
            {detail.task.title || 'Untitled'} • {detail.task.type}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {detail.task.payload.text && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm whitespace-pre-wrap">{detail.task.payload.text}</p>
            </div>
          )}
          {detail.task.payload.url && (
            <div className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4 text-gray-500" />
              <a
                href={detail.task.payload.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline"
              >
                {detail.task.payload.url}
              </a>
            </div>
          )}
          {getPayloadImage(detail.task.payload) ? (() => {
            const imgPayload = getPayloadImage(detail.task.payload)!;
            const fileId = getDriveFileIdForEmbed(imgPayload);
            const driveHref =
              imgPayload.drive_view_url ||
              imgPayload.drive_file_url ||
              (fileId ? `https://drive.google.com/file/d/${fileId}/view` : '');
            const srcCandidates = getImageSrcCandidates(imgPayload);
            const primarySrc = srcCandidates[0] ?? null;

            return (
              <div className="space-y-3">
                <div className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden flex flex-col items-center justify-center min-h-[200px]">
                  {!primarySrc ? (
                    <p className="text-sm text-gray-500 p-6 text-center">
                      No image URL in task payload.
                      {driveHref ? (
                        <>
                          {' '}
                          <a
                            href={driveHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 underline"
                          >
                            Open in Google Drive
                          </a>
                        </>
                      ) : null}
                    </p>
                  ) : (
                    <img
                      src={primarySrc}
                      alt={detail.task.title}
                      className="w-full max-h-[min(70vh,640px)] object-contain bg-white"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      data-candidate-idx="0"
                      onError={(e) => {
                        const el = e.target as HTMLImageElement;
                        let idx = parseInt(el.getAttribute('data-candidate-idx') || '0', 10);
                        console.warn('Image src failed, trying next candidate:', el.src);
                        idx += 1;
                        if (idx < srcCandidates.length) {
                          el.setAttribute('data-candidate-idx', String(idx));
                          el.src = srcCandidates[idx];
                          return;
                        }
                        el.src =
                          'data:image/svg+xml,' +
                          encodeURIComponent(
                            '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect fill="#eee" width="200" height="200"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#999" font-size="14" font-family="Arial">Image load error</text></svg>'
                          );
                      }}
                    />
                  )}
                </div>
                <div className="text-xs text-gray-500 space-y-1 px-1">
                  {imgPayload.original_filename ? <p>📁 {imgPayload.original_filename}</p> : null}
                  {typeof imgPayload.file_size === 'number' ? (
                    <p>📊 {(imgPayload.file_size / 1024).toFixed(1)} KB</p>
                  ) : null}
                  {driveHref ? (
                    <p>
                      🔗{' '}
                      <a
                        href={driveHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline"
                      >
                        View in Google Drive
                      </a>
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })() : null}
          {/* Fallback to old image_url if image object not present */}
          {!getPayloadImage(detail.task.payload) && detail.task.payload.image_url && (
            <div>
              <img
                src={detail.task.payload.image_url}
                alt="Task"
                className="max-w-full rounded-lg"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* 标注比较 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Annotation Comparison
          </CardTitle>
          <CardDescription>
            {detail.comparison.conflict_count} conflict{detail.comparison.conflict_count > 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            {detail.annotations.slice(0, 2).map((ann, idx) => (
              <div key={ann.annotation_id} className="space-y-2">
                <div className="flex items-center gap-2 mb-4">
                  <Badge variant="outline">Coder {idx + 1}</Badge>
                  <span className="text-sm font-medium">{ann.coder_name}</span>
                </div>
                {Object.entries(detail.tag_groups).map(([groupId, group]) => {
                  const value = ann.labels[groupId] || 'N/A';
                  const isDifferent = detail.comparison.differences.some(
                    (diff) => diff.group_id === groupId
                  );

                  return (
                    <div
                      key={groupId}
                      className={`p-3 rounded-lg border ${
                        isDifferent ? 'bg-amber-50 border-amber-300' : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="text-xs font-medium text-gray-600 mb-1">
                        {group.name}
                      </div>
                      <div className="text-sm font-semibold">{value}</div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Consensus 选择 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Consensus Resolution
          </CardTitle>
          <CardDescription>
            Select the agreed-upon values for each tag group
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(detail.tag_groups).map(([groupId, group]) => {
            const isDifferent = detail.comparison.differences.some(
              (diff) => diff.group_id === groupId
            );
            const currentValue = consensusLabels[groupId] || '';

            return (
              <div key={groupId} className="space-y-2">
                <Label className="flex items-center gap-2">
                  {group.name}
                  {isDifferent && (
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                  )}
                </Label>
                <div className="flex flex-wrap gap-2">
                  {group.options.map((option: any) => {
                    // 支持对象和字符串格式
                    const optionId = typeof option === 'object' ? option.option_id : option;
                    const optionLabel = typeof option === 'object' ? option.label : option;
                    
                    return (
                      <Button
                        key={optionId}
                        variant={currentValue === optionId || currentValue === optionLabel ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleConsensusChange(groupId, optionLabel)}
                      >
                        {optionLabel}
                      </Button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <div className="space-y-2">
            <Label>Consensus Note (Optional)</Label>
            <Textarea
              value={consensusNote}
              onChange={(e) => setConsensusNote(e.target.value)}
              placeholder="Add notes about the consensus decision..."
              rows={3}
            />
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => handleSubmitConsensus(false)}
              disabled={saving || success}
              variant="outline"
              className="flex-1 flex items-center justify-center gap-2"
              size="lg"
            >
              {saving ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Saving...
                </>
              ) : success ? (
                <>
                  <CheckCircle className="h-5 w-5" />
                  Saved!
                </>
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  Save
                </>
              )}
            </Button>

            <Button
              onClick={() => handleSubmitConsensus(true)}
              disabled={saving || success || currentIndex >= allConflicts.length - 1}
              className="flex-1 flex items-center justify-center gap-2"
              size="lg"
            >
              {saving ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Saving...
                </>
              ) : success ? (
                <>
                  <CheckCircle className="h-5 w-5" />
                  Saved!
                </>
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  Save & Next
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
