/**
 * TestConfigForm — form for creating singular dbt tests.
 *
 * Creates custom singular tests (standalone .sql files) with
 * full SQL editing and validation.
 */

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { FlaskConical, Save, Lightbulb } from 'lucide-react'
import type { SingularTestCreatePayload } from '../../types/visualModel'
import { SavedQueryPicker } from '../shared/SavedQueryPicker'
import { SaveAsQueryButton } from '../shared/SaveAsQueryButton'
import type { SavedQuery } from '../../hooks/useDbtSavedQueries'

export interface TestConfigFormProps {
  modelName: string
  availableModels?: string[]
  onSave: (payload: SingularTestCreatePayload) => void
  isSaving?: boolean
}

const SEVERITY_OPTIONS = ['ERROR', 'WARN'] as const

const SQL_TEMPLATES = [
  {
    label: 'Row Count Check',
    sql: `-- Fails when row count drops below threshold
SELECT COUNT(*) AS row_count
FROM {{ ref('MODEL_NAME') }}
HAVING COUNT(*) < 1`,
  },
  {
    label: 'Duplicate Check',
    sql: `-- Fails when duplicates exist on key columns
SELECT
    column_1,
    column_2,
    COUNT(*) AS cnt
FROM {{ ref('MODEL_NAME') }}
GROUP BY column_1, column_2
HAVING COUNT(*) > 1`,
  },
  {
    label: 'Referential Integrity',
    sql: `-- Fails when foreign key references are broken
SELECT a.id
FROM {{ ref('MODEL_NAME') }} a
LEFT JOIN {{ ref('OTHER_MODEL') }} b
    ON a.foreign_key = b.id
WHERE b.id IS NULL`,
  },
  {
    label: 'Freshness Check',
    sql: `-- Fails when data is stale (no records in last 24h)
SELECT MAX(created_at) AS latest
FROM {{ ref('MODEL_NAME') }}
HAVING MAX(created_at) < NOW() - INTERVAL 24 HOUR`,
  },
  {
    label: 'Custom Assertion',
    sql: `-- Returns rows that violate the business rule
SELECT *
FROM {{ ref('MODEL_NAME') }}
WHERE amount < 0  -- amounts should never be negative`,
  },
]

export function TestConfigForm({
  modelName,
  availableModels = [],
  onSave,
  isSaving = false,
}: TestConfigFormProps) {
  const [testName, setTestName] = useState('')
  const [sql, setSql] = useState('')
  const [severity, setSeverity] = useState<'ERROR' | 'WARN'>('ERROR')
  const [description, setDescription] = useState('')

  const applyTemplate = (template: typeof SQL_TEMPLATES[number]) => {
    setSql(template.sql.replace(/MODEL_NAME/g, modelName))
    if (!testName) {
      setTestName(
        `assert_${modelName}_${template.label.toLowerCase().replace(/\s+/g, '_')}`
      )
    }
  }

  const applySavedQuery = (q: SavedQuery) => {
    setSql(q.sql)
    if (!testName) {
      const safe = q.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
      setTestName(`assert_${modelName}_${safe}`)
    }
    if (!description && q.description) {
      setDescription(q.description)
    }
  }

  const handleSave = () => {
    onSave({
      test_name: testName,
      model_name: modelName,
      sql,
      severity,
      description: description || undefined,
    })
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <FlaskConical className="h-4 w-4" />
          Create Singular Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Test Name *</Label>
            <Input
              value={testName}
              onChange={(e) => setTestName(e.target.value)}
              placeholder={`assert_${modelName}_custom`}
              className="h-8 text-xs font-mono"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Severity</Label>
            <Select value={severity} onValueChange={(v) => setSeverity(v as typeof severity)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SEVERITY_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s} className="text-xs">
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Description</Label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What does this test check?"
            className="h-8 text-xs"
          />
        </div>

        {/* Quick templates */}
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Lightbulb className="h-3 w-3" />
              Templates
            </span>
            <SavedQueryPicker
              onSelect={applySavedQuery}
              label="Load Saved Query"
              size="xs"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {SQL_TEMPLATES.map((t) => (
              <Badge
                key={t.label}
                variant="outline"
                className="text-[10px] cursor-pointer hover:bg-accent"
                onClick={() => applyTemplate(t)}
              >
                {t.label}
              </Badge>
            ))}
          </div>
        </div>

        {/* SQL Editor */}
        <div className="space-y-1">
          <Label className="text-xs">
            Test SQL * <span className="text-muted-foreground">(rows returned = test failure)</span>
          </Label>
          <Textarea
            value={sql}
            onChange={(e) => setSql(e.target.value)}
            placeholder={`SELECT *\nFROM {{ ref('${modelName}') }}\nWHERE condition_that_should_not_exist`}
            rows={8}
            className="font-mono text-xs"
          />
        </div>

        {/* Available refs */}
        {availableModels.length > 0 && (
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Insert ref()</Label>
            <div className="flex flex-wrap gap-1">
              {availableModels.map((m) => (
                <Badge
                  key={m}
                  variant="secondary"
                  className="text-[10px] font-mono cursor-pointer"
                  onClick={() => setSql((prev) => `${prev}{{ ref('${m}') }}`)}
                >
                  {m}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <Button
          onClick={handleSave}
          disabled={!testName || !sql || isSaving}
          className="w-full"
        >
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Creating...' : 'Create Singular Test'}
        </Button>

        {/* Save as Query — persists the test SQL into the tenant library. */}
        <div className="flex justify-end">
          <SaveAsQueryButton
            sql={sql}
            defaultName={testName || `test_${modelName}`}
            defaultDescription={`Singular dbt test for ${modelName}`}
            defaultTags={['dbt', 'test']}
            queryType="dbt"
            size="xs"
            disabled={!sql}
            label="Save as Query"
          />
        </div>
      </CardContent>
    </Card>
  )
}
