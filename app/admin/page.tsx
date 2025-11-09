'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Shield, Users, Lock, Boxes, Plus, Edit, Trash2, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Role {
  id: string
  name: string
  description: string | null
  created_at: string
}

interface Permission {
  id: string
  role_id: string
  module_id: string
  actions: string[]
  roles: { name: string }
  modules: { name: string; path: string }
}

interface Module {
  id: string
  name: string
  description: string | null
  path: string
  parent_id: string | null
  available_actions: string[]
}

interface User {
  id: string
  email: string
  username: string | null
  first_name: string | null
  last_name: string | null
  status_state: string | null
}

export default function AdminPage() {
  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [modules, setModules] = useState<Module[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  const [showRoleDialog, setShowRoleDialog] = useState(false)
  const [showUserRoleDialog, setShowUserRoleDialog] = useState(false)
  const [showPermissionDialog, setShowPermissionDialog] = useState(false)
  const [showModuleDialog, setShowModuleDialog] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null)
  const [editingModule, setEditingModule] = useState<Module | null>(null)
  const [editingRole, setEditingRole] = useState<Role | null>(null)

  const [roleForm, setRoleForm] = useState({ name: '', description: '' })
  const [selectedModulePermissions, setSelectedModulePermissions] = useState<Record<string, string[]>>({})
  const [searchTerm, setSearchTerm] = useState('')

  const [permissionForm, setPermissionForm] = useState({ role_id: '', module_id: '', actions: [] as string[] })
  const [moduleForm, setModuleForm] = useState({
    name: '',
    description: '',
    path: '',
    parent_id: null as string | null,
    available_actions: [] as string[]
  })

  const supabase = createClient()

  useEffect(() => {
    fetchAllData()
  }, [])

  async function fetchAllData() {
    setLoading(true)
    await Promise.all([
      fetchRoles(),
      fetchPermissions(),
      fetchModules(),
      fetchUsers()
    ])
    setLoading(false)
  }

  async function fetchRoles() {
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) console.error('Error fetching roles:', error)
    if (data) setRoles(data)
  }

  async function fetchPermissions() {
    const { data, error } = await supabase
      .from('role_module_permissions')
      .select(`
        *,
        roles(name),
        modules(name, path)
      `)
      .order('created_at', { ascending: false })
    if (error) console.error('Error fetching permissions:', error)
    if (data) setPermissions(data as Permission[])
  }

  async function fetchModules() {
    const { data, error } = await supabase
      .from('modules')
      .select('*')
      .order('name')
    if (error) console.error('Error fetching modules:', error)
    if (data) setModules(data)
  }

  async function fetchUsers() {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, username, first_name, last_name, status_state')
      .order('created_at', { ascending: false })
    if (error) console.error('Error fetching users:', error)
    if (data) setUsers(data)
  }

  async function handleCreateOrUpdateRole() {
    if (!roleForm.name) return

    if (editingRole) {
      await supabase
        .from('roles')
        .update({ name: roleForm.name, description: roleForm.description })
        .eq('id', editingRole.id)
    } else {
      const { data, error } = await supabase
        .from('roles')
        .insert({ name: roleForm.name, description: roleForm.description })
        .select()
        .maybeSingle()

      if (!error && data && Object.keys(selectedModulePermissions).length > 0) {
        const rolePermissions = Object.entries(selectedModulePermissions).map(([moduleId, actions]) => ({
          role_id: data.id,
          module_id: moduleId,
          actions
        }))
        await supabase.from('role_module_permissions').insert(rolePermissions)
      }
    }

    setShowRoleDialog(false)
    setRoleForm({ name: '', description: '' })
    setSelectedModulePermissions({})
    setEditingRole(null)
    fetchRoles()
    fetchPermissions()
  }

  async function handleDeleteRole(roleId: string) {
    await supabase.from('roles').delete().eq('id', roleId)
    fetchRoles()
    fetchPermissions()
  }

  async function handleAssignRoleToUser(userId: string, roleId: string) {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('user_roles').insert({
      user_id: userId,
      role_id: roleId,
      assigned_by: user?.id
    })
    setShowUserRoleDialog(false)
    setSelectedUser(null)
  }

  async function handleSavePermission() {
    if (!permissionForm.role_id || !permissionForm.module_id) return

    if (editingPermission) {
      await supabase
        .from('role_module_permissions')
        .update({ actions: permissionForm.actions })
        .eq('id', editingPermission.id)
    } else {
      await supabase.from('role_module_permissions').insert(permissionForm)
    }

    setShowPermissionDialog(false)
    setPermissionForm({ role_id: '', module_id: '', actions: [] })
    setEditingPermission(null)
    fetchPermissions()
  }

  async function handleDeletePermission(permissionId: string) {
    await supabase.from('role_module_permissions').delete().eq('id', permissionId)
    fetchPermissions()
  }

  async function handleSaveModule() {
    if (!moduleForm.name || !moduleForm.path) return

    if (editingModule) {
      await supabase
        .from('modules')
        .update(moduleForm)
        .eq('id', editingModule.id)
    } else {
      await supabase.from('modules').insert(moduleForm)
    }

    setShowModuleDialog(false)
    setModuleForm({ name: '', description: '', path: '', parent_id: null, available_actions: [] })
    setEditingModule(null)
    fetchModules()
  }

  async function handleDeleteModule(moduleId: string) {
    await supabase.from('modules').delete().eq('id', moduleId)
    fetchModules()
  }

  const groupedPermissions = modules.map(module => ({
    module,
    permissions: permissions.filter(p => p.module_id === module.id)
  }))

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Admin Panel</h2>
          <p className="text-gray-600 mt-1">Manage roles, permissions, and user access</p>
        </div>

        <Tabs defaultValue="roles" className="space-y-6">
          <TabsList className="bg-gray-100">
            <TabsTrigger value="roles" className="gap-2">
              <Shield className="w-4 h-4" />
              Roles
            </TabsTrigger>
            <TabsTrigger value="permissions" className="gap-2">
              <Lock className="w-4 h-4" />
              Permissions
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="w-4 h-4" />
              User Access
            </TabsTrigger>
            <TabsTrigger value="modules" className="gap-2">
              <Boxes className="w-4 h-4" />
              Modules
            </TabsTrigger>
          </TabsList>

          <TabsContent value="roles" className="space-y-4">
            <Card className="border-gray-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-semibold">Roles Management</CardTitle>
                    <CardDescription>Create and manage user roles</CardDescription>
                  </div>
                  <Button onClick={() => setShowRoleDialog(true)} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Role
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : roles.length === 0 ? (
                  <div className="text-center py-12">
                    <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No roles found</h3>
                    <p className="text-gray-600 mb-4">Create your first role to get started</p>
                    <Button onClick={() => setShowRoleDialog(true)} className="bg-blue-600 hover:bg-blue-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Role
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {roles.map(role => (
                      <div key={role.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                              <Shield className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900">{role.name}</h4>
                              <p className="text-sm text-gray-600">{role.description || 'No description'}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingRole(role)
                              setRoleForm({ name: role.name, description: role.description || '' })
                              setShowRoleDialog(true)
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteRole(role.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="permissions" className="space-y-4">
            <Card className="border-gray-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-semibold">Permissions</CardTitle>
                    <CardDescription>{permissions.length} permissions across {modules.length} modules</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative w-64">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        placeholder="Search permissions..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 border-gray-200"
                      />
                    </div>
                    <Button onClick={() => setShowPermissionDialog(true)} className="bg-blue-600 hover:bg-blue-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Permission
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {groupedPermissions.map(({ module, permissions: modulePerms }) => (
                      modulePerms.length > 0 && (
                        <div key={module.id}>
                          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <Boxes className="w-4 h-4 text-teal-600" />
                            {module.name}
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {modulePerms.map(perm => (
                              <div key={perm.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex-1">
                                    <span className="font-medium text-gray-900 text-sm">{perm.roles.name}</span>
                                    <div className="flex gap-1 mt-1 flex-wrap">
                                      {perm.actions.map(action => (
                                        <Badge key={action} className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                                          {action}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                  <div className="flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setEditingPermission(perm)
                                        setPermissionForm({
                                          role_id: perm.role_id,
                                          module_id: perm.module_id,
                                          actions: perm.actions
                                        })
                                        setShowPermissionDialog(true)
                                      }}
                                    >
                                      <Edit className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeletePermission(perm.id)}
                                      className="text-red-600 hover:text-red-700"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                                <p className="text-xs text-gray-600">{perm.modules.path}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <Card className="border-gray-200">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">User Access Management</CardTitle>
                <CardDescription>Assign roles to users</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : users.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
                    <p className="text-gray-600">Users will appear here once they are created</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {users.map(user => (
                      <div key={user.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                            <span className="text-sm font-semibold text-white">
                              {user.first_name?.[0] || user.email?.[0]?.toUpperCase() || 'U'}
                            </span>
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">{user.username || user.email}</h4>
                            <p className="text-sm text-gray-600">{user.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={
                            user.status_state === 'activated' ? 'bg-green-50 text-green-700 border-green-200' :
                            'bg-yellow-50 text-yellow-700 border-yellow-200'
                          }>
                            {user.status_state || 'pending'}
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(user)
                              setShowUserRoleDialog(true)
                            }}
                          >
                            Assign Role
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="modules" className="space-y-4">
            <Card className="border-gray-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-semibold">Modules</CardTitle>
                    <CardDescription>Application modules and their access paths</CardDescription>
                  </div>
                  <Button onClick={() => setShowModuleDialog(true)} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Module
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {modules.map(module => (
                      <div key={module.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-start justify-between mb-2">
                          <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                            <Boxes className="w-5 h-5 text-teal-600" />
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingModule(module)
                                setModuleForm({
                                  name: module.name,
                                  description: module.description || '',
                                  path: module.path,
                                  parent_id: module.parent_id,
                                  available_actions: module.available_actions
                                })
                                setShowModuleDialog(true)
                              }}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteModule(module.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        <h4 className="font-semibold text-gray-900 mb-1">{module.name}</h4>
                        <p className="text-sm text-gray-600 mb-2">{module.description}</p>
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-700 block mb-2">
                          {module.path}
                        </code>
                        <div className="flex gap-1 flex-wrap">
                          {module.available_actions.map((action, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {action}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent>
          <DialogClose onClick={() => {
            setShowRoleDialog(false)
            setEditingRole(null)
            setRoleForm({ name: '', description: '' })
            setSelectedModulePermissions({})
          }} />
          <DialogHeader>
            <DialogTitle>{editingRole ? 'Edit Role' : 'Create New Role'}</DialogTitle>
            <DialogDescription>Define a new role and assign module permissions</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label htmlFor="roleName" className="text-sm font-medium">Role Name *</Label>
              <Input
                id="roleName"
                value={roleForm.name}
                onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                placeholder="e.g. Content Manager"
                className="mt-1 border-gray-200"
              />
            </div>
            <div>
              <Label htmlFor="roleDesc" className="text-sm font-medium">Description</Label>
              <textarea
                id="roleDesc"
                value={roleForm.description}
                onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                placeholder="Describe the role's purpose"
                className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 min-h-[60px] text-sm"
              />
            </div>
            {!editingRole && (
              <div>
                <Label className="text-sm font-medium">Module Permissions</Label>
                <div className="mt-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3 space-y-3">
                  {modules.map(module => (
                    <div key={module.id} className="p-2 border border-gray-100 rounded">
                      <h4 className="font-medium text-sm text-gray-900 mb-2">{module.name}</h4>
                      <div className="flex flex-wrap gap-2">
                        {module.available_actions.map(action => (
                          <label key={action} className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedModulePermissions[module.id]?.includes(action) || false}
                              onChange={(e) => {
                                const current = selectedModulePermissions[module.id] || []
                                if (e.target.checked) {
                                  setSelectedModulePermissions({
                                    ...selectedModulePermissions,
                                    [module.id]: [...current, action]
                                  })
                                } else {
                                  setSelectedModulePermissions({
                                    ...selectedModulePermissions,
                                    [module.id]: current.filter(a => a !== action)
                                  })
                                }
                              }}
                              className="w-4 h-4 text-blue-600"
                            />
                            <span className="text-xs">{action}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowRoleDialog(false)
                  setEditingRole(null)
                  setRoleForm({ name: '', description: '' })
                  setSelectedModulePermissions({})
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateOrUpdateRole}
                disabled={!roleForm.name}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {editingRole ? 'Update' : 'Create'} Role
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showUserRoleDialog} onOpenChange={setShowUserRoleDialog}>
        <DialogContent>
          <DialogClose onClick={() => {
            setShowUserRoleDialog(false)
            setSelectedUser(null)
          }} />
          <DialogHeader>
            <DialogTitle>Assign Role</DialogTitle>
            <DialogDescription>
              Assign a role to {selectedUser?.username || selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {roles.map(role => (
              <button
                key={role.id}
                onClick={() => selectedUser && handleAssignRoleToUser(selectedUser.id, role.id)}
                className="w-full p-3 text-left border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                <h4 className="font-semibold text-gray-900">{role.name}</h4>
                <p className="text-sm text-gray-600">{role.description}</p>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showPermissionDialog} onOpenChange={setShowPermissionDialog}>
        <DialogContent>
          <DialogClose onClick={() => {
            setShowPermissionDialog(false)
            setEditingPermission(null)
            setPermissionForm({ role_id: '', module_id: '', actions: [] })
          }} />
          <DialogHeader>
            <DialogTitle>{editingPermission ? 'Edit Permission' : 'Create Permission'}</DialogTitle>
            <DialogDescription>Assign module actions to a role</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label htmlFor="permRole" className="text-sm font-medium">Role *</Label>
              <Select
                value={permissionForm.role_id}
                onValueChange={(value) => setPermissionForm({ ...permissionForm, role_id: value })}
              >
                <SelectTrigger className="mt-1 border-gray-200">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="permModule" className="text-sm font-medium">Module *</Label>
              <Select
                value={permissionForm.module_id}
                onValueChange={(value) => setPermissionForm({ ...permissionForm, module_id: value })}
              >
                <SelectTrigger className="mt-1 border-gray-200">
                  <SelectValue placeholder="Select module" />
                </SelectTrigger>
                <SelectContent>
                  {modules.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium">Actions</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {['Create', 'Update', 'List', 'Delete'].map(action => (
                  <label key={action} className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={permissionForm.actions.includes(action)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setPermissionForm({ ...permissionForm, actions: [...permissionForm.actions, action] })
                        } else {
                          setPermissionForm({ ...permissionForm, actions: permissionForm.actions.filter(a => a !== action) })
                        }
                      }}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm">{action}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowPermissionDialog(false)
                  setEditingPermission(null)
                  setPermissionForm({ role_id: '', module_id: '', actions: [] })
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSavePermission}
                disabled={!permissionForm.role_id || !permissionForm.module_id}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {editingPermission ? 'Update' : 'Create'} Permission
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showModuleDialog} onOpenChange={setShowModuleDialog}>
        <DialogContent>
          <DialogClose onClick={() => {
            setShowModuleDialog(false)
            setEditingModule(null)
            setModuleForm({ name: '', description: '', path: '', parent_id: null, available_actions: [] })
          }} />
          <DialogHeader>
            <DialogTitle>{editingModule ? 'Edit Module' : 'Create Module'}</DialogTitle>
            <DialogDescription>Define module details and available actions</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label htmlFor="modName" className="text-sm font-medium">Module Name *</Label>
              <Input
                id="modName"
                value={moduleForm.name}
                onChange={(e) => setModuleForm({ ...moduleForm, name: e.target.value })}
                placeholder="e.g. User Management"
                className="mt-1 border-gray-200"
              />
            </div>
            <div>
              <Label htmlFor="modDesc" className="text-sm font-medium">Description</Label>
              <Input
                id="modDesc"
                value={moduleForm.description}
                onChange={(e) => setModuleForm({ ...moduleForm, description: e.target.value })}
                placeholder="Describe the module"
                className="mt-1 border-gray-200"
              />
            </div>
            <div>
              <Label htmlFor="modPath" className="text-sm font-medium">Path *</Label>
              <Input
                id="modPath"
                value={moduleForm.path}
                onChange={(e) => setModuleForm({ ...moduleForm, path: e.target.value })}
                placeholder="e.g. /dashboard/users"
                className="mt-1 border-gray-200"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Available Actions</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {['Create', 'Update', 'List', 'Delete', '*'].map(action => (
                  <label key={action} className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={moduleForm.available_actions.includes(action)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setModuleForm({ ...moduleForm, available_actions: [...moduleForm.available_actions, action] })
                        } else {
                          setModuleForm({ ...moduleForm, available_actions: moduleForm.available_actions.filter(a => a !== action) })
                        }
                      }}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm">{action}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowModuleDialog(false)
                  setEditingModule(null)
                  setModuleForm({ name: '', description: '', path: '', parent_id: null, available_actions: [] })
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveModule}
                disabled={!moduleForm.name || !moduleForm.path}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {editingModule ? 'Update' : 'Create'} Module
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
