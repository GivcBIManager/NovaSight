/**
 * VisualQueryBuilder — Main no-code SQL builder.
 *
 * Orchestrates the SELECT, JOIN, WHERE, GROUP BY sub-builders
 * and emits a VisualModelCreatePayload on save.
 */

import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Save, Eye, Code } from 'lucide-react'
import { SelectBuilder } from './SelectBuilder'
import { JoinBuilder } from './JoinBuilder'
import { WhereBuilder } from './WhereBuilder'
import { GroupByBuilder } from './GroupByBuilder'
import type {
  VisualModelCreatePayload,
  VisualColumnConfig,
  VisualJoinConfig,
  WarehouseColumn,
} from '../../types/visualModel'
import type { Materialization } from '../../types'

export interface VisualQueryBuilderProps {
  /** Available columns from ClickHouse for the selected source. */
  availableColumns: WarehouseColumn[]
  /** Available upstream models for ref() joins. */
  availableModels: string[]
  /** Initial values (for editing). */
  initialValues?: Partial<VisualModelCreatePayload>
  /** Called when user saves the model configuration. */
  onSave: (payload: VisualModelCreatePayload) => void
  /** Called when user requests code preview. */
  onPreview: (payload: VisualModelCreatePayload) => void
  /** Whether a save is in progress. */
  isSaving?: boolean
}

export function VisualQueryBuilder({
  availableColumns,
  availableModels,
  initialValues,
  onSave,
  onPreview,
  isSaving = false,
}: VisualQueryBuilderProps) {
  const [modelName, setModelName] = useState(initialValues?.model_name || '')
  const [description, setDescription] = useState(initialValues?.description || '')
  const [layer, setLayer] = useState<'staging' | 'intermediate' | 'marts'>(
    (initialValues?.model_layer as 'staging' | 'intermediate' | 'marts') || 'staging'
  )
  const [materialization, setMaterialization] = useState<Materialization>(
    (initialValues?.materialization as Materialization) || 'view'
  )
  const [sourceName, setSourceName] = useState(initialValues?.source_name || '')
  const [sourceTable, setSourceTable] = useState(initialValues?.source_table || '')
  const [columns, setColumns] = useState<VisualColumnConfig[]>(
    (initialValues?.columns as VisualColumnConfig[]) || []
  )
  const [joins, setJoins] = useState<VisualJoinConfig[]>(
    (initialValues?.joins as VisualJoinConfig[]) || []
  )
  const [whereClause, setWhereClause] = useState(initialValues?.where_clause || '')
  const [groupBy, setGroupBy] = useState<string[]>(initialValues?.group_by || [])
  const [tags, setTags] = useState(initialValues?.tags?.join(', ') || '')

  const buildPayload = useCallback((): VisualModelCreatePayload => ({
    model_name: modelName,
    model_layer: layer,
    description,
    materialization,
    source_name: sourceName || undefined,
    source_table: sourceTable || undefined,
    columns,
    joins,
    where_clause: whereClause || undefined,
    group_by: groupBy,
    tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
    refs: joins.map((j) => j.source_model),
  }), [modelName, layer, description, materialization, sourceName, sourceTable, columns, joins, whereClause, groupBy, tags])

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Code className="h-5 w-5" />
          Visual Query Builder
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Model Identity */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="space-y-1">
            <Label className="text-xs">Model Name</Label>
            <Input
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              placeholder="stg_orders"
              className="font-mono text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Layer</Label>
            <Select value={layer} onValueChange={(v) => setLayer(v as typeof layer)}>
              <SelectTrigger className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="staging">Staging (stg_)</SelectItem>
                <SelectItem value="intermediate">Intermediate (int_)</SelectItem>
                <SelectItem value="marts">Marts (dim_/fct_)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Materialization</Label>
            <Select value={materialization} onValueChange={(v) => setMaterialization(v as Materialization)}>
              <SelectTrigger className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="view">View</SelectItem>
                <SelectItem value="table">Table</SelectItem>
                <SelectItem value="incremental">Incremental</SelectItem>
                <SelectItem value="ephemeral">Ephemeral</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Tags</Label>
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="finance, daily"
              className="text-sm"
            />
          </div>
        </div>

        {/* Source (staging only) */}
        {layer === 'staging' && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="space-y-1">
              <Label className="text-xs">Source Name</Label>
              <Input
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
                placeholder="raw_data"
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Source Table</Label>
              <Input
                value={sourceTable}
                onChange={(e) => setSourceTable(e.target.value)}
                placeholder="orders"
                className="font-mono text-sm"
              />
            </div>
          </div>
        )}

        <div className="space-y-1 mb-4">
          <Label className="text-xs">Description</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What does this model do?"
            rows={2}
            className="text-sm"
          />
        </div>

        {/* SQL Builder Tabs */}
        <Tabs defaultValue="select" className="mt-2">
          <TabsList className="w-full">
            <TabsTrigger value="select" className="flex-1 text-xs">SELECT</TabsTrigger>
            <TabsTrigger value="joins" className="flex-1 text-xs">JOINS</TabsTrigger>
            <TabsTrigger value="where" className="flex-1 text-xs">WHERE</TabsTrigger>
            <TabsTrigger value="groupby" className="flex-1 text-xs">GROUP BY</TabsTrigger>
          </TabsList>

          <TabsContent value="select" className="mt-3">
            <SelectBuilder
              availableColumns={availableColumns}
              selectedColumns={columns}
              onChange={setColumns}
            />
          </TabsContent>

          <TabsContent value="joins" className="mt-3">
            <JoinBuilder
              availableModels={availableModels}
              joins={joins}
              onChange={setJoins}
            />
          </TabsContent>

          <TabsContent value="where" className="mt-3">
            <WhereBuilder
              value={whereClause}
              onChange={setWhereClause}
              columns={columns}
            />
          </TabsContent>

          <TabsContent value="groupby" className="mt-3">
            <GroupByBuilder
              columns={columns}
              selectedColumns={groupBy}
              onChange={setGroupBy}
            />
          </TabsContent>
        </Tabs>

        {/* Actions */}
        <div className="flex gap-2 mt-4 pt-4 border-t">
          <Button
            onClick={() => onSave(buildPayload())}
            disabled={!modelName || isSaving}
            className="flex-1"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Model'}
          </Button>
          <Button
            variant="outline"
            onClick={() => onPreview(buildPayload())}
            disabled={!modelName}
          >
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
