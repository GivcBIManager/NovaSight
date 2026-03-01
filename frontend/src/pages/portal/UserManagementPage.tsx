/**
 * User Management Page (Portal Admin)
 * 
 * Cross-tenant user management for super admins.
 * View, filter, and manage all platform users.
 */

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import {
  portalAdminService,
  type PortalUser,
  type PortalTenant,
  type PaginatedResponse,
  type PortalUserCreateData,
} from '@/services/portalAdminService'
import {
  Search,
  Users,
  MoreVertical,
  UserCheck,
  UserX,
  Lock,
  Eye,
  Loader2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Mail,
  Shield,
  Building2,
  UserPlus,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { getStatusClasses, getRoleClasses } from '@/lib/colors'

export const UserManagementPage: React.FC = () => {
  const { toast } = useToast()
  const [data, setData] = useState<PaginatedResponse<PortalUser> | null>(null)
  const [tenants, setTenants] = useState<PortalTenant[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tenantFilter, setTenantFilter] = useState<string>('all')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const perPage = 15

  // Dialog states
  const [viewingUser, setViewingUser] = useState<PortalUser | null>(null)
  const [deactivatingUser, setDeactivatingUser] = useState<PortalUser | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [newUser, setNewUser] = useState<PortalUserCreateData>({
    email: '',
    name: '',
    password: '',
    tenant_id: '',
    roles: ['viewer'],
  })
  const [statusChangeUser, setStatusChangeUser] = useState<PortalUser | null>(null)
  const [newStatus, setNewStatus] = useState<string>('active')

  const loadUsers = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await portalAdminService.listUsers({
        page,
        per_page: perPage,
        search: search || undefined,
        tenant_id: tenantFilter !== 'all' ? tenantFilter : undefined,
        role: roleFilter !== 'all' ? roleFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      })
      setData(result)
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to load users',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [page, search, tenantFilter, roleFilter, statusFilter, toast])

  const loadTenants = useCallback(async () => {
    try {
      const result = await portalAdminService.listTenants({ per_page: 100 })
      setTenants(result.items || [])
    } catch {
      // Silently fail - filter won't work but page still loads
    }
  }, [])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  useEffect(() => {
    loadTenants()
  }, [loadTenants])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const handleStatusChange = async () => {
    if (!statusChangeUser) return
    try {
      await portalAdminService.updateUserStatus(statusChangeUser.id, newStatus)
      toast({ title: 'Success', description: `User status updated to ${newStatus}` })
      setStatusChangeUser(null)
      loadUsers()
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to update user',
        variant: 'destructive',
      })
    }
  }

  const handleDeactivate = async () => {
    if (!deactivatingUser) return
    try {
      await portalAdminService.deleteUser(deactivatingUser.id)
      toast({ title: 'Success', description: 'User deactivated' })
      setDeactivatingUser(null)
      loadUsers()
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to deactivate user',
        variant: 'destructive',
      })
    }
  }

  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.name || !newUser.password || !newUser.tenant_id) {
      toast({ title: 'Validation Error', description: 'All fields are required', variant: 'destructive' })
      return
    }
    setIsCreating(true)
    try {
      await portalAdminService.createUser(newUser)
      toast({ title: 'Success', description: `User "${newUser.name}" created successfully` })
      setShowCreateDialog(false)
      setNewUser({ email: '', name: '', password: '', tenant_id: '', roles: ['viewer'] })
      loadUsers()
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to create user',
        variant: 'destructive',
      })
    } finally {
      setIsCreating(false)
    }
  }

  const getRoleDisplayName = (role: PortalUser['roles'][0]) => {
    return role.display_name || role.name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
            View and manage all users across all tenants.
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Add New User
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={tenantFilter} onValueChange={(v) => { setTenantFilter(v); setPage(1) }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Tenants" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tenants</SelectItem>
                {tenants.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1) }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="super_admin">Super Admin</SelectItem>
                <SelectItem value="tenant_admin">Tenant Admin</SelectItem>
                <SelectItem value="data_engineer">Data Engineer</SelectItem>
                <SelectItem value="bi_developer">BI Developer</SelectItem>
                <SelectItem value="analyst">Analyst</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
                <SelectItem value="auditor">Auditor</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="locked">Locked</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={loadUsers}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* User List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Platform Users
            {data && (
              <Badge variant="secondary" className="ml-2">
                {data.total}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            All registered users across all organizations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !data?.items?.length ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No users found</p>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium">User</th>
                      <th className="text-left p-3 font-medium">Tenant</th>
                      <th className="text-left p-3 font-medium">Roles</th>
                      <th className="text-left p-3 font-medium">Status</th>
                      <th className="text-left p-3 font-medium">Last Login</th>
                      <th className="text-right p-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((user) => (
                      <tr key={user.id} className="border-b last:border-b-0 hover:bg-muted/30 transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
                              {user.name?.charAt(0)?.toUpperCase() || 'U'}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium truncate">{user.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="text-sm truncate">{user.tenant_name || 'Unknown'}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {user.roles?.slice(0, 2).map((role) => (
                              <Badge
                                key={role.id || role.name}
                                variant="outline"
                                className={`text-xs ${getRoleClasses(role.name)}`}
                              >
                                {getRoleDisplayName(role)}
                              </Badge>
                            ))}
                            {user.roles?.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{user.roles.length - 2}
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge variant="outline" className={getStatusClasses(user.status)}>
                            {user.status}
                          </Badge>
                        </td>
                        <td className="p-3 text-muted-foreground text-sm">
                          {user.last_login_at
                            ? new Date(user.last_login_at).toLocaleDateString()
                            : 'Never'}
                        </td>
                        <td className="p-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setViewingUser(user)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {user.status !== 'active' && (
                                <DropdownMenuItem onClick={() => {
                                  setStatusChangeUser(user)
                                  setNewStatus('active')
                                }}>
                                  <UserCheck className="h-4 w-4 mr-2" />
                                  Activate
                                </DropdownMenuItem>
                              )}
                              {user.status === 'active' && (
                                <DropdownMenuItem onClick={() => {
                                  setStatusChangeUser(user)
                                  setNewStatus('locked')
                                }}>
                                  <Lock className="h-4 w-4 mr-2" />
                                  Lock Account
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setDeactivatingUser(user)}
                              >
                                <UserX className="h-4 w-4 mr-2" />
                                Deactivate
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {data.pages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {data.page} of {data.pages} · {data.total} total
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= data.pages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* View User Dialog */}
      <UserDetailDialog user={viewingUser} onClose={() => setViewingUser(null)} />

      {/* Status Change Confirmation */}
      <AlertDialog open={!!statusChangeUser} onOpenChange={() => setStatusChangeUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change User Status</AlertDialogTitle>
            <AlertDialogDescription>
              Set <strong>{statusChangeUser?.name}</strong>'s status to{' '}
              <strong>{newStatus}</strong>?
              {newStatus === 'locked' && ' The user will be unable to log in.'}
              {newStatus === 'active' && ' The user will regain full access.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleStatusChange}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Deactivate Confirmation */}
      <AlertDialog open={!!deactivatingUser} onOpenChange={() => setDeactivatingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate <strong>{deactivatingUser?.name}</strong> ({deactivatingUser?.email})?
              They will lose all access to the platform.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeactivate} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create User Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => {
        setShowCreateDialog(open)
        if (!open) setNewUser({ email: '', name: '', password: '', tenant_id: '', roles: ['viewer'] })
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Add New User
            </DialogTitle>
            <DialogDescription>
              Create a new user and assign them to a tenant.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="create-name">Full Name</Label>
              <Input
                id="create-name"
                placeholder="John Doe"
                value={newUser.name}
                onChange={(e) => setNewUser((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-email">Email Address</Label>
              <Input
                id="create-email"
                type="email"
                placeholder="john@example.com"
                value={newUser.email}
                onChange={(e) => setNewUser((prev) => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-password">Password</Label>
              <Input
                id="create-password"
                type="password"
                placeholder="Minimum 8 characters"
                value={newUser.password}
                onChange={(e) => setNewUser((prev) => ({ ...prev, password: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-tenant">Tenant</Label>
              <Select
                value={newUser.tenant_id}
                onValueChange={(v) => setNewUser((prev) => ({ ...prev, tenant_id: v }))}
              >
                <SelectTrigger id="create-tenant">
                  <SelectValue placeholder="Select a tenant" />
                </SelectTrigger>
                <SelectContent>
                  {tenants.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-role">Role</Label>
              <Select
                value={newUser.roles?.[0] || 'viewer'}
                onValueChange={(v) => setNewUser((prev) => ({ ...prev, roles: [v] }))}
              >
                <SelectTrigger id="create-role">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                  <SelectItem value="tenant_admin">Tenant Admin</SelectItem>
                  <SelectItem value="data_engineer">Data Engineer</SelectItem>
                  <SelectItem value="bi_developer">BI Developer</SelectItem>
                  <SelectItem value="analyst">Analyst</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                  <SelectItem value="auditor">Auditor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateUser} disabled={isCreating} className="gap-2">
              {isCreating && <Loader2 className="h-4 w-4 animate-spin" />}
              {isCreating ? 'Creating...' : 'Create User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ---- User Detail Dialog ----

interface UserDetailDialogProps {
  user: PortalUser | null
  onClose: () => void
}

const UserDetailDialog: React.FC<UserDetailDialogProps> = ({ user, onClose }) => {
  if (!user) return null

  return (
    <Dialog open={!!user} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>User Details</DialogTitle>
          <DialogDescription>Complete user information</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* User Header */}
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xl">
              {user.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div>
              <h3 className="text-lg font-semibold">{user.name}</h3>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Mail className="h-3.5 w-3.5" />
                {user.email}
              </div>
            </div>
          </div>

          <div className="grid gap-3 text-sm border-t pt-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" /> Tenant
              </span>
              <span className="font-medium">{user.tenant_name || 'Unknown'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <Badge variant="outline" className={getStatusClasses(user.status)}>
                {user.status}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5" /> Roles
              </span>
              <div className="flex flex-wrap justify-end gap-1">
                {user.roles?.map((role) => (
                  <Badge
                    key={role.id || role.name}
                    variant="outline"
                    className={`text-xs ${getRoleClasses(role.name)}`}
                  >
                    {role.display_name || role.name}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created</span>
              <span>{new Date(user.created_at).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last Login</span>
              <span>{user.last_login_at ? new Date(user.last_login_at).toLocaleString() : 'Never'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">User ID</span>
              <code className="text-xs bg-muted px-2 py-0.5 rounded">{user.id}</code>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
