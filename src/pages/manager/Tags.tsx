import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Plus, Edit, Trash2, AlertCircle, Loader2, Sparkles } from 'lucide-react'
import { getToken } from '@/lib/storage'

interface TagOption {
  option_id: string
  label: string
  order: number
  active: boolean
  description?: string
}

interface TagGroup {
  _id: string
  group_id: string
  name: string
  description?: string
  type: 'single' | 'multi'
  required: boolean
  order: number
  active: boolean
  options: TagOption[]
}

type OptionDiff = {
  id: string
  label: string
  description?: string
}

type TagGroupChangePreview = {
  isCreate: boolean
  groupName: string
  nameChanged?: { from: string; to: string }
  descriptionChanged?: { from: string; to: string }
  typeChanged?: { from: string; to: string }
  requiredChanged?: { from: boolean; to: boolean }
  activeChanged?: { from: boolean; to: boolean }
  beforeOptions: OptionDiff[]
  afterOptions: OptionDiff[]
  addedOptions: OptionDiff[]
  removedOptions: OptionDiff[]
  renamedOptions: Array<{ from: string; to: string }>
  optionDescriptionChanged: Array<{
    label: string
    from: string
    to: string
  }>
}

function normalizeText(v: unknown): string {
  if (v == null) return ''
  const s = String(v).trim()
  if (!s || s === 'None' || s === 'null' || s === 'undefined') return ''
  return s
}

function toOptionDiff(o: TagOption): OptionDiff {
  return {
    id: o.option_id,
    label: normalizeText(o.label) || 'Untitled',
    description: normalizeText(o.description),
  }
}

function buildGroupChangePreview(
  before: TagGroup | null,
  after: TagGroup
): TagGroupChangePreview {
  if (!before) {
    return {
      isCreate: true,
      groupName: after.name,
      beforeOptions: [],
      afterOptions: (after.options || []).map(toOptionDiff),
      addedOptions: (after.options || []).map(toOptionDiff),
      removedOptions: [],
      renamedOptions: [],
      optionDescriptionChanged: [],
    }
  }

  const beforeMap = new Map((before.options || []).map((o) => [o.option_id, o]))
  const afterMap = new Map((after.options || []).map((o) => [o.option_id, o]))

  const addedOptions: OptionDiff[] = []
  const removedOptions: OptionDiff[] = []
  const renamedOptions: Array<{ from: string; to: string }> = []
  const optionDescriptionChanged: Array<{ label: string; from: string; to: string }> = []

  for (const [id, opt] of afterMap) {
    if (!beforeMap.has(id)) {
      addedOptions.push(toOptionDiff(opt))
    }
  }
  for (const [id, opt] of beforeMap) {
    if (!afterMap.has(id)) {
      removedOptions.push(toOptionDiff(opt))
    }
  }
  for (const [id, afterOpt] of afterMap) {
    const beforeOpt = beforeMap.get(id)
    if (!beforeOpt) continue
    const beforeLabel = normalizeText(beforeOpt.label)
    const afterLabel = normalizeText(afterOpt.label)
    if (beforeLabel !== afterLabel) {
      renamedOptions.push({ from: beforeLabel, to: afterLabel })
    }
    const bd = normalizeText(beforeOpt.description)
    const ad = normalizeText(afterOpt.description)
    if (bd !== ad) {
      optionDescriptionChanged.push({
        label: afterLabel || beforeLabel,
        from: bd,
        to: ad,
      })
    }
  }

  const beforeDesc = normalizeText(before.description)
  const afterDesc = normalizeText(after.description)

  return {
    isCreate: false,
    groupName: after.name,
    nameChanged:
      before.name !== after.name ? { from: before.name, to: after.name } : undefined,
    descriptionChanged:
      beforeDesc !== afterDesc ? { from: beforeDesc, to: afterDesc } : undefined,
    typeChanged:
      before.type !== after.type ? { from: before.type, to: after.type } : undefined,
    requiredChanged:
      before.required !== after.required
        ? { from: before.required, to: after.required }
        : undefined,
    activeChanged:
      before.active !== after.active
        ? { from: before.active, to: after.active }
        : undefined,
    beforeOptions: (before.options || []).map(toOptionDiff),
    afterOptions: (after.options || []).map(toOptionDiff),
    addedOptions,
    removedOptions,
    renamedOptions,
    optionDescriptionChanged,
  }
}

function previewHasChanges(p: TagGroupChangePreview): boolean {
  if (p.isCreate) return true
  return Boolean(
    p.nameChanged ||
      p.descriptionChanged ||
      p.typeChanged ||
      p.requiredChanged ||
      p.activeChanged ||
      p.addedOptions.length ||
      p.removedOptions.length ||
      p.renamedOptions.length ||
      p.optionDescriptionChanged.length
  )
}

