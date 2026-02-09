/**
 * DAG Code Preview Dialog
 * 
 * Shows a preview of the generated DAG Python code before saving.
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Copy, Check, Download, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings?: string[]
}

interface DagCodePreviewProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  dagName: string
  code: string
  validation: ValidationResult
  onConfirmSave: () => void
  isSaving: boolean
}

export function DagCodePreview({
  open,
  onOpenChange,
  dagName,
  code,
  validation,
  onConfirmSave,
  isSaving,
}: DagCodePreviewProps) {
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast({
        title: 'Copied',
        description: 'Code copied to clipboard',
      })
    } catch {
      toast({
        title: 'Failed to copy',
        description: 'Could not copy to clipboard',
        variant: 'destructive',
      })
    }
  }

  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/x-python' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${dagName}.py`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            DAG Code Preview
            <Badge variant={validation.valid ? 'default' : 'destructive'}>
              {validation.valid ? 'Valid' : 'Has Errors'}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Review the generated Airflow DAG code for <strong>{dagName}</strong>
          </DialogDescription>
        </DialogHeader>

        {/* Validation Results */}
        {!validation.valid && validation.errors.length > 0 && (
          <div className="flex-shrink-0 rounded-md border border-destructive/50 bg-destructive/10 p-3">
            <div className="flex items-center gap-2 text-destructive font-medium mb-2">
              <AlertCircle className="h-4 w-4" />
              Validation Errors
            </div>
            <ul className="text-sm text-destructive space-y-1">
              {validation.errors.map((error, i) => (
                <li key={i}>• {error}</li>
              ))}
            </ul>
          </div>
        )}

        {validation.valid && (
          <div className="flex-shrink-0 rounded-md border border-green-500/50 bg-green-500/10 p-3">
            <div className="flex items-center gap-2 text-green-600 font-medium">
              <CheckCircle2 className="h-4 w-4" />
              DAG configuration is valid and ready to save
            </div>
          </div>
        )}

        {/* Code Preview */}
        <div className="relative flex-1 min-h-0">
          <div className="absolute right-2 top-2 flex gap-1 z-10">
            <Button variant="ghost" size="sm" onClick={handleCopy}>
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
          <ScrollArea className="h-full max-h-[50vh] rounded-md border bg-muted/30">
            <pre className="p-4 text-sm font-mono whitespace-pre-wrap break-all">
              <code>{code}</code>
            </pre>
          </ScrollArea>
        </div>

        <DialogFooter className="flex-shrink-0 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={onConfirmSave}
            disabled={!validation.valid || isSaving}
          >
            {isSaving ? 'Saving...' : 'Save & Deploy to Airflow'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default DagCodePreview
