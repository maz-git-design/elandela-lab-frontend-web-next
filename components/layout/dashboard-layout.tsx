'use client'

import { Sidebar } from './sidebar'
import { ReactNode, useState } from 'react'

interface DashboardLayoutProps {
  children: ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <main className={`flex-1 transition-all duration-300 overflow-x-hidden ${collapsed ? 'ml-16' : 'ml-64'}`}>
        <div className="max-w-full p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
