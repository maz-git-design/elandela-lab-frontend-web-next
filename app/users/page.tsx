'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Users as UsersIcon, Plus, UserPlus, UserCheck } from 'lucide-react'

const users = [
  {
    id: '1',
    fullName: 'John Doe',
    email: 'john.doe@university.edu',
    role: 'student',
    department: 'Computer Science',
    cohort: 'CS 2024',
    phone: '+1234567890',
    status: 'active',
  },
  {
    id: '2',
    fullName: 'Jane Smith',
    email: 'jane.smith@university.edu',
    role: 'instructor',
    department: 'Physics',
    cohort: '-',
    phone: '+1234567891',
    status: 'active',
  },
  {
    id: '3',
    fullName: 'Mike Johnson',
    email: 'mike.johnson@university.edu',
    role: 'student',
    department: 'Biology',
    cohort: 'BIO 2023',
    phone: '+1234567892',
    status: 'active',
  },
  {
    id: '4',
    fullName: 'Sarah Williams',
    email: 'sarah.williams@university.edu',
    role: 'admin',
    department: 'Administration',
    cohort: '-',
    phone: '+1234567893',
    status: 'active',
  },
]

function getRoleColor(role: string) {
  switch (role) {
    case 'admin':
      return 'bg-red-100 text-red-700 border-red-200'
    case 'instructor':
      return 'bg-blue-100 text-blue-700 border-blue-200'
    case 'student':
      return 'bg-green-100 text-green-700 border-green-200'
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200'
  }
}

export default function UsersPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Users</h1>
            <p className="text-gray-600 mt-1">Manage system users and their access</p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add User
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <UsersIcon className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">567</div>
              <p className="text-xs text-gray-600 mt-1">+23 this month</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Students</CardTitle>
              <UserCheck className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">489</div>
              <p className="text-xs text-gray-600 mt-1">Active students</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Instructors</CardTitle>
              <UserPlus className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">67</div>
              <p className="text-xs text-gray-600 mt-1">Teaching staff</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Admins</CardTitle>
              <UsersIcon className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">11</div>
              <p className="text-xs text-gray-600 mt-1">System administrators</p>
            </CardContent>
          </Card>
        </div>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>User Directory</CardTitle>
            <CardDescription>View and manage all system users</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                  <tr>
                    <th className="px-6 py-3">Name</th>
                    <th className="px-6 py-3">Email</th>
                    <th className="px-6 py-3">Role</th>
                    <th className="px-6 py-3">Department</th>
                    <th className="px-6 py-3">Cohort</th>
                    <th className="px-6 py-3">Phone</th>
                    <th className="px-6 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="bg-white border-b hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {user.fullName}
                      </td>
                      <td className="px-6 py-4">{user.email}</td>
                      <td className="px-6 py-4">
                        <Badge className={getRoleColor(user.role)}>
                          {user.role}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">{user.department}</td>
                      <td className="px-6 py-4">{user.cohort}</td>
                      <td className="px-6 py-4">{user.phone}</td>
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
