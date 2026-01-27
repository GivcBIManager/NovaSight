import { useState } from 'react'
import { ChevronRight, Database, Table, Loader2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { useDataSourceSchema } from '../hooks'
import type { TableInfo } from '@/types/datasource'

interface SchemaBrowserProps {
  datasourceId: string
  onTableSelect?: (schema: string, table: string) => void
  selectable?: boolean
  selectedTables?: Set<string>
  onSelectionChange?: (selected: Set<string>) => void
}

export function SchemaBrowser({
  datasourceId,
  onTableSelect,
  selectable = false,
  selectedTables = new Set(),
  onSelectionChange,
}: SchemaBrowserProps) {
  const { data: schemaData, isLoading, error } = useDataSourceSchema(datasourceId, {
    include_columns: false,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-4 border border-destructive/50 rounded-lg bg-destructive/10">
        <AlertCircle className="h-5 w-5 text-destructive" />
        <span className="text-sm text-destructive">Failed to load schema</span>
      </div>
    )
  }

  if (!schemaData || schemaData.schemas.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        <Database className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No schemas found</p>
      </div>
    )
  }

  return (
    <div className="border rounded-lg">
      <div className="flex items-center justify-between p-4 border-b bg-muted/50">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-muted-foreground" />
          <span className="font-medium">Database Schema</span>
        </div>
        <Badge variant="secondary">{schemaData.total_tables} tables</Badge>
      </div>

      <div className="divide-y">
        {schemaData.schemas.map((schema) => (
          <SchemaItem
            key={schema.name}
            schema={schema}
            onTableSelect={onTableSelect}
            selectable={selectable}
            selectedTables={selectedTables}
            onSelectionChange={onSelectionChange}
          />
        ))}
      </div>
    </div>
  )
}

interface SchemaItemProps {
  schema: {
    name: string
    tables: TableInfo[]
  }
  onTableSelect?: (schema: string, table: string) => void
  selectable?: boolean
  selectedTables: Set<string>
  onSelectionChange?: (selected: Set<string>) => void
}

function SchemaItem({
  schema,
  onTableSelect,
  selectable,
  selectedTables,
  onSelectionChange,
}: SchemaItemProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleSelectAll = (checked: boolean) => {
    const newSelected = new Set(selectedTables)
    schema.tables.forEach((table) => {
      const tableKey = `${schema.name}.${table.name}`
      if (checked) {
        newSelected.add(tableKey)
      } else {
        newSelected.delete(tableKey)
      }
    })
    onSelectionChange?.(newSelected)
  }

  const allSelected = schema.tables.every((table) =>
    selectedTables.has(`${schema.name}.${table.name}`)
  )
  const someSelected = schema.tables.some((table) =>
    selectedTables.has(`${schema.name}.${table.name}`)
  )

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-2 p-3 hover:bg-muted/50 transition-colors",
          selectable && "cursor-pointer"
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        {selectable && (
          <Checkbox
            checked={allSelected}
            onCheckedChange={handleSelectAll}
            onClick={(e) => e.stopPropagation()}
            className={someSelected && !allSelected ? "data-[state=checked]:bg-primary/50" : ""}
          />
        )}
        
        <ChevronRight
          className={cn(
            "h-4 w-4 transition-transform text-muted-foreground",
            isOpen && "rotate-90"
          )}
        />
        <Database className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium flex-1">{schema.name}</span>
        <Badge variant="outline" className="text-xs">
          {schema.tables.length} tables
        </Badge>
      </div>

      {isOpen && (
        <div className="pl-12 bg-muted/20">
          {schema.tables.map((table) => (
            <TableItem
              key={table.name}
              schema={schema.name}
              table={table}
              onSelect={onTableSelect}
              selectable={selectable}
              isSelected={selectedTables.has(`${schema.name}.${table.name}`)}
              onSelectionChange={(checked) => {
                const newSelected = new Set(selectedTables)
                const tableKey = `${schema.name}.${table.name}`
                if (checked) {
                  newSelected.add(tableKey)
                } else {
                  newSelected.delete(tableKey)
                }
                onSelectionChange?.(newSelected)
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface TableItemProps {
  schema: string
  table: TableInfo
  onSelect?: (schema: string, table: string) => void
  selectable?: boolean
  isSelected: boolean
  onSelectionChange?: (checked: boolean) => void
}

function TableItem({
  schema,
  table,
  onSelect,
  selectable,
  isSelected,
  onSelectionChange,
}: TableItemProps) {
  const handleClick = () => {
    if (selectable) {
      onSelectionChange?.(!isSelected)
    } else {
      onSelect?.(schema, table.name)
    }
  }

  return (
    <div
      className="flex items-center gap-2 p-2 px-3 hover:bg-muted/50 cursor-pointer transition-colors group"
      onClick={handleClick}
    >
      {selectable && (
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onSelectionChange?.(checked as boolean)}
          onClick={(e) => e.stopPropagation()}
        />
      )}
      
      <Table className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm flex-1 group-hover:text-foreground">{table.name}</span>
      
      {table.row_count !== undefined && (
        <span className="text-xs text-muted-foreground">
          {table.row_count.toLocaleString()} rows
        </span>
      )}
    </div>
  )
}
