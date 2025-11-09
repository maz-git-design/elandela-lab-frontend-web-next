'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { UserCheck, Calendar, Microscope, Users, Activity } from 'lucide-react'

const stats = [
  {
    title: 'Total Attendances',
    value: '1,234',
    change: '+12% from last month',
    icon: UserCheck,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  {
    title: 'Active Reservations',
    value: '45',
    change: '+5 pending approval',
    icon: Calendar,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  {
    title: 'Lab Equipment',
    value: '89',
    change: '12 in maintenance',
    icon: Microscope,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
  {
    title: 'Active Users',
    value: '567',
    change: '+23 new this month',
    icon: Users,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
  },
]

const recentActivities = [
  {
    user: 'John Doe',
    action: 'checked in for Lab Session',
    time: '5 minutes ago',
    type: 'attendance',
  },
  {
    user: 'Jane Smith',
    action: 'reserved Microscope A1',
    time: '15 minutes ago',
    type: 'reservation',
  },
  {
    user: 'Mike Johnson',
    action: 'completed Lab Session',
    time: '1 hour ago',
    type: 'activity',
  },
  {
    user: 'Sarah Williams',
    action: 'registered new equipment',
    time: '2 hours ago',
    type: 'equipment',
  },
]

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back! Here is your lab overview.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <Card key={stat.title} className="border-none shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    {stat.title}
                  </CardTitle>
                  <div className={`${stat.bgColor} ${stat.color} rounded-lg p-2`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-gray-600 mt-1">{stat.change}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest actions in the system</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivities.map((activity, index) => (
                  <div key={index} className="flex items-start gap-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50">
                      <Activity className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {activity.user}
                      </p>
                      <p className="text-sm text-gray-600">
                        {activity.action}
                      </p>
                      <p className="text-xs text-gray-500">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
              <CardDescription>Performance metrics</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Attendance Rate</span>
                <span className="text-sm font-bold text-green-600">94%</span>
              </div>
              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full w-[94%] bg-green-500 rounded-full"></div>
              </div>

              <div className="flex items-center justify-between mt-4">
                <span className="text-sm font-medium">Equipment Utilization</span>
                <span className="text-sm font-bold text-blue-600">78%</span>
              </div>
              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full w-[78%] bg-blue-500 rounded-full"></div>
              </div>

              <div className="flex items-center justify-between mt-4">
                <span className="text-sm font-medium">Lab Capacity</span>
                <span className="text-sm font-bold text-purple-600">65%</span>
              </div>
              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full w-[65%] bg-purple-500 rounded-full"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
