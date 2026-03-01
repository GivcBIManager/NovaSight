/**
 * Audit Logs Page
 * 
 * View and search audit logs with filtering, export, and integrity verification.
 * Backend: GET /api/v1/audit/logs, GET /api/v1/audit/security-events, POST /api/v1/audit/export
 */

import { useState, useCallback } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  Shield,
  Search,
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  Info,
  Filter,
  Calendar,
  Loader2,
  ShieldCheck,
  FileText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import api from '@/lib/api'
import { getActionClasses, getSeverityIconClass } from '@/lib/colors'

interface AuditLog {
  id: string
  action: string
  resource_type: string
  resource_id: string | null
  resource_name: string | null
  user_id: string | null
  user_email: string | null
  ip_address: string | null
  changes: Record<string, unknown> | null
  extra_data: Record<string, unknown> | null
  success: boolean
  error_message: string | null
  severity: string
  timestamp: string
  integrity_verified: boolean
}

interface SecurityEvent {
  id: string
  event_type: string
  severity: string
  user_email: string
  ip_address: string
  details: string
  created_at: string
}

const SEVERITY_ICONS: Record<string, React.ReactNode> = {
  critical: <AlertTriangle className={`h-4 w-4 ${getSeverityIconClass('critical')}`} />,
  high: <AlertTriangle className={`h-4 w-4 ${getSeverityIconClass('high')}`} />,
  medium: <Info className={`h-4 w-4 ${getSeverityIconClass('medium')}`} />,
  low: <Info className={`h-4 w-4 ${getSeverityIconClass('low')}`} />,
  info: <CheckCircle className={`h-4 w-4 ${getSeverityIconClass('info')}`} />,
}

