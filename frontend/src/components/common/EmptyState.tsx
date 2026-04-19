import * as React from 'react'
import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EmptyStateActionProp {
  label: string
  onClick: () => void
}

interface EmptyStateProps {
  /**
   * Either a Lucide icon component reference (legacy API) or any ReactNode
   * (preferred — aligns with `PageHeader` and lets callers pass a sized
   * icon element like `<GitBranch className="h-12 w-12" />`).
   */
  icon?: LucideIcon | React.ReactNode
  title: string
  description?: string
  /**
   * Either a `{ label, onClick }` descriptor (legacy) or any ReactNode
   * (preferred — lets callers pass a `<Button asChild><Link>…</Link></Button>`).
   */
  action?: EmptyStateActionProp | React.ReactNode
  className?: string
}

function isReactNodeIcon(
  icon: LucideIcon | React.ReactNode | undefined,
): icon is React.ReactNode {
  // Lucide icons are forwardRef components (objects with $$typeof symbol).
  // Any already-rendered ReactElement is also an object with $$typeof but
  // also has `props`. Treat "callable" (function/forwardRef) as the legacy
  // component form; everything else is a node.
  return !(typeof icon === 'function' || (typeof icon === 'object' && icon !== null && '$$typeof' in (icon as object) && !('props' in (icon as object))))
}

function isReactNodeAction(
  action: EmptyStateActionProp | React.ReactNode | undefined,
): action is React.ReactNode {
  if (action == null) return false
  if (typeof action === 'object' && action !== null && 'label' in (action as object) && 'onClick' in (action as object)) {
    return false
  }
  return true
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center',
        className,
      )}
    >
      {icon ? (
        isReactNodeIcon(icon) ? (
          <div className="mb-4 text-muted-foreground">{icon as React.ReactNode}</div>
        ) : (
          <div className="mb-4 rounded-full bg-muted p-4">
            {React.createElement(icon as LucideIcon, {
              className: 'h-8 w-8 text-muted-foreground',
            })}
          </div>
        )
      ) : null}

      <h3 className="mb-2 text-lg font-semibold">{title}</h3>

      {description ? (
        <p className="mb-4 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      ) : null}

      {action
        ? isReactNodeAction(action)
          ? (action as React.ReactNode)
          : (() => {
              const a = action as EmptyStateActionProp
              return <Button onClick={a.onClick}>{a.label}</Button>
            })()
        : null}
    </div>
  )
}
