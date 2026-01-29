/**
 * Edit User Dialog Component
 * 
 * Dialog for editing existing user details and roles
 */

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { AlertCircle, Loader2 } from 'lucide-react'
import api from '@/lib/api'
import type { User, Role, UpdateUserData } from '../types'

const editUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  is_active: z.boolean(),
  roles: z.array(z.string()).min(1, 'Select at least one role'),
})

type FormData = z.infer<typeof editUserSchema>

interface EditUserDialogProps {
  user: User
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditUserDialog({ user, open, onOpenChange }: EditUserDialogProps) {
  const [error, setError] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const { data: roles } = useQuery<Role[]>({
    queryKey: ['roles'],
    queryFn: async () => {
      const response = await api.get<Role[]>('/roles')
      return response.data
    },
  })

  const form = useForm<FormData>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      name: user.name,
      email: user.email,
      is_active: user.is_active,
      roles: user.roles.map((r) => r.name),
    },
  })

  // Reset form when user changes
  useEffect(() => {
    form.reset({
      name: user.name,
      email: user.email,
      is_active: user.is_active,
      roles: user.roles.map((r) => r.name),
    })
  }, [user, form])

  const mutation = useMutation({
    mutationFn: async (data: UpdateUserData) => {
      const response = await api.put(`/users/${user.id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      onOpenChange(false)
      setError(null)
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Failed to update user')
    },
  })

  const onSubmit = (data: FormData) => {
    setError(null)
    mutation.mutate(data)
  }

  const selectedRoles = form.watch('roles')

  const toggleRole = (roleName: string) => {
    const current = form.getValues('roles')
    if (current.includes(roleName)) {
      form.setValue(
        'roles',
        current.filter((r) => r !== roleName),
        { shouldValidate: true }
      )
    } else {
      form.setValue('roles', [...current, roleName], { shouldValidate: true })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update user details and permissions.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="edit-name">Full Name</Label>
            <Input
              id="edit-name"
              {...form.register('name')}
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-email">Email</Label>
            <Input
              id="edit-email"
              type="email"
              {...form.register('email')}
            />
            {form.formState.errors.email && (
              <p className="text-sm text-destructive">
                {form.formState.errors.email.message}
              </p>
            )}
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="is-active">Active Status</Label>
              <p className="text-sm text-muted-foreground">
                Inactive users cannot log in
              </p>
            </div>
            <Switch
              id="is-active"
              checked={form.watch('is_active')}
              onCheckedChange={(checked) => form.setValue('is_active', checked)}
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Roles</Label>
            <ScrollArea className="h-32 border rounded-md p-3">
              <div className="space-y-2">
                {roles?.map((role) => (
                  <div
                    key={role.id}
                    className="flex items-center space-x-2"
                  >
                    <Checkbox
                      id={`edit-role-${role.id}`}
                      checked={selectedRoles.includes(role.name)}
                      onCheckedChange={() => toggleRole(role.name)}
                    />
                    <label
                      htmlFor={`edit-role-${role.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {role.name}
                      {role.description && (
                        <span className="text-muted-foreground ml-1">
                          - {role.description}
                        </span>
                      )}
                    </label>
                  </div>
                ))}
              </div>
            </ScrollArea>
            {form.formState.errors.roles && (
              <p className="text-sm text-destructive">
                {form.formState.errors.roles.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
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
        </form>
      </DialogContent>
    </Dialog>
  )
}
