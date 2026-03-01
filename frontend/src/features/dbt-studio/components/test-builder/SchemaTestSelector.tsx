/**
 * SchemaTestSelector — per-column test configurator.
 *
 * Lets users toggle built-in dbt tests (unique, not_null, accepted_values,
 * relationships) and dbt_expectations tests on individual columns.
 */

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { ShieldCheck, Search } from 'lucide-react'
import type { VisualColumnConfig } from '../../types/visualModel'

export interface VisualTestConfig {
  test_type: string
  config?: Record<string, unknown>
}

export interface SchemaTestSelectorProps {
  columns: VisualColumnConfig[]
  columnTests: Record<string, VisualTestConfig[]>
  onChange: (columnTests: Record<string, VisualTestConfig[]>) => void
  availableModels?: string[]
}

const BUILT_IN_TESTS = [
  { type: 'unique', label: 'Unique', description: 'No duplicate values' },
  { type: 'not_null', label: 'Not Null', description: 'No NULL values' },
  { type: 'accepted_values', label: 'Accepted Values', description: 'Only allowed values', hasConfig: true },
  { type: 'relationships', label: 'Relationships', description: 'FK to another model', hasConfig: true },
]

const DBT_EXPECTATIONS_TESTS = [
  { type: 'expect_column_values_to_not_be_null', label: 'Not Null (dbt_expectations)' },
  { type: 'expect_column_values_to_be_unique', label: 'Unique (dbt_expectations)' },
  { type: 'expect_column_values_to_be_between', label: 'Between', hasConfig: true },
  { type: 'expect_column_values_to_match_regex', label: 'Regex Match', hasConfig: true },
  { type: 'expect_column_value_lengths_to_be_between', label: 'Length Between', hasConfig: true },
  { type: 'expect_column_values_to_be_of_type', label: 'Type Check', hasConfig: true },
]

