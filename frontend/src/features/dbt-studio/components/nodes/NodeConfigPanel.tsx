/**
 * NodeConfigPanel — Right sidebar panel for configuring a selected node.
 *
 * Opens as a Sheet when a node is clicked on the canvas.
 * Contains tabs for: General, Columns, Joins, Tests, Code Preview.
 */

import { useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Save, Eye, Trash2 } from 'lucide-react'
import type { VisualModelRecord, VisualModelUpdatePayload, VisualColumnConfig } from '../../types/visualModel'

export interface NodeConfigPanelProps {
  model: VisualModelRecord | null
  open: boolean
  onClose: () => void
  onSave: (payload: VisualModelUpdatePayload) => void
  onPreview: (modelId: string) => void
  onDelete: (modelId: string) => void
  previewSql?: string
  previewYaml?: string
}

export function NodeConfigPanel({
  model,
  open,
  onClose,
  onSave,
  onPreview,
  onDelete,
  previewSql,
  previewYaml,
}: NodeConfigPanelProps) {
  const [activeTab, setActiveTab] = useState('general')

  if (!model) return null

  const config = model.visual_config as Record<string, unknown>

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-[480px] sm:max-w-[480px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={
                model.model_layer === 'staging'
                  ? 'border-green-400 text-green-700'
                  : model.model_layer === 'intermediate'
                  ? 'border-amber-400 text-amber-700'
                  : 'border-purple-400 text-purple-700'
              }
            >
              {model.model_layer}
            </Badge>
            {model.model_name}
          </SheetTitle>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="w-full">
            <TabsTrigger value="general" className="flex-1">General</TabsTrigger>
            <TabsTrigger value="columns" className="flex-1">Columns</TabsTrigger>
            <TabsTrigger value="tests" className="flex-1">Tests</TabsTrigger>
            <TabsTrigger value="code" className="flex-1">Code</TabsTrigger>
          </TabsList>

          {/* General Tab */}
          <TabsContent value="general" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Model Name</Label>
              <Input value={model.model_name} readOnly className="bg-muted" />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                defaultValue={model.description}
                placeholder="Describe what this model does..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Materialization</Label>
              <Select defaultValue={model.materialization}>
                <SelectTrigger>
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

            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-1">
                {model.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">{tag}</Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Layer</Label>
              <Select defaultValue={model.model_layer}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staging">Staging</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="marts">Marts</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          {/* Columns Tab */}
          <TabsContent value="columns" className="mt-4">
            <div className="space-y-2">
              {((config?.columns || []) as VisualColumnConfig[]).map((col, i) => (
                <div key={i} className="flex items-center gap-2 p-2 border rounded text-sm">
                  <span className="font-mono flex-1 truncate">{col.alias || col.name}</span>
                  {col.data_type && (
                    <Badge variant="outline" className="text-[10px]">{col.data_type}</Badge>
                  )}
                  {col.tests?.length > 0 && (
                    <Badge variant="secondary" className="text-[10px]">
                      {col.tests.length} test{col.tests.length > 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
              ))}
              {(!config?.columns || (config.columns as unknown[]).length === 0) && (
                <p className="text-sm text-muted-foreground">No columns configured yet.</p>
              )}
            </div>
          </TabsContent>

          {/* Tests Tab */}
          <TabsContent value="tests" className="mt-4">
            <p className="text-sm text-muted-foreground mb-2">
              Per-column tests are configured in the Visual SQL Builder.
              Use the Test Builder panel for singular data tests.
            </p>
            {((config?.columns || []) as VisualColumnConfig[])
              .filter((c) => c.tests && c.tests.length > 0)
              .map((col, i) => (
                <div key={i} className="mb-2">
                  <div className="text-sm font-medium">{col.name}</div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {col.tests.map((t, j) => (
                      <Badge key={j} variant="outline" className="text-[10px]">
                        {typeof t === 'string' ? t : t.type}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
          </TabsContent>

          {/* Code Preview Tab */}
          <TabsContent value="code" className="mt-4">
            <div className="space-y-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPreview(model.id)}
                className="w-full"
              >
                <Eye className="h-4 w-4 mr-2" />
                Generate Preview
              </Button>

              {previewSql && (
                <div>
                  <Label className="mb-1">Generated SQL</Label>
                  <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-64 font-mono">
                    {previewSql}
                  </pre>
                </div>
              )}

              {previewYaml && (
                <div>
                  <Label className="mb-1">Generated YAML</Label>
                  <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-64 font-mono">
                    {previewYaml}
                  </pre>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-6 pt-4 border-t">
          <Button onClick={() => onSave(config as unknown as VisualModelUpdatePayload)} className="flex-1">
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
          <Button
            variant="destructive"
            size="icon"
            onClick={() => onDelete(model.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
