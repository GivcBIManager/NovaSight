/**
 * FreshnessConfig — source freshness threshold configurator.
 *
 * Lets users set warn_after / error_after thresholds and the
 * loaded_at_field for source freshness monitoring.
 */

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Save, Clock, AlertTriangle, XCircle } from 'lucide-react'
import type { SourceFreshnessPayload } from '../../types/visualModel'

export interface FreshnessConfigProps {
  sourceName: string
  tableName: string
  initialConfig?: Partial<SourceFreshnessPayload>
  onSave: (payload: SourceFreshnessPayload) => void
  onRunCheck?: () => void
  isSaving?: boolean
}

type Period = 'minute' | 'hour' | 'day'

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: 'minute', label: 'Minutes' },
  { value: 'hour', label: 'Hours' },
  { value: 'day', label: 'Days' },
]

export function FreshnessConfig({
  sourceName,
  tableName,
  initialConfig,
  onSave,
  onRunCheck,
  isSaving = false,
}: FreshnessConfigProps) {
  const [loadedAtField, setLoadedAtField] = useState(
    initialConfig?.loaded_at_field || ''
  )
  const [warnCount, setWarnCount] = useState(
    initialConfig?.warn_after?.count?.toString() || '12'
  )
  const [warnPeriod, setWarnPeriod] = useState<Period>(
    (initialConfig?.warn_after?.period as Period) || 'hour'
  )
  const [errorCount, setErrorCount] = useState(
    initialConfig?.error_after?.count?.toString() || '24'
  )
  const [errorPeriod, setErrorPeriod] = useState<Period>(
    (initialConfig?.error_after?.period as Period) || 'hour'
  )

  const handleSave = () => {
    onSave({
      source_name: sourceName,
      table_name: tableName,
      loaded_at_field: loadedAtField,
      warn_after: { count: parseInt(warnCount, 10), period: warnPeriod },
      error_after: { count: parseInt(errorCount, 10), period: errorPeriod },
    })
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Source Freshness
          <Badge variant="outline" className="ml-auto text-[10px] font-mono">
            {sourceName}.{tableName}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <Label className="text-xs">Loaded At Field *</Label>
          <Input
            value={loadedAtField}
            onChange={(e) => setLoadedAtField(e.target.value)}
            placeholder="_loaded_at"
            className="h-8 text-xs font-mono"
          />
          <p className="text-[10px] text-muted-foreground">
            Timestamp column that indicates when data was last loaded.
          </p>
        </div>

        {/* Warn threshold */}
        <div className="space-y-1">
          <Label className="text-xs flex items-center gap-1">
            <AlertTriangle className="h-3 w-3 text-yellow-500" />
            Warn After
          </Label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              min={1}
              value={warnCount}
              onChange={(e) => setWarnCount(e.target.value)}
              className="h-8 text-xs"
            />
            <Select value={warnPeriod} onValueChange={(v) => setWarnPeriod(v as Period)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map((p) => (
                  <SelectItem key={p.value} value={p.value} className="text-xs">
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Error threshold */}
        <div className="space-y-1">
          <Label className="text-xs flex items-center gap-1">
            <XCircle className="h-3 w-3 text-red-500" />
            Error After
          </Label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              min={1}
              value={errorCount}
              onChange={(e) => setErrorCount(e.target.value)}
              className="h-8 text-xs"
            />
            <Select value={errorPeriod} onValueChange={(v) => setErrorPeriod(v as Period)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map((p) => (
                  <SelectItem key={p.value} value={p.value} className="text-xs">
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            onClick={handleSave}
            disabled={!loadedAtField || isSaving}
            className="flex-1"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Config'}
          </Button>
          {onRunCheck && (
            <Button variant="outline" onClick={onRunCheck}>
              <Clock className="h-4 w-4 mr-2" />
              Run Check
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
