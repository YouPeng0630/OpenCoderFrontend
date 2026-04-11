/**
 * Reports Tab Component - CSV Export
 * 下载所有标注数据
 */
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Download,
  Loader2,
  CheckCircle,
  AlertCircle,
  FileText
} from 'lucide-react';
import { getToken } from '@/lib/storage';

interface ReportsTabProps {
  projectId: string;
}

export function ReportsTab({ projectId }: ReportsTabProps) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleDownloadCSV = async () => {
    try {
      setDownloading(true);
      setError(null);
      setSuccess(null);

      const token = getToken();
      if (!token) {
        throw new Error('No authentication token');
      }

      const apiBaseUrl = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8000';
      const url = `${apiBaseUrl}/api/exports/${projectId}/annotations/csv?token=${encodeURIComponent(token)}`;

      const response = await fetch(url);

      if (!response.ok) {
        let errorMessage = `Failed to download file (${response.status})`;
        try {
          const errorData = await response.json();
          if (errorData.detail) {
            errorMessage = errorData.detail;
          }
        } catch {
          // 无法解析 JSON，使用默认错误
        }
        throw new Error(errorMessage);
      }

      // 获取文件内容
      const blob = await response.blob();
      
      // 创建下载链接
      const filename = `annotations_${new Date().toISOString().split('T')[0]}.csv`;
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      setSuccess(`Downloaded: ${filename}`);
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

      {/* 下载卡片 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Download Annotations
          </CardTitle>
          <CardDescription>
            Export all annotation data as CSV file
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleDownloadCSV}
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
                Download CSV
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
