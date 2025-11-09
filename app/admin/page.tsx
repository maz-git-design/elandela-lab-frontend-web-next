'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Shield, Key, Lock, Plus } from 'lucide-react'

const roles = [
  {
    id: '1',
    name: 'Admin',
    description: 'Full system access',
    userCount: 11,
    permissions: 45,
  },
  {
    id: '2',
    name: 'Instructor',
    description: 'Teaching and lab management',
    userCount: 67,
    permissions: 28,
  },
  {
    id: '3',
    name: 'Student',
    description: 'Basic lab access',
    userCount: 489,
    permissions: 12,
  },
]

const permissions = [
  {
    id: '1',
    name: 'manage_users',
    description: 'Create, update, and delete users',
    module: 'users',
    assignedRoles: ['Admin'],
  },
  {
    id: '2',
    name: 'view_dashboard',
    description: 'Access dashboard',
    module: 'dashboard',
    assignedRoles: ['Admin', 'Instructor', 'Student'],
  },
  {
    id: '3',
    name: 'manage_equipment',
    description: 'Add and modify lab equipment',
    module: 'equipment',
    assignedRoles: ['Admin', 'Instructor'],
  },
  {
    id: '4',
    name: 'create_reservation',
    description: 'Create equipment reservations',
    module: 'reservations',
    assignedRoles: ['Admin', 'Instructor', 'Student'],
  },
  {
    id: '5',
    name: 'manage_attendance',
    description: 'Mark and modify attendance',
    module: 'attendance',
    assignedRoles: ['Admin', 'Instructor'],
  },
]

function getModuleColor(module: string) {
  const colors: Record<string, string> = {
    users: 'bg-red-100 text-red-700 border-red-200',
    dashboard: 'bg-blue-100 text-blue-700 border-blue-200',
    equipment: 'bg-green-100 text-green-700 border-green-200',
    reservations: 'bg-purple-100 text-purple-700 border-purple-200',
    attendance: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  }
  return colors[module] || 'bg-gray-100 text-gray-700 border-gray-200'
}

export default function AdminPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Admin</h1>
            <p className="text-gray-600 mt-1">Manage roles, modules, and permissions</p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Role
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Roles</CardTitle>
              <Shield className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">3</div>
              <p className="text-xs text-gray-600 mt-1">Active roles</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Permissions</CardTitle>
              <Key className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">45</div>
              <p className="text-xs text-gray-600 mt-1">System permissions</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Modules</CardTitle>
              <Lock className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">7</div>
              <p className="text-xs text-gray-600 mt-1">Protected modules</p>
            </CardContent>
          </Card>
        </div>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Roles</CardTitle>
            <CardDescription>Manage user roles and their capabilities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {roles.map((role) => (
                <div
                  key={role.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50">
                      <Shield className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{role.name}</h3>
                      <p className="text-sm text-gray-600">{role.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-medium">{role.userCount} users</p>
                      <p className="text-xs text-gray-600">{role.permissions} permissions</p>
                    </div>
                    <Button variant="outline" size="sm">
                      Edit
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Permissions</CardTitle>
            <CardDescription>System permissions and their assignments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                  <tr>
                    <th className="px-6 py-3">Permission</th>
                    <th className="px-6 py-3">Description</th>
                    <th className="px-6 py-3">Module</th>
                    <th className="px-6 py-3">Assigned Roles</th>
                    <th className="px-6 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {permissions.map((permission) => (
                    <tr key={permission.id} className="bg-white border-b hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {permission.name}
                      </td>
                      <td className="px-6 py-4">{permission.description}</td>
                      <td className="px-6 py-4">
                        <Badge className={getModuleColor(permission.module)}>
                          {permission.module}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-1">
                          {permission.assignedRoles.map((role, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {role}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Button variant="outline" size="sm">
                          Edit
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
