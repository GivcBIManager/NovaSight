/**
 * CodePreview — syntax-highlighted read-only code viewer.
 *
 * Displays generated SQL and YAML with copy-to-clipboard and
 * optional diff highlighting.
 */

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Copy, Check, FileCode2, Download } from 'lucide-react'

export interface CodePreviewProps {
  sql?: string
  yaml?: string
  title?: string
  maxHeight?: string
}

export function CodePreview({
  sql,
  yaml,
  title = 'Generated Code',
  maxHeight = '400px',
}: CodePreviewProps) {
  const [copiedTab, setCopiedTab] = useState<string | null>(null)

  const copyToClipboard = async (text: string, tab: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedTab(tab)
    setTimeout(() => setCopiedTab(null), 2000)
  }

  const download = (content: string, ext: string) => {
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `generated.${ext}`
    a.click()
    URL.revokeObjectURL(url)
  }

  const defaultTab = sql ? 'sql' : yaml ? 'yaml' : 'sql'

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <FileCode2 className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={defaultTab}>
          <div className="flex items-center justify-between">
            <TabsList className="h-7">
              {sql && (
                <TabsTrigger value="sql" className="text-[10px] h-5 px-2">
                  SQL
                </TabsTrigger>
              )}
              {yaml && (
                <TabsTrigger value="yaml" className="text-[10px] h-5 px-2">
                  YAML
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          {sql && (
            <TabsContent value="sql" className="mt-2">
              <div className="relative">
                <div className="absolute top-2 right-2 flex gap-1 z-10">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 bg-slate-800/50 hover:bg-slate-700"
                    onClick={() => copyToClipboard(sql, 'sql')}
                  >
                    {copiedTab === 'sql' ? (
                      <Check className="h-3 w-3 text-green-400" />
                    ) : (
                      <Copy className="h-3 w-3 text-slate-300" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 bg-slate-800/50 hover:bg-slate-700"
                    onClick={() => download(sql, 'sql')}
                  >
                    <Download className="h-3 w-3 text-slate-300" />
                  </Button>
                </div>
                <pre
                  className="bg-slate-950 text-slate-100 rounded-md p-3 text-xs font-mono overflow-auto leading-5"
                  style={{ maxHeight }}
                >
                  {sql.split('\n').map((line, i) => (
                    <div key={i} className="flex">
                      <span className="text-slate-600 select-none w-8 text-right mr-3 shrink-0">
                        {i + 1}
                      </span>
                      <span>{highlightSql(line)}</span>
                    </div>
                  ))}
                </pre>
                <Badge variant="secondary" className="absolute bottom-2 right-2 text-[10px]">
                  {sql.split('\n').length} lines
                </Badge>
              </div>
            </TabsContent>
          )}

          {yaml && (
            <TabsContent value="yaml" className="mt-2">
              <div className="relative">
                <div className="absolute top-2 right-2 flex gap-1 z-10">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 bg-slate-800/50 hover:bg-slate-700"
                    onClick={() => copyToClipboard(yaml, 'yaml')}
                  >
                    {copiedTab === 'yaml' ? (
                      <Check className="h-3 w-3 text-green-400" />
                    ) : (
                      <Copy className="h-3 w-3 text-slate-300" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 bg-slate-800/50 hover:bg-slate-700"
                    onClick={() => download(yaml, 'yml')}
                  >
                    <Download className="h-3 w-3 text-slate-300" />
                  </Button>
                </div>
                <pre
                  className="bg-slate-950 text-slate-100 rounded-md p-3 text-xs font-mono overflow-auto leading-5"
                  style={{ maxHeight }}
                >
                  {yaml.split('\n').map((line, i) => (
                    <div key={i} className="flex">
                      <span className="text-slate-600 select-none w-8 text-right mr-3 shrink-0">
                        {i + 1}
                      </span>
                      <span>{highlightYaml(line)}</span>
                    </div>
                  ))}
                </pre>
                <Badge variant="secondary" className="absolute bottom-2 right-2 text-[10px]">
                  {yaml.split('\n').length} lines
                </Badge>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  )
}

// ─── Basic Syntax Highlighting ───────────────────────────────────────────────

function highlightSql(line: string): React.ReactNode {
  // Simple keyword highlighting (no full parser needed)
  const SQL_KEYWORDS =
    /\b(SELECT|FROM|WHERE|JOIN|LEFT|RIGHT|INNER|FULL|OUTER|ON|AND|OR|GROUP BY|ORDER BY|HAVING|AS|CASE|WHEN|THEN|ELSE|END|WITH|UNION|ALL|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|DISTINCT|LIMIT|OFFSET|NOT|NULL|IN|BETWEEN|LIKE|IS|EXISTS|COUNT|SUM|AVG|MIN|MAX|COALESCE|CAST|IF|NULLIF)\b/gi

  const JINJA = /(\{\{.*?\}\}|\{%.*?%\}|\{#.*?#\})/g

  const parts: React.ReactNode[] = []
  let remaining = line
  let key = 0

  // First pass: Jinja
  const jinjaMatches = [...remaining.matchAll(JINJA)]
  if (jinjaMatches.length > 0) {
    let lastIdx = 0
    for (const match of jinjaMatches) {
      if (match.index! > lastIdx) {
        parts.push(
          <span key={key++}>{highlightKeywords(remaining.slice(lastIdx, match.index!))}</span>
        )
      }
      parts.push(
        <span key={key++} className="text-orange-400">
          {match[0]}
        </span>
      )
      lastIdx = match.index! + match[0].length
    }
    if (lastIdx < remaining.length) {
      parts.push(<span key={key++}>{highlightKeywords(remaining.slice(lastIdx))}</span>)
    }
    return <>{parts}</>
  }

  return highlightKeywords(line)

  function highlightKeywords(text: string): React.ReactNode {
    const matches = [...text.matchAll(SQL_KEYWORDS)]
    if (matches.length === 0) return text

    const parts: React.ReactNode[] = []
    let lastIdx = 0
    for (const match of matches) {
      if (match.index! > lastIdx) {
        parts.push(text.slice(lastIdx, match.index!))
      }
      parts.push(
        <span key={`kw-${match.index}`} className="text-blue-400 font-bold">
          {match[0]}
        </span>
      )
      lastIdx = match.index! + match[0].length
    }
    if (lastIdx < text.length) parts.push(text.slice(lastIdx))
    return <>{parts}</>
  }
}

function highlightYaml(line: string): React.ReactNode {
  // Highlight YAML keys and comments
  if (line.trimStart().startsWith('#')) {
    return <span className="text-slate-500 italic">{line}</span>
  }
  const colonIdx = line.indexOf(':')
  if (colonIdx > 0 && !line.trimStart().startsWith('-')) {
    return (
      <>
        <span className="text-cyan-400">{line.slice(0, colonIdx)}</span>
        <span className="text-slate-400">:</span>
        <span>{line.slice(colonIdx + 1)}</span>
      </>
    )
  }
  return line
}
