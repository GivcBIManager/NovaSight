/**
 * Create Tenant Dialog Component
 * 
 * Dialog for creating new tenants with admin user setup
 */

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Plus, AlertCircle, Loader2 } from 'lucide-react'
import api from '@/lib/api'
import type { CreateTenantData } from '../types'

const createTenantSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters'),
  plan: z.enum(['starter', 'professional', 'enterprise']),
  admin_email: z.string().email('Invalid email address'),
  admin_name: z.string().min(1, 'Admin name is required'),
  admin_password: z.string()
    .min(12, 'Password must be at least 12 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
})

type FormData = z.infer<typeof createTenantSchema>

const PLAN_DESCRIPTIONS = {
  starter: 'Up to 5 users, 3 connections, 10 GB storage',
  professional: 'Up to 25 users, 10 connections, 100 GB storage',
  enterprise: 'Unlimited users & connections, 1 TB storage',
}

export function CreateTenantDialog() {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const form = useForm<FormData>({
    resolver: zodResolver(createTenantSchema),
    defaultValues: {
      name: '',
      plan: 'starter',
      admin_email: '',
      admin_name: '',
      admin_password: '',
    },
  })

  const mutation = useMutation({
    mutationFn: async (data: CreateTenantData) => {
      const response = await api.post('/admin/tenants', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
      queryClient.invalidateQueries({ queryKey: ['platform-stats'] })
      setOpen(false)
      form.reset()
      setError(null)
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Failed to create tenant')
    },
  })

  const onSubmit = (data: FormData) => {
    setError(null)
    mutation.mutate(data)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Tenant
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Tenant</DialogTitle>
          <DialogDescription>
            Set up a new tenant organization with an admin user.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Tenant Details */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">
              Tenant Details
            </h4>
            
            <div className="space-y-2">
              <Label htmlFor="name">Organization Name</Label>
              <Input
                id="name"
                placeholder="Acme Corporation"
                {...form.register('name')}
              />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan">Plan</Label>
              <Select
                value={form.watch('plan')}
                onValueChange={(value: 'starter' | 'professional' | 'enterprise') => 
                  form.setValue('plan', value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="starter">
                    <div className="flex flex-col">
                      <span>Starter</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="professional">
                    <div className="flex flex-col">
                      <span>Professional</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="enterprise">
                    <div className="flex flex-col">
                      <span>Enterprise</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {PLAN_DESCRIPTIONS[form.watch('plan')]}
              </p>
            </div>
          </div>

          {/* Admin User Details */}
          <div className="space-y-4 pt-4 border-t">
            <h4 className="text-sm font-medium text-muted-foreground">
              Admin User
            </h4>
            
            <div className="space-y-2">
              <Label htmlFor="admin_name">Admin Name</Label>
              <Input
                id="admin_name"
                placeholder="John Smith"
                {...form.register('admin_name')}
              />
              {form.formState.errors.admin_name && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.admin_name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin_email">Admin Email</Label>
              <Input
                id="admin_email"
                type="email"
                placeholder="admin@example.com"
                {...form.register('admin_email')}
              />
              {form.formState.errors.admin_email && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.admin_email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin_password">Password</Label>
              <Input
                id="admin_password"
                type="password"
                placeholder="••••••••••••"
                {...form.register('admin_password')}
              />
              {form.formState.errors.admin_password && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.admin_password.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Must be at least 12 characters with uppercase, lowercase, number, and special character.
              </p>
            </div>
          </div>

          <DialogFooter>
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
                'Create Tenant'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
