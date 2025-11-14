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
import {
  Microscope,
  Plus,
  Package,
  Wrench,
  Edit,
  Trash2,
  Search,
  MapPin,
  Users,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Eye
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { getCurrentUserProfile, UserRole, canManageLabs } from '@/lib/auth/roles'
import { useRouter } from 'next/navigation'

interface Lab {
  id: string
  name: string
  code: string | null
  description: string | null
  building: string | null
  room_number: string | null
  floor: number | null
  capacity_users: number | null
  capacity_equipment: number | null
  lab_status: string | null
  department_id: string | null
  location: string | null
  departments?: { name: string }
}

interface Equipment {
  id: string
  name: string
  code: string
  serial_number: string | null
  model: string | null
  description: string | null
  status: string | null
  current_status: string | null
  location: string | null
  category_id: string | null
  image_path: string | null
  delivery_date: string | null
  entry_date: string | null
  equipment_categories?: { name: string }
}

interface EquipmentCategory {
  id: string
  name: string
  description: string | null
  image_path: string | null
}

export default function LabsPage() {
  const router = useRouter()
  const [labs, setLabs] = useState<Lab[]>([])
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [categories, setCategories] = useState<EquipmentCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<UserRole>('user')
  const [myLab, setMyLab] = useState<Lab | null>(null)
  const [myLabEquipment, setMyLabEquipment] = useState<Equipment[]>([])

  const [showLabDialog, setShowLabDialog] = useState(false)
  const [showEquipmentDialog, setShowEquipmentDialog] = useState(false)
  const [showCategoryDialog, setShowCategoryDialog] = useState(false)
  const [editingLab, setEditingLab] = useState<Lab | null>(null)
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null)
  const [editingCategory, setEditingCategory] = useState<EquipmentCategory | null>(null)

  const [searchTerm, setSearchTerm] = useState('')
  const [searchTermLabs, setSearchTermLabs] = useState('')
  const [searchTermCategories, setSearchTermCategories] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [currentPageLabs, setCurrentPageLabs] = useState(1)
  const [currentPageCategories, setCurrentPageCategories] = useState(1)
  const itemsPerPage = 10

  const [labForm, setLabForm] = useState({
    name: '',
    code: '',
    description: '',
    building: '',
    room_number: '',
    floor: 1,
    capacity_users: 30,
    capacity_equipment: 20,
    lab_status: 'active',
    department_id: ''
  })

  const [equipmentForm, setEquipmentForm] = useState({
    name: '',
    code: '',
    serial_number: '',
    model: '',
    description: '',
    category_id: '',
    current_status: 'available',
    delivery_date: '',
    entry_date: '',
    location: ''
  })

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: ''
  })

  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      const profile = await getCurrentUserProfile()
      if (profile) {
        setUserRole(profile.role)
        if (profile.role === 'lab_admin') {
          await fetchMyLab(profile.id)
        }
      }
      fetchAllData()
    }
    init()
  }, [])

  async function fetchAllData() {
    setLoading(true)
    await Promise.all([
      fetchLabs(),
      fetchEquipment(),
      fetchCategories()
    ])
    setLoading(false)
  }

  async function fetchMyLab(userId: string) {
    const { data: labManagerData, error: labManagerError } = await supabase
      .from('lab_managers')
      .select('lab_id')
      .eq('user_id', userId)
      .maybeSingle()

    if (labManagerError) {
      console.error('Error fetching lab manager data:', labManagerError)
      return
    }

    if (labManagerData) {
      const { data: labData, error: labError } = await supabase
        .from('activities')
        .select(`
          *,
          departments(name)
        `)
        .eq('id', labManagerData.lab_id)
        .maybeSingle()

      if (labError) {
        console.error('Error fetching lab:', labError)
        return
      }

      if (labData) {
        setMyLab(labData as Lab)

        const { data: equipmentData, error: equipmentError } = await supabase
          .from('equipment')
          .select(`
            *,
            equipment_categories(name)
          `)
          .eq('current_lab_id', labData.id)
          .order('name')

        if (equipmentError) {
          console.error('Error fetching my lab equipment:', equipmentError)
        } else {
          setMyLabEquipment(equipmentData as Equipment[])
        }
      }
    }
  }

  const handleViewEquipment = (lab: Lab) => {
    router.push(`/labs/manage?lab=${lab.id}`)
  }

  async function fetchLabs() {
    const { data, error } = await supabase
      .from('activities')
      .select(`
        *,
        departments(name)
      `)
      .order('created_at', { ascending: false })
    if (error) console.error('Error fetching labs:', error)
    if (data) setLabs(data as Lab[])
  }

  async function fetchEquipment() {
    const { data, error } = await supabase
      .from('equipment')
      .select(`
        *,
        equipment_categories(name)
      `)
      .order('created_at', { ascending: false })
    if (error) console.error('Error fetching equipment:', error)
    if (data) setEquipment(data as Equipment[])
  }

  async function fetchCategories() {
    const { data, error } = await supabase
      .from('equipment_categories')
      .select('*')
      .order('name')
    if (error) console.error('Error fetching categories:', error)
    if (data) setCategories(data)
  }

  async function handleSaveLab() {
    if (!labForm.name) return

    if (editingLab) {
      await supabase
        .from('activities')
        .update(labForm)
        .eq('id', editingLab.id)
    } else {
      await supabase.from('activities').insert(labForm)
    }

    setShowLabDialog(false)
    setLabForm({
      name: '',
      code: '',
      description: '',
      building: '',
      room_number: '',
      floor: 1,
      capacity_users: 30,
      capacity_equipment: 20,
      lab_status: 'active',
      department_id: ''
    })
    setEditingLab(null)
    fetchLabs()
  }

  async function handleDeleteLab(labId: string) {
    await supabase.from('activities').delete().eq('id', labId)
    fetchLabs()
  }

  async function handleSaveEquipment() {
    if (!equipmentForm.name || !equipmentForm.code) return

    if (editingEquipment) {
      await supabase
        .from('equipment')
        .update(equipmentForm)
        .eq('id', editingEquipment.id)
    } else {
      await supabase.from('equipment').insert(equipmentForm)
    }

    setShowEquipmentDialog(false)
    setEquipmentForm({
      name: '',
      code: '',
      serial_number: '',
      model: '',
      description: '',
      category_id: '',
      current_status: 'available',
      delivery_date: '',
      entry_date: '',
      location: ''
    })
    setEditingEquipment(null)
    fetchEquipment()
  }

  async function handleDeleteEquipment(equipmentId: string) {
    await supabase.from('equipment').delete().eq('id', equipmentId)
    fetchEquipment()
  }

  async function handleSaveCategory() {
    if (!categoryForm.name) return

    if (editingCategory) {
      await supabase
        .from('equipment_categories')
        .update(categoryForm)
        .eq('id', editingCategory.id)
    } else {
      await supabase.from('equipment_categories').insert(categoryForm)
    }

    setShowCategoryDialog(false)
    setCategoryForm({ name: '', description: '' })
    setEditingCategory(null)
    fetchCategories()
  }

  async function handleDeleteCategory(categoryId: string) {
    await supabase.from('equipment_categories').delete().eq('id', categoryId)
    fetchCategories()
  }

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-700 border-green-200'
      case 'in_use':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      case 'retired':
        return 'bg-red-100 text-red-700 border-red-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const getLabStatusColor = (status: string | null) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700 border-green-200'
      case 'under_maintenance':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      case 'closed':
        return 'bg-red-100 text-red-700 border-red-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const filteredEquipment = equipment.filter(e =>
    e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.code.toLowerCase().includes(searchTerm.toLowerCase())
  )
  const totalPagesEquipment = Math.ceil(filteredEquipment.length / itemsPerPage)
  const startIndexEquipment = (currentPage - 1) * itemsPerPage
  const paginatedEquipment = filteredEquipment.slice(startIndexEquipment, startIndexEquipment + itemsPerPage)

  const filteredLabs = labs.filter(l =>
    l.name.toLowerCase().includes(searchTermLabs.toLowerCase()) ||
    (l.code && l.code.toLowerCase().includes(searchTermLabs.toLowerCase()))
  )
  const totalPagesLabs = Math.ceil(filteredLabs.length / itemsPerPage)
  const startIndexLabs = (currentPageLabs - 1) * itemsPerPage
  const paginatedLabs = filteredLabs.slice(startIndexLabs, startIndexLabs + itemsPerPage)

  const filteredCategories = categories.filter(c =>
    c.name.toLowerCase().includes(searchTermCategories.toLowerCase())
  )
  const totalPagesCategories = Math.ceil(filteredCategories.length / itemsPerPage)
  const startIndexCategories = (currentPageCategories - 1) * itemsPerPage
  const paginatedCategories = filteredCategories.slice(startIndexCategories, startIndexCategories + itemsPerPage)

  const equipmentStats = {
    total: equipment.length,
    available: equipment.filter(e => e.current_status === 'available').length,
    in_use: equipment.filter(e => e.current_status === 'in_use').length,
    maintenance: equipment.filter(e => e.current_status === 'maintenance').length
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Labs & Equipment</h2>
          <p className="text-gray-600 mt-1">Manage laboratory facilities and equipment inventory</p>
        </div>

        {userRole === 'lab_admin' && myLab && (
          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">My Lab</CardTitle>
                  <CardDescription>Your managed laboratory</CardDescription>
                </div>
                <Button
                  onClick={() => router.push('/labs/manage')}
                  className="gap-2"
                >
                  <Wrench className="h-4 w-4" />
                  Manage Equipment
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-lg mb-2">{myLab.name}</h3>
                  {myLab.code && <p className="text-sm text-gray-600 mb-1">Code: {myLab.code}</p>}
                  {myLab.description && <p className="text-gray-700 mb-3">{myLab.description}</p>}
                  <div className="space-y-2 text-sm">
                    {myLab.building && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <MapPin className="h-4 w-4" />
                        <span>{myLab.building} {myLab.room_number && `- Room ${myLab.room_number}`}</span>
                      </div>
                    )}
                    {myLab.capacity_users && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Users className="h-4 w-4" />
                        <span>Capacity: {myLab.capacity_users} users</span>
                      </div>
                    )}
                    {myLab.lab_status && (
                      <Badge className={
                        myLab.lab_status === 'active' ? 'bg-green-100 text-green-700' :
                        myLab.lab_status === 'under_maintenance' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }>
                        {myLab.lab_status.replace('_', ' ')}
                      </Badge>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-3">Equipment Summary</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-3 bg-white rounded-lg border">
                      <span className="text-sm font-medium">Total Equipment</span>
                      <span className="text-lg font-bold text-blue-600">{myLabEquipment.length}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-white rounded-lg border">
                      <span className="text-sm font-medium">Available</span>
                      <span className="text-lg font-bold text-green-600">
                        {myLabEquipment.filter(e => e.current_status === 'available').length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-white rounded-lg border">
                      <span className="text-sm font-medium">In Use</span>
                      <span className="text-lg font-bold text-orange-600">
                        {myLabEquipment.filter(e => e.current_status === 'in_use').length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-white rounded-lg border">
                      <span className="text-sm font-medium">Under Maintenance</span>
                      <span className="text-lg font-bold text-red-600">
                        {myLabEquipment.filter(e => e.current_status === 'under_maintenance').length}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-gray-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Labs</CardTitle>
              <div className="bg-blue-50 text-blue-600 rounded-lg p-2">
                <Microscope className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{labs.length}</div>
              <p className="text-xs text-gray-600 mt-1">Active lab facilities</p>
            </CardContent>
          </Card>

          <Card className="border-gray-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Equipment</CardTitle>
              <div className="bg-green-50 text-green-600 rounded-lg p-2">
                <Package className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{equipment.length}</div>
              <p className="text-xs text-gray-600 mt-1">Equipment items</p>
            </CardContent>
          </Card>

          <Card className="border-gray-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Equipment Categories</CardTitle>
              <div className="bg-purple-50 text-purple-600 rounded-lg p-2">
                <Wrench className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{categories.length}</div>
              <p className="text-xs text-gray-600 mt-1">Different categories</p>
            </CardContent>
          </Card>

          <Card className="border-gray-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Available Equipment</CardTitle>
              <div className="bg-teal-50 text-teal-600 rounded-lg p-2">
                <Package className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {equipment.filter(e => e.current_status === 'available').length}
              </div>
              <p className="text-xs text-gray-600 mt-1">Ready to use</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="labs" className="space-y-6">
          <TabsList className="bg-gray-100">
            <TabsTrigger value="labs" className="gap-2">
              <Microscope className="w-4 h-4" />
              Labs
            </TabsTrigger>
            {canManageLabs(userRole) && (
              <>
                <TabsTrigger value="equipment" className="gap-2">
                  <Package className="w-4 h-4" />
                  Equipment
                </TabsTrigger>
                <TabsTrigger value="categories" className="gap-2">
                  <Wrench className="w-4 h-4" />
                  Categories
                </TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="labs" className="space-y-4">
            <Card className="border-gray-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-semibold">Laboratory Facilities</CardTitle>
                    <CardDescription>Manage lab spaces and facilities</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative w-64">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        placeholder="Search labs..."
                        value={searchTermLabs}
                        onChange={(e) => {
                          setSearchTermLabs(e.target.value)
                          setCurrentPageLabs(1)
                        }}
                        className="pl-10 border-gray-200"
                      />
                    </div>
                    {canManageLabs(userRole) && (
                      <div className="flex gap-2">
                        <Link href="/labs/manage">
                          <Button variant="outline">
                            <Package className="w-4 h-4 mr-2" />
                            Manage Lab
                          </Button>
                        </Link>
                        {userRole === 'super_admin' && (
                          <Button onClick={() => setShowLabDialog(true)} className="bg-blue-600 hover:bg-blue-700">
                            <Plus className="w-4 h-4 mr-2" />
                            Add Lab
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : labs.length === 0 ? (
                  <div className="text-center py-12">
                    <Microscope className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No labs found</h3>
                    <p className="text-gray-600 mb-4">{userRole === 'super_admin' ? 'Create your first lab to get started' : 'No labs available at the moment'}</p>
                    {userRole === 'super_admin' && (
                      <Button onClick={() => setShowLabDialog(true)} className="bg-blue-600 hover:bg-blue-700">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Lab
                      </Button>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {paginatedLabs.map(lab => (
                      <div key={lab.id} className="group bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200 overflow-hidden">
                        <div className="p-5">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                                <Microscope className="w-6 h-6 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-gray-900 text-lg truncate" title={lab.name}>
                                  {lab.name}
                                </h4>
                                {lab.code && (
                                  <code className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-mono">
                                    {lab.code}
                                  </code>
                                )}
                              </div>
                            </div>
                            <Badge className={getLabStatusColor(lab.lab_status)}>
                              {lab.lab_status || 'active'}
                            </Badge>
                          </div>

                          <p className="text-sm text-gray-600 mb-4 line-clamp-2 min-h-[2.5rem]">
                            {lab.description || 'No description available'}
                          </p>

                          <div className="space-y-2 mb-4">
                            {lab.building && (
                              <div className="flex items-center gap-2 text-xs text-gray-600">
                                <MapPin className="w-3.5 h-3.5 text-gray-400" />
                                <span>{lab.building}, Room {lab.room_number}, Floor {lab.floor}</span>
                              </div>
                            )}
                            {lab.capacity_users && (
                              <div className="flex items-center gap-2 text-xs text-gray-600">
                                <Users className="w-3.5 h-3.5 text-gray-400" />
                                <span>Capacity: {lab.capacity_users} users</span>
                              </div>
                            )}
                            {lab.departments && (
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <span className="w-3.5 h-3.5 inline-block"></span>
                                <span>Dept: {lab.departments.name}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="bg-gray-50 px-5 py-3 flex gap-2 border-t border-gray-100">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewEquipment(lab)}
                          >
                            <Eye className="w-3.5 h-3.5 mr-1.5" />
                            View Equipment
                          </Button>
                          {userRole === 'user' ? (
                            <Button
                              variant="default"
                              size="sm"
                              className="flex-1"
                              onClick={() => router.push(`/reservations/request?lab=${lab.id}`)}
                            >
                              <Calendar className="w-3.5 h-3.5 mr-1.5" />
                              Create Reservation
                            </Button>
                          ) : (
                            <>
                              <Link href="/labs/manage">
                                <Button
                                  variant="default"
                                  size="sm"
                                  className="w-24"
                                >
                                  <Package className="w-3.5 h-3.5 mr-1.5" />
                                  Manage
                                </Button>
                              </Link>
                              {userRole === 'super_admin' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEditingLab(lab)
                                    setLabForm({
                                      name: lab.name,
                                      code: lab.code || '',
                                      description: lab.description || '',
                                      building: lab.building || '',
                                      room_number: lab.room_number || '',
                                floor: lab.floor || 1,
                                capacity_users: lab.capacity_users || 30,
                                capacity_equipment: lab.capacity_equipment || 20,
                                lab_status: lab.lab_status || 'active',
                                department_id: lab.department_id || ''
                              })
                              setShowLabDialog(true)
                            }}
                            className="hover:bg-gray-200"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                              )}
                              {userRole === 'super_admin' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteLab(lab.id)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                    </div>

                    {totalPagesLabs > 1 && (
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                        <div className="text-sm text-gray-600">
                          Showing {startIndexLabs + 1} to {Math.min(startIndexLabs + itemsPerPage, filteredLabs.length)} of {filteredLabs.length} labs
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPageLabs(prev => Math.max(1, prev - 1))}
                            disabled={currentPageLabs === 1}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <span className="text-sm text-gray-600">
                            Page {currentPageLabs} of {totalPagesLabs}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPageLabs(prev => Math.min(totalPagesLabs, prev + 1))}
                            disabled={currentPageLabs === totalPagesLabs}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="equipment" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="border-gray-200">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Equipment</CardTitle>
                  <Package className="h-4 w-4 text-gray-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{equipmentStats.total}</div>
                  <p className="text-xs text-gray-600 mt-1">Across all labs</p>
                </CardContent>
              </Card>

              <Card className="border-gray-200">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Available</CardTitle>
                  <div className="h-2 w-2 rounded-full bg-green-500"></div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{equipmentStats.available}</div>
                  <p className="text-xs text-gray-600 mt-1">Ready for use</p>
                </CardContent>
              </Card>

              <Card className="border-gray-200">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">In Use</CardTitle>
                  <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{equipmentStats.in_use}</div>
                  <p className="text-xs text-gray-600 mt-1">Currently reserved</p>
                </CardContent>
              </Card>

              <Card className="border-gray-200">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Maintenance</CardTitle>
                  <Wrench className="h-4 w-4 text-yellow-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{equipmentStats.maintenance}</div>
                  <p className="text-xs text-gray-600 mt-1">Under repair</p>
                </CardContent>
              </Card>
            </div>

            <Card className="border-gray-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-semibold">Equipment Inventory</CardTitle>
                    <CardDescription>Manage laboratory equipment</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative w-64">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        placeholder="Search equipment..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 border-gray-200"
                      />
                    </div>
                    <Button onClick={() => setShowEquipmentDialog(true)} className="bg-blue-600 hover:bg-blue-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Equipment
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
                  <>
                    <div className="relative overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 border-b border-gray-200">Name</th>
                            <th className="px-6 py-3 border-b border-gray-200">Code</th>
                            <th className="px-6 py-3 border-b border-gray-200">Serial Number</th>
                            <th className="px-6 py-3 border-b border-gray-200">Category</th>
                            <th className="px-6 py-3 border-b border-gray-200">Status</th>
                            <th className="px-6 py-3 border-b border-gray-200">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedEquipment.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                No equipment found
                              </td>
                            </tr>
                          ) : (
                            paginatedEquipment.map((item) => (
                          <tr key={item.id} className="bg-white border-b border-gray-200 hover:bg-gray-50">
                            <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                              {item.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">{item.code}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{item.serial_number || '-'}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{item.equipment_categories?.name || '-'}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge className={getStatusColor(item.current_status)}>
                                {item.current_status || 'available'}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setEditingEquipment(item)
                                    setEquipmentForm({
                                      name: item.name,
                                      code: item.code,
                                      serial_number: item.serial_number || '',
                                      model: item.model || '',
                                      description: item.description || '',
                                      category_id: item.category_id || '',
                                      current_status: item.current_status || 'available',
                                      delivery_date: item.delivery_date || '',
                                      entry_date: item.entry_date || '',
                                      location: item.location || ''
                                    })
                                    setShowEquipmentDialog(true)
                                  }}
                                >
                                  <Edit className="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteEquipment(item.id)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    {totalPagesEquipment > 1 && (
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                        <div className="text-sm text-gray-600">
                          Showing {startIndexEquipment + 1} to {Math.min(startIndexEquipment + itemsPerPage, filteredEquipment.length)} of {filteredEquipment.length} items
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <span className="text-sm text-gray-600">
                            Page {currentPage} of {totalPagesEquipment}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.min(totalPagesEquipment, prev + 1))}
                            disabled={currentPage === totalPagesEquipment}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categories" className="space-y-4">
            <Card className="border-gray-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-semibold">Equipment Categories</CardTitle>
                    <CardDescription>Organize equipment by category</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative w-64">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        placeholder="Search categories..."
                        value={searchTermCategories}
                        onChange={(e) => {
                          setSearchTermCategories(e.target.value)
                          setCurrentPageCategories(1)
                        }}
                        className="pl-10 border-gray-200"
                      />
                    </div>
                    {userRole === 'super_admin' && (
                      <Button onClick={() => setShowCategoryDialog(true)} className="bg-blue-600 hover:bg-blue-700">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Category
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {paginatedCategories.map(category => (
                      <div key={category.id} className="group bg-white rounded-xl border border-gray-200 hover:border-teal-300 hover:shadow-md transition-all duration-200 overflow-hidden">
                        <div className="p-5">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-lg flex items-center justify-center shadow-sm">
                                <Package className="w-6 h-6 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-gray-900 text-lg truncate" title={category.name}>
                                  {category.name}
                                </h4>
                              </div>
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 line-clamp-2 min-h-[2.5rem]">
                            {category.description || 'No description available'}
                          </p>
                        </div>
                        {userRole === 'super_admin' && (
                          <div className="bg-gray-50 px-5 py-3 flex gap-2 border-t border-gray-100">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingCategory(category)
                                setCategoryForm({
                                  name: category.name,
                                  description: category.description || ''
                                })
                                setShowCategoryDialog(true)
                              }}
                              className="hover:bg-gray-200"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteCategory(category.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                      ))}
                    </div>

                    {totalPagesCategories > 1 && (
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                        <div className="text-sm text-gray-600">
                          Showing {startIndexCategories + 1} to {Math.min(startIndexCategories + itemsPerPage, filteredCategories.length)} of {filteredCategories.length} categories
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPageCategories(prev => Math.max(1, prev - 1))}
                            disabled={currentPageCategories === 1}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <span className="text-sm text-gray-600">
                            Page {currentPageCategories} of {totalPagesCategories}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPageCategories(prev => Math.min(totalPagesCategories, prev + 1))}
                            disabled={currentPageCategories === totalPagesCategories}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showLabDialog} onOpenChange={setShowLabDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogClose onClick={() => {
            setShowLabDialog(false)
            setEditingLab(null)
            setLabForm({
              name: '',
              code: '',
              description: '',
              building: '',
              room_number: '',
              floor: 1,
              capacity_users: 30,
              capacity_equipment: 20,
              lab_status: 'active',
              department_id: ''
            })
          }} />
          <DialogHeader>
            <DialogTitle>{editingLab ? 'Edit Lab' : 'Create New Lab'}</DialogTitle>
            <DialogDescription>Define lab details and specifications</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="labName" className="text-sm font-medium">Lab Name *</Label>
                <Input
                  id="labName"
                  value={labForm.name}
                  onChange={(e) => setLabForm({ ...labForm, name: e.target.value })}
                  placeholder="e.g. Physics Laboratory"
                  className="mt-1 border-gray-200"
                />
              </div>
              <div>
                <Label htmlFor="labCode" className="text-sm font-medium">Lab Code</Label>
                <Input
                  id="labCode"
                  value={labForm.code}
                  onChange={(e) => setLabForm({ ...labForm, code: e.target.value })}
                  placeholder="e.g. PHY-LAB-01"
                  className="mt-1 border-gray-200"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="labDesc" className="text-sm font-medium">Description</Label>
              <textarea
                id="labDesc"
                value={labForm.description}
                onChange={(e) => setLabForm({ ...labForm, description: e.target.value })}
                placeholder="Describe the lab"
                className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 min-h-[60px] text-sm"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="building" className="text-sm font-medium">Building</Label>
                <Input
                  id="building"
                  value={labForm.building}
                  onChange={(e) => setLabForm({ ...labForm, building: e.target.value })}
                  placeholder="e.g. Building A"
                  className="mt-1 border-gray-200"
                />
              </div>
              <div>
                <Label htmlFor="roomNumber" className="text-sm font-medium">Room Number</Label>
                <Input
                  id="roomNumber"
                  value={labForm.room_number}
                  onChange={(e) => setLabForm({ ...labForm, room_number: e.target.value })}
                  placeholder="e.g. 101"
                  className="mt-1 border-gray-200"
                />
              </div>
              <div>
                <Label htmlFor="floor" className="text-sm font-medium">Floor</Label>
                <Input
                  id="floor"
                  type="number"
                  value={labForm.floor}
                  onChange={(e) => setLabForm({ ...labForm, floor: parseInt(e.target.value) || 1 })}
                  className="mt-1 border-gray-200"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="capacityUsers" className="text-sm font-medium">User Capacity</Label>
                <Input
                  id="capacityUsers"
                  type="number"
                  value={labForm.capacity_users}
                  onChange={(e) => setLabForm({ ...labForm, capacity_users: parseInt(e.target.value) || 30 })}
                  className="mt-1 border-gray-200"
                />
              </div>
              <div>
                <Label htmlFor="capacityEquip" className="text-sm font-medium">Equipment Capacity</Label>
                <Input
                  id="capacityEquip"
                  type="number"
                  value={labForm.capacity_equipment}
                  onChange={(e) => setLabForm({ ...labForm, capacity_equipment: parseInt(e.target.value) || 20 })}
                  className="mt-1 border-gray-200"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="labStatus" className="text-sm font-medium">Status</Label>
              <Select
                value={labForm.lab_status}
                onValueChange={(value) => setLabForm({ ...labForm, lab_status: value })}
              >
                <SelectTrigger className="mt-1 border-gray-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="under_maintenance">Under Maintenance</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowLabDialog(false)
                  setEditingLab(null)
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveLab}
                disabled={!labForm.name}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {editingLab ? 'Update' : 'Create'} Lab
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showEquipmentDialog} onOpenChange={setShowEquipmentDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogClose onClick={() => {
            setShowEquipmentDialog(false)
            setEditingEquipment(null)
            setEquipmentForm({
              name: '',
              code: '',
              serial_number: '',
              model: '',
              description: '',
              category_id: '',
              current_status: 'available',
              delivery_date: '',
              entry_date: '',
              location: ''
            })
          }} />
          <DialogHeader>
            <DialogTitle>{editingEquipment ? 'Edit Equipment' : 'Add New Equipment'}</DialogTitle>
            <DialogDescription>Define equipment details and specifications</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="equipName" className="text-sm font-medium">Name *</Label>
                <Input
                  id="equipName"
                  value={equipmentForm.name}
                  onChange={(e) => setEquipmentForm({ ...equipmentForm, name: e.target.value })}
                  placeholder="e.g. Microscope A1"
                  className="mt-1 border-gray-200"
                />
              </div>
              <div>
                <Label htmlFor="equipCode" className="text-sm font-medium">Code *</Label>
                <Input
                  id="equipCode"
                  value={equipmentForm.code}
                  onChange={(e) => setEquipmentForm({ ...equipmentForm, code: e.target.value })}
                  placeholder="e.g. MIC-001"
                  className="mt-1 border-gray-200"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="serialNumber" className="text-sm font-medium">Serial Number</Label>
                <Input
                  id="serialNumber"
                  value={equipmentForm.serial_number}
                  onChange={(e) => setEquipmentForm({ ...equipmentForm, serial_number: e.target.value })}
                  placeholder="e.g. SN123456"
                  className="mt-1 border-gray-200"
                />
              </div>
              <div>
                <Label htmlFor="model" className="text-sm font-medium">Model</Label>
                <Input
                  id="model"
                  value={equipmentForm.model}
                  onChange={(e) => setEquipmentForm({ ...equipmentForm, model: e.target.value })}
                  placeholder="e.g. Model X-2000"
                  className="mt-1 border-gray-200"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="equipDesc" className="text-sm font-medium">Description</Label>
              <textarea
                id="equipDesc"
                value={equipmentForm.description}
                onChange={(e) => setEquipmentForm({ ...equipmentForm, description: e.target.value })}
                placeholder="Describe the equipment"
                className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 min-h-[60px] text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="category" className="text-sm font-medium">Category</Label>
                <Select
                  value={equipmentForm.category_id}
                  onValueChange={(value) => setEquipmentForm({ ...equipmentForm, category_id: value })}
                >
                  <SelectTrigger className="mt-1 border-gray-200">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="status" className="text-sm font-medium">Status</Label>
                <Select
                  value={equipmentForm.current_status}
                  onValueChange={(value) => setEquipmentForm({ ...equipmentForm, current_status: value })}
                >
                  <SelectTrigger className="mt-1 border-gray-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="in_use">In Use</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="retired">Retired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="deliveryDate" className="text-sm font-medium">Delivery Date</Label>
                <Input
                  id="deliveryDate"
                  type="date"
                  value={equipmentForm.delivery_date}
                  onChange={(e) => setEquipmentForm({ ...equipmentForm, delivery_date: e.target.value })}
                  className="mt-1 border-gray-200"
                />
              </div>
              <div>
                <Label htmlFor="entryDate" className="text-sm font-medium">Entry Date</Label>
                <Input
                  id="entryDate"
                  type="date"
                  value={equipmentForm.entry_date}
                  onChange={(e) => setEquipmentForm({ ...equipmentForm, entry_date: e.target.value })}
                  className="mt-1 border-gray-200"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowEquipmentDialog(false)
                  setEditingEquipment(null)
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveEquipment}
                disabled={!equipmentForm.name || !equipmentForm.code}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {editingEquipment ? 'Update' : 'Create'} Equipment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent>
          <DialogClose onClick={() => {
            setShowCategoryDialog(false)
            setEditingCategory(null)
            setCategoryForm({ name: '', description: '' })
          }} />
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Edit Category' : 'Create Category'}</DialogTitle>
            <DialogDescription>Define equipment category</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label htmlFor="categoryName" className="text-sm font-medium">Category Name *</Label>
              <Input
                id="categoryName"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                placeholder="e.g. Microscopes"
                className="mt-1 border-gray-200"
              />
            </div>
            <div>
              <Label htmlFor="categoryDesc" className="text-sm font-medium">Description</Label>
              <textarea
                id="categoryDesc"
                value={categoryForm.description}
                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                placeholder="Describe the category"
                className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 min-h-[60px] text-sm"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCategoryDialog(false)
                  setEditingCategory(null)
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveCategory}
                disabled={!categoryForm.name}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {editingCategory ? 'Update' : 'Create'} Category
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
