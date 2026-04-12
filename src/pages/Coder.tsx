import React, { useState, useEffect, useCallback, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getToken } from '@/lib/storage';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import { Check, Circle } from 'lucide-react';
import { 
  Save, 
  AlertCircle,
  Loader2,
  CheckCircle,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { MessageManagerDialog } from '@/components/notifications/MessageManagerDialog';
import { ChatButton } from '@/components/chat/ChatButton';

interface Task {
  id: string;
  title: string;
  task_type?: 'text' | 'url' | 'image';
  payload: {
    text?: string;
    image?: {
      drive_file_id?: string;
      drive_file_url: string;
      drive_cdn_url?: string;  // Google CDN URL (备选，更快)
      drive_view_url?: string;
      drive_thumbnail_url?: string;
      original_filename: string;
      file_size: number;
      mime_type: string;
    };
    [key: string]: any;
  };
  status: string;
  tags: { [key: string]: any };
  created_at: string;
}

interface TagOption {
  value: string;
  label: string;
  color?: string;
  description?: string;
}

interface TagGroup {
  _id: string;
  group_id: string;
  name: string;
  description?: string;
  type: 'single' | 'multi';
  required: boolean;
  order?: number;
  active?: boolean;
  options: TagOption[];
  constraints?: {
    min_selections?: number;
    max_selections?: number;
  };
}

interface CoderProps {
  noLayout?: boolean;  // Optional prop to skip PageLayout wrapper
}

/** Google Drive file id for /preview embed (same file as drive_file_url / drive_view_url). */
function getDriveFileIdForEmbed(image: NonNullable<Task['payload']['image']>): string | null {
  if (image.drive_file_id?.trim()) return image.drive_file_id.trim();
  const view = image.drive_view_url;
  const fromView = view?.match(/\/file\/d\/([^/]+)/)?.[1];
  if (fromView) return fromView;
  const u = image.drive_file_url;
  const fromQuery = u?.match(/[?&]id=([^&]+)/)?.[1];
  if (fromQuery) return decodeURIComponent(fromQuery);
  return null;
}

/** True when payload carries image fields (covers next_task missing task_type after submit-and-next). */
function getPayloadImage(task: Task | null): NonNullable<Task['payload']['image']> | null {
  const img = task?.payload?.image;
  if (!img || typeof img !== 'object') return null;
  const anyImg = img as Record<string, unknown>;
  if (
    (typeof anyImg.drive_file_url === 'string' && anyImg.drive_file_url.trim()) ||
    (typeof anyImg.drive_file_id === 'string' && anyImg.drive_file_id.trim()) ||
    (typeof anyImg.drive_view_url === 'string' && anyImg.drive_view_url.trim()) ||
    (typeof anyImg.drive_cdn_url === 'string' && anyImg.drive_cdn_url.trim())
  ) {
    return img as NonNullable<Task['payload']['image']>;
  }
  return null;
}

/**
 * URLs to try for <img src>. Order matters:
 * - uc?export=view often returns HTML (virus scan / consent), so it fails as image — put it late.
 * - lh3 + Drive thumbnail API usually return real image bytes for link-shared files.
 */
function getImageSrcCandidates(image: NonNullable<Task['payload']['image']>): string[] {
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

function mapApiTaskToTask(task: Record<string, any>): Task {
  const payload = task.payload || { text: '' };
  const inferredImage =
    payload.image && typeof payload.image === 'object' && Object.keys(payload.image).length > 0;
  const taskType =
    task.task_type ||
    task.taskType ||
    (inferredImage ? 'image' : 'text');
  return {
    id: task._id || task.id,
    title: task.title || 'Untitled Task',
    task_type: taskType as Task['task_type'],
    payload,
    status: task.status || 'in_progress',
    tags: task.tags || {},
    created_at: task.created_at || task.createdAt || new Date().toISOString(),
  };
}

export const Coder: React.FC<CoderProps> = ({ noLayout = false }) => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [tagGroups, setTagGroups] = useState<TagGroup[]>([]);
  const [selectedTags, setSelectedTags] = useState<{ [groupId: string]: string[] }>({});
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loadingAISuggestion, setLoadingAISuggestion] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<{
    confidence: number;
    reasoning: string;
  } | null>(null);

  const apiBaseUrl = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8000';

  // Check user application status across all projects
  const checkApplicationStatus = useCallback(async (): Promise<'approved' | 'pending' | 'none'> => {
    try {
      const token = localStorage.getItem('auth_state');
      if (!token) return 'none';
      
      const authState = JSON.parse(token);
      
      console.log('🔍 Checking application status across all projects...');
      
      // Fetch all projects
      const projectsResponse = await fetch(
        `${apiBaseUrl}/api/projects?token=${encodeURIComponent(authState.token)}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      );
      
      if (!projectsResponse.ok) {
        console.log('  ❌ Failed to fetch projects:', projectsResponse.status);
        return 'none';
      }
      
      const projectsData = await projectsResponse.json();
      const projects = projectsData.items || projectsData.projects || projectsData.data || projectsData || [];
      
      console.log(`  📋 Found ${projects.length} projects, checking applications...`);
      
      // Check each project for user's applications
      for (const project of projects) {
        const projectId = project.id || project._id;
        if (!projectId) continue;
        
        try {
          const appsResponse = await fetch(
            `${apiBaseUrl}/api/projects/${projectId}/applications?token=${encodeURIComponent(authState.token)}&limit=100`,
            {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' },
            }
          );
          
          if (appsResponse.ok) {
            const appsData = await appsResponse.json();
            console.log(`  📦 Raw API response for project ${projectId}:`, appsData);
            console.log(`  📦 Response keys:`, Object.keys(appsData));
            
            const applicationsList = appsData.items || appsData.applications || appsData.data || [];
            console.log(`  📋 Parsed applications list:`, applicationsList);
            console.log(`  📋 Applications count:`, applicationsList.length);
            
            // Log first application structure for debugging
            if (applicationsList.length > 0) {
              console.log(`  📋 First application structure:`, applicationsList[0]);
              console.log(`  📋 Available fields:`, Object.keys(applicationsList[0]));
            }
            
            // Find user's application by user_id (most reliable since email may not be returned)
            console.log(`  🔍 Looking for applications matching user ID: ${user?.id}`);
            console.log(`  🔍 Looking for applications matching user email: ${user?.email}`);
            const userApplications = applicationsList.filter((app: any) => {
              const appUserId = app.applicant_user_id || app.applicantUserId || app.user_id || app.userId;
              const appEmail = app.applicant_email || app.applicantEmail || app.email;
              
              console.log(`    - Checking app:`, {
                appUserId,
                appEmail,
                userIdMatch: appUserId === user?.id,
                emailMatch: appEmail === user?.email,
                willMatch: appUserId === user?.id || appEmail === user?.email
              });
              
              return appUserId === user?.id || appEmail === user?.email;
            });
            
            if (userApplications.length > 0) {
              const latestApp = userApplications[0];
              const status = latestApp.status;
              
              console.log(`  ✅ Found application in project ${projectId}:`, status);
              
              // Save to localStorage for ApplicationPending page
              const appId = latestApp._id || latestApp.id;
              if (appId) localStorage.setItem('application_id', appId);
              if (projectId) localStorage.setItem('applied_project_id', projectId);
              
              // Return status
              if (status === 'approved') {
                console.log('  ✨ Application approved! Updating user data...');
                
                // Update user's project_id in localStorage
                const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
                console.log('  📋 Current user before update:', currentUser);
                console.log('  📋 Current user project_id before:', currentUser.project_id);
                
                currentUser.project_id = projectId;
                localStorage.setItem('user', JSON.stringify(currentUser));
                
                // Verify the update
                const verifyUser = JSON.parse(localStorage.getItem('user') || '{}');
                console.log('  📋 Current user after update:', currentUser);
                console.log('  📋 Verified user from localStorage:', verifyUser);
                console.log('  📋 Verified project_id:', verifyUser.project_id);
                console.log('  💾 Saved to localStorage successfully!');
                
                return 'approved';
              } else if (status === 'pending') {
                return 'pending';
              }
            }
          }
        } catch (error) {
          console.log(`  ⚠️ Error checking project ${projectId}:`, error);
          continue;
        }
      }
      
      console.log('  ❌ No application found');
      return 'none';
      
    } catch (error) {
      console.error('  ❌ Error checking applications:', error);
      return 'none';
    }
  }, [user, apiBaseUrl]);

  // Wrap fetchTaskAndTags in useCallback to prevent re-creation
  const fetchTaskAndTags = useCallback(async () => {
    if (!user?.project_id) {
      console.log('⚠️ No project_id, skipping fetch');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const token = getToken();
      if (!token) {
        console.error('❌ No authentication token');
        throw new Error('No authentication token');
      }

      console.log('📡 Fetching next task for project:', user.project_id);

      // Use the new /my-next-task endpoint
      const response = await fetch(
        `${apiBaseUrl}/api/projects/${user.project_id}/my-next-task?token=${encodeURIComponent(token)}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (response.status === 404) {
        // No more tasks
        console.log('🎉 No more tasks available');
        setCurrentTask(null);
        setTagGroups([]);
        setLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch next task: ${response.status}`);
      }

      const data = await response.json();
      console.log('📦 Received task data:', data);

      // Transform task
      const task = data.task;
      if (task) {
        const transformedTask = mapApiTaskToTask(task);
        setCurrentTask(transformedTask);
        setSelectedTags({});  // Reset tags for new task
        console.log('✅ Current task loaded:', transformedTask.id, 'type:', transformedTask.task_type);
      } else {
        console.log('⚠️ No task in response');
        setCurrentTask(null);
      }

      // Set tag groups (already included in response)
      const groups = data.tag_groups || [];
      setTagGroups(groups);
      console.log('✅ Tag groups loaded:', groups.length);
      
      console.log('✅ Data loading complete:', {
        hasTask: !!task,
        hasTagGroups: groups.length > 0,
        projectId: user.project_id
      });
      
      // Debug: Log tag groups structure
      console.log('📋 Tag groups structure:', groups);
      if (groups.length > 0) {
        console.log('📋 First group options:', groups[0].options);
        console.log('📋 First option keys:', groups[0].options?.[0] ? Object.keys(groups[0].options[0]) : 'N/A');
      }

    } catch (error) {
      console.error('❌ Failed to load data:', error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to load data',
      });
    } finally {
      console.log('🏁 Setting loading to false');
      setLoading(false);
    }
  }, [user?.project_id, apiBaseUrl]);

  // Check if user has a project or application - run only once on mount or when project_id changes
  useEffect(() => {
    console.log('🔄 useEffect triggered, user state:', {
      hasUser: !!user,
      project_id: user?.project_id,
      email: user?.email
    });

    const checkUserStatus = async () => {
      if (!user?.project_id) {
        console.log('⚠️ Coder has no project, checking application status...');
        
        // Check application status across all projects
        const status = await checkApplicationStatus();
        
        if (status === 'approved') {
          console.log('✨ Application approved! Refreshing user context...');
          // Refresh user from localStorage (project_id was updated by checkApplicationStatus)
          refreshUser();
          // The useEffect will re-run with new project_id and load the annotation interface
        } else if (status === 'pending') {
          console.log('⏳ Application pending, redirecting to pending page...');
          navigate('/coder/pending', { replace: true });
        } else {
          console.log('📝 No application found, redirecting to apply page...');
          navigate('/coder/apply', { replace: true });
        }
      } else {
        console.log('✅ Coder has project:', user.project_id, '- loading annotation interface...');
        fetchTaskAndTags();
      }
    };
    
    checkUserStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.project_id]); // Only re-run when project_id changes

  const handleTagChange = (groupId: string, optionValue: string, groupType: 'single' | 'multi') => {
    console.log('🏷️ Tag changed:', { groupId, optionValue, groupType });
    
    setSelectedTags((prev) => {
      const newTags = { ...prev };
      
      if (groupType === 'single') {
        // Single selection: replace with new value
        newTags[groupId] = [optionValue];
      } else {
        // Multiple selection: toggle
        const current = newTags[groupId] || [];
        if (current.includes(optionValue)) {
          newTags[groupId] = current.filter((id) => id !== optionValue);
        } else {
          newTags[groupId] = [...current, optionValue];
        }
      }
      
      console.log('🏷️ Updated tags:', newTags);
      return newTags;
    });
  };

  const validateAnnotation = (): string | null => {
    // Check required tag groups
    for (const group of tagGroups) {
      if (group.required) {
        const selected = selectedTags[group.group_id] || [];
        if (selected.length === 0) {
          return `Please select at least one option for "${group.name}" (required)`;
        }
      }
    }
    return null;
  };

  const handleGetAISuggestion = async () => {
    if (!currentTask || !user?.project_id) {
      setMessage({ type: 'error', text: 'No task available' });
      return;
    }

    try {
      setLoadingAISuggestion(true);
      setMessage(null);
      setAiSuggestion(null);

      const token = getToken();
      if (!token) throw new Error('No authentication token');

      console.log('🤖 Getting AI suggestion...');

      // 准备tag_groups数据
      const tagGroupsForAI = tagGroups.map(group => ({
        group_id: group.group_id,
        group_name: group.name,
        type: group.type,
        options: group.options.map(opt => ({
          value: (opt as any).option_id || opt.value || opt.label,
          label: opt.label
        }))
      }));

      const response = await fetch(
        `${apiBaseUrl}/api/llm/annotate?token=${encodeURIComponent(token)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sentence: currentTask.payload.text,
            tag_groups: tagGroupsForAI
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData?.detail || `Failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ AI suggestion received:', result);

      if (result.success) {
        // Auto-fill AI suggested labels
        const suggestions: { [groupId: string]: string[] } = {};
        result.annotation.labels.forEach((label: any) => {
          suggestions[label.group_id] = label.selected;
        });

        setSelectedTags(suggestions);
        setAiSuggestion({
          confidence: result.annotation.overall_confidence,
          reasoning: result.annotation.reasoning
        });

        setMessage({
          type: 'success',
          text: `AI suggestions applied (confidence: ${(result.annotation.overall_confidence * 100).toFixed(0)}%)`
        });
      }
    } catch (error) {
      console.error('❌ Failed to get AI suggestion:', error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to get AI suggestion'
      });
    } finally {
      setLoadingAISuggestion(false);
    }
  };

  const handleSave = async () => {
    if (!currentTask || !user?.project_id) {
      alert('No task to save');
      return;
    }

    // Validate
    const validationError = validateAnnotation();
    if (validationError) {
      setMessage({ type: 'error', text: validationError });
      return;
    }

    try {
      setSaving(true);
      setMessage(null);

      const token = getToken();
      if (!token) throw new Error('No authentication token');

      console.log('💾 Submitting annotation and fetching next task...');
      console.log('📋 Current selectedTags:', selectedTags);
      
      // Convert selectedTags object to labels array format with tag names
      // Instead of saving option_ids, we save the actual option labels for better readability
      const labelsArray = Object.entries(selectedTags).map(([group_id, option_values]) => {
        // Find the tag group
        const tagGroup = tagGroups.find(g => g.group_id === group_id);
        
        if (!tagGroup) {
          console.warn(`⚠️ Tag group ${group_id} not found`);
          return {
            group_id,
            option_ids: Array.isArray(option_values) ? option_values : [option_values]
          };
        }
        
        // Convert option values (IDs) to option labels
        const optionIds = Array.isArray(option_values) ? option_values : [option_values];
        const optionLabels = optionIds.map(optionValue => {
          const option = tagGroup.options.find(opt => {
            const optVal = (opt as any).option_id || opt.value || opt.label;
            return optVal === optionValue;
          });
          
          if (!option) {
            console.warn(`⚠️ Option ${optionValue} not found in group ${group_id}`);
            return optionValue; // Fallback to the value itself
          }
          
          // Return the label (human-readable name) instead of the ID
          return option.label;
        });
        
        return {
          group_id,
          option_ids: optionLabels  // Now contains labels like "Positive", "School" instead of IDs
        };
      });
      
      console.log('📋 Converted to labels array (with names):', labelsArray);
      console.log('📋 Full request body:', {
        task_id: currentTask.id,
        labels: labelsArray,
        notes: note.trim() || undefined,
      });

      // Use the new /submit-and-next endpoint
      const response = await fetch(
        `${apiBaseUrl}/api/projects/${user.project_id}/submit-and-next?token=${encodeURIComponent(token)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            task_id: currentTask.id,
            labels: labelsArray,
            notes: note.trim() || undefined,
          }),
        }
      );

      console.log('📡 Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error response:', errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { detail: errorText };
        }
        
        throw new Error(errorData?.detail || errorData?.message || `Failed to save: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Annotation submitted:', result);
      console.log('✅ Response structure:', {
        has_more: result.has_more,
        hasNextTask: !!result.next_task,
        submittedId: result.submitted?.annotation_id
      });
      
      // Verify that the backend updated the task status
      console.log('🔍 Verifying task status update (backend should have done this)...');
      if (result.submitted?.task_id) {
        console.log(`   Previous task ${result.submitted.task_id} should now be marked as "completed" by backend`);
      }

      setMessage({
        type: 'success',
        text: 'Annotation saved successfully!',
      });

      // Check if there are more tasks
      if (result.has_more && result.next_task) {
        console.log('📝 Loading next task...');
        
        // Load next task from response
        setTimeout(() => {
          const nextTask = result.next_task.task;
          if (nextTask) {
            const transformedTask = mapApiTaskToTask(nextTask);
            setCurrentTask(transformedTask);
            setTagGroups(result.next_task.tag_groups || []);
            setSelectedTags({});
            setNote('');
            setMessage(null);
          }
        }, 1500);
      } else {
        console.log('🎉 All tasks completed!');
        setTimeout(() => {
          setCurrentTask(null);
          setTagGroups([]);
          setSelectedTags({});
          setNote('');
          setMessage({
            type: 'success',
            text: '🎉 All tasks completed!',
          });
        }, 1500);
      }

    } catch (error) {
      console.error('❌ Failed to save annotation:', error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to save annotation',
      });
    } finally {
      setSaving(false);
    }
  };

  const ContentWrapper: React.FC<{ children: ReactNode }> = ({ children }) => {
    return noLayout ? <>{children}</> : <PageLayout>{children}</PageLayout>;
  };

  if (loading) {
    return (
      <ContentWrapper>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-gray-500">Loading annotation interface...</p>
          </div>
        </div>
      </ContentWrapper>
    );
  }

  if (!currentTask) {
    return (
      <ContentWrapper>
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">All Caught Up!</h2>
              <p className="text-gray-500 text-center mb-6">
                You have no assigned tasks at the moment.<br />
                Check back later or contact your project manager.
              </p>
            </CardContent>
          </Card>
        </div>
      </ContentWrapper>
    );
  }

  return (
    <ContentWrapper>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Page Header with Message Button */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Task Annotation</h1>
            <p className="text-sm text-gray-500 mt-1">Complete your assigned tasks</p>
          </div>
          <MessageManagerDialog />
        </div>

        {/* Message Display */}
        {message && (
          <div
            className={`flex items-center gap-2 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}
          >
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm font-medium">{message.text}</p>
          </div>
        )}

        {/* Task Display */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                Current Task
                <ChevronRight className="h-5 w-5 text-gray-400" />
                <span className="text-sm font-normal text-gray-500">#{currentTask.id.slice(-6)}</span>
              </CardTitle>
              <Badge variant="secondary">Assigned</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {getPayloadImage(currentTask) ? (() => {
              const imgPayload = getPayloadImage(currentTask)!;
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
                      alt={currentTask.title}
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
            })() : (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-base text-gray-900 whitespace-pre-wrap leading-relaxed">
                  {currentTask.payload.text ?? ''}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Annotation Form */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Annotation Tags</CardTitle>
                <CardDescription>
                  Select appropriate tags for this task. Fields marked with * are required.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                onClick={handleGetAISuggestion}
                disabled={loadingAISuggestion}
                className="flex items-center gap-2"
              >
              {loadingAISuggestion ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Get AI Suggestion
                </>
              )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* AI Suggestion Display */}
            {aiSuggestion && (
              <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border-2 border-blue-200">
                <div className="flex items-start gap-3">
                  <Sparkles className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-blue-900">AI Suggestion</span>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        Confidence: {(aiSuggestion.confidence * 100).toFixed(0)}%
                      </Badge>
                    </div>
                    <p className="text-sm text-blue-700 leading-relaxed">
                      {aiSuggestion.reasoning}
                    </p>
                  </div>
                </div>
              </div>
            )}
            {tagGroups.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <AlertCircle className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                <p>No tag groups configured for this project.</p>
              </div>
            ) : (
              tagGroups.map((group) => (
                <div key={group._id} className="space-y-3">
                  <Label className="text-base font-semibold text-gray-900">
                    {group.name}
                    {group.required && <span className="text-red-500 ml-1">*</span>}
                    <span className="ml-2 text-xs font-normal text-gray-500">
                      ({group.type === 'single' ? 'Single choice' : 'Multiple choice'})
                    </span>
                  </Label>
                  {group.description && (
                    <p className="text-sm text-gray-500 -mt-2">{group.description}</p>
                  )}

                  {group.type === 'single' ? (
                    // Radio buttons for single selection
                    <RadioGroupPrimitive.Root
                      value={selectedTags[group.group_id]?.[0] || ''}
                      onValueChange={(value: string) => {
                        console.log('📻 Radio change event:', { group_id: group.group_id, value });
                        handleTagChange(group.group_id, value, 'single');
                      }}
                      className="space-y-2"
                    >
                      {group.options.map((option) => {
                        const optionValue = (option as any).option_id || option.value || option.label;
                        return (
                        <div key={optionValue} className="flex items-center space-x-3">
                          <RadioGroupPrimitive.Item
                            value={optionValue}
                            id={`radio-${group.group_id}-${optionValue}`}
                            className="aspect-square h-4 w-4 rounded-full border border-primary text-primary ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
                              <Circle className="h-2.5 w-2.5 fill-current text-current" />
                            </RadioGroupPrimitive.Indicator>
                          </RadioGroupPrimitive.Item>
                          <label
                            htmlFor={`radio-${group.group_id}-${optionValue}`}
                            className="text-sm text-gray-700 cursor-pointer font-normal flex-1"
                          >
                            <span>{option.label}</span>
                            {option.description && (
                              <span className="text-xs text-gray-400 ml-2">- {option.description}</span>
                            )}
                          </label>
                        </div>
                      )})}
                    </RadioGroupPrimitive.Root>
                  ) : (
                    // Checkboxes for multiple selection
                    <div className="space-y-2">
                      {group.options.map((option) => {
                        const optionValue = (option as any).option_id || option.value || option.label;
                        return (
                        <div key={optionValue} className="flex items-center space-x-3">
                          <CheckboxPrimitive.Root
                            checked={(selectedTags[group.group_id] || []).includes(optionValue)}
                            onCheckedChange={() => handleTagChange(group.group_id, optionValue, 'multi')}
                            id={`check-${group.group_id}-${optionValue}`}
                            className="h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                          >
                            <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
                              <Check className="h-4 w-4" />
                            </CheckboxPrimitive.Indicator>
                          </CheckboxPrimitive.Root>
                          <label
                            htmlFor={`check-${group.group_id}-${optionValue}`}
                            className="text-sm text-gray-700 cursor-pointer font-normal flex-1"
                          >
                            <span>{option.label}</span>
                            {option.description && (
                              <span className="text-xs text-gray-400 ml-2">- {option.description}</span>
                            )}
                          </label>
                        </div>
                      )})}
                    </div>
                  )}
                </div>
              ))
            )}

            {/* Note Section */}
            <div className="space-y-2 pt-4 border-t">
              <Label htmlFor="note" className="text-base font-semibold text-gray-900">
                Additional Notes (Optional)
              </Label>
              <textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add any observations, concerns, or comments about this task..."
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm resize-none"
              />
              <p className="text-xs text-gray-500">{note.length} characters</p>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-4 border-t">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Annotation
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 浮动聊天按钮 */}
      {user?.id && user?.project_id && (
        <ChatButton projectId={user.project_id} userId={user.id} />
      )}
    </ContentWrapper>
  );
};
