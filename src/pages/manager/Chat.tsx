import { useAuth } from '@/contexts/AuthContext'
import { ChatPanel } from '@/components/chat/ChatPanel'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MessageSquare } from 'lucide-react'

export function ManagerChat() {
  const { user } = useAuth()

  if (!user?.project_id) {
    return (
      <div className="max-w-7xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Team Chat
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500">Please select a project first to access team chat.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <MessageSquare className="h-6 w-6" />
          Team Chat
        </h1>
        <p className="text-gray-500 mt-1">
          Communicate with your team members in real-time
        </p>
      </div>

      <ChatPanel projectId={user.project_id} userId={user.id} />
    </div>
  )
}
