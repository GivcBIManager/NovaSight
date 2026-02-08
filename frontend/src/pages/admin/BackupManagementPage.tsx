import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  HardDrive,
  Download,
  Trash2,
  Shield,
  Clock,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Plus,
  RotateCcw,
  Search,
  Filter,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Label } from '@/components/ui/label'
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
import api from '@/lib/api'

interface Backup {
  id: string
  key: string
  database_type: string
  size: number
  created_at: string
  status: string
  checksum?: string
  metadata?: Record<string, unknown>
}

interface BackupStats {
  total_backups: number
  total_size: number
  by_type: Record<string, { count: number; size: number }>
  latest_backup?: string
  oldest_backup?: string
}

interface RecoveryPoint {
  timestamp: string
  database_type: string
  available: boolean
}

const DB_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'postgresql', label: 'PostgreSQL' },
  { value: 'clickhouse', label: 'ClickHouse' },
  { value: 'redis', label: 'Redis' },
]

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString()
}

export function BackupManagementPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('backups')
  const [filterType, setFilterType] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedBackup, setSelectedBackup] = useState<Backup | null>(null)

  // Create backup form
  const [createDbType, setCreateDbType] = useState('postgresql')

  // PITR form
  const [pitrTimestamp, setPitrTimestamp] = useState('')
  const [pitrDbType, setPitrDbType] = useState('postgresql')

  // ── Queries ──
  const { data: backupsData, isLoading: isLoadingBackups } = useQuery({
    queryKey: ['backups', filterType],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filterType) params.set('database_type', filterType)
      params.set('limit', '50')
      const res = await api.get(`/admin/backups?${params.toString()}`)
      return res.data
    },
  })

  const { data: statsData } = useQuery({
    queryKey: ['backups', 'stats', filterType],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filterType) params.set('database_type', filterType)
      const res = await api.get(`/admin/backups/stats?${params.toString()}`)
      return res.data as BackupStats
    },
  })

  const { data: recoveryPoints, isLoading: isLoadingRecovery } = useQuery({
    queryKey: ['backups', 'recovery-points', pitrDbType],
    queryFn: async () => {
      const params = new URLSearchParams({ database_type: pitrDbType })
      const res = await api.get(`/admin/backups/recovery-points?${params.toString()}`)
      return res.data as RecoveryPoint[]
    },
    enabled: activeTab === 'recovery',
  })

  // ── Mutations ──
  const createBackupMutation = useMutation({
    mutationFn: async (dbType: string) => {
      const res = await api.post(`/admin/backups/${dbType}`)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backups'] })
      setCreateDialogOpen(false)
    },
  })

  const deleteBackupMutation = useMutation({
    mutationFn: async (key: string) => {
      const res = await api.delete(`/admin/backups/${encodeURIComponent(key)}`)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backups'] })
      setDeleteDialogOpen(false)
      setSelectedBackup(null)
    },
  })

  const verifyBackupMutation = useMutation({
    mutationFn: async (key: string) => {
      const res = await api.post(`/admin/backups/${encodeURIComponent(key)}/verify`)
      return res.data
    },
  })

  const downloadBackupMutation = useMutation({
    mutationFn: async (key: string) => {
      const res = await api.get(`/admin/backups/${encodeURIComponent(key)}/download`)
      return res.data as { download_url: string; expires_in: number }
    },
    onSuccess: (data) => {
      window.open(data.download_url, '_blank')
    },
  })

  const pitrMutation = useMutation({
    mutationFn: async (params: { target_time: string; database_type: string }) => {
      const res = await api.post('/admin/backups/pitr', params)
      return res.data
    },
    onSuccess: () => {
      setRestoreDialogOpen(false)
    },
  })

  const backups: Backup[] = backupsData?.backups ?? backupsData?.data ?? []
  const filteredBackups = searchTerm
    ? backups.filter(
        (b) =>
          b.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
          b.database_type.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : backups

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Backup & Recovery</h1>
          <p className="text-muted-foreground mt-1">
            Manage database backups, restore points, and disaster recovery
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['backups'] })}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Backup
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {statsData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Backups</CardDescription>
              <CardTitle className="text-2xl">{statsData.total_backups}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Size</CardDescription>
              <CardTitle className="text-2xl">{formatBytes(statsData.total_size)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Latest Backup</CardDescription>
              <CardTitle className="text-sm">
                {statsData.latest_backup ? formatDate(statsData.latest_backup) : 'N/A'}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>By Type</CardDescription>
              <CardContent className="p-0">
                <div className="flex gap-2 flex-wrap">
                  {statsData.by_type &&
                    Object.entries(statsData.by_type).map(([type, info]) => (
                      <Badge key={type} variant="secondary" className="text-xs">
                        {type}: {info.count}
                      </Badge>
                    ))}
                </div>
              </CardContent>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="backups">Backups</TabsTrigger>
          <TabsTrigger value="recovery">Point-in-Time Recovery</TabsTrigger>
        </TabsList>

        {/* Backups Tab */}
        <TabsContent value="backups" className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search backups..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                {DB_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoadingBackups ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredBackups.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <HardDrive className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">No Backups Found</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Create your first backup to get started with disaster recovery.
                </p>
                <Button className="mt-4" onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Backup
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Backup</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBackups.map((backup) => (
                    <TableRow key={backup.key}>
                      <TableCell className="font-mono text-xs max-w-[300px] truncate">
                        {backup.key}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{backup.database_type}</Badge>
                      </TableCell>
                      <TableCell>{formatBytes(backup.size)}</TableCell>
                      <TableCell className="text-sm">{formatDate(backup.created_at)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={backup.status === 'completed' ? 'default' : 'secondary'}
                        >
                          {backup.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => verifyBackupMutation.mutate(backup.key)}
                            disabled={verifyBackupMutation.isPending}
                            title="Verify integrity"
                          >
                            <Shield className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => downloadBackupMutation.mutate(backup.key)}
                            disabled={downloadBackupMutation.isPending}
                            title="Download"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              setSelectedBackup(backup)
                              setDeleteDialogOpen(true)
                            }}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}

          {/* Verification result toast */}
          {verifyBackupMutation.data && (
            <Card className={verifyBackupMutation.data.valid ? 'border-green-200' : 'border-red-200'}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  {verifyBackupMutation.data.valid ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <span className="text-sm text-green-700">Backup integrity verified successfully</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-5 w-5 text-red-600" />
                      <span className="text-sm text-red-700">Backup integrity check failed</span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* PITR Tab */}
        <TabsContent value="recovery" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5" />
                Point-in-Time Recovery
              </CardTitle>
              <CardDescription>
                Restore your database to a specific point in time. This is a destructive operation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Database Type</Label>
                  <Select value={pitrDbType} onValueChange={setPitrDbType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="postgresql">PostgreSQL</SelectItem>
                      <SelectItem value="clickhouse">ClickHouse</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Target Timestamp</Label>
                  <Input
                    type="datetime-local"
                    value={pitrTimestamp}
                    onChange={(e) => setPitrTimestamp(e.target.value)}
                  />
                </div>
              </div>

              {/* Available recovery points */}
              {isLoadingRecovery ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading recovery points...
                </div>
              ) : recoveryPoints && recoveryPoints.length > 0 ? (
                <div>
                  <Label className="text-xs font-semibold uppercase text-muted-foreground">
                    Available Recovery Points
                  </Label>
                  <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
                    {(recoveryPoints as RecoveryPoint[]).map((point, idx) => (
                      <Button
                        key={idx}
                        variant="outline"
                        size="sm"
                        className="text-xs justify-start"
                        disabled={!point.available}
                        onClick={() =>
                          setPitrTimestamp(
                            new Date(point.timestamp).toISOString().slice(0, 16)
                          )
                        }
                      >
                        <Clock className="mr-1 h-3 w-3" />
                        {formatDate(point.timestamp)}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No recovery points available.</p>
              )}

              <div className="flex items-center gap-2 p-3 rounded-md bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-200">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <p className="text-sm">
                  Point-in-time recovery will overwrite current data. This action cannot be
                  undone. Make sure to create a fresh backup before proceeding.
                </p>
              </div>

              <Button
                variant="destructive"
                disabled={!pitrTimestamp || pitrMutation.isPending}
                onClick={() => setRestoreDialogOpen(true)}
              >
                {pitrMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="mr-2 h-4 w-4" />
                )}
                Initiate Recovery
              </Button>

              {pitrMutation.data && (
                <div className="mt-4 p-3 rounded-md bg-green-50 dark:bg-green-950 text-green-800 dark:text-green-200">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="text-sm font-medium">Recovery initiated successfully</span>
                  </div>
                  <p className="text-xs mt-1">Job ID: {pitrMutation.data.job_id ?? 'N/A'}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Backup Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Backup</DialogTitle>
            <DialogDescription>
              Trigger an immediate backup for the selected database type.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Database Type</Label>
              <Select value={createDbType} onValueChange={setCreateDbType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="postgresql">PostgreSQL</SelectItem>
                  <SelectItem value="clickhouse">ClickHouse</SelectItem>
                  <SelectItem value="redis">Redis</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createBackupMutation.mutate(createDbType)}
              disabled={createBackupMutation.isPending}
            >
              {createBackupMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <HardDrive className="mr-2 h-4 w-4" />
              )}
              Create Backup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm PITR Dialog */}
      <AlertDialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Point-in-Time Recovery</AlertDialogTitle>
            <AlertDialogDescription>
              This will restore <strong>{pitrDbType}</strong> to{' '}
              <strong>{pitrTimestamp ? formatDate(pitrTimestamp) : 'N/A'}</strong>. All data
              after this point will be lost. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                pitrMutation.mutate({
                  target_time: new Date(pitrTimestamp).toISOString(),
                  database_type: pitrDbType,
                })
              }
            >
              Confirm Recovery
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Backup</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete this backup? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => selectedBackup && deleteBackupMutation.mutate(selectedBackup.key)}
            >
              {deleteBackupMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