export function AuditLogsPage() {
  const { toast } = useToast()
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState<string>('all')
  const [resourceFilter, setResourceFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const perPage = 25

  // Fetch audit logs
  const { data: logsData, isLoading: logsLoading, refetch: refetchLogs } = useQuery({
    queryKey: ['audit-logs', page, search, actionFilter, resourceFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        per_page: String(perPage),
      })
      if (search) params.append('search', search)
      if (actionFilter !== 'all') params.append('action', actionFilter)
      if (resourceFilter !== 'all') params.append('resource_type', resourceFilter)
      
      const res = await api.get(`/api/v1/audit/logs?${params}`)
      return res.data.data || res.data  // Handle { success, data } wrapper
    },
  })

  // Fetch security events
  const { data: securityData, isLoading: securityLoading } = useQuery({
    queryKey: ['security-events'],
    queryFn: async () => {
      const res = await api.get('/api/v1/audit/security-events')
      return res.data.data || res.data  // Handle { success, data } wrapper
    },
  })

  // Fetch action types
  const { data: actionTypes } = useQuery({
    queryKey: ['audit-action-types'],
    queryFn: async () => {
      const res = await api.get('/api/v1/audit/actions')
      return res.data
    },
  })

  // Verify integrity
  const verifyIntegrity = useMutation({
    mutationFn: async () => {
      const res = await api.post('/api/v1/audit/verify-integrity')
      return res.data
    },
    onSuccess: (data) => {
      toast({
        title: data.valid ? 'Integrity Verified' : 'Integrity Issue Detected',
        description: data.valid
          ? 'Audit log hash chain is intact.'
          : `Found ${data.broken_links || 0} broken links in the hash chain.`,
        variant: data.valid ? 'default' : 'destructive',
      })
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to verify audit log integrity.',
        variant: 'destructive',
      })
    },
  })

  // Export audit logs
  const exportLogs = useMutation({
    mutationFn: async () => {
      const res = await api.post('/api/v1/audit/export', {
        format: 'csv',
        days: 30,
      })
      return res.data
    },
    onSuccess: () => {
      toast({
        title: 'Export Started',
        description: 'Audit log export has been initiated. You will be notified when ready.',
      })
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to export audit logs.',
        variant: 'destructive',
      })
    },
  })

  const formatDate = useCallback((dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }, [])

  const logs: AuditLog[] = logsData?.items || []
  const totalPages = logsData?.pages || 1
  const securityEvents: SecurityEvent[] = securityData?.events || []

  return (
    <div className="container py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            Audit Logs
          </h1>
          <p className="text-muted-foreground mt-1">
            Track all actions and security events across the platform
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => verifyIntegrity.mutate()}
            disabled={verifyIntegrity.isPending}
          >
            {verifyIntegrity.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <ShieldCheck className="h-4 w-4 mr-2" />
            )}
            Verify Integrity
          </Button>
          <Button
            variant="outline"
            onClick={() => exportLogs.mutate()}
            disabled={exportLogs.isPending}
          >
            {exportLogs.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Export
          </Button>
        </div>
      </div>

      <Tabs defaultValue="logs">
        <TabsList>
          <TabsTrigger value="logs">
            <FileText className="h-4 w-4 mr-2" />
            Audit Logs
          </TabsTrigger>
          <TabsTrigger value="security">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Security Events
          </TabsTrigger>
        </TabsList>

        {/* Audit Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search logs..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                    className="pl-10"
                  />
                </div>
                <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1) }}>
                  <SelectTrigger className="w-[160px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="All actions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    {(actionTypes?.actions || []).map((a: string) => (
                      <SelectItem key={a} value={a}>{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={resourceFilter} onValueChange={(v) => { setResourceFilter(v); setPage(1) }}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All resources" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Resources</SelectItem>
                    <SelectItem value="user">Users</SelectItem>
                    <SelectItem value="tenant">Tenants</SelectItem>
                    <SelectItem value="connection">Connections</SelectItem>
                    <SelectItem value="dag">DAGs</SelectItem>
                    <SelectItem value="dashboard">Dashboards</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={() => refetchLogs()}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Logs Table */}
          <Card>
            <CardContent className="p-0">
              {logsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : logs.length === 0 ? (
                <div className="text-center py-12">
                  <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No audit logs found</p>
                </div>
              ) : (
                <>
                  <div className="rounded-md">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left p-3 font-medium">Timestamp</th>
                          <th className="text-left p-3 font-medium">Action</th>
                          <th className="text-left p-3 font-medium">Resource</th>
                          <th className="text-left p-3 font-medium">User</th>
                          <th className="text-left p-3 font-medium">IP Address</th>
                        </tr>
                      </thead>
                      <tbody>
                        {logs.map((log) => (
                          <tr key={log.id} className="border-b last:border-b-0 hover:bg-muted/30">
                            <td className="p-3 text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(log.timestamp)}
                              </div>
                            </td>
                            <td className="p-3">
                              <Badge variant="outline" className={getActionClasses(log.action)}>
                                {log.action}
                              </Badge>
                            </td>
                            <td className="p-3">
                              <div>
                                <span className="font-medium">{log.resource_type}</span>
                                {log.resource_name && (
                                  <span className="text-muted-foreground ml-1 text-xs">
                                    ({log.resource_name})
                                  </span>
                                )}
                                {!log.resource_name && log.resource_id && (
                                  <span className="text-muted-foreground ml-1 text-xs">
                                    #{log.resource_id?.slice(0, 8)}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-3">{log.user_email || '-'}</td>
                            <td className="p-3 font-mono text-xs">{log.ip_address || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between p-4 border-t">
                      <p className="text-sm text-muted-foreground">
                        Page {page} of {totalPages}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={page <= 1}
                          onClick={() => setPage(p => p - 1)}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={page >= totalPages}
                          onClick={() => setPage(p => p + 1)}
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
        </TabsContent>

        {/* Security Events Tab */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Security Events
              </CardTitle>
              <CardDescription>
                Suspicious activities and security-relevant events
              </CardDescription>
            </CardHeader>
            <CardContent>
              {securityLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : securityEvents.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">All Clear</h3>
                  <p className="text-muted-foreground">
                    No security events detected recently
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {securityEvents.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-start gap-3 p-4 rounded-lg border"
                    >
                      <div className="mt-0.5">
                        {SEVERITY_ICONS[event.severity] || SEVERITY_ICONS.info}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{event.event_type}</span>
                          <Badge variant="outline">{event.severity}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{event.details}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>{event.user_email}</span>
                          <span className="font-mono">{event.ip_address}</span>
                          <span>{formatDate(event.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
