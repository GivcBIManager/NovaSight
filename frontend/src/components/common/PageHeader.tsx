import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * PageHeader — Canonical page header primitive for NovaSight.
 *
 * ## Purpose
 * Establishes a single, consistent visual contract for every page-level header
 * so the user's attention path is predictable across modules:
 *
 *   [icon]  Title (h1, semibold)           [  Primary CTA  ] [Secondary]
 *           Short description (muted)      ^^ one per view
 *
 * ## UX hierarchy rules baked in here
 * 1. **One focal point**: the h1 carries the heaviest type weight on the page.
 *    Everything else (metric values, card titles) must be a smaller or lighter
 *    step so the eye lands here first.
 * 2. **Muted description**: the description uses `text-muted-foreground` so it
 *    recedes, avoiding competition with the title or CTA (von Restorff: color
 *    and weight should mark the exception, not the baseline).
 * 3. **Right-aligned actions**: the natural left-to-right reading path lands on
 *    the primary CTA last — after context is established. Do not place primary
 *    CTAs on the left of the header.
 * 4. **One primary button** (`variant="default" | "destructive" | "gradient"`)
 *    per header at most. Other actions must use `outline`, `secondary`, `ghost`,
 *    or `link` so a single button wins the visual-weight competition.
 * 5. **Rhythm via spacing**: the component deliberately emits `mb-6` below the
 *    header so callers don't re-invent vertical rhythm.
 *
 * ## Example
 * ```tsx
 * <PageHeader
 *   icon={<GitBranch className="h-5 w-5" />}
 *   title="DAG Workflows"
 *   description="Manage your data pipeline orchestration"
 *   actions={
 *     <Button asChild>           // primary (variant="default")
 *       <Link to="/app/dags/new">Create DAG</Link>
 *     </Button>
 *   }
 * />
 * ```
 */
export interface PageHeaderProps {
  /** The page's h1 label. Keep under ~40 characters. */
  title: string;
  /** One short, user-facing sentence explaining what this page is for. */
  description?: string;
  /** Optional icon rendered in a muted container to the left of the title. */
  icon?: React.ReactNode;
  /**
   * Header actions (buttons, menus). Convention: **at most one** primary CTA
   * (filled `default` / `destructive` / `gradient` variant) plus zero or more
   * secondary / tertiary actions.
   */
  actions?: React.ReactNode;
  /** Optional slot for breadcrumbs or a back-link, rendered above the title. */
  eyebrow?: React.ReactNode;
  /** Render a subtle border below the header for visual separation. */
  bordered?: boolean;
  /** Additional classes for the outer <header> element. */
  className?: string;
  /**
   * When true, promotes the title with a gradient treatment. Reserve for
   * marketing / hero contexts only — in product pages the plain foreground
   * produces a clearer focal point.
   */
  accentTitle?: boolean;
}

export const PageHeader = React.forwardRef<HTMLElement, PageHeaderProps>(
  function PageHeader(
    {
      title,
      description,
      icon,
      actions,
      eyebrow,
      bordered = false,
      accentTitle = false,
      className,
    },
    ref,
  ) {
    // Stable id lets the <main> element's aria-labelledby point here.
    const reactId = React.useId();
    const titleId = `page-header-${reactId}`;

    return (
      <header
        ref={ref}
        aria-labelledby={titleId}
        className={cn(
          'mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between',
          bordered && 'border-b border-border pb-6',
          className,
        )}
      >
        <div className="flex min-w-0 items-start gap-3">
          {icon ? (
            <div
              aria-hidden
              className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground sm:flex"
            >
              {icon}
            </div>
          ) : null}

          <div className="min-w-0 flex-1">
            {eyebrow ? (
              <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {eyebrow}
              </div>
            ) : null}

            <h1
              id={titleId}
              className={cn(
                'truncate text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-3xl',
                accentTitle && 'text-gradient',
              )}
            >
              {title}
            </h1>

            {description ? (
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
        </div>

        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        ) : null}
      </header>
    );
  },
);
