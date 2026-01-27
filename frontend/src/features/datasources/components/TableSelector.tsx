import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { SchemaBrowser } from './SchemaBrowser'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useTestNewConnection, useCreateDataSource } from '../hooks'
import type { DatabaseType } from '@/types/datasource'

interface TableSelectorProps {
  dbType: DatabaseType
  connectionData: any
  selectedTables: Set<string>
  onSelectionChange: (selected: Set<string>) => void
}

export function TableSelector({
  dbType,
  connectionData,
  selectedTables,
  onSelectionChange,
}: TableSelectorProps) {
  const [tempConnectionId, setTempConnectionId] = useState<string | null>(null)
  const createDataSource = useCreateDataSource()

  // Create a temporary connection to browse schema
  useEffect(() => {
    const createTemp = async () => {
      try {
        // In a real implementation, we might need a special endpoint
        // for temporary connections or just use the test endpoint
        // For now, we'll show a message
      } catch (error) {
        console.error('Failed to create temporary connection:', error)
      }
    }
    createTemp()
  }, [])

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium mb-2">Select Tables (Optional)</h3>
        <p className="text-sm text-muted-foreground">
          Choose which tables you want to sync. You can change this later.
        </p>
      </div>

      <Alert>
        <AlertDescription>
          You can skip this step and sync all tables, or select specific tables now.
          Selected: {selectedTables.size} table{selectedTables.size !== 1 ? 's' : ''}
        </AlertDescription>
      </Alert>

      {tempConnectionId ? (
        <SchemaBrowser
          datasourceId={tempConnectionId}
          selectable
          selectedTables={selectedTables}
          onSelectionChange={onSelectionChange}
        />
      ) : (
        <div className="border rounded-lg p-8">
          <div className="flex flex-col items-center text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <div className="space-y-2">
              <p className="text-sm font-medium">Loading database schema...</p>
              <p className="text-xs text-muted-foreground">
                This step is optional. You can skip it and configure table selection later.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
