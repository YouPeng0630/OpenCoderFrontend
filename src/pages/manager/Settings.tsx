import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { getToken } from '@/lib/storage'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  AlertCircle,
  CheckCircle2,
  Database as DatabaseIcon,
  KeyRound,
  Loader2,
  Save,
  Settings as SettingsIcon,
  Sparkles,
} from 'lucide-react'

/** Models available only after the project adds its own OpenRouter API key */
const UNLOCKED_MODELS = [
  'openai/gpt-4o-mini',
  'openai/gpt-4o',
  'anthropic/claude-3.5-haiku',
  'anthropic/claude-3.5-sonnet',
  'google/gemini-2.0-flash-001',
  'meta-llama/llama-3.3-70b-instruct',
]

interface ProjectSettings {
  cluster_uri?: string
  cluster_uri_masked?: string | null
  has_cluster_uri?: boolean
  llm_enabled?: boolean
  openrouter_api_key_masked?: string | null
  has_openrouter_api_key?: boolean
  llm_model?: string
  annotation_model?: string
  defaults?: {
    llm_model: string
    annotation_model: string
    server_has_openrouter_key: boolean
    basic_model?: string
  }
}

export function ManagerSettings() {
  const { user } = useAuth()
  const apiBase = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8000'

  const [loading, setLoading] = useState(true)
  const [savingDb, setSavingDb] = useState(false)
  const [savingAi, setSavingAi] = useState(false)
  const [checkingKey, setCheckingKey] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [keyCheck, setKeyCheck] = useState<{
    type: 'success' | 'error' | 'warn'
    text: string
  } | null>(null)
  const [settings, setSettings] = useState<ProjectSettings | null>(null)

  const [mongoUri, setMongoUri] = useState('')
  const [llmEnabled, setLlmEnabled] = useState(true)
  const [apiKey, setApiKey] = useState('')
  const [llmModel, setLlmModel] = useState('')
  const [annotationModel, setAnnotationModel] = useState('')

  const load = useCallback(async () => {
    if (!user?.project_id) {
      setLoading(false)
      return
    }
    setLoading(true)
    setMessage(null)
    try {
      const token = getToken()
      const res = await fetch(
        `${apiBase}/api/projects/${user.project_id}/settings?token=${encodeURIComponent(token || '')}`
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(typeof err.detail === 'string' ? err.detail : `HTTP ${res.status}`)
      }
      const data: ProjectSettings = await res.json()
      setSettings(data)
      setMongoUri(data.cluster_uri || '')
      setLlmEnabled(data.llm_enabled !== false)
      setLlmModel(data.llm_model || '')
      setAnnotationModel(data.annotation_model || '')
      setApiKey('')
      setKeyCheck(null)
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message || 'Failed to load settings' })
    } finally {
      setLoading(false)
    }
  }, [apiBase, user?.project_id])

  useEffect(() => {
    load()
  }, [load])

  const patchSettings = async (body: Record<string, unknown>) => {
    const token = getToken()
    const res = await fetch(
      `${apiBase}/api/projects/${user!.project_id}/settings?token=${encodeURIComponent(token || '')}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    )
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(typeof err.detail === 'string' ? err.detail : `HTTP ${res.status}`)
    }
  }

  const saveDatabase = async () => {
    const uri = mongoUri.trim()
    if (uri && !uri.startsWith('mongodb+srv://')) {
      setMessage({
        type: 'error',
        text: 'Only MongoDB Atlas URIs are allowed (must start with mongodb+srv://)',
      })
      return
    }
    setSavingDb(true)
    setMessage(null)
    try {
      await patchSettings({ cluster_uri: uri })
      setMessage({ type: 'success', text: 'Database settings saved.' })
      await load()
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message || 'Failed to save database settings' })
    } finally {
      setSavingDb(false)
    }
  }

  const saveAi = async () => {
    setSavingAi(true)
    setMessage(null)
    try {
      const body: Record<string, unknown> = {
        llm_enabled: llmEnabled,
        llm_model: llmModel.trim(),
        annotation_model: annotationModel.trim(),
      }
      if (apiKey.trim()) {
        body.openrouter_api_key = apiKey.trim()
      }
      await patchSettings(body)
      setMessage({ type: 'success', text: 'AI settings saved.' })
      await load()
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message || 'Failed to save AI settings' })
    } finally {
      setSavingAi(false)
    }
  }

  const checkApiKey = async () => {
    setCheckingKey(true)
    setKeyCheck(null)
    try {
      const token = getToken()
      const res = await fetch(
        `${apiBase}/api/projects/${user!.project_id}/settings/verify-openrouter-key?token=${encodeURIComponent(token || '')}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ openrouter_api_key: apiKey.trim() || null }),
        }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(typeof data.detail === 'string' ? data.detail : `HTTP ${res.status}`)
      }
      if (!data.valid) {
        setKeyCheck({ type: 'error', text: data.message || 'API key is not valid.' })
      } else if (!data.eligible) {
        setKeyCheck({
          type: 'warn',
          text: data.message || 'Key is valid but has no remaining credits.',
        })
      } else {
        setKeyCheck({ type: 'success', text: data.message || 'API key is valid and eligible.' })
      }
    } catch (e: any) {
      setKeyCheck({ type: 'error', text: e.message || 'Failed to check API key' })
    } finally {
      setCheckingKey(false)
    }
  }

  if (!user?.project_id) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-white px-6 py-16 text-center text-sm text-gray-500">
        No active project. Enter a project from the Hub first.
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  const defaults = settings?.defaults
  const basicModel = defaults?.basic_model || defaults?.annotation_model || 'openai/gpt-4o-mini'
  const hasOwnKey = Boolean(settings?.has_openrouter_api_key)
  const unlockingKey = Boolean(apiKey.trim())
  const modelsUnlocked = hasOwnKey || unlockingKey

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold text-gray-900">
          <SettingsIcon className="h-7 w-7" />
          Settings
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Project database connection and AI / OpenRouter configuration
        </p>
      </div>

      {message && (
        <div
          className={`flex items-center gap-2 rounded-md p-3 ${
            message.type === 'success'
              ? 'border border-green-200 bg-green-50 text-green-800'
              : 'border border-red-200 bg-red-50 text-red-800'
          }`}
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p className="text-sm">{message.text}</p>
        </div>
      )}

      {/* Database */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <DatabaseIcon className="h-5 w-5 text-primary" />
            <CardTitle>MongoDB Connection</CardTitle>
          </div>
          <CardDescription>
            Optional project Atlas URI (mongodb+srv://). Leave empty to use the server default database.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
            <div className="text-sm text-blue-800">
              <p className="mb-1 font-medium">MongoDB Atlas URI Format:</p>
              <code className="mt-1 block rounded bg-blue-100 px-2 py-1 text-xs">
                mongodb+srv://username:password@cluster.mongodb.net/database
              </code>
              <p className="mt-2 text-xs">Only MongoDB Atlas (mongodb+srv://) URIs are accepted.</p>
            </div>
          </div>

          {settings?.has_cluster_uri && settings.cluster_uri_masked && (
            <p className="text-xs text-gray-500">
              Currently saved: <span className="font-mono">{settings.cluster_uri_masked}</span>
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="mongo-uri">MongoDB Atlas URI</Label>
            <input
              id="mongo-uri"
              type="password"
              autoComplete="off"
              value={mongoUri}
              onChange={(e) => setMongoUri(e.target.value)}
              placeholder="mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/mydb"
              className="w-full rounded-md border border-gray-300 px-4 py-3 font-mono text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <h3 className="mb-2 font-medium text-gray-900">MongoDB Atlas Setup</h3>
            <ul className="list-inside list-disc space-y-1 text-sm text-gray-600">
              <li>Create a free cluster at mongodb.com/cloud/atlas</li>
              <li>Add your IP to the Atlas Network Access whitelist</li>
              <li>Create a database user with read/write permissions</li>
              <li>Copy the connection string from Connect in Atlas</li>
              <li>Replace &lt;password&gt; with the real password</li>
            </ul>
          </div>

          <div className="flex justify-end">
            <Button onClick={saveDatabase} disabled={savingDb} className="gap-2">
              {savingDb ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Database
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* AI / OpenRouter */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle>AI / OpenRouter</CardTitle>
          </div>
          <CardDescription>
            Control whether AI coding suggestions are available for this project, and optionally bring your
            own OpenRouter key.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-start gap-3 rounded-lg border border-violet-200 bg-violet-50 p-4">
            <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-violet-700" />
            <div className="space-y-2 text-sm text-violet-950">
              <p className="font-medium">Why add an API key?</p>
              <p>
                OpenCoder includes a <strong>basic built-in model</strong> (
                <span className="font-mono text-xs">{basicModel}</span>) for Get AI Suggestion, covered by
                the platform’s shared quota when available.
              </p>
              <p>
                Add your own <strong>OpenRouter API key</strong> to unlock more models (GPT-4o, Claude,
                Gemini, Llama, and any OpenRouter model id). Usage then bills against{' '}
                <strong>your own token quota</strong> — not the platform’s — so your team can scale AI
                coding without shared limits.
              </p>
              <p className="text-xs text-violet-800">
                Get a key at{' '}
                <a
                  href="https://openrouter.ai/keys"
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-2"
                >
                  openrouter.ai/keys
                </a>
                .
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
            <div className="min-w-0">
              <Label htmlFor="llm-enabled" className="text-sm font-medium text-gray-900">
                Enable AI features
              </Label>
              <p className="mt-0.5 text-xs text-gray-500">
                When off, Get AI Suggestion is unavailable for everyone in this project.
              </p>
            </div>
            <Switch
              id="llm-enabled"
              checked={llmEnabled}
              onCheckedChange={setLlmEnabled}
              aria-label="Enable AI features"
            />
          </div>

          {!llmEnabled && (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              AI is currently disabled. Turn it on above and save to allow Get AI Suggestion again.
            </p>
          )}

          <div className={`space-y-5 ${!llmEnabled ? 'pointer-events-none opacity-50' : ''}`}>
            <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600">
              {modelsUnlocked ? (
                <>
                  Custom models unlocked with your API key. Calls use{' '}
                  <span className="font-medium">your OpenRouter quota</span>.
                </>
              ) : (
                <>
                  No project key yet — only the basic model{' '}
                  <span className="font-mono">{basicModel}</span> is available (platform quota).
                </>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="or-key" className="flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5" />
                OpenRouter API Key
              </Label>
              {settings?.has_openrouter_api_key && (
                <p className="text-xs text-gray-500">
                  Saved key: <span className="font-mono">{settings.openrouter_api_key_masked}</span>
                </p>
              )}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Input
                  id="or-key"
                  type="password"
                  autoComplete="new-password"
                  disabled={!llmEnabled}
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value)
                    setKeyCheck(null)
                  }}
                  placeholder="sk-or-v1-… (leave blank to keep current)"
                  className="sm:flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={!llmEnabled || checkingKey || (!apiKey.trim() && !hasOwnKey)}
                  onClick={checkApiKey}
                  className="gap-2 shrink-0"
                >
                  {checkingKey ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Check key
                </Button>
              </div>
              <p className="text-[11px] text-gray-400">
                Checks eligibility via OpenRouter <span className="font-mono">GET /api/v1/key</span>.
                Leave blank and click Check to test the saved key.
              </p>
              {keyCheck && (
                <div
                  className={`rounded-md border px-3 py-2 text-xs ${
                    keyCheck.type === 'success'
                      ? 'border-green-200 bg-green-50 text-green-800'
                      : keyCheck.type === 'warn'
                        ? 'border-amber-200 bg-amber-50 text-amber-900'
                        : 'border-red-200 bg-red-50 text-red-800'
                  }`}
                >
                  {keyCheck.text}
                </div>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="llm-model">Default LLM model</Label>
                <Input
                  id="llm-model"
                  list="llm-model-options"
                  disabled={!llmEnabled || !modelsUnlocked}
                  value={modelsUnlocked ? llmModel : basicModel}
                  onChange={(e) => setLlmModel(e.target.value)}
                  placeholder={basicModel}
                />
                <datalist id="llm-model-options">
                  {UNLOCKED_MODELS.map((m) => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
                <p className="text-[11px] text-gray-400">
                  {modelsUnlocked
                    ? 'Used for general LLM calls when set.'
                    : 'Locked to basic model until you add an API key.'}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ann-model">Annotation model</Label>
                <Input
                  id="ann-model"
                  list="ann-model-options"
                  disabled={!llmEnabled || !modelsUnlocked}
                  value={modelsUnlocked ? annotationModel : basicModel}
                  onChange={(e) => setAnnotationModel(e.target.value)}
                  placeholder={basicModel}
                />
                <datalist id="ann-model-options">
                  {UNLOCKED_MODELS.map((m) => (
                    <option key={`a-${m}`} value={m} />
                  ))}
                </datalist>
                <p className="text-[11px] text-gray-400">
                  {modelsUnlocked
                    ? 'Used by Get AI Suggestion (Coder).'
                    : 'Locked to basic model until you add an API key.'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={saveAi} disabled={savingAi} className="gap-2">
              {savingAi ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save AI Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
