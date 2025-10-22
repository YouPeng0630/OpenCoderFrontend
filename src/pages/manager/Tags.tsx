import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Plus, Edit, Trash2, AlertCircle, Loader2 } from 'lucide-react'
import { getToken } from '@/lib/storage'

interface TagOption {
  option_id: string
  label: string
  order: number
  active: boolean
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

export function ManagerTags() {
  const [tagGroups, setTagGroups] = useState<TagGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<TagGroup | null>(null)
  const [toast, setToast] = useState({ open: false, message: '', type: 'success' as 'success' | 'error' })
  const [projectId, setProjectId] = useState<string | null>(null)
  
  // Quick add option dialog
  const [quickAddDialogOpen, setQuickAddDialogOpen] = useState(false)
  const [quickAddGroupId, setQuickAddGroupId] = useState<string | null>(null)
  const [quickAddOptionLabel, setQuickAddOptionLabel] = useState('')

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
      
      setTagGroups(Array.isArray(data) ? data : [data])
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

  // Save edited group
  const saveEditedGroup = async () => {
    if (!editingGroup) return
    
    if (!editingGroup.name.trim()) {
      showToast('Please enter a tag group name', 'error')
      return
    }

    try {
      setSaving(true)
      
      // Update local state first
      const existingIndex = tagGroups.findIndex((g) => g._id === editingGroup._id)
      let updatedGroups: TagGroup[]
      
      // For new groups, generate group_id from name
      const groupToSave = existingIndex < 0 
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
      showToast(existingIndex >= 0 ? 'Updated successfully' : 'Added successfully', 'success')
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
        <Button onClick={addTagGroup} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Tag Group
        </Button>
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
                <div className="flex items-center justify-between">
                  {group.options && group.options.length > 0 ? (
                    <div className="flex-1 flex flex-wrap gap-3">
                      {group.options.map((option) => (
                        <Badge
                          key={option.option_id}
                          variant={option.active ? 'secondary' : 'outline'}
                          className={`px-4 py-2 text-base ${option.active ? '' : 'text-gray-400'}`}
                        >
                          {option.label}
                        </Badge>
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
                      <div key={option.option_id} className="flex items-center gap-2 p-3 border rounded-md bg-gray-50">
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
                  <Button onClick={saveEditedGroup} disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save'
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
              <p className="text-xs text-gray-500 mt-1.5">
                This will be added to the selected tag group.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setQuickAddDialogOpen(false)
                setQuickAddOptionLabel('')
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
