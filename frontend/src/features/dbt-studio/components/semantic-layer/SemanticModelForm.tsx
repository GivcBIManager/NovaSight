/**
 * SemanticModelForm — top-level form for defining a dbt semantic model.
 *
 * Composes EntityEditor, DimensionEditor, and MeasureEditor into
 * a unified form with model-level metadata.
 */

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Save, Database } from 'lucide-react'
import { EntityEditor, type Entity } from './EntityEditor'
import { DimensionEditor, type Dimension } from './DimensionEditor'
import { MeasureEditor, type Measure } from './MeasureEditor'

export interface SemanticModelDefinition {
  name: string
  model_ref: string
  description?: string
  entities: Entity[]
  dimensions: Dimension[]
  measures: Measure[]
}

export interface SemanticModelFormProps {
  initialValues?: Partial<SemanticModelDefinition>
  availableModels?: string[]
  availableColumns?: string[]
  onSave: (model: SemanticModelDefinition) => void
  isSaving?: boolean
}

export function SemanticModelForm({
  initialValues,
  availableModels = [],
  availableColumns = [],
  onSave,
  isSaving = false,
}: SemanticModelFormProps) {
  const [name, setName] = useState(initialValues?.name || '')
  const [modelRef, setModelRef] = useState(initialValues?.model_ref || '')
  const [description, setDescription] = useState(initialValues?.description || '')
  const [entities, setEntities] = useState<Entity[]>(initialValues?.entities || [])
  const [dimensions, setDimensions] = useState<Dimension[]>(initialValues?.dimensions || [])
  const [measures, setMeasures] = useState<Measure[]>(initialValues?.measures || [])

  const handleSave = () => {
    onSave({
      name,
      model_ref: modelRef,
      description: description || undefined,
      entities,
      dimensions,
      measures,
    })
  }

  const totalElements = entities.length + dimensions.length + measures.length

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Database className="h-4 w-4" />
          Semantic Model
          {totalElements > 0 && (
            <Badge variant="secondary" className="ml-auto text-[10px]">
              {totalElements} elements
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Model identity */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Semantic Model Name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="orders"
              className="h-8 text-xs font-mono"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">dbt Model Reference *</Label>
            {availableModels.length > 0 ? (
              <select
                value={modelRef}
                onChange={(e) => setModelRef(e.target.value)}
                className="h-8 w-full rounded-md border border-input bg-background px-3 text-xs font-mono"
              >
                <option value="">Select model</option>
                {availableModels.map((m) => (
                  <option key={m} value={`ref('${m}')`}>
                    {m}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                value={modelRef}
                onChange={(e) => setModelRef(e.target.value)}
                placeholder="ref('fct_orders')"
                className="h-8 text-xs font-mono"
              />
            )}
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Description</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Orders semantic model with customer and product dimensions"
            rows={2}
            className="text-xs"
          />
        </div>

        {/* Sub-editors in tabs */}
        <Tabs defaultValue="entities">
          <TabsList className="w-full">
            <TabsTrigger value="entities" className="flex-1 text-xs">
              Entities ({entities.length})
            </TabsTrigger>
            <TabsTrigger value="dimensions" className="flex-1 text-xs">
              Dimensions ({dimensions.length})
            </TabsTrigger>
            <TabsTrigger value="measures" className="flex-1 text-xs">
              Measures ({measures.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="entities" className="mt-3">
            <EntityEditor
              entities={entities}
              onChange={setEntities}
              availableColumns={availableColumns}
            />
          </TabsContent>

          <TabsContent value="dimensions" className="mt-3">
            <DimensionEditor
              dimensions={dimensions}
              onChange={setDimensions}
              availableColumns={availableColumns}
            />
          </TabsContent>

          <TabsContent value="measures" className="mt-3">
            <MeasureEditor
              measures={measures}
              onChange={setMeasures}
              availableColumns={availableColumns}
            />
          </TabsContent>
        </Tabs>

        <Button
          onClick={handleSave}
          disabled={!name || !modelRef || isSaving}
          className="w-full"
        >
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save Semantic Model'}
        </Button>
      </CardContent>
    </Card>
  )
}
