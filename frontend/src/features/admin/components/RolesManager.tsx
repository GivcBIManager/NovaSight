/**
 * Roles Manager Component
 * 
 * Component for managing roles and permissions
 */

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Plus,
  Pencil,
  Shield,
  Users,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import api from '@/lib/api'
import type { Role, Permission } from '../types'

// Permission categories for grouping
const PERMISSION_CATEGORIES = {
  datasources: { label: 'Data Sources', icon: '🔌' },
  ingestion: { label: 'Ingestion', icon: '📥' },
  models: { label: 'dbt Models', icon: '🔧' },
  dags: { label: 'DAGs', icon: '📊' },
  analytics: { label: 'Analytics', icon: '📈' },
  dashboards: { label: 'Dashboards', icon: '📋' },
  admin: { label: 'Administration', icon: '⚙️' },
}

const createRoleSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters')
    .regex(/^[a-z0-9_]+$/, 'Name must be lowercase alphanumeric with underscores'),
  description: z.string().optional(),
  permissions: z.array(z.string()).min(1, 'Select at least one permission'),
})

type CreateRoleFormData = z.infer<typeof createRoleSchema>

interface PermissionMatrixProps {
  permissions: Permission[]
  selectedPermissions: string[]
  onToggle: (permissionCode: string) => void
  disabled?: boolean
}

function PermissionMatrix({
  permissions,
  selectedPermissions,
  onToggle,
  disabled,
}: PermissionMatrixProps) {
  // Group permissions by category
  const groupedPermissions = permissions.reduce((acc, perm) => {
    const category = perm.category || 'other'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(perm)
    return acc
  }, {} as Record<string, Permission[]>)

  return (
    <Accordion type="multiple" className="w-full">
      {Object.entries(groupedPermissions).map(([category, perms]) => {
        const categoryInfo = PERMISSION_CATEGORIES[category as keyof typeof PERMISSION_CATEGORIES]
        const selectedCount = perms.filter((p) =>
          selectedPermissions.includes(p.code)
        ).length

        return (
          <AccordionItem key={category} value={category}>
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <span>{categoryInfo?.icon || '📁'}</span>
                <span>{categoryInfo?.label || category}</span>
                <Badge variant="secondary" className="ml-2">
                  {selectedCount}/{perms.length}
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2">
                {perms.map((perm) => (
                  <div
                    key={perm.id}
                    className="flex items-start space-x-2 p-2 rounded hover:bg-muted/50"
                  >
                    <Checkbox
                      id={`perm-${perm.id}`}
                      checked={selectedPermissions.includes(perm.code)}
                      onCheckedChange={() => onToggle(perm.code)}
                      disabled={disabled}
                    />
                    <div className="space-y-0.5">
                      <label
                        htmlFor={`perm-${perm.id}`}
                        className="text-sm font-medium cursor-pointer"
                      >
                        {perm.name}
                      </label>
                      {perm.description && (
                        <p className="text-xs text-muted-foreground">
                          {perm.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )
      })}
    </Accordion>
  )
}

function CreateRoleDialog() {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const { data: permissions } = useQuery<Permission[]>({
    queryKey: ['permissions'],
    queryFn: async () => {
      const response = await api.get<Permission[]>('/permissions')
      return response.data
    },
  })

  const form = useForm<CreateRoleFormData>({
    resolver: zodResolver(createRoleSchema),
    defaultValues: {
      name: '',
      description: '',
      permissions: [],
    },
  })

  const mutation = useMutation({
    mutationFn: async (data: CreateRoleFormData) => {
      const response = await api.post('/roles', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      setOpen(false)
      form.reset()
      setError(null)
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Failed to create role')
    },
  })

  const selectedPermissions = form.watch('permissions')

  const togglePermission = (code: string) => {
    const current = form.getValues('permissions')
    if (current.includes(code)) {
      form.setValue(
        'permissions',
        current.filter((c) => c !== code),
        { shouldValidate: true }
      )
    } else {
      form.setValue('permissions', [...current, code], { shouldValidate: true })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Role
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Create Custom Role</DialogTitle>
          <DialogDescription>
            Define a new role with specific permissions.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))}>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="role-name">Role Name</Label>
                <Input
                  id="role-name"
                  placeholder="custom_analyst"
                  {...form.register('name')}
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.name.message}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Lowercase letters, numbers, and underscores only
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role-description">Description (optional)</Label>
                <Input
                  id="role-description"
                  placeholder="A custom role for..."
                  {...form.register('description')}
                />
              </div>

              <div className="space-y-2">
                <Label>Permissions</Label>
                {permissions && (
                  <PermissionMatrix
                    permissions={permissions}
                    selectedPermissions={selectedPermissions}
                    onToggle={togglePermission}
                  />
                )}
                {form.formState.errors.permissions && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.permissions.message}
                  </p>
                )}
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Role'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface EditRoleDialogProps {
  role: Role
  open: boolean
  onOpenChange: (open: boolean) => void
}

function EditRoleDialog({ role, open, onOpenChange }: EditRoleDialogProps) {
  const [error, setError] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const { data: permissions } = useQuery<Permission[]>({
    queryKey: ['permissions'],
    queryFn: async () => {
      const response = await api.get<Permission[]>('/permissions')
      return response.data
    },
  })

  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(
    role.permissions.map((p) => p.code)
  )

  const mutation = useMutation({
    mutationFn: (perms: string[]) =>
      api.put(`/roles/${role.id}/permissions`, { permissions: perms }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      onOpenChange(false)
      setError(null)
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Failed to update role')
    },
  })

  const togglePermission = (code: string) => {
    setSelectedPermissions((current) =>
      current.includes(code)
        ? current.filter((c) => c !== code)
        : [...current, code]
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Edit Role: {role.name}</DialogTitle>
          <DialogDescription>
            Modify the permissions for this role.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {permissions && (
              <PermissionMatrix
                permissions={permissions}
                selectedPermissions={selectedPermissions}
                onToggle={togglePermission}
                disabled={!role.is_custom}
              />
            )}

            {!role.is_custom && (
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  System roles cannot be modified. Create a custom role instead.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate(selectedPermissions)}
            disabled={!role.is_custom || mutation.isPending}
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function RolesManager() {
  const [editingRole, setEditingRole] = useState<Role | null>(null)

  const { data: roles, isLoading, error } = useQuery<Role[]>({
    queryKey: ['roles'],
    queryFn: async () => {
      const response = await api.get<Role[]>('/roles')
      return response.data
    },
  })

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex justify-end">
        <CreateRoleDialog />
      </div>

      {/* Error State */}
      {error && (
        <div className="text-center py-8 text-destructive">
          Failed to load roles. Please try again.
        </div>
      )}

      {/* Roles Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Role</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Permissions</TableHead>
              <TableHead className="text-right">Users</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-8 ml-auto" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-16" />
                  </TableCell>
                </TableRow>
              ))
            ) : roles?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <p className="text-muted-foreground">
                    No roles found. Create a custom role to get started.
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              roles?.map((role) => (
                <TableRow key={role.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{role.name}</span>
                    </div>
                    {role.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {role.description}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    {role.is_custom ? (
                      <Badge variant="outline">Custom</Badge>
                    ) : (
                      <Badge variant="secondary">System</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {role.permissions.length} permissions
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{role.users_count ?? 0}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingRole(role)}
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Role Dialog */}
      {editingRole && (
        <EditRoleDialog
          role={editingRole}
          open={!!editingRole}
          onOpenChange={(open) => !open && setEditingRole(null)}
        />
      )}
    </div>
  )
}
