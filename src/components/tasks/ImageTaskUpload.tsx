/**
 * ImageTaskUpload Component
 * 图片任务上传组件
 */

import { useState } from "react";
import { Upload, Image as ImageIcon, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getToken } from "@/lib/storage";

interface ImageTaskUploadProps {
  projectId: string;
  onSuccess: () => void;
  onCancel?: () => void;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export function ImageTaskUpload({ projectId, onSuccess, onCancel }: ImageTaskUploadProps) {
  const [title, setTitle] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>("");

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (PNG, JPG, GIF, WebP)');
      return;
    }

    // 验证文件大小 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image size must be less than 10MB');
      return;
    }

    setSelectedFile(file);
    
    // 生成预览
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setPreview("");
    setError("");
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select an image');
      return;
    }

    setUploading(true);
    setError("");
    const token = getToken();

    if (!token) {
      setError('Not authenticated. Please login again.');
      setUploading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('title', title.trim() || selectedFile.name);
      formData.append('image', selectedFile);
      formData.append('tags', JSON.stringify([]));

      const response = await fetch(
        `${API_BASE_URL}/api/projects/${projectId}/tasks/upload-image?token=${encodeURIComponent(token)}`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Upload failed' }));
        throw new Error(errorData.detail || 'Upload failed');
      }

      const result = await response.json();
      console.log('✅ Image task created:', result);
      
      // 清空表单
      setTitle("");
      setSelectedFile(null);
      setPreview("");
      
      // 通知父组件
      onSuccess();
      
    } catch (error: any) {
      console.error('Upload error:', error);
      
      const errorMessage = error.message || 'Failed to upload image task. Please try again.';
      
      // 检查是否是 Google 凭证问题
      if (errorMessage.includes('credentials') || errorMessage.includes('Drive access')) {
        setError(`🔐 Google Drive Authorization Required\n\n${errorMessage}\n\n📝 Steps to fix:\n1. Click your profile icon (top right)\n2. Select "Sign out"\n3. Visit: https://myaccount.google.com/permissions\n4. Remove "OpenCoder" access\n5. Login again with Google\n6. Grant Google Drive permission`);
      } else {
        setError(errorMessage);
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          Upload Image Task
        </h3>
        {onCancel && (
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      <div className="space-y-4">
        {/* 任务标题（可选） */}
        <div>
          <Label htmlFor="task-title">Task Title (Optional)</Label>
          <Input
            id="task-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Leave empty to use image filename"
            className="mt-1"
            disabled={uploading}
          />
          <p className="text-xs text-gray-500 mt-1">
            If not provided, the image filename will be used as the task title
          </p>
        </div>

        {/* 图片上传区域 */}
        <div>
          <Label>Image File *</Label>
          <div className="mt-2">
            {!selectedFile ? (
              <>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="image-upload"
                  disabled={uploading}
                />
                <label
                  htmlFor="image-upload"
                  className={`flex items-center justify-center w-full h-48 border-2 border-dashed rounded-lg transition-colors ${
                    uploading 
                      ? 'border-gray-200 cursor-not-allowed' 
                      : 'border-gray-300 cursor-pointer hover:border-primary hover:bg-gray-50'
                  }`}
                >
                  <div className="text-center">
                    <Upload className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                    <p className="text-sm font-medium text-gray-700 mb-1">
                      Click to upload image
                    </p>
                    <p className="text-xs text-gray-500">
                      PNG, JPG, GIF, WebP up to 10MB
                    </p>
                  </div>
                </label>
              </>
            ) : (
              <div className="relative border-2 border-gray-200 rounded-lg overflow-hidden">
                <img 
                  src={preview} 
                  alt="Preview" 
                  className="w-full h-64 object-contain bg-gray-50" 
                />
                {!uploading && (
                  <button
                    onClick={handleRemoveFile}
                    className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
                <div className="p-2 bg-gray-50 border-t">
                  <p className="text-xs text-gray-600 truncate">
                    {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800 font-medium mb-2">⚠️ Upload Failed</p>
            <div className="text-sm text-red-700 whitespace-pre-wrap">{error}</div>
            {error.includes('credentials') && (
              <a
                href="https://myaccount.google.com/permissions"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-3 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700 transition-colors"
              >
                Open Google Permissions →
              </a>
            )}
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex gap-2">
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="flex-1"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading to Google Drive...
              </>
            ) : (
              <>
                <ImageIcon className="h-4 w-4 mr-2" />
                Create Image Task
              </>
            )}
          </Button>
          
          {onCancel && (
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={uploading}
            >
              Cancel
            </Button>
          )}
        </div>

        {/* 提示信息 */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-700">
            💡 Images will be stored in Manager's Google Drive and automatically shared with all project members.
          </p>
        </div>
      </div>
    </Card>
  );
}
