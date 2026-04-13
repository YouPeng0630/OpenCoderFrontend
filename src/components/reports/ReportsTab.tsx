/**
 * Reports Tab - Simple weekly summary using LLM
 */
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, Calendar } from 'lucide-react';
import { getToken } from '@/lib/storage';

interface ReportsTabProps {
  projectId: string;
}

interface WeeklySummary {
  summary: string;
  generated_at: string;
}

export function ReportsTab({ projectId }: ReportsTabProps) {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<WeeklySummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateWeeklySummary = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = getToken();
      if (!token) {
        throw new Error('No authentication token');
      }

      const apiBaseUrl = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(
        `${apiBaseUrl}/api/llm/weekly-summary?project_id=${projectId}&token=${encodeURIComponent(token)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to generate summary');
      }

      const data = await response.json();
      setSummary({
        summary: data.summary || data.report?.summary || 'No summary available',
        generated_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Generate summary error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate weekly summary');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Weekly Progress Summary
          </CardTitle>
          <CardDescription>
            AI-generated summary of this week's annotation progress
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={generateWeeklySummary}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Generating summary...
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5" />
                Generate Weekly Summary
              </>
            )}
          </Button>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {summary && (
            <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
              <div className="prose prose-sm max-w-none">
                <p className="text-gray-800 whitespace-pre-line leading-relaxed">
                  {summary.summary}
                </p>
              </div>
              <div className="mt-4 pt-4 border-t border-blue-200">
                <p className="text-xs text-gray-500">
                  Generated at {new Date(summary.generated_at).toLocaleString()}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
