'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Activity, Calendar, Building, Layers, Users, Plus } from 'lucide-react'

const stats = [
  {
    title: 'Activities',
    value: '45',
    description: 'Lab sessions & workshops',
    icon: Activity,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  {
    title: 'Academic Years',
    value: '3',
    description: 'Active and archived',
    icon: Calendar,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  {
    title: 'Departments',
    value: '12',
    description: 'Across university',
    icon: Building,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
  {
    title: 'Cohorts',
    value: '28',
    description: 'Student groups',
    icon: Users,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
  },
]

const activities = [
  {
    id: '1',
    name: 'Physics Lab Session',
    type: 'lab_session',
    instructor: 'Dr. Jane Smith',
    department: 'Physics',
    startTime: '2025-11-10 09:00',
    endTime: '2025-11-10 12:00',
    location: 'Lab 101',
  },
  {
    id: '2',
    name: 'Chemistry Workshop',
    type: 'workshop',
    instructor: 'Prof. John Doe',
    department: 'Chemistry',
    startTime: '2025-11-11 14:00',
    endTime: '2025-11-11 17:00',
    location: 'Lab 203',
  },
]

const departments = [
  { id: '1', name: 'Computer Science', code: 'CS', students: 156 },
  { id: '2', name: 'Physics', code: 'PHY', students: 89 },
  { id: '3', name: 'Chemistry', code: 'CHEM', students: 112 },
  { id: '4', name: 'Biology', code: 'BIO', students: 132 },
]

export default function ManagementPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Management</h1>
          <p className="text-gray-600 mt-1">Manage activities, academic years, departments, and cohorts</p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <Card key={stat.title} className="border-gray-200 shadow-sm">
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
                  <p className="text-xs text-gray-600 mt-1">{stat.description}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Activities</CardTitle>
                <CardDescription>Manage lab sessions and workshops</CardDescription>
              </div>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                      <Activity className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{activity.name}</h4>
                      <p className="text-sm text-gray-600">{activity.instructor}</p>
                      <div className="flex gap-4 mt-2 text-xs text-gray-500">
                        <span>{activity.department}</span>
                        <span>{activity.location}</span>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      Edit
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Departments</CardTitle>
                <CardDescription>Academic departments</CardDescription>
              </div>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {departments.map((dept) => (
                  <div
                    key={dept.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50">
                        <Building className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{dept.name}</h4>
                        <p className="text-sm text-gray-600">Code: {dept.code}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-600">{dept.students} students</span>
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Academic Years</CardTitle>
                <CardDescription>Manage academic year periods</CardDescription>
              </div>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-900">2024-2025</h4>
                      <p className="text-sm text-gray-600">Sep 2024 - Jun 2025</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-blue-700 bg-blue-100 px-2 py-1 rounded">
                        Current
                      </span>
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-900">2023-2024</h4>
                      <p className="text-sm text-gray-600">Sep 2023 - Jun 2024</p>
                    </div>
                    <Button variant="outline" size="sm">
                      View
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Equipment Categories</CardTitle>
                <CardDescription>Lab equipment classification</CardDescription>
              </div>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {['Microscopes', 'Centrifuges', 'Spectrophotometers', 'PCR Machines'].map((category, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50">
                        <Layers className="h-4 w-4 text-green-600" />
                      </div>
                      <span className="font-medium text-gray-900">{category}</span>
                    </div>
                    <Button variant="outline" size="sm">
                      Edit
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
