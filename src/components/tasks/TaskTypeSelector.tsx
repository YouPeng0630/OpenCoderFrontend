import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Image as ImageIcon, 
  Video, 
  Music, 
  Link as LinkIcon,
  FileSearch,
  ChevronRight,
  FileType 
} from 'lucide-react';

interface TaskTypeStats {
  type: string;
  count: number;
  icon: React.ReactNode;
  label: string;
  description: string;
  color: string;
}

interface TaskTypeSelectorProps {
  stats: TaskTypeStats[];
  onSelectType: (type: string | null) => void;
  loading?: boolean;
}

export function TaskTypeSelector({ stats, onSelectType, loading }: TaskTypeSelectorProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const totalTasks = stats.reduce((sum, s) => sum + s.count, 0);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Select Task Type</h1>
        <p className="mt-2 text-gray-600">
          You have <span className="font-semibold text-primary">{totalTasks}</span> tasks available for annotation
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <Card
            key={stat.type}
            className={`cursor-pointer transition-all hover:shadow-lg hover:scale-105 ${
              stat.count === 0 ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            onClick={() => stat.count > 0 && onSelectType(stat.type)}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  {stat.icon}
                </div>
                <Badge variant={stat.count > 0 ? "default" : "secondary"} className="text-lg px-3 py-1">
                  {stat.count}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <CardTitle className="text-xl mb-2">{stat.label}</CardTitle>
              <CardDescription className="text-sm">
                {stat.description}
              </CardDescription>
              {stat.count > 0 && (
                <div className="flex items-center justify-end mt-4 text-primary">
                  <span className="text-sm font-medium">Start Annotating</span>
                  <ChevronRight className="h-4 w-4 ml-1" />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* All Tasks Button */}
      <Card
        className="cursor-pointer transition-all hover:shadow-lg bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200"
        onClick={() => onSelectType(null)}
      >
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-100">
                <FileSearch className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">All Tasks</h3>
                <p className="text-sm text-gray-600">Annotate tasks from all types</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge className="text-lg px-4 py-2 bg-blue-600">
                {totalTasks} total
              </Badge>
              <ChevronRight className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper function to get task type configuration
export function getTaskTypeConfig(type: string): {
  icon: React.ReactNode;
  label: string;
  description: string;
  color: string;
} {
  const iconSize = "h-6 w-6";
  
  const configs: Record<string, any> = {
    text: {
      icon: <FileText className={`${iconSize} text-gray-700`} />,
      label: "Text Tasks",
      description: "Annotate text content and documents",
      color: "bg-gray-100",
    },
    image: {
      icon: <ImageIcon className={`${iconSize} text-green-700`} />,
      label: "Image Tasks",
      description: "Annotate and label images",
      color: "bg-green-100",
    },
    video: {
      icon: <Video className={`${iconSize} text-blue-700`} />,
      label: "Video Tasks",
      description: "Annotate video content",
      color: "bg-blue-100",
    },
    audio: {
      icon: <Music className={`${iconSize} text-purple-700`} />,
      label: "Audio Tasks",
      description: "Annotate audio recordings",
      color: "bg-purple-100",
    },
    url: {
      icon: <LinkIcon className={`${iconSize} text-orange-700`} />,
      label: "URL Tasks",
      description: "Annotate web content",
      color: "bg-orange-100",
    },
    bibliographic: {
      icon: <FileSearch className={`${iconSize} text-indigo-700`} />,
      label: "Literature Tasks",
      description: "Annotate academic articles and papers",
      color: "bg-indigo-100",
    },
    pdf_document_coding: {
      icon: <FileType className={`${iconSize} text-red-700`} />,
      label: "PDF Document Coding",
      description: "Code PDF documents with document-level and passage-level annotations",
      color: "bg-red-100",
    },
  };

  return configs[type] || {
    icon: <FileText className={`${iconSize} text-gray-700`} />,
    label: type.charAt(0).toUpperCase() + type.slice(1),
    description: `Annotate ${type} tasks`,
    color: "bg-gray-100",
  };
}
