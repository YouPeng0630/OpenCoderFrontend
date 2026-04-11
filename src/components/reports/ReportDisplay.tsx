/**
 * 报告展示组件
 * 用于展示周报和月报
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, TrendingUp, AlertCircle, Lightbulb, Award, Target } from 'lucide-react';
import type { WeeklyReportResponse, MonthlyReportResponse } from '@/services/llm';

interface ReportDisplayProps {
  report: WeeklyReportResponse['report'] | MonthlyReportResponse['report'];
  type: 'weekly' | 'monthly';
  metadata?: {
    generated_at: string;
    model_used: string;
    cost: number;
  };
}

export function ReportDisplay({ report, type, metadata }: ReportDisplayProps) {
  const isMonthly = type === 'monthly';
  const monthlyReport = isMonthly ? (report as MonthlyReportResponse['report']) : null;

  return (
    <div className="space-y-6">
      {/* 报告标题 */}
      <div className="border-b pb-4">
        <h2 className="text-3xl font-bold text-gray-900">{report.title}</h2>
        <div className="flex items-center gap-4 mt-2">
          <p className="text-sm text-gray-500">{report.period}</p>
          {metadata && (
            <>
              <Badge variant="outline" className="text-xs">
                {metadata.model_used}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                Cost: ${metadata.cost.toFixed(4)}
              </Badge>
            </>
          )}
        </div>
      </div>

      {/* Executive Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-primary" />
            Executive Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 leading-relaxed">{report.summary}</p>
        </CardContent>
      </Card>

      {/* Progress Statistics */}
      {!isMonthly && 'progress' in report.sections && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Progress Statistics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600">Total Annotations</p>
                <p className="text-2xl font-bold text-blue-600">
                  {report.sections.progress.total_annotations}
                </p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600">Completion Rate</p>
                <p className="text-2xl font-bold text-green-600">
                  {report.sections.progress.completion_rate}%
                </p>
              </div>
            </div>
            <p className="text-gray-700 mt-4">{report.sections.progress.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Monthly Progress (Monthly Report Only) */}
      {isMonthly && monthlyReport && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Monthly Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600">Total Annotations</p>
                <p className="text-2xl font-bold text-blue-600">
                  {monthlyReport.sections.monthly_progress.total_annotations}
                </p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-gray-600">Total Tasks</p>
                <p className="text-2xl font-bold text-purple-600">
                  {monthlyReport.sections.monthly_progress.total_tasks}
                </p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600">Completion Rate</p>
                <p className="text-2xl font-bold text-green-600">
                  {monthlyReport.sections.monthly_progress.completion_rate}%
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <Badge variant={
                monthlyReport.sections.monthly_progress.trend === 'increasing' || monthlyReport.sections.monthly_progress.trend === '上升' ? 'default' :
                monthlyReport.sections.monthly_progress.trend === 'decreasing' || monthlyReport.sections.monthly_progress.trend === '下降' ? 'destructive' : 'secondary'
              }>
                Trend: {monthlyReport.sections.monthly_progress.trend}
              </Badge>
            </div>
            <p className="text-gray-700 mt-4">
              {monthlyReport.sections.monthly_progress.description}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Team Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-yellow-600" />
            Team Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-yellow-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">🏆 Top Performer</p>
            <p className="text-lg font-semibold text-yellow-700">
              {report.sections.team_performance.top_performer}
            </p>
          </div>

          {isMonthly && monthlyReport && monthlyReport.sections.team_performance.most_improved && (
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">📈 Most Improved</p>
              <p className="text-lg font-semibold text-green-700">
                {monthlyReport.sections.team_performance.most_improved}
              </p>
            </div>
          )}

          <div className="space-y-2 mt-4">
            {report.sections.team_performance.members.map((member, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{member.name}</p>
                  <p className="text-sm text-gray-600">{member.performance}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{member.annotations}</p>
                  <p className="text-xs text-gray-500">Annotations</p>
                  {isMonthly && 'growth' in member && (
                    <Badge variant="outline" className="mt-1 text-xs">
                      {member.growth}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>

          <p className="text-gray-700 mt-4">{report.sections.team_performance.description}</p>
        </CardContent>
      </Card>

      {/* Weekly Breakdown (Monthly Report Only) */}
      {isMonthly && monthlyReport && monthlyReport.sections.weekly_breakdown && (
        <Card>
          <CardHeader>
            <CardTitle>Weekly Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {monthlyReport.sections.weekly_breakdown.map((week, idx) => (
                <div key={idx} className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                  <p className="text-sm font-medium text-gray-700">{week.week}</p>
                  <p className="text-2xl font-bold text-blue-600 my-2">{week.annotations}</p>
                  <p className="text-xs text-gray-600">{week.highlights}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quality Metrics (Monthly Report Only) */}
      {isMonthly && monthlyReport && monthlyReport.sections.quality_metrics && (
        <Card>
          <CardHeader>
            <CardTitle>Quality Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-green-50 rounded-lg text-center">
                <p className="text-sm text-gray-600">Average Quality</p>
                <p className="text-3xl font-bold text-green-600">
                  {monthlyReport.sections.quality_metrics.average_quality}
                </p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg text-center">
                <p className="text-sm text-gray-600">Consistency</p>
                <p className="text-lg font-semibold text-blue-600">
                  {monthlyReport.sections.quality_metrics.consistency}
                </p>
              </div>
              <div className="p-4 bg-orange-50 rounded-lg text-center">
                <p className="text-sm text-gray-600">Issues Count</p>
                <p className="text-3xl font-bold text-orange-600">
                  {monthlyReport.sections.quality_metrics.issues_count}
                </p>
              </div>
            </div>
            <p className="text-gray-700 mt-4">
              {monthlyReport.sections.quality_metrics.description}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Highlights */}
      {report.sections.highlights && report.sections.highlights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Highlights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {report.sections.highlights.map((highlight, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">{highlight}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Achievements (Monthly Report Only) */}
      {isMonthly && monthlyReport && monthlyReport.sections.achievements && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-600" />
              Key Achievements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {monthlyReport.sections.achievements.map((achievement, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <Award className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">{achievement}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Issues/Challenges */}
      {report.sections.issues && report.sections.issues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              {isMonthly ? 'Challenges' : 'Issues'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {(isMonthly && monthlyReport ? monthlyReport.sections.challenges : report.sections.issues).map((issue, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">{issue}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {report.sections.recommendations && report.sections.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-blue-600" />
              {isMonthly ? 'Next Month Plan' : 'Recommendations'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isMonthly && monthlyReport && monthlyReport.sections.next_month_plan ? (
              <div className="space-y-3">
                {monthlyReport.sections.next_month_plan.map((plan, idx) => (
                  <div key={idx} className="p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Target className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-gray-900">{plan.goal}</p>
                        <p className="text-sm text-gray-600 mt-1">{plan.action}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <ul className="space-y-2">
                {report.sections.recommendations.map((recommendation, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <Lightbulb className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{recommendation}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {/* Conclusion */}
      <Card className="border-2 border-primary">
        <CardHeader>
          <CardTitle>Conclusion</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 leading-relaxed font-medium">{report.conclusion}</p>
        </CardContent>
      </Card>
    </div>
  );
}
