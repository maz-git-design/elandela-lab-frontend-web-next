'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  UserCheck,
  Calendar,
  Microscope,
  Users,
  Shield,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  User as UserIcon,
  BarChart3,
  Layers
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUserProfile, UserRole } from '@/lib/auth/roles'

interface MenuItem {
  title: string
  href: string
  icon: typeof LayoutDashboard
  roles: UserRole[]
}

const menuItems: MenuItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['user', 'lab_admin', 'super_admin'],
  },
  {
    title: 'Analytics',
    href: '/analytics',
    icon: BarChart3,
    roles: ['user', 'lab_admin', 'super_admin'],
  },
  {
    title: 'Attendances',
    href: '/attendances',
    icon: UserCheck,
    roles: ['user', 'lab_admin', 'super_admin'],
  },
  {
    title: 'Reservations',
    href: '/reservations',
    icon: Calendar,
    roles: ['user', 'lab_admin', 'super_admin'],
  },
  {
    title: 'Labs',
    href: '/labs',
    icon: Microscope,
    roles: ['user', 'lab_admin', 'super_admin'],
  },
  {
    title: 'Users',
    href: '/users',
    icon: Users,
    roles: ['super_admin'],
  },
  {
    title: 'Management',
    href: '/management',
    icon: Layers,
    roles: ['super_admin'],
  },
  {
    title: 'Admin',
    href: '/admin',
    icon: Shield,
    roles: ['super_admin'],
  },
]

const bottomMenuItems = [
  {
    title: 'Settings',
    href: '/settings',
    icon: Settings,
  },
]

interface SidebarProps {
  collapsed: boolean
  setCollapsed: (collapsed: boolean) => void
}

export function Sidebar({ collapsed, setCollapsed }: SidebarProps) {
  const pathname = usePathname()
  const [user, setUser] = useState<{ email: string; full_name?: string; role?: UserRole } | null>(null)
  const [userRole, setUserRole] = useState<UserRole>('user')
  const supabase = createClient()

  useEffect(() => {
    const fetchUser = async () => {
      const profile = await getCurrentUserProfile()
      if (profile) {
        setUser({
          email: profile.email,
          full_name: profile.full_name,
          role: profile.role,
        })
        setUserRole(profile.role)
      }
    }
    fetchUser()
  }, [])

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen border-r border-gray-200 bg-white transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex h-full flex-col">
        <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4">
          {!collapsed && (
            <h1 className="text-xl font-bold text-blue-600">
              Lab Manager
            </h1>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="rounded-lg p-2 hover:bg-gray-100"
          >
            {collapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-5 w-5" />
            )}
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {menuItems
            .filter(item => item.roles.includes(userRole))
            .map((item) => {
              const Icon = item.icon
              const isActive = pathname.startsWith(item.href)

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.title : ''}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors relative group',
                    collapsed ? 'justify-center' : '',
                    isActive
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  )}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {!collapsed && <span>{item.title}</span>}
                </Link>
              )
            })}
        </nav>

        <div className="border-t border-gray-200 p-4 space-y-2">
          {user && (
            <div className={cn(
              "flex items-center gap-3 px-3 py-2 mb-2 border-b border-gray-200 pb-3",
              collapsed ? "justify-center" : ""
            )}>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 flex-shrink-0">
                <UserIcon className="h-4 w-4 text-blue-600" />
              </div>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user.full_name || 'User'}
                  </p>
                  <p className="text-xs text-gray-600 truncate">
                    {user.email}
                  </p>
                  <p className="text-xs text-blue-600 font-medium capitalize mt-0.5">
                    {user.role?.replace('_', ' ')}
                  </p>
                </div>
              )}
            </div>
          )}

          {bottomMenuItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href

            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.title : ''}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  collapsed ? 'justify-center' : '',
                  isActive
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                )}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span>{item.title}</span>}
              </Link>
            )
          })}

          <button
            onClick={async () => {
              await supabase.auth.signOut()
              window.location.href = '/auth/login'
            }}
            title={collapsed ? 'Logout' : ''}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900',
              collapsed ? 'justify-center' : ''
            )}
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </div>
    </aside>
  )
}
