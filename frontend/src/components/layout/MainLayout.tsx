import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

export function MainLayout() {
  const location = useLocation()
  const isPortalRoute = location.pathname.startsWith('/app/portal')

  return (
    <div className="flex h-screen overflow-hidden">
      {!isPortalRoute && <Sidebar />}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-muted/40 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
