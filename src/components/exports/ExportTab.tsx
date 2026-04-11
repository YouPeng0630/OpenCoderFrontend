/**
 * Export Tab Component
 * Manager 数据导出功能
 */
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Download,
  FileText,
  Database,
  Users,
  CheckCircle,
  Loader2,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';
import { getToken } from '@/lib/storage';

interface ExportTabProps {
  projectId: string;
}

export function ExportTab({ projectId }: ExportTabProps) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleDownloadExcel = async () => {
    try {
      setDownloading(true);
      setError(null);
      setSuccess(null);

      const token = getToken();
      if (!token) {
        throw new Error('No authentication token');
      }

      const apiBaseUrl = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8000';
      const url = `${apiBaseUrl}/api/exports/${projectId}/complete-export?format=excel&token=${encodeURIComponent(token)}`;

      const response = await fetch(url);

      if (!response.ok) {
        let errorMessage = `Failed to download file (${response.status})`;
        try {
          const errorData = await response.json();
          if (errorData.detail) {
            errorMessage = errorData.detail;
          } else if (typeof errorData === 'string') {
            errorMessage = errorData;
          } else if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch {
          // 如果无法解析 JSON，使用默认错误消息
        }
        throw new Error(errorMessage);
      }

      // 获取文件内容
      const blob = await response.blob();
      
      // 创建下载链接
      const filename = `project_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      setSuccess(`Successfully downloaded: ${filename}`);
      console.log(`Downloaded: ${filename}`);
    } catch (err) {
      console.error('Download failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to download file');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* 错误提示 */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* 成功提示 */}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}

      {/* 导出卡片 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Export Project Data
          </CardTitle>
          <CardDescription>
            Download all annotations, tasks, and statistics in Excel format
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleDownloadExcel}
            disabled={downloading}
            className="w-full flex items-center justify-center gap-2 h-12"
            size="lg"
          >
            {downloading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Downloading...
              </>
            ) : (
              <>
                <Download className="h-5 w-5" />
                Download Excel
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