function OptionChips({
  options,
  tone,
}: {
  options: OptionDiff[]
  tone: 'before' | 'after'
}) {
  if (options.length === 0) {
    return <p className="text-xs text-slate-400">(no tags)</p>
  }
  const chip =
    tone === 'before'
      ? 'border-slate-200 bg-white text-slate-700'
      : 'border-emerald-200 bg-emerald-50 text-emerald-800'

  return (
    <div className="flex flex-col gap-1.5">
      {options.map((o) => (
        <div
          key={o.id}
          className={`rounded-md border px-2 py-1.5 text-xs ${chip}`}
        >
          <p className="font-medium">{o.label}</p>
          {o.description ? (
            <p className="mt-0.5 text-[11px] opacity-80 whitespace-pre-wrap">{o.description}</p>
          ) : null}
        </div>
      ))}
    </div>
  )
}

export function ManagerTags() {
  const [tagGroups, setTagGroups] = useState<TagGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<TagGroup | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [preview, setPreview] = useState<TagGroupChangePreview | null>(null)
  const [changeNote, setChangeNote] = useState('')
  const [toast, setToast] = useState({ open: false, message: '', type: 'success' as 'success' | 'error' })
  const [projectId, setProjectId] = useState<string | null>(null)
  
  // Quick add option dialog
  const [quickAddDialogOpen, setQuickAddDialogOpen] = useState(false)
  const [quickAddGroupId, setQuickAddGroupId] = useState<string | null>(null)
  const [quickAddOptionLabel, setQuickAddOptionLabel] = useState('')
  const [quickAddOptionDescription, setQuickAddOptionDescription] = useState('')

  // AI codebook suggestion (returns TagGroup-shaped JSON)
  const [aiOpen, setAiOpen] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiMode, setAiMode] = useState<'replace' | 'extend'>('replace')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiRationale, setAiRationale] = useState('')
  const [aiSuggested, setAiSuggested] = useState<TagGroup[]>([])
  const [aiMeta, setAiMeta] = useState<string>('')
  const [aiApplying, setAiApplying] = useState(false)

  // Fetch tag groups
  const fetchTagGroups = async () => {
    if (!projectId) {
      console.warn('Cannot fetch tag groups: no project ID')
      return
    }

    setLoading(true)
    try {
      const token = getToken()
      const apiBaseUrl = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8000'
      const url = `${apiBaseUrl}/api/projects/${projectId}/tag-groups?token=${encodeURIComponent(token!)}`
      
      console.log('Fetching tag groups from:', url)
      
      const response = await fetch(url)
      
      console.log('Response status:', response.status, response.statusText)
      
      if (!response.ok) throw new Error('Failed to fetch tag groups')
      
      const data = await response.json()
      console.log('Tag groups data:', data)

      const list = (Array.isArray(data) ? data : [data]).map((g: any) => ({
        ...g,
        description: normalizeText(g.description),
        options: (g.options || []).map((o: any) => ({
          ...o,
          label: normalizeText(o.label) || 'Untitled',
          description: normalizeText(o.description),
        })),
      }))
      setTagGroups(list)
    } catch (error) {
      console.error('Error fetching tag groups:', error)
      showToast('Failed to fetch tag groups: ' + (error as Error).message, 'error')
      setTagGroups([])
    } finally {
      setLoading(false)
    }
  }

  // Fetch user info and project ID on mount
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const token = getToken()
        if (!token) {
          throw new Error('No authentication token')
        }

        const apiBaseUrl = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8000'
        
        console.log('Fetching user info...')
        const response = await fetch(
          `${apiBaseUrl}/auth/user?token=${encodeURIComponent(token)}`
        )

        if (!response.ok) {
          throw new Error('Failed to fetch user info')
        }

        const user = await response.json()
        console.log('User info:', user)
        
        if (user.project_id) {
          console.log('✅ User has project:', user.project_id)
          setProjectId(user.project_id)
        } else {
          console.log('❌ User has no project')
          setLoading(false)
        }
      } catch (error) {
        console.error('Failed to fetch user info:', error)
        setLoading(false)
      }
    }

    fetchUserInfo()
  }, [])

  // Fetch tag groups when projectId changes
  useEffect(() => {
    if (projectId) {
      console.log('Fetching tag groups for project:', projectId)
      fetchTagGroups()
    }
  }, [projectId])

  // Show toast
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ open: true, message, type })
    setTimeout(() => setToast({ open: false, message: '', type: 'success' }), 3000)
  }

  // Generate group_id from name (slug format)
  const generateGroupId = (name: string): string => {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_') // Replace non-alphanumeric with underscore
      .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
      .substring(0, 50) // Limit length
    
    // Add timestamp to ensure uniqueness
    return `${slug}_${Date.now()}`
  }

  const mapSuggestedToTagGroups = (raw: any[]): TagGroup[] => {
    const now = Date.now()
    return (raw || []).map((g, i) => {
      const name = normalizeText(g.name) || `Group ${i + 1}`
      const group_id = normalizeText(g.group_id) || generateGroupId(name)
      const options: TagOption[] = (g.options || []).map((o: any, j: number) => ({
        option_id: normalizeText(o.option_id) || `opt_${now}_${i}_${j}`,
        label: normalizeText(o.label) || 'Untitled',
        order: typeof o.order === 'number' ? o.order : j + 1,
        active: o.active !== false,
        description: normalizeText(o.description),
      }))
      return {
        _id: `ai_${now}_${i}`,
        group_id,
        name,
        description: normalizeText(g.description),
        type: g.type === 'multi' ? 'multi' : 'single',
        required: !!g.required,
        order: typeof g.order === 'number' ? g.order : i + 1,
        active: g.active !== false,
        options,
      }
    })
  }

  const openAiSuggest = () => {
    setAiPrompt('')
    setAiMode(tagGroups.length > 0 ? 'extend' : 'replace')
    setAiRationale('')
    setAiSuggested([])
    setAiMeta('')
    setAiOpen(true)
  }

  const runAiSuggest = async () => {
    if (!projectId) {
      showToast('No project selected', 'error')
      return
    }
    try {
      setAiLoading(true)
      setAiSuggested([])
      setAiRationale('')
      const token = getToken()
      if (!token) throw new Error('No authentication token')
      const apiBaseUrl = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8000'
      const res = await fetch(
        `${apiBaseUrl}/api/llm/suggest-codebook?token=${encodeURIComponent(token)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_id: projectId,
            user_prompt: aiPrompt.trim() || null,
            sample_size: 100,
            mode: aiMode,
          }),
        }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const detail = data?.detail
        throw new Error(
          typeof detail === 'string' ? detail : detail?.message || `HTTP ${res.status}`
        )
      }
      // Backend guarantees TagGroup-shaped tag_groups for the frontend
      const groups = mapSuggestedToTagGroups(data.tag_groups || [])
      if (!groups.length) throw new Error('No tag_groups returned')
      setAiSuggested(groups)
      setAiRationale(normalizeText(data.rationale))
      const meta = data.metadata || {}
      setAiMeta(
        [
          meta.sampled_tasks != null ? `${meta.sampled_tasks} tasks sampled` : null,
          meta.model_used || null,
          meta.provider || null,
        ]
          .filter(Boolean)
          .join(' · ')
      )
    } catch (error) {
      console.error('AI codebook suggest failed:', error)
      showToast('Suggest failed: ' + (error as Error).message, 'error')
    } finally {
      setAiLoading(false)
    }
  }

  const updateAiGroup = (index: number, patch: Partial<TagGroup>) => {
    setAiSuggested((prev) =>
      prev.map((g, i) => (i === index ? { ...g, ...patch } : g))
    )
  }

  const updateAiOption = (
    groupIndex: number,
    optionId: string,
    field: 'label' | 'description',
    value: string
  ) => {
    setAiSuggested((prev) =>
      prev.map((g, i) => {
        if (i !== groupIndex) return g
        return {
          ...g,
          options: g.options.map((o) =>
            o.option_id === optionId ? { ...o, [field]: value } : o
          ),
        }
      })
    )
  }

  const removeAiGroup = (index: number) => {
    setAiSuggested((prev) => prev.filter((_, i) => i !== index))
  }

  const applyAiSuggested = async () => {
    if (!projectId || aiSuggested.length === 0) return
    for (const g of aiSuggested) {
      if (!g.name.trim()) {
        showToast('Each suggested group needs a name', 'error')
        return
      }
      if (!g.options.length) {
        showToast(`Group "${g.name}" needs at least one option`, 'error')
        return
      }
    }

    try {
      setAiApplying(true)
      const token = getToken()
      if (!token) throw new Error('No authentication token')
      const apiBaseUrl = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8000'

      const stamped = aiSuggested.map((g, i) => ({
        ...g,
        group_id: generateGroupId(g.name),
        order:
          aiMode === 'replace'
            ? i + 1
            : tagGroups.length + i + 1,
      }))

      const updatedGroups =
        aiMode === 'replace' ? stamped : [...tagGroups, ...stamped]

      const note =
        aiMode === 'replace'
          ? `Applied AI-suggested codebook${aiPrompt.trim() ? `: ${aiPrompt.trim().slice(0, 120)}` : ''}`
          : `Merged AI-suggested tag groups${aiPrompt.trim() ? `: ${aiPrompt.trim().slice(0, 120)}` : ''}`

      const response = await fetch(
        `${apiBaseUrl}/api/projects/${projectId}/tag-groups-overwrite?token=${encodeURIComponent(token)}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tag_groups: updatedGroups,
            change_note: note,
          }),
        }
      )
      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.detail || `HTTP ${response.status}`)
      }

      setTagGroups(updatedGroups)
      setAiOpen(false)
      showToast(
        aiMode === 'replace'
          ? 'AI codebook applied (you can keep editing groups)'
          : 'AI groups merged into codebook',
        'success'
      )
    } catch (error) {
      console.error('Apply AI codebook failed:', error)
      showToast('Apply failed: ' + (error as Error).message, 'error')
    } finally {
      setAiApplying(false)
    }
  }

  // Add new tag group
  const addTagGroup = () => {
    const timestamp = Date.now()
    const newGroup: TagGroup = {
      _id: timestamp.toString(),
      group_id: `group_${timestamp}`,
      name: 'New Tag Group',
      description: '',
      type: 'single',
      required: false,
      order: tagGroups.length + 1,
      active: true,
      options: [],
    }
    setEditingGroup(newGroup)
    setDialogOpen(true)
  }

  // Edit tag group
  const editTagGroup = (group: TagGroup) => {
    setEditingGroup({ ...group })
    setDialogOpen(true)
  }

  // Delete tag group
  const deleteTagGroup = async (groupId: string) => {
    if (!confirm('Are you sure you want to delete this tag group?')) return
    
    try {
      setSaving(true)
      const updatedGroups = tagGroups.filter((g) => g._id !== groupId)
      
      // Save to API
      const token = getToken()
      if (!token) throw new Error('No authentication token')
      
      const apiBaseUrl = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8000'
      
      const response = await fetch(
        `${apiBaseUrl}/api/projects/${projectId}/tag-groups-overwrite?token=${encodeURIComponent(token)}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tag_groups: updatedGroups }),
        }
      )
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.detail || `HTTP ${response.status}`)
      }
      
      setTagGroups(updatedGroups)
      showToast('Deleted successfully', 'success')
    } catch (error) {
      console.error('Failed to delete tag group:', error)
      showToast(`Failed to delete: ${error}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  // Open preview before saving
  const requestSaveEditedGroup = () => {
    if (!editingGroup) return

    if (!editingGroup.name.trim()) {
      showToast('Please enter a tag group name', 'error')
      return
    }

    const existing = tagGroups.find((g) => g._id === editingGroup._id) || null
    const change = buildGroupChangePreview(existing, editingGroup)
    if (!previewHasChanges(change)) {
      showToast('No changes to save', 'error')
      return
    }
    setPreview(change)
    setChangeNote('')
    setPreviewOpen(true)
  }

  // Confirm save after preview
  const confirmSaveEditedGroup = async () => {
    if (!editingGroup) return

    const note = changeNote.trim()
    if (!note) {
      showToast('Please add a note explaining this change', 'error')
      return
    }

    try {
      setSaving(true)

      const existingIndex = tagGroups.findIndex((g) => g._id === editingGroup._id)
      let updatedGroups: TagGroup[]

      const groupToSave =
        existingIndex < 0
          ? { ...editingGroup, group_id: generateGroupId(editingGroup.name) }
          : editingGroup

      if (existingIndex < 0) {
        console.log(`Generated group_id: ${groupToSave.group_id} from name: ${editingGroup.name}`)
      }

      if (existingIndex >= 0) {
        updatedGroups = [...tagGroups]
        updatedGroups[existingIndex] = groupToSave
      } else {
        updatedGroups = [...tagGroups, groupToSave]
      }

      const token = getToken()
      if (!token) throw new Error('No authentication token')

      const apiBaseUrl = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8000'

      const response = await fetch(
        `${apiBaseUrl}/api/projects/${projectId}/tag-groups-overwrite?token=${encodeURIComponent(token)}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tag_groups: updatedGroups,
            change_note: note,
            change_group_id: groupToSave.group_id,
          }),
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.detail || `HTTP ${response.status}`)
      }

      setTagGroups(updatedGroups)
      showToast(existingIndex >= 0 ? 'Updated successfully' : 'Added successfully', 'success')
      setPreviewOpen(false)
      setPreview(null)
      setChangeNote('')
      setDialogOpen(false)
      setEditingGroup(null)
    } catch (error) {
      console.error('Failed to save tag group:', error)
      showToast(`Failed to save: ${error}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  // Add tag
  const addOption = () => {
    if (!editingGroup) return

    const newOption: TagOption = {
      option_id: `option_${Date.now()}`,
      label: 'New Tag',
      order: (editingGroup.options?.length || 0) + 1,
      active: true,
      description: '',
    }
    setEditingGroup({
      ...editingGroup,
      options: [...(editingGroup.options || []), newOption],
    })
  }

  // Delete tag
  const deleteOption = (optionId: string) => {
    if (!editingGroup) return
    
    setEditingGroup({
      ...editingGroup,
      options: editingGroup.options.filter((o) => o.option_id !== optionId),
    })
  }

  // Update tag
  const updateOption = (optionId: string, field: keyof TagOption, value: any) => {
    if (!editingGroup) return
    
    setEditingGroup({
      ...editingGroup,
      options: editingGroup.options.map((o) =>
        o.option_id === optionId ? { ...o, [field]: value } : o
      ),
    })
  }

  // Quick add tag to existing group
  const openQuickAddDialog = (groupId: string) => {
    setQuickAddGroupId(groupId)
    setQuickAddOptionLabel('')
    setQuickAddOptionDescription('')
    setQuickAddDialogOpen(true)
  }

  const quickAddOption = async () => {
    if (!quickAddOptionLabel.trim() || !quickAddGroupId || !projectId) {
      showToast('Please enter a tag label', 'error')
      return
    }

    try {
      setSaving(true)
      const token = getToken()
      if (!token) throw new Error('No authentication token')

      // Find the group
      const group = tagGroups.find((g) => g._id === quickAddGroupId)
      if (!group) throw new Error('Group not found')

      // Create new option
      const newOption: TagOption = {
        option_id: `option_${Date.now()}`,
        label: quickAddOptionLabel.trim(),
        order: (group.options?.length || 0) + 1,
        active: true,
        description: quickAddOptionDescription.trim() || '',
      }

      // Update group with new option
      const updatedGroup = {
        ...group,
        options: [...(group.options || []), newOption],
      }

      const apiBaseUrl = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8000'
      
      console.log(`Updating group ${group.group_id} with new tag:`, newOption)
      
      const response = await fetch(
        `${apiBaseUrl}/api/projects/${projectId}/tag-groups/${group.group_id}?token=${encodeURIComponent(token)}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedGroup),
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.detail || `HTTP ${response.status}`)
      }

      // Update local state
      setTagGroups(tagGroups.map((g) => (g._id === quickAddGroupId ? updatedGroup : g)))
      
      showToast('Tag added successfully', 'success')
      setQuickAddDialogOpen(false)
      setQuickAddGroupId(null)
      setQuickAddOptionLabel('')
      setQuickAddOptionDescription('')
    } catch (error) {
      console.error('Failed to add tag:', error)
      showToast(`Failed to add tag: ${error}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-gray-600">Loading...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tag Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage tag groups and options for your project. Changes are saved automatically.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={openAiSuggest}
            className="flex items-center gap-2"
            disabled={!projectId}
          >
            <Sparkles className="h-4 w-4" />
            Suggest with AI
          </Button>
          <Button onClick={addTagGroup} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Tag Group
          </Button>
        </div>
      </div>

      {/* Tag Groups Grid */}
      {tagGroups.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-lg text-gray-900 font-medium">No tag groups yet</p>
            <p className="text-sm text-gray-500 mt-1">
              Click "Add Tag Group" to create your first tag group
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {tagGroups.map((group) => (
            <Card key={group._id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <CardTitle>{group.name}</CardTitle>
                      <Badge variant={group.type === 'single' ? 'default' : 'secondary'}>
                        {group.type === 'single' ? 'Single' : 'Multi'}
                      </Badge>
                      {group.required && (
                        <Badge variant="destructive">Required</Badge>
                      )}
                      {!group.active && (
                        <Badge variant="outline" className="text-gray-500">
                          Inactive
                        </Badge>
                      )}
                    </div>
                    {group.description && (
                      <CardDescription className="mt-2">{group.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => editTagGroup(group)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteTagGroup(group._id)}
                      className="text-red-600 border-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {/* Tags */}
              <CardContent className="border-t pt-6">
                <div className="flex items-start justify-between gap-3">
                  {group.options && group.options.length > 0 ? (
                    <div className="flex-1 flex flex-wrap gap-3">
                      {group.options.map((option) => (
                        <div key={option.option_id} className="max-w-xs">
                          <Badge
                            variant={option.active ? 'secondary' : 'outline'}
                            className={`px-4 py-2 text-base ${option.active ? '' : 'text-gray-400'}`}
                          >
                            {option.label}
                          </Badge>
                          {option.description && (
                            <p className="mt-1 text-xs text-gray-500 line-clamp-2 px-1">
                              {option.description}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="flex-1 text-sm text-gray-400 italic">
                      No tags yet. Click "Add Tag" to create one.
                    </p>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openQuickAddDialog(group._id)}
                    className="h-8 text-xs ml-3 flex-shrink-0"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Tag
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] w-[90vw] max-w-[600px] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {editingGroup && tagGroups.find((g) => g._id === editingGroup._id)
                ? 'Edit Tag Group'
                : 'Add Tag Group'}
            </DialogTitle>
          </DialogHeader>

            {editingGroup && (
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">
                      Tag Group Name <span className="text-red-500">*</span>
                    </Label>
                    <input
                      type="text"
                      value={editingGroup.name}
                      onChange={(e) => setEditingGroup({ ...editingGroup, name: e.target.value })}
                      className="mt-1.5 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Enter tag group name"
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-700">Description</Label>
                    <textarea
                      value={editingGroup.description || ''}
                      onChange={(e) => setEditingGroup({ ...editingGroup, description: e.target.value })}
                      className="mt-1.5 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      rows={3}
                      placeholder="Enter description (optional)"
                    />
                  </div>

                  {/* Type Selection */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">
                      Selection Type
                    </Label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={editingGroup.type === 'single'}
                          onChange={() => setEditingGroup({ ...editingGroup, type: 'single' })}
                          className="w-4 h-4 text-primary"
                        />
                        <span className="text-sm">Single Choice</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={editingGroup.type === 'multi'}
                          onChange={() => setEditingGroup({ ...editingGroup, type: 'multi' })}
                          className="w-4 h-4 text-primary"
                        />
                        <span className="text-sm">Multiple Choice</span>
                      </label>
                    </div>
                  </div>

                  {/* Required Switch */}
                  <div className="flex items-center justify-between py-2">
                    <Label className="text-sm font-medium text-gray-700">Required</Label>
                    <Switch
                      checked={editingGroup.required}
                      onCheckedChange={(checked: boolean) => setEditingGroup({ ...editingGroup, required: checked })}
                    />
                  </div>

                  {/* Active Switch */}
                  <div className="flex items-center justify-between py-2">
                    <Label className="text-sm font-medium text-gray-700">Active</Label>
                    <Switch
                      checked={editingGroup.active}
                      onCheckedChange={(checked: boolean) => setEditingGroup({ ...editingGroup, active: checked })}
                    />
                  </div>
                </div>

                {/* Tags */}
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-sm font-medium text-gray-700">Tag List</Label>
                    <Button
                      onClick={addOption}
                      size="sm"
                      variant="outline"
                      className="h-8"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Tag
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {editingGroup.options && editingGroup.options.map((option) => (
                      <div key={option.option_id} className="p-3 border rounded-md bg-gray-50 space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={option.label}
                            onChange={(e) => updateOption(option.option_id, 'label', e.target.value)}
                            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="Tag name"
                          />
                          <Button
                            onClick={() => deleteOption(option.option_id)}
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <textarea
                          value={option.description || ''}
                          onChange={(e) => updateOption(option.option_id, 'description', e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary"
                          rows={2}
                          placeholder="Optional description (AI annotation hint)"
                        />
                      </div>
                    ))}
                    {(!editingGroup.options || editingGroup.options.length === 0) && (
                      <p className="text-sm text-gray-500 text-center py-4">
                        No tags yet, click "Add Tag" to create one
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                    Cancel
                  </Button>
                  <Button onClick={requestSaveEditedGroup} disabled={saving}>
                    Save
                  </Button>
                </div>
              </div>
            )}
        </DialogContent>
      </Dialog>

      {/* AI codebook suggestion — expects / returns TagGroup shape */}
      <Dialog
        open={aiOpen}
        onOpenChange={(open) => {
          if (!aiLoading && !aiApplying) setAiOpen(open)
        }}
      >
        <DialogContent className="max-h-[90vh] w-[95vw] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Sparkles className="h-5 w-5 text-primary" />
              Suggest codebook with AI
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Samples up to 100 recent tasks, combines them with your prompt, and returns{' '}
              <span className="font-medium text-gray-800">tag groups</span> in the same format
              this page uses — tweak anything before applying.
            </p>

            <div>
              <Label className="text-sm font-medium text-gray-700">Your prompt (optional)</Label>
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                rows={3}
                placeholder="e.g. Focus on policy stance and stakeholder type; prefer single-choice groups; English labels…"
                disabled={aiLoading || aiApplying}
              />
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Apply mode</Label>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="radio"
                    checked={aiMode === 'replace'}
                    onChange={() => setAiMode('replace')}
                    disabled={aiLoading || aiApplying}
                  />
                  Replace current codebook
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="radio"
                    checked={aiMode === 'extend'}
                    onChange={() => setAiMode('extend')}
                    disabled={aiLoading || aiApplying}
                  />
                  Merge as new groups (keep existing)
                </label>
              </div>
              {aiMode === 'replace' && tagGroups.length > 0 && (
                <p className="mt-1 text-xs text-amber-700">
                  Applying will overwrite your current {tagGroups.length} tag group
                  {tagGroups.length === 1 ? '' : 's'}.
                </p>
              )}
            </div>

            <div className="flex justify-end">
              <Button onClick={runAiSuggest} disabled={aiLoading || aiApplying} className="gap-2">
                {aiLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate suggestions
                  </>
                )}
              </Button>
            </div>

            {aiMeta && (
              <p className="text-xs text-gray-400">{aiMeta}</p>
            )}
            {aiRationale && (
              <div className="rounded-md border border-gray-100 bg-slate-50 px-3 py-2 text-sm text-gray-700">
                {aiRationale}
              </div>
            )}

            {aiSuggested.length > 0 && (
              <div className="space-y-3 border-t pt-4">
                <p className="text-sm font-medium text-gray-800">
                  Suggested tag groups (editable)
                </p>
                {aiSuggested.map((g, gi) => (
                  <div key={g._id} className="rounded-lg border border-gray-200 p-3 space-y-2">
                    <div className="flex flex-wrap items-start gap-2">
                      <input
                        type="text"
                        value={g.name}
                        onChange={(e) => updateAiGroup(gi, { name: e.target.value })}
                        className="min-w-[140px] flex-1 rounded border border-gray-300 px-2 py-1.5 text-sm"
                        placeholder="Group name"
                      />
                      <select
                        value={g.type}
                        onChange={(e) =>
                          updateAiGroup(gi, {
                            type: e.target.value === 'multi' ? 'multi' : 'single',
                          })
                        }
                        className="rounded border border-gray-300 px-2 py-1.5 text-sm"
                      >
                        <option value="single">Single</option>
                        <option value="multi">Multi</option>
                      </select>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-red-600"
                        onClick={() => removeAiGroup(gi)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <textarea
                      value={g.description || ''}
                      onChange={(e) => updateAiGroup(gi, { description: e.target.value })}
                      className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                      rows={2}
                      placeholder="Group description"
                    />
                    <div className="space-y-2 pl-1">
                      {g.options.map((o) => (
                        <div key={o.option_id} className="rounded-md bg-gray-50 p-2 space-y-1">
                          <input
                            type="text"
                            value={o.label}
                            onChange={(e) =>
                              updateAiOption(gi, o.option_id, 'label', e.target.value)
                            }
                            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                            placeholder="Option label"
                          />
                          <input
                            type="text"
                            value={o.description || ''}
                            onChange={(e) =>
                              updateAiOption(gi, o.option_id, 'description', e.target.value)
                            }
                            className="w-full rounded border border-gray-200 px-2 py-1 text-xs"
                            placeholder="Option description (optional)"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setAiOpen(false)}
                    disabled={aiApplying}
                  >
                    Cancel
                  </Button>
                  <Button onClick={applyAiSuggested} disabled={aiApplying} className="gap-2">
                    {aiApplying ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Applying…
                      </>
                    ) : aiMode === 'replace' ? (
                      'Apply codebook'
                    ) : (
                      'Merge into codebook'
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview changes before save */}
      <Dialog
        open={previewOpen}
        onOpenChange={(open) => {
          if (!saving) {
            setPreviewOpen(open)
            if (!open) setPreview(null)
          }
        }}
      >
        <DialogContent className="max-h-[85vh] w-[90vw] max-w-[560px] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {preview?.isCreate ? 'Preview: create tag group' : 'Preview: update tag group'}
            </DialogTitle>
          </DialogHeader>

          {preview && (
            <div className="space-y-4 text-sm">
              <p className="text-slate-800">
                {preview.isCreate ? 'Creating tag group' : 'Updating tag group'}{' '}
                <span className="font-semibold text-violet-800">{preview.groupName}</span>
              </p>

              {preview.nameChanged && (
                <p>
                  <span className="text-slate-500">name:</span>{' '}
                  <span className="line-through text-rose-600">{preview.nameChanged.from}</span>
                  {' → '}
                  <span className="font-medium text-emerald-700">{preview.nameChanged.to}</span>
                </p>
              )}

              {preview.descriptionChanged && (
                <p className="text-sm">
                  <span className="text-slate-500">description:</span>{' '}
                  <span className="line-through text-rose-600 whitespace-pre-wrap">
                    {preview.descriptionChanged.from || '(empty)'}
                  </span>
                  {' → '}
                  <span className="font-medium text-emerald-700 whitespace-pre-wrap">
                    {preview.descriptionChanged.to || '(empty)'}
                  </span>
                </p>
              )}

              {(preview.typeChanged || preview.requiredChanged || preview.activeChanged) && (
                <div className="space-y-1 text-slate-600">
                  {preview.typeChanged && (
                    <p>
                      type: <span className="line-through text-rose-600">{preview.typeChanged.from}</span>
                      {' → '}
                      <span className="text-emerald-700">{preview.typeChanged.to}</span>
                    </p>
                  )}
                  {preview.requiredChanged && (
                    <p>
                      required:{' '}
                      <span className="line-through text-rose-600">
                        {String(preview.requiredChanged.from)}
                      </span>
                      {' → '}
                      <span className="text-emerald-700">{String(preview.requiredChanged.to)}</span>
                    </p>
                  )}
                  {preview.activeChanged && (
                    <p>
                      active:{' '}
                      <span className="line-through text-rose-600">
                        {String(preview.activeChanged.from)}
                      </span>
                      {' → '}
                      <span className="text-emerald-700">{String(preview.activeChanged.to)}</span>
                    </p>
                  )}
                </div>
              )}

              {preview.optionDescriptionChanged.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-slate-500">tag descriptions</p>
                  {preview.optionDescriptionChanged.map((d, i) => (
                    <p key={i} className="text-sm">
                      <span className="font-medium text-slate-800">{d.label}:</span>{' '}
                      <span className="line-through text-rose-600 whitespace-pre-wrap">
                        {d.from || '(empty)'}
                      </span>
                      {' → '}
                      <span className="font-medium text-emerald-700 whitespace-pre-wrap">
                        {d.to || '(empty)'}
                      </span>
                    </p>
                  ))}
                </div>
              )}

              {(preview.addedOptions.length > 0 ||
                preview.removedOptions.length > 0 ||
                preview.renamedOptions.length > 0 ||
                preview.isCreate) && (
                <div>
                  <p className="mb-1.5 text-xs font-medium text-slate-500">tags</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-md border border-rose-100 bg-rose-50/40 p-2.5">
                      <p className="mb-1.5 text-[11px] font-medium text-rose-600">before</p>
                      <OptionChips options={preview.beforeOptions} tone="before" />
                    </div>
                    <div className="rounded-md border border-emerald-100 bg-emerald-50/40 p-2.5">
                      <p className="mb-1.5 text-[11px] font-medium text-emerald-700">after</p>
                      <OptionChips options={preview.afterOptions} tone="after" />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <Label className="text-sm font-medium text-gray-700">
                  Change note <span className="text-red-500">*</span>
                </Label>
                <textarea
                  value={changeNote}
                  onChange={(e) => setChangeNote(e.target.value)}
                  className="mt-1.5 w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  rows={3}
                  placeholder="Why are you making this change? (shown on Project Logbook)"
                />
                <p className="mt-1 text-xs text-gray-500">
                  This note will appear in the Project Logbook with this codebook update.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setPreviewOpen(false)
                    setPreview(null)
                    setChangeNote('')
                  }}
                  disabled={saving}
                >
                  Back
                </Button>
                <Button
                  onClick={confirmSaveEditedGroup}
                  disabled={saving || !changeNote.trim()}
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Confirm Save'
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Quick Add Tag Dialog */}
      <Dialog open={quickAddDialogOpen} onOpenChange={setQuickAddDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Tag</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="option-label" className="text-sm font-medium text-gray-700">
                Tag Label <span className="text-red-500">*</span>
              </Label>
              <input
                id="option-label"
                type="text"
                value={quickAddOptionLabel}
                onChange={(e) => setQuickAddOptionLabel(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    quickAddOption()
                  }
                }}
                className="mt-1.5 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="e.g., Positive, Negative, Neutral"
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="option-desc" className="text-sm font-medium text-gray-700">
                Description (optional)
              </Label>
              <textarea
                id="option-desc"
                value={quickAddOptionDescription}
                onChange={(e) => setQuickAddOptionDescription(e.target.value)}
                className="mt-1.5 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                rows={2}
                placeholder="Optional — can guide AI annotation"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setQuickAddDialogOpen(false)
                setQuickAddOptionLabel('')
                setQuickAddOptionDescription('')
              }}
            >
              Cancel
            </Button>
            <Button onClick={quickAddOption} disabled={!quickAddOptionLabel.trim() || saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Tag'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Toast Notification */}
      {toast.open && (
        <div
          className={`fixed bottom-4 right-4 rounded-lg px-6 py-4 shadow-lg z-50 ${
            toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          } text-white animate-in slide-in-from-bottom-5`}
        >
          <p className="text-sm font-medium">{toast.message}</p>
        </div>
      )}
    </div>
  )
}
