/**
 * Tenant Actions Component
 * 
 * Dropdown menu with actions for managing individual tenants
 */

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  MoreHorizontal,
  Eye,
  Pencil,
  PauseCircle,
  PlayCircle,
  Trash2,
  Settings,
  Users,
} from 'lucide-react'
import api from '@/lib/api'
import type { Tenant } from '../types'

interface TenantActionsProps {
  tenant: Tenant
}

export function TenantActions({ tenant }: TenantActionsProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showSuspendDialog, setShowSuspendDialog] = useState(false)
  const [suspendReason, setSuspendReason] = useState('')
  
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const suspendMutation = useMutation({
    mutationFn: (reason: string) =>
      api.post(`/admin/tenants/${tenant.id}/suspend`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
      setShowSuspendDialog(false)
      setSuspendReason('')
    },
  })

  const reactivateMutation = useMutation({
    mutationFn: () =>
      api.post(`/admin/tenants/${tenant.id}/reactivate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () =>
      api.delete(`/admin/tenants/${tenant.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
      queryClient.invalidateQueries({ queryKey: ['platform-stats'] })
      setShowDeleteDialog(false)
    },
  })

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <DropdownMenuItem
            onClick={() => navigate(`/admin/tenants/${tenant.id}`)}
          >
            <Eye className="h-4 w-4 mr-2" />
            View Details
          </DropdownMenuItem>
          
          <DropdownMenuItem
            onClick={() => navigate(`/admin/tenants/${tenant.id}/edit`)}
          >
            <Pencil className="h-4 w-4 mr-2" />
            Edit Tenant
          </DropdownMenuItem>
          
          <DropdownMenuItem
            onClick={() => navigate(`/admin/tenants/${tenant.id}/users`)}
          >
            <Users className="h-4 w-4 mr-2" />
            Manage Users
          </DropdownMenuItem>
          
          <DropdownMenuItem
            onClick={() => navigate(`/admin/tenants/${tenant.id}/settings`)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          {tenant.is_active ? (
            <DropdownMenuItem
              onClick={() => setShowSuspendDialog(true)}
              className="text-yellow-600 focus:text-yellow-600"
            >
              <PauseCircle className="h-4 w-4 mr-2" />
              Suspend Tenant
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onClick={() => reactivateMutation.mutate()}
              className="text-green-600 focus:text-green-600"
            >
              <PlayCircle className="h-4 w-4 mr-2" />
              Reactivate Tenant
            </DropdownMenuItem>
          )}
          
          <DropdownMenuItem
            onClick={() => setShowDeleteDialog(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Tenant
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Suspend Dialog */}
      <Dialog open={showSuspendDialog} onOpenChange={setShowSuspendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend Tenant</DialogTitle>
            <DialogDescription>
              This will disable access for all users in "{tenant.name}".
              All running jobs will be paused.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for suspension</Label>
            <Textarea
              id="reason"
              placeholder="Enter the reason for suspending this tenant..."
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
            />
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSuspendDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => suspendMutation.mutate(suspendReason)}
              disabled={!suspendReason.trim() || suspendMutation.isPending}
            >
              {suspendMutation.isPending ? 'Suspending...' : 'Suspend Tenant'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tenant</AlertDialogTitle>
            <AlertDialogDescription>
              This action will schedule "{tenant.name}" for deletion. 
              All data will be retained for 30 days before permanent removal.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete Tenant'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
