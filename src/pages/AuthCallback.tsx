import { useEffect, useState } from 'react'
import { Loader2, AlertCircle } from 'lucide-react'
import { saveAuthState, saveUser } from '@/lib/storage'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { User, UserRole } from '@/types/auth'

export function AuthCallback() {
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get token from URL parameters
        const params = new URLSearchParams(window.location.search)
        const token = params.get('token')

        if (!token) {
          throw new Error('No authentication token received')
        }

        // Save token temporarily
        const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
        saveAuthState({
          token,
          isAuthenticated: true,
          expiresAt,
        })

        // Fetch user info from backend
        const apiBaseUrl = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8000'
        const response = await fetch(`${apiBaseUrl}/auth/user?token=${encodeURIComponent(token)}`, {
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch user information: ${response.status} ${response.statusText}`)
        }

        const result = await response.json()
        console.log('Backend response:', result)
        
        // Support multiple response formats
        let userData
        if (result.success && result.data) {
          // Format 1: { success: true, data: { ... } }
          userData = result.data
        } else if (result.data) {
          // Format 2: { data: { ... } }
          userData = result.data
        } else if (result.id || result._id) {
          // Format 3: Direct user object
          userData = result
        } else {
          console.error('Unexpected response format:', result)
          throw new Error('Invalid response from server. Check console for details.')
        }

        // Transform backend user data to frontend format
        // Backend roles: "manager" | "coder" | null
        const role: UserRole | null = userData.role === 'manager' ? 'project-manager' : 
                                       userData.role === 'coder' ? 'coder' : null
        
        const user: User = {
          id: userData.id || userData._id,
          username: userData.name || userData.username,
          email: userData.email,
          role: role,
          avatar: userData.avatar_url || userData.avatarUrl || userData.avatar || '',
          project_id: userData.project_id || userData.projectId || null,  // Add project_id
        }

        console.log('Transformed user:', user)
        console.log('User project_id:', user.project_id)

        // Save user info
        saveUser(user)

        // ⭐ Use window.location.href to force page reload
        // This way AuthContext will reinitialize and read the latest user data
        console.log('✅ User info saved, redirecting...')
        
        // Redirect based on role
        if (!user.role) {
          console.log('→ Redirecting to role selection')
          window.location.href = '/role-selection'
        } else {
          const targetPath = user.role === 'project-manager' ? '/project-manager' : '/coder'
          console.log(`→ Redirecting to ${targetPath}`)
          window.location.href = targetPath
        }

      } catch (err) {
        console.error('Auth callback error:', err)
        setError(err instanceof Error ? err.message : 'Authentication failed')
      }
    }

    handleCallback()
  }, []) // Empty deps: only run once on mount

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="w-5 h-5" />
                <CardTitle>Authentication Error</CardTitle>
              </div>
              <CardDescription>
                We couldn't sign you in. Please try again.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-destructive">{error}</p>
              </div>
              <Button
                onClick={() => window.location.href = '/login'}
                className="w-full"
              >
                Back to Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Signing you in...</h2>
        <p className="text-sm text-gray-600">Please wait a moment</p>
      </div>
    </div>
  )
}
