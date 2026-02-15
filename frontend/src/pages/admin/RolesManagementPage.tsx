/**
 * Roles Management Page
 * 
 * Manage RBAC roles and permissions for the current tenant.
 * Backend: GET/POST/PUT/DELETE /api/v1/roles, GET /api/v1/roles/permissions
 */

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Shield,
  Plus,
  Edit,
  Trash2,
  Check,
  X,
  Loader2,
  RefreshCw,
  Lock,
  Users,
  Key,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/components/ui/use-toast'
import api from '@/lib/api'

interface Permission {
  id: string
  name: string
  description: string
  category: string
}

// Permissions can be either an array ["*"] or a dict {"category": ["perm1", "perm2"]}
type PermissionsData = string[] | Record<string, string[]>

interface Role {
  id: string
  name: string
  display_name: string
  description: string
  is_system: boolean
  permissions: PermissionsData
  user_count?: number
  created_at: string
}

// Helper to flatten permissions dict/array to a flat array of permission names
function flattenPermissions(permissions: PermissionsData): string[] {
  if (!permissions) return []
  if (Array.isArray(permissions)) {
    return permissions
  }
  // It's a dict like {"category": ["perm1", "perm2"]}
  return Object.values(permissions).flat()
}

export function RolesManagementPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [deletingRole, setDeletingRole] = useState<Role | null>(null)

  // Fetch roles
  const { data: rolesData, isLoading: rolesLoading, refetch } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const res = await api.get('/api/v1/roles')
      return res.data
    },
  })

  // Fetch permissions
  const { data: permissionsData } = useQuery({
    queryKey: ['permissions'],
    queryFn: async () => {
      const res = await api.get('/api/v1/roles/permissions')
      return res.data
    },
  })

  // Delete role
  const deleteRole = useMutation({
    mutationFn: async (roleId: string) => {
      await api.delete(`/api/v1/roles/${roleId}`)
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Role deleted successfully' })
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      setDeletingRole(null)
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to delete role.',
        variant: 'destructive',
      })
    },
  })

  const roles: Role[] = rolesData?.roles || []
  const permissions: Permission[] = permissionsData?.permissions || []

  // Group permissions by category
  const permissionsByCategory = permissions.reduce((acc, perm) => {
    const cat = perm.category || 'general'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(perm)
    return acc
  }, {} as Record<string, Permission[]>)

  return (
    <div className="container py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Key className="h-8 w-8 text-primary" />
            Roles & Permissions
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage access control roles and their permissions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Role
          </Button>
        </div>
      </div>

      {/* Roles Grid */}
      {rolesLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : roles.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Shield className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Roles Configured</h3>
            <p className="text-muted-foreground mb-4">
              Create roles to define access permissions for your users.
            </p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Role
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map((role) => (
            <Card key={role.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {role.is_system ? (
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Shield className="h-4 w-4 text-primary" />
                    )}
                    <CardTitle className="text-lg">{role.display_name}</CardTitle>
                  </div>
                  {role.is_system && (
                    <Badge variant="secondary">System</Badge>
                  )}
                </div>
                <CardDescription>{role.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{role.user_count || 0} users assigned</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Key className="h-4 w-4 text-muted-foreground" />
                    <span>{flattenPermissions(role.permissions).length} permissions</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {flattenPermissions(role.permissions).slice(0, 5).map((perm) => (
                      <Badge key={perm} variant="outline" className="text-xs">
                        {perm}
                      </Badge>
                    ))}
                    {flattenPermissions(role.permissions).length > 5 && (
                      <Badge variant="outline" className="text-xs">
                        +{flattenPermissions(role.permissions).length - 5} more
                      </Badge>
                    )}
                  </div>
                </div>
                {!role.is_system && (
                  <div className="flex gap-2 mt-4 pt-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setEditingRole(role)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeletingRole(role)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Role Dialog */}
      <RoleFormDialog
        open={createDialogOpen || !!editingRole}
        role={editingRole}
        permissionsByCategory={permissionsByCategory}
        onClose={() => {
          setCreateDialogOpen(false)
          setEditingRole(null)
        }}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['roles'] })
          setCreateDialogOpen(false)
          setEditingRole(null)
        }}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingRole} onOpenChange={() => setDeletingRole(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the role &quot;{deletingRole?.display_name}&quot;?
              Users assigned to this role will lose their permissions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingRole && deleteRole.mutate(deletingRole.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteRole.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete Role
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ---- Role Form Dialog ----

interface RoleFormDialogProps {
  open: boolean
  role?: Role | null
  permissionsByCategory: Record<string, Permission[]>
  onClose: () => void
  onSuccess: () => void
}

function RoleFormDialog({ open, role, permissionsByCategory, onClose, onSuccess }: RoleFormDialogProps) {
  const { toast } = useToast()
  const [name, setName] = useState(role?.name || '')
  const [displayName, setDisplayName] = useState(role?.display_name || '')
  const [description, setDescription] = useState(role?.description || '')
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(
    role?.permissions ? flattenPermissions(role.permissions) : []
  )
  const [isSaving, setIsSaving] = useState(false)

  // Reset form when dialog opens
  useState(() => {
    if (open) {
      setName(role?.name || '')
      setDisplayName(role?.display_name || '')
      setDescription(role?.description || '')
      setSelectedPermissions(role?.permissions ? flattenPermissions(role.permissions) : [])
    }
  })

  const togglePermission = (permName: string) => {
    setSelectedPermissions(prev =>
      prev.includes(permName)
        ? prev.filter(p => p !== permName)
        : [...prev, permName]
    )
  }

  const handleSubmit = async () => {
    if (!name.trim() || !displayName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Name and display name are required.',
        variant: 'destructive',
      })
      return
    }

    setIsSaving(true)
    try {
      if (role) {
        await api.put(`/api/v1/roles/${role.id}`, {
          display_name: displayName,
          description,
          permissions: selectedPermissions,
        })
        toast({ title: 'Success', description: 'Role updated successfully' })
      } else {
        await api.post('/api/v1/roles', {
          name,
          display_name: displayName,
          description,
          permissions: selectedPermissions,
        })
        toast({ title: 'Success', description: 'Role created successfully' })
      }
      onSuccess()
    } catch (err) {
      toast({
        title: 'Error',
        description: `Failed to ${role ? 'update' : 'create'} role.`,
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{role ? 'Edit Role' : 'Create Role'}</DialogTitle>
          <DialogDescription>
            {role ? 'Modify role settings and permissions.' : 'Define a new access control role.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Role Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., data_analyst"
                disabled={!!role}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g., Data Analyst"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Role description"
            />
          </div>

          <div className="space-y-3">
            <Label>Permissions</Label>
            {Object.entries(permissionsByCategory).map(([category, perms]) => (
              <div key={category} className="space-y-2">
                <h4 className="text-sm font-semibold capitalize border-b pb-1">
                  {category}
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {perms.map((perm) => (
                    <label
                      key={perm.name}
                      className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedPermissions.includes(perm.name)}
                        onCheckedChange={() => togglePermission(perm.name)}
                      />
                      <div>
                        <span className="text-sm font-medium">{perm.name}</span>
                        {perm.description && (
                          <p className="text-xs text-muted-foreground">{perm.description}</p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {role ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
