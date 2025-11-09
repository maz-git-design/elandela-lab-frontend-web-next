'use client'

import { Sidebar } from './sidebar'
import { ReactNode } from 'react'

interface DashboardLayoutProps {
  children: ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="ml-64 flex-1 transition-all overflow-x-hidden">
        <div className="max-w-full p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
