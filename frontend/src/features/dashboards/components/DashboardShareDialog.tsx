/**
 * Dashboard Share & Clone Dialog
 * Provides sharing with users and cloning functionality
 */

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Share2,
  Copy,
  UserPlus,
  X,
  Loader2,
  CheckCircle2,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import api from '@/lib/api'

interface DashboardShareDialogProps {
  dashboardId: string
  dashboardName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DashboardShareDialog({
  dashboardId,
  dashboardName,
  open,
  onOpenChange,
}: DashboardShareDialogProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('share')

  // Share form
  const [userEmails, setUserEmails] = useState('')
  const [sharePermission, setSharePermission] = useState<'view' | 'edit'>('view')
  const [sharedUsers, setSharedUsers] = useState<Array<{ email: string; permission: string }>>([])

  // Clone form
  const [cloneName, setCloneName] = useState(`${dashboardName} (Copy)`)
  const [includeWidgets, setIncludeWidgets] = useState(true)

  // ── Mutations ──
  const shareMutation = useMutation({
    mutationFn: async (params: { user_emails: string[]; permission: string }) => {
      const res = await api.post(`/dashboards/${dashboardId}/share`, params)
      return res.data
    },
    onSuccess: (_data, variables) => {
      const newUsers = variables.user_emails.map((email) => ({
        email,
        permission: variables.permission,
      }))
      setSharedUsers((prev) => [...prev, ...newUsers])
      setUserEmails('')
    },
  })

  const unshareMutation = useMutation({
    mutationFn: async (params: { user_emails: string[] }) => {
      const res = await api.post(`/dashboards/${dashboardId}/unshare`, params)
      return res.data
    },
    onSuccess: (_data, variables) => {
      setSharedUsers((prev) =>
        prev.filter((u) => !variables.user_emails.includes(u.email))
      )
    },
  })

  const cloneMutation = useMutation({
    mutationFn: async (params: { name: string; include_widgets: boolean }) => {
      const res = await api.post(`/dashboards/${dashboardId}/clone`, params)
      return res.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['dashboards'] })
      onOpenChange(false)
      const newId = data.id ?? data.dashboard?.id
      if (newId) {
        navigate(`/app/dashboards/${newId}`)
      }
    },
  })

  function handleShare() {
    const emails = userEmails
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean)
    if (emails.length === 0) return
    shareMutation.mutate({ user_emails: emails, permission: sharePermission })
  }

  function handleUnshare(email: string) {
    unshareMutation.mutate({ user_emails: [email] })
  }

  function handleClone() {
    if (!cloneName.trim()) return
    cloneMutation.mutate({ name: cloneName.trim(), include_widgets: includeWidgets })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share & Clone
          </DialogTitle>
          <DialogDescription>
            Share "{dashboardName}" with others or create a copy.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="share" className="flex-1">
              <Users className="mr-2 h-4 w-4" />
              Share
            </TabsTrigger>
            <TabsTrigger value="clone" className="flex-1">
              <Copy className="mr-2 h-4 w-4" />
              Clone
            </TabsTrigger>
          </TabsList>

          {/* Share Tab */}
          <TabsContent value="share" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Add people</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="user@example.com, user2@example.com"
                  value={userEmails}
                  onChange={(e) => setUserEmails(e.target.value)}
                  className="flex-1"
                />
                <select
                  value={sharePermission}
                  onChange={(e) => setSharePermission(e.target.value as 'view' | 'edit')}
                  className="px-3 py-2 border rounded-md text-sm bg-background"
                >
                  <option value="view">View</option>
                  <option value="edit">Edit</option>
                </select>
              </div>
              <p className="text-xs text-muted-foreground">
                Separate multiple emails with commas
              </p>
            </div>

            <Button
              size="sm"
              onClick={handleShare}
              disabled={!userEmails.trim() || shareMutation.isPending}
            >
              {shareMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="mr-2 h-4 w-4" />
              )}
              Share
            </Button>

            {shareMutation.isSuccess && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                Shared successfully
              </div>
            )}

            {/* Shared Users List */}
            {sharedUsers.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">
                  Shared With
                </Label>
                <div className="space-y-1">
                  {sharedUsers.map((user) => (
                    <div
                      key={user.email}
                      className="flex items-center justify-between p-2 rounded bg-muted/50"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{user.email}</span>
                        <Badge variant="outline" className="text-xs">
                          {user.permission}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUnshare(user.email)}
                        disabled={unshareMutation.isPending}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Clone Tab */}
          <TabsContent value="clone" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="clone-name">Dashboard Name</Label>
              <Input
                id="clone-name"
                value={cloneName}
                onChange={(e) => setCloneName(e.target.value)}
                placeholder="Enter name for the cloned dashboard"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="include-widgets"
                checked={includeWidgets}
                onCheckedChange={setIncludeWidgets}
              />
              <Label htmlFor="include-widgets" className="text-sm">
                Include all widgets
              </Label>
            </div>

            <Button
              onClick={handleClone}
              disabled={!cloneName.trim() || cloneMutation.isPending}
              className="w-full"
            >
              {cloneMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Copy className="mr-2 h-4 w-4" />
              )}
              Clone Dashboard
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
