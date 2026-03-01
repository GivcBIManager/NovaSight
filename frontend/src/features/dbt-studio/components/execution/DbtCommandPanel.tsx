/**
 * DbtCommandPanel — run dbt commands from the UI.
 *
 * Provides a guided interface for dbt run, test, build, seed,
 * snapshot, docs generate, and source freshness commands.
 */

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Terminal, Play, RefreshCw } from 'lucide-react'

export interface DbtCommandPayload {
  command: string
  selector?: string
  exclude?: string
  full_refresh?: boolean
  target?: string
  vars?: string
}

export interface DbtCommandPanelProps {
  onExecute: (payload: DbtCommandPayload) => void
  isExecuting?: boolean
  availableTargets?: string[]
}

const DBT_COMMANDS = [
  { value: 'run', label: 'dbt run', description: 'Materialize models' },
  { value: 'test', label: 'dbt test', description: 'Run schema & data tests' },
  { value: 'build', label: 'dbt build', description: 'Run + test (DAG order)' },
  { value: 'seed', label: 'dbt seed', description: 'Load CSV seed files' },
  { value: 'snapshot', label: 'dbt snapshot', description: 'Capture SCD snapshots' },
  { value: 'compile', label: 'dbt compile', description: 'Compile SQL without executing' },
  { value: 'source freshness', label: 'dbt source freshness', description: 'Check source freshness' },
] as const

const SELECTOR_PRESETS = [
  { label: 'All models', value: '' },
  { label: 'Staging only', value: 'tag:staging' },
  { label: 'Marts only', value: 'tag:marts' },
  { label: 'Modified +', value: 'state:modified+' },
  { label: '1+ downstream', value: '+model_name+' },
]

export function DbtCommandPanel({
  onExecute,
  isExecuting = false,
  availableTargets = ['dev', 'prod'],
}: DbtCommandPanelProps) {
  const [command, setCommand] = useState<string>('run')
  const [selector, setSelector] = useState('')
  const [exclude, setExclude] = useState('')
  const [fullRefresh, setFullRefresh] = useState(false)
  const [target, setTarget] = useState('dev')
  const [vars, setVars] = useState('')

  const handleExecute = () => {
    onExecute({
      command,
      selector: selector || undefined,
      exclude: exclude || undefined,
      full_refresh: fullRefresh || undefined,
      target,
      vars: vars || undefined,
    })
  }

  const selectedCommand = DBT_COMMANDS.find((c) => c.value === command)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Terminal className="h-4 w-4" />
          dbt Command Panel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Command selector */}
        <div className="space-y-1">
          <Label className="text-xs">Command</Label>
          <Select value={command} onValueChange={setCommand}>
            <SelectTrigger className="text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DBT_COMMANDS.map((cmd) => (
                <SelectItem key={cmd.value} value={cmd.value}>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs">{cmd.label}</span>
                    <span className="text-[10px] text-muted-foreground">
                      — {cmd.description}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Node selector */}
        <div className="space-y-1">
          <Label className="text-xs">Selector (--select)</Label>
          <div className="flex gap-1 mb-1">
            {SELECTOR_PRESETS.map((p) => (
              <Badge
                key={p.label}
                variant={selector === p.value ? 'default' : 'outline'}
                className="text-[10px] cursor-pointer"
                onClick={() => setSelector(p.value)}
              >
                {p.label}
              </Badge>
            ))}
          </div>
          <Input
            value={selector}
            onChange={(e) => setSelector(e.target.value)}
            placeholder="model_name tag:daily path:models/staging"
            className="h-8 text-xs font-mono"
          />
        </div>

        {/* Exclude */}
        <div className="space-y-1">
          <Label className="text-xs">Exclude (--exclude)</Label>
          <Input
            value={exclude}
            onChange={(e) => setExclude(e.target.value)}
            placeholder="tag:wip model_to_skip"
            className="h-8 text-xs font-mono"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Target */}
          <div className="space-y-1">
            <Label className="text-xs">Target</Label>
            <Select value={target} onValueChange={setTarget}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableTargets.map((t) => (
                  <SelectItem key={t} value={t} className="text-xs">
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Full Refresh */}
          <div className="space-y-1">
            <Label className="text-xs">Full Refresh</Label>
            <div className="flex items-center gap-2 h-8">
              <Switch
                checked={fullRefresh}
                onCheckedChange={setFullRefresh}
              />
              <span className="text-xs text-muted-foreground">
                {fullRefresh ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
        </div>

        {/* Vars */}
        <div className="space-y-1">
          <Label className="text-xs">Variables (--vars JSON)</Label>
          <Input
            value={vars}
            onChange={(e) => setVars(e.target.value)}
            placeholder='{"start_date": "2024-01-01"}'
            className="h-8 text-xs font-mono"
          />
        </div>

        {/* Command preview */}
        <div className="bg-slate-900 text-slate-100 rounded p-2 text-xs font-mono">
          <span className="text-green-400">$</span>{' '}
          dbt {command}
          {selector && ` --select ${selector}`}
          {exclude && ` --exclude ${exclude}`}
          {fullRefresh && ' --full-refresh'}
          {target && ` --target ${target}`}
          {vars && ` --vars '${vars}'`}
        </div>

        {/* Execute */}
        <Button
          onClick={handleExecute}
          disabled={isExecuting}
          className="w-full"
        >
          {isExecuting ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Execute {selectedCommand?.label}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
