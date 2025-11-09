'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Shield, Key, Lock, Plus, Edit2, Trash2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Role {
  id: string
  name: string
  description: string | null
  created_at: string
}

interface Module {
  id: string
  name: string
  description: string | null
  path: string
  available_actions: string[]
  parent_id: string | null
}

interface RoleModulePermission {
  id: string
  role_id: string
  module_id: string
  actions: string[]
  roles: { name: string }
  modules: { name: string; path: string }
}

export default function AdminPage() {
  const [roles, setRoles] = useState<Role[]>([])
  const [modules, setModules] = useState<Module[]>([])
  const [permissions, setPermissions] = useState<RoleModulePermission[]>([])
  const [stats, setStats] = useState({ roles: 0, permissions: 0, modules: 0 })
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [rolesRes, modulesRes, permissionsRes] = await Promise.all([
        supabase.from('roles').select('*').order('name'),
        supabase.from('modules').select('*').order('name'),
        supabase
          .from('role_module_permissions')
          .select(`
            *,
            roles(name),
            modules(name, path)
          `)
          .order('created_at', { ascending: false })
      ])

      if (rolesRes.data) setRoles(rolesRes.data)
      if (modulesRes.data) setModules(modulesRes.data)
      if (permissionsRes.data) setPermissions(permissionsRes.data)

      setStats({
        roles: rolesRes.data?.length || 0,
        permissions: permissionsRes.data?.length || 0,
        modules: modulesRes.data?.length || 0
      })
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getModuleColor = (moduleName: string) => {
    const colors: Record<string, string> = {
      users: 'bg-red-100 text-red-700 border-red-200',
      dashboard: 'bg-blue-100 text-blue-700 border-blue-200',
      equipment: 'bg-green-100 text-green-700 border-green-200',
      reservations: 'bg-orange-100 text-orange-700 border-orange-200',
      attendances: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      labs: 'bg-teal-100 text-teal-700 border-teal-200',
      activities: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    }
    return colors[moduleName] || 'bg-gray-100 text-gray-700 border-gray-200'
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Admin</h1>
            <p className="text-gray-600 mt-1">Manage roles, modules, and permissions</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Module
            </Button>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Role
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Roles</CardTitle>
              <Shield className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.roles}</div>
              <p className="text-xs text-gray-600 mt-1">Active roles</p>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Permissions</CardTitle>
              <Key className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.permissions}</div>
              <p className="text-xs text-gray-600 mt-1">Assigned permissions</p>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Modules</CardTitle>
              <Lock className="h-4 w-4 text-teal-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.modules}</div>
              <p className="text-xs text-gray-600 mt-1">System modules</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle>Roles</CardTitle>
              <CardDescription>Manage user roles and their capabilities</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-gray-500">Loading roles...</div>
              ) : roles.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No roles found</div>
              ) : (
                <div className="space-y-3">
                  {roles.map((role) => (
                    <div
                      key={role.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                          <Shield className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{role.name}</h3>
                          <p className="text-sm text-gray-600">{role.description || 'No description'}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="gap-1">
                          <Edit2 className="h-3 w-3" />
                          Edit
                        </Button>
                        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle>Modules</CardTitle>
              <CardDescription>System modules with available actions</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-gray-500">Loading modules...</div>
              ) : modules.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No modules found</div>
              ) : (
                <div className="space-y-3">
                  {modules.map((module) => (
                    <div
                      key={module.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900">{module.name}</h3>
                          <Badge variant="outline" className="text-xs">
                            {module.path}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{module.description || 'No description'}</p>
                        <div className="flex gap-1 mt-2">
                          {module.available_actions.map((action, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {action}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button variant="outline" size="sm" className="gap-1">
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Role Permissions</CardTitle>
                <CardDescription>Manage role-module permissions and actions</CardDescription>
              </div>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Assign Permission
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading permissions...</div>
            ) : permissions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No permissions assigned yet</div>
            ) : (
              <div className="relative overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                    <tr>
                      <th className="px-6 py-3">Role</th>
                      <th className="px-6 py-3">Module</th>
                      <th className="px-6 py-3">Path</th>
                      <th className="px-6 py-3">Actions</th>
                      <th className="px-6 py-3">Manage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {permissions.map((permission) => (
                      <tr key={permission.id} className="bg-white border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-900">
                          <Badge variant="outline" className="font-semibold">
                            {permission.roles.name}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <Badge className={getModuleColor(permission.modules.name)}>
                            {permission.modules.name}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-gray-600 text-xs font-mono">
                          {permission.modules.path}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-1 flex-wrap">
                            {permission.actions.map((action, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {action}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="gap-1">
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
