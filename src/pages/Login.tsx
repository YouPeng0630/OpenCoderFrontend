import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/contexts/AuthContext'
import { Chrome, Loader2 } from 'lucide-react'

export function Login() {
  const { isAuthenticated, user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isAuthenticated && user) {
      if (!user.role) {
        navigate('/role-selection', { replace: true })
      } else {
        const targetPath = user.role === 'project-manager' ? '/project-manager' : '/coder'
        navigate(targetPath, { replace: true })
      }
    }
  }, [isAuthenticated, user, navigate])

  const apiBaseUrl = (import.meta as any).env.VITE_API_BASE_URL
  const authCallbackUrl = (import.meta as any).env.VITE_AUTH_CALLBACK

  const handleLogin = () => {
    setLoading(true)
    
    // Debug: Log environment variables
    console.log('🔧 Environment Variables:')
    console.log('  API Base URL:', apiBaseUrl)
    console.log('  Auth Callback:', authCallbackUrl)
    
    const redirectUrl = `${apiBaseUrl}/auth/login?redirect_uri=${encodeURIComponent(authCallbackUrl)}`
    console.log('🔗 Redirect URL:', redirectUrl)
    
    window.location.href = redirectUrl
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Project Management Platform</h1>
          <p className="mt-2 text-sm text-gray-600">
            Professional project management and development collaboration platform
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Welcome Back</CardTitle>
            <CardDescription>
              Sign in to your account to continue with project management tasks
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-black hover:bg-gray-800 text-white"
              size="lg"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Chrome className="mr-2 h-4 w-4" />
              )}
              {loading ? 'Signing In...' : 'Sign In with Google'}
            </Button>

            <div className="text-center text-sm text-gray-500">
              <p>You'll be redirected to Google for authentication</p>
            </div>
          </CardContent>
        </Card>

        <div className="text-center text-xs text-gray-400">
          <p>© 2024 Project Management Platform. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}
