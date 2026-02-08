import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Database, CheckCircle, XCircle, Loader2, RefreshCw } from 'lucide-react'
import { useDataSources, useTestConnection } from '@/features/datasources/hooks'
import { useToast } from '@/components/ui/use-toast'
import { ConnectionWizard } from '@/features/datasources/components/ConnectionWizard'
import type { DataSource } from '@/types/datasource'

export function ConnectionsPage() {
  const [wizardOpen, setWizardOpen] = useState(false)
  const { data, isLoading, error, refetch } = useDataSources()
  const testConnection = useTestConnection()
  const { toast } = useToast()

  const connections = data?.items || []

  const handleTestConnection = async (id: string) => {
    try {
      const result = await testConnection.mutateAsync(id)
      toast({
        title: result.success ? 'Connection Successful' : 'Connection Failed',
        description: result.message,
        variant: result.success ? 'default' : 'destructive',
      })
    } catch {
      toast({
        title: 'Test Failed',
        description: 'Unable to test connection',
        variant: 'destructive',
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <p className="text-destructive">Failed to load connections</p>
        <Button onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Data Connections</h1>
          <p className="text-muted-foreground">
            Manage connections to your data sources
          </p>
        </div>
        <Button onClick={() => setWizardOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Connection
        </Button>
      </div>

      {/* Connections Grid */}
      {connections.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Database className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No connections yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first database connection to get started.
            </p>
            <Button onClick={() => setWizardOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Connection
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {connections.map((conn: DataSource) => (
            <Card key={conn.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">{conn.name}</CardTitle>
                  </div>
                  {conn.status === 'active' ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type:</span>
                    <span className="font-medium uppercase">{conn.db_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Host:</span>
                    <span className="font-medium">{conn.host}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <span
                      className={`font-medium ${
                        conn.status === 'active'
                          ? 'text-green-600'
                          : 'text-gray-500'
                      }`}
                    >
                      {conn.status}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleTestConnection(conn.id)}
                    disabled={testConnection.isPending}
                  >
                    {testConnection.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Test'
                    )}
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/app/datasources/${conn.id}`}>Edit</Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/app/datasources/${conn.id}`}>Browse</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Connection Wizard Dialog */}
      <ConnectionWizard open={wizardOpen} onOpenChange={setWizardOpen} />
    </div>
  )
}
