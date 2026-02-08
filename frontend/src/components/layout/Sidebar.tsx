import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Database,
  GitBranch,
  Table2,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Boxes,
  MessageSquare,
  Book,
  Shield,
  Key,
  FileText,
  Layers,
  HardDrive,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'

const navigation = [
  { name: 'Dashboard', href: '/app/dashboard', icon: LayoutDashboard },
  { name: 'Ask Data', href: '/app/query', icon: MessageSquare },
  { name: 'Connections', href: '/app/connections', icon: Database },
  { name: 'DAGs', href: '/app/dags', icon: GitBranch },
  { name: 'PySpark Apps', href: '/app/pyspark', icon: Sparkles },
  { name: 'Semantic Layer', href: '/app/semantic', icon: Boxes },
  { name: 'Dashboards', href: '/app/dashboards', icon: BarChart3 },
  { name: 'Documentation', href: '/app/docs', icon: Book },
  { name: 'Settings', href: '/app/settings', icon: Settings },
]

const adminNavigation = [
  { name: 'dbt Operations', href: '/app/admin/dbt', icon: Layers },
  { name: 'Audit Logs', href: '/app/admin/audit', icon: FileText },
  { name: 'Roles & Permissions', href: '/app/admin/roles', icon: Key },
  { name: 'Backup & Recovery', href: '/app/admin/backups', icon: HardDrive },
]

export function Sidebar() {
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const { user } = useAuth()

  const isSuperAdmin = user?.roles?.includes('super_admin')
  const isAdmin = user?.roles?.includes('admin') || isSuperAdmin

  return (
    <div
      className={cn(
        'flex flex-col border-r bg-card transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
            N
          </div>
          {!collapsed && (
            <span className="text-lg font-semibold">NovaSight</span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-2 py-4">
        {navigation.map((item) => {
          const isActive = location.pathname.startsWith(item.href)
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Admin Navigation (Admin & Super Admin) */}
      {isAdmin && (
        <div className="border-t px-2 py-3">
          {!collapsed && (
            <p className="px-3 mb-2 text-xs font-semibold uppercase text-muted-foreground tracking-wider">
              Administration
            </p>
          )}
          {adminNavigation.map((item) => {
            const isActive = location.pathname.startsWith(item.href)
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span>{item.name}</span>}
              </Link>
            )
          })}
        </div>
      )}

      {/* Portal Management (Super Admin only) */}
      {isSuperAdmin && (
        <div className="border-t px-2 py-3">
          <Link
            to="/app/portal"
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              location.pathname.startsWith('/app/portal')
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <Shield className="h-5 w-5 shrink-0" />
            {!collapsed && <span>Portal Management</span>}
          </Link>
        </div>
      )}

      {/* Collapse toggle */}
      <div className="border-t p-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-center"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  )
}