export function SchemaTestSelector({
  columns,
  columnTests,
  onChange,
  availableModels = [],
}: SchemaTestSelectorProps) {
  const [search, setSearch] = useState('')

  const filtered = columns.filter(
    (c) => c.name.toLowerCase().includes(search.toLowerCase())
  )

  const getTests = (colName: string) => columnTests[colName] || []

  const hasTest = (colName: string, testType: string) =>
    getTests(colName).some((t) => t.test_type === testType)

  const toggleTest = (colName: string, testType: string) => {
    const current = getTests(colName)
    const exists = current.find((t) => t.test_type === testType)
    const updated = exists
      ? current.filter((t) => t.test_type !== testType)
      : [...current, { test_type: testType }]
    onChange({ ...columnTests, [colName]: updated })
  }

  const updateTestConfig = (
    colName: string,
    testType: string,
    config: Record<string, unknown>
  ) => {
    const current = getTests(colName)
    const updated = current.map((t) =>
      t.test_type === testType ? { ...t, config } : t
    )
    onChange({ ...columnTests, [colName]: updated })
  }

  const getTestConfig = (colName: string, testType: string) => {
    const test = getTests(colName).find((t) => t.test_type === testType)
    return test?.config || {}
  }

  const totalTestCount = Object.values(columnTests).reduce(
    (acc, tests) => acc + tests.length,
    0
  )

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" />
          Schema Tests
          {totalTestCount > 0 && (
            <Badge variant="secondary" className="ml-auto text-[10px]">
              {totalTestCount} tests
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search columns..."
            className="pl-8 h-8 text-sm"
          />
        </div>

        <Accordion type="multiple" className="border rounded-md">
          {filtered.map((col) => {
            const tests = getTests(col.name)
            return (
              <AccordionItem key={col.name} value={col.name}>
                <AccordionTrigger className="px-3 py-2 text-sm hover:no-underline">
                  <div className="flex items-center gap-2">
                    <span className="font-mono">{col.alias || col.name}</span>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {col.data_type}
                    </Badge>
                    {tests.length > 0 && (
                      <Badge variant="default" className="text-[10px]">
                        {tests.length}
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-3 pb-3 space-y-3">
                  {/* Built-in tests */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Built-in Tests</Label>
                    {BUILT_IN_TESTS.map((test) => (
                      <div key={test.type} className="space-y-1">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={hasTest(col.name, test.type)}
                            onCheckedChange={() => toggleTest(col.name, test.type)}
                          />
                          <span className="text-xs font-medium">{test.label}</span>
                          <span className="text-[10px] text-muted-foreground">
                            — {test.description}
                          </span>
                        </label>

                        {/* accepted_values config */}
                        {test.type === 'accepted_values' && hasTest(col.name, test.type) && (
                          <div className="ml-6 space-y-1">
                            <Label className="text-xs">Values (comma-separated)</Label>
                            <Input
                              value={
                                (getTestConfig(col.name, test.type).values as string[] || []).join(', ')
                              }
                              onChange={(e) =>
                                updateTestConfig(col.name, test.type, {
                                  values: e.target.value.split(',').map((v) => v.trim()).filter(Boolean),
                                })
                              }
                              placeholder="active, pending, cancelled"
                              className="h-7 text-xs"
                            />
                          </div>
                        )}

                        {/* relationships config */}
                        {test.type === 'relationships' && hasTest(col.name, test.type) && (
                          <div className="ml-6 grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs">To Model</Label>
                              {availableModels.length > 0 ? (
                                <Select
                                  value={(getTestConfig(col.name, test.type).to as string) || ''}
                                  onValueChange={(v) =>
                                    updateTestConfig(col.name, test.type, {
                                      ...getTestConfig(col.name, test.type),
                                      to: v,
                                    })
                                  }
                                >
                                  <SelectTrigger className="h-7 text-xs">
                                    <SelectValue placeholder="Select" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {availableModels.map((m) => (
                                      <SelectItem key={m} value={`ref('${m}')`} className="text-xs font-mono">
                                        {m}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Input
                                  value={(getTestConfig(col.name, test.type).to as string) || ''}
                                  onChange={(e) =>
                                    updateTestConfig(col.name, test.type, {
                                      ...getTestConfig(col.name, test.type),
                                      to: e.target.value,
                                    })
                                  }
                                  placeholder="ref('stg_customers')"
                                  className="h-7 text-xs font-mono"
                                />
                              )}
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Field</Label>
                              <Input
                                value={(getTestConfig(col.name, test.type).field as string) || ''}
                                onChange={(e) =>
                                  updateTestConfig(col.name, test.type, {
                                    ...getTestConfig(col.name, test.type),
                                    field: e.target.value,
                                  })
                                }
                                placeholder="id"
                                className="h-7 text-xs font-mono"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* dbt_expectations tests */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">dbt_expectations</Label>
                    {DBT_EXPECTATIONS_TESTS.map((test) => (
                      <div key={test.type} className="space-y-1">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={hasTest(col.name, test.type)}
                            onCheckedChange={() => toggleTest(col.name, test.type)}
                          />
                          <span className="text-xs">{test.label}</span>
                        </label>

                        {test.hasConfig && hasTest(col.name, test.type) && (
                          <TestConfigForm
                            testType={test.type}
                            config={getTestConfig(col.name, test.type)}
                            onChange={(cfg) => updateTestConfig(col.name, test.type, cfg)}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )
          })}
        </Accordion>
      </CardContent>
    </Card>
  )
}

// ─── Inline Test Config Forms ────────────────────────────────────────────

interface TestConfigFormProps {
  testType: string
  config: Record<string, unknown>
  onChange: (config: Record<string, unknown>) => void
}

function TestConfigForm({ testType, config, onChange }: TestConfigFormProps) {
  switch (testType) {
    case 'expect_column_values_to_be_between':
      return (
        <div className="ml-6 grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Min</Label>
            <Input
              type="number"
              value={(config.min_value as string) || ''}
              onChange={(e) => onChange({ ...config, min_value: Number(e.target.value) })}
              className="h-7 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Max</Label>
            <Input
              type="number"
              value={(config.max_value as string) || ''}
              onChange={(e) => onChange({ ...config, max_value: Number(e.target.value) })}
              className="h-7 text-xs"
            />
          </div>
        </div>
      )
    case 'expect_column_values_to_match_regex':
      return (
        <div className="ml-6 space-y-1">
          <Label className="text-xs">Regex Pattern</Label>
          <Input
            value={(config.regex as string) || ''}
            onChange={(e) => onChange({ ...config, regex: e.target.value })}
            placeholder="^[A-Z]{2}\\d{4}$"
            className="h-7 text-xs font-mono"
          />
        </div>
      )
    case 'expect_column_value_lengths_to_be_between':
      return (
        <div className="ml-6 grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Min Length</Label>
            <Input
              type="number"
              value={(config.min_value as string) || ''}
              onChange={(e) => onChange({ ...config, min_value: Number(e.target.value) })}
              className="h-7 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Max Length</Label>
            <Input
              type="number"
              value={(config.max_value as string) || ''}
              onChange={(e) => onChange({ ...config, max_value: Number(e.target.value) })}
              className="h-7 text-xs"
            />
          </div>
        </div>
      )
    case 'expect_column_values_to_be_of_type':
      return (
        <div className="ml-6 space-y-1">
          <Label className="text-xs">Expected Type</Label>
          <Input
            value={(config.column_type as string) || ''}
            onChange={(e) => onChange({ ...config, column_type: e.target.value })}
            placeholder="String"
            className="h-7 text-xs font-mono"
          />
        </div>
      )
    default:
      return null
  }
}
