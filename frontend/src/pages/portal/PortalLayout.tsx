/**
 * Portal Management Layout
 * 
 * Shell layout for the super admin portal management area.
 * Provides a sidebar with portal-specific navigation and a content area.
 */

import React from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import {
  LayoutDashboard,
  Building2,
  Users,
  Server,
  ArrowLeft,
  Shield,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const portalNav = [
  { 
    name: 'Overview', 
    href: '/portal', 
    icon: LayoutDashboard,
    description: 'Dashboard & statistics',
    exact: true,
  },
  { 
    name: 'Tenants', 
    href: '/portal/tenants', 
    icon: Building2,
    description: 'Manage organizations',
  },
  { 
    name: 'Users', 
    href: '/portal/users', 
    icon: Users,
    description: 'Cross-tenant user management',
  },
  { 
    name: 'Infrastructure', 
    href: '/portal/infrastructure', 
    icon: Server,
    description: 'Server configurations',
  },
]

export const PortalLayout: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()

  const isSuperAdmin = user?.roles?.some(
    (r) => r === 'super_admin' || (typeof r === 'object' && (r as { name?: string }).name === 'super_admin')
  )

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <Shield className="h-16 w-16 text-muted-foreground mx-auto" />
          <h2 className="text-2xl font-bold">Access Denied</h2>
          <p className="text-muted-foreground">
            Portal management is restricted to super administrators.
          </p>
          <Button onClick={() => navigate('/dashboard')}>
            Return to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full -m-6">
      {/* Portal Sidebar */}
      <div className="w-72 border-r bg-card flex flex-col">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Portal Management</h2>
              <p className="text-xs text-muted-foreground">Super Admin</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground hover:text-foreground"
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Application
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          {portalNav.map((item) => {
            const isActive = item.exact
              ? location.pathname === item.href
              : location.pathname.startsWith(item.href)
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors group',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{item.name}</div>
                  <div className={cn(
                    'text-xs truncate',
                    isActive ? 'text-primary-foreground/70' : 'text-muted-foreground'
                  )}>
                    {item.description}
                  </div>
                </div>
                <ChevronRight className={cn(
                  'h-4 w-4 shrink-0 transition-transform',
                  isActive ? 'text-primary-foreground/70' : 'opacity-0 group-hover:opacity-50'
                )} />
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t">
          <div className="text-xs text-muted-foreground">
            Logged in as <span className="font-medium text-foreground">{user?.email}</span>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6 bg-muted/40">
        <Outlet />
      </div>
    </div>
  )
}
