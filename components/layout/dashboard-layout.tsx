'use client'

import { Sidebar } from './sidebar'
import { ReactNode, useState, useEffect } from 'react'

interface DashboardLayoutProps {
  children: ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const savedState = localStorage.getItem('sidebar-collapsed')
    if (savedState !== null) {
      setCollapsed(savedState === 'true')
    }
    setMounted(true)
  }, [])

  const handleSetCollapsed = (value: boolean) => {
    setCollapsed(value)
    localStorage.setItem('sidebar-collapsed', String(value))
  }

  if (!mounted) {
    return null
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar collapsed={collapsed} setCollapsed={handleSetCollapsed} />
      <main className={`flex-1 transition-all duration-300 overflow-x-hidden ${collapsed ? 'ml-16' : 'ml-64'}`}>
        <div className="max-w-full p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
