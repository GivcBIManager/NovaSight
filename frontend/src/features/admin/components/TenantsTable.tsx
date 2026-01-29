/**
 * Tenants Table Component
 * 
 * Displays a paginated, searchable table of all tenants
 */

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Search } from 'lucide-react'
import { CreateTenantDialog } from './CreateTenantDialog'
import { TenantActions } from './TenantActions'
import { Pagination } from './Pagination'
import api from '@/lib/api'
import { formatDistanceToNow } from 'date-fns'
import type { Tenant, PaginatedResponse } from '../types'

function formatDate(dateString: string): string {
  try {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true })
  } catch {
    return dateString
  }
}

function getPlanBadgeVariant(plan: string): 'default' | 'secondary' | 'outline' {
  switch (plan) {
    case 'enterprise':
      return 'default'
    case 'professional':
      return 'secondary'
    default:
      return 'outline'
  }
}

export function TenantsTable() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Debounce search input
  const handleSearchChange = (value: string) => {
    setSearch(value)
    // Reset to first page on search
    setPage(1)
    // Simple debounce
    const timeoutId = setTimeout(() => {
      setDebouncedSearch(value)
    }, 300)
    return () => clearTimeout(timeoutId)
  }

  const { data, isLoading, error } = useQuery<PaginatedResponse<Tenant>>({
    queryKey: ['tenants', page, debouncedSearch],
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<Tenant>>('/admin/tenants', {
        params: { page, search: debouncedSearch, per_page: 10 },
      })
      return response.data
    },
  })

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tenants..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <CreateTenantDialog />
      </div>

      {/* Error State */}
      {error && (
        <div className="text-center py-8 text-destructive">
          Failed to load tenants. Please try again.
        </div>
      )}

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Users</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Loading skeleton
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-14" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-8 ml-auto" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-8" />
                  </TableCell>
                </TableRow>
              ))
            ) : data?.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <p className="text-muted-foreground">
                    {debouncedSearch
                      ? 'No tenants found matching your search.'
                      : 'No tenants yet. Create your first tenant to get started.'}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              data?.items.map((tenant) => (
                <TableRow key={tenant.id}>
                  <TableCell className="font-medium">{tenant.name}</TableCell>
                  <TableCell className="text-muted-foreground font-mono text-sm">
                    {tenant.slug}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getPlanBadgeVariant(tenant.plan)}>
                      {tenant.plan}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {tenant.is_active ? (
                      <Badge variant="success">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{tenant.users_count}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDate(tenant.created_at)}
                  </TableCell>
                  <TableCell>
                    <TenantActions tenant={tenant} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {data && data.pages > 1 && (
        <Pagination
          page={page}
          totalPages={data.pages}
          onPageChange={setPage}
        />
      )}
    </div>
  )
}
