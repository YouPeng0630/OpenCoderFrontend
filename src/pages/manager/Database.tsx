import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Database as DatabaseIcon, Save, AlertCircle } from 'lucide-react'

export function ManagerDatabase() {
  const [mongoUri, setMongoUri] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const handleSave = async () => {
    if (!mongoUri.trim()) {
      setMessage({ type: 'error', text: 'Please enter a MongoDB Atlas URI' })
      return
    }

    // Validate that it's a MongoDB Atlas URI
    if (!mongoUri.startsWith('mongodb+srv://')) {
      setMessage({ 
        type: 'error', 
        text: 'Only MongoDB Atlas URIs are allowed. URI must start with mongodb+srv://' 
      })
      return
    }

    setSaving(true)
    setMessage(null)

    try {
      // TODO: Call API to save MongoDB URI
      console.log('Saving MongoDB Atlas URI:', mongoUri)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setMessage({ type: 'success', text: 'MongoDB Atlas URI saved successfully!' })
    } catch (error) {
      console.error('Failed to save MongoDB Atlas URI:', error)
      setMessage({ type: 'error', text: 'Failed to save MongoDB Atlas URI' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Database Management</h1>
        <p className="mt-1 text-sm text-gray-500">
          Configure MongoDB Atlas connection
        </p>
      </div>

      {/* MongoDB URI Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <DatabaseIcon className="h-5 w-5 text-primary" />
            <CardTitle>MongoDB Connection</CardTitle>
          </div>
          <CardDescription>
            Enter your MongoDB Atlas URI to connect to the cloud database
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Info Box */}
          <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">MongoDB Atlas URI Format:</p>
              <code className="text-xs bg-blue-100 px-2 py-1 rounded block mt-1">
                mongodb+srv://username:password@cluster.mongodb.net/database
              </code>
              <p className="mt-2 text-xs">
                ⚠️ Only MongoDB Atlas (mongodb+srv://) URIs are accepted
              </p>
            </div>
          </div>

          {/* Input Field */}
          <div className="space-y-2">
            <Label htmlFor="mongo-uri" className="text-base font-medium">
              MongoDB Atlas URI
            </Label>
            <input
              id="mongo-uri"
              type="text"
              value={mongoUri}
              onChange={(e) => setMongoUri(e.target.value)}
              placeholder="mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/mydb"
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-mono text-sm"
            />
            <p className="text-xs text-gray-500">
              Must start with mongodb+srv:// (Atlas only)
            </p>
          </div>

          {/* Message Display */}
          {message && (
            <div
              className={`flex items-center gap-2 p-3 rounded-md ${
                message.type === 'success'
                  ? 'bg-green-50 border border-green-200 text-green-800'
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}
            >
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <p className="text-sm">{message.text}</p>
            </div>
          )}

          {/* Save Button */}
          <div className="flex justify-end pt-2">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Configuration
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Additional Info */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 mb-2">MongoDB Atlas Setup</h3>
        <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
          <li>Create a free cluster at <a href="https://www.mongodb.com/cloud/atlas" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">mongodb.com/cloud/atlas</a></li>
          <li>Add your IP address to the IP whitelist in Atlas Network Access</li>
          <li>Create a database user with read/write permissions</li>
          <li>Get your connection string from the "Connect" button in Atlas</li>
          <li>Replace <code className="text-xs bg-gray-200 px-1 rounded">&lt;password&gt;</code> with your actual password</li>
        </ul>
      </div>
    </div>
  )
}

