'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  ChevronRight,
  Home,
  Plus,
  Edit,
  Trash2,
  Search
} from 'lucide-react'
import { useEffect, useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { getCurrentUserProfile, UserRole } from '@/lib/auth/roles'
import { useSearchParams } from 'next/navigation'

interface Lab {
  id: string
  name: string
  code: string | null
  building: string | null
  room_number: string | null
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
  equipment_categories?: { name: string }
}

interface EquipmentCategory {
  id: string
  name: string
}

function LabManagementPageContent() {
  const searchParams = useSearchParams()
  const labIdFromUrl = searchParams.get('lab')

  const [labs, setLabs] = useState<Lab[]>([])
  const [selectedLab, setSelectedLab] = useState<Lab | null>(null)
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [categories, setCategories] = useState<EquipmentCategory[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [userRole, setUserRole] = useState<UserRole>('user')
  const [managedLabIds, setManagedLabIds] = useState<string[]>([])
  const [canManageEquipment, setCanManageEquipment] = useState(false)

  const [showEquipmentDialog, setShowEquipmentDialog] = useState(false)
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null)

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

  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      const profile = await getCurrentUserProfile()
      if (profile) {
        setUserRole(profile.role)
        if (profile.role === 'lab_admin') {
          const { data: labManagerData } = await supabase
            .from('lab_managers')
            .select('lab_id')
            .eq('user_id', profile.id)

          if (labManagerData) {
            setManagedLabIds(labManagerData.map(lm => lm.lab_id))
          }
        }
      }
      await fetchLabs()
      await fetchCategories()
    }
    init()
  }, [])

  useEffect(() => {
    if (labIdFromUrl && labs.length > 0) {
      const lab = labs.find(l => l.id === labIdFromUrl)
      if (lab) {
        setSelectedLab(lab)
      }
    }
  }, [labIdFromUrl, labs])

  useEffect(() => {
    if (selectedLab) {
      const canManage = userRole === 'super_admin' ||
                        (userRole === 'lab_admin' && managedLabIds.includes(selectedLab.id))
      setCanManageEquipment(canManage)
    }
  }, [selectedLab, userRole, managedLabIds])

  useEffect(() => {
    if (selectedLab) {
      fetchEquipmentForLab()
    }
  }, [selectedLab])

  const fetchLabs = async () => {
    let query = supabase
      .from('activities')
      .select('id, name, lab_code, building, room_number')
      .order('name')

    if (userRole === 'lab_admin' && managedLabIds.length > 0) {
      query = query.in('id', managedLabIds)
    }

    const { data } = await query

    const mappedLabs = (data || []).map(lab => ({
      id: lab.id,
      name: lab.name,
      code: lab.lab_code,
      building: lab.building,
      room_number: lab.room_number
    }))
    setLabs(mappedLabs)

    if (mappedLabs.length > 0 && !selectedLab) {
      setSelectedLab(mappedLabs[0])
    }
  }

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('equipment_categories')
      .select('*')
      .order('name')
    setCategories(data || [])
  }

  const fetchEquipmentForLab = async () => {
    if (!selectedLab) return

    const { data } = await supabase
      .from('equipment')
      .select('*, equipment_categories(name)')
      .eq('current_lab_id', selectedLab.id)
      .order('name')

    setEquipment(data || [])
  }

  const handleSaveEquipment = async () => {
    if (!equipmentForm.name || !equipmentForm.code || !selectedLab) return

    const equipmentData = {
      ...equipmentForm,
      current_lab_id: selectedLab.id
    }

    if (editingEquipment) {
      await supabase
        .from('equipment')
        .update(equipmentData)
        .eq('id', editingEquipment.id)
    } else {
      await supabase.from('equipment').insert(equipmentData)
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
    fetchEquipmentForLab()
  }

  const handleDeleteEquipment = async (equipmentId: string) => {
    if (!confirm('Are you sure you want to delete this equipment?')) return

    await supabase.from('equipment').delete().eq('id', equipmentId)
    fetchEquipmentForLab()
  }

  const getStatusColor = (status?: string | null) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-700 border-green-200'
      case 'in_use':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      case 'retired':
        return 'bg-gray-100 text-gray-700 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const filteredEquipment = equipment.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.serial_number && item.serial_number.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <nav className="flex items-center space-x-2 text-sm text-gray-600">
          <Link href="/dashboard" className="hover:text-gray-900 flex items-center gap-1">
            <Home className="h-4 w-4" />
            Dashboard
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link href="/labs" className="hover:text-gray-900">
            Labs
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-gray-900 font-medium">Manage Lab</span>
        </nav>

        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Manage Lab Equipment</h1>
          <p className="text-gray-600 mt-1">Select a lab and manage its equipment</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Select Lab</CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={selectedLab?.id || ''}
              onValueChange={(value) => {
                const lab = labs.find(l => l.id === value)
                setSelectedLab(lab || null)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a lab to manage" />
              </SelectTrigger>
              <SelectContent>
                {labs.map((lab) => (
                  <SelectItem key={lab.id} value={lab.id}>
                    {lab.name} {lab.code && `(${lab.code})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {selectedLab && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Equipment in {selectedLab.name}</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    {equipment.length} items total
                  </p>
                </div>
                {canManageEquipment && (
                  <Button
                    onClick={() => {
                      setShowEquipmentDialog(true)
                      setEquipmentForm({
                        ...equipmentForm,
                        location: selectedLab.name
                      })
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Equipment
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search equipment..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="relative overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 border-b border-gray-200">Name</th>
                        <th className="px-6 py-3 border-b border-gray-200">Code</th>
                        <th className="px-6 py-3 border-b border-gray-200">Serial</th>
                        <th className="px-6 py-3 border-b border-gray-200">Category</th>
                        <th className="px-6 py-3 border-b border-gray-200">Status</th>
                        <th className="px-6 py-3 border-b border-gray-200">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEquipment.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                            {searchTerm ? 'No equipment found matching your search' : 'No equipment in this lab yet'}
                          </td>
                        </tr>
                      ) : (
                        filteredEquipment.map((item) => (
                          <tr key={item.id} className="bg-white border-b border-gray-200 hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap font-medium">{item.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{item.code}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{item.serial_number || '-'}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{item.equipment_categories?.name || '-'}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge className={getStatusColor(item.current_status)}>
                                {item.current_status || 'available'}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {canManageEquipment ? (
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
                                        delivery_date: '',
                                        entry_date: '',
                                        location: item.location || ''
                                      })
                                      setShowEquipmentDialog(true)
                                    }}
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDeleteEquipment(item.id)}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              ) : (
                                <span className="text-sm text-gray-500">View only</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

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
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Equipment Name *</Label>
                <Input
                  id="name"
                  value={equipmentForm.name}
                  onChange={(e) => setEquipmentForm({ ...equipmentForm, name: e.target.value })}
                  placeholder="e.g., Microscope Model X"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Equipment Code *</Label>
                <Input
                  id="code"
                  value={equipmentForm.code}
                  onChange={(e) => setEquipmentForm({ ...equipmentForm, code: e.target.value })}
                  placeholder="e.g., EQ-001"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="serial">Serial Number</Label>
                <Input
                  id="serial"
                  value={equipmentForm.serial_number}
                  onChange={(e) => setEquipmentForm({ ...equipmentForm, serial_number: e.target.value })}
                  placeholder="Serial number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  value={equipmentForm.model}
                  onChange={(e) => setEquipmentForm({ ...equipmentForm, model: e.target.value })}
                  placeholder="Model name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={equipmentForm.category_id}
                onValueChange={(value) => setEquipmentForm({ ...equipmentForm, category_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={equipmentForm.current_status}
                onValueChange={(value) => setEquipmentForm({ ...equipmentForm, current_status: value })}
              >
                <SelectTrigger>
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

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={equipmentForm.description}
                onChange={(e) => setEquipmentForm({ ...equipmentForm, description: e.target.value })}
                placeholder="Equipment description"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={equipmentForm.location}
                onChange={(e) => setEquipmentForm({ ...equipmentForm, location: e.target.value })}
                placeholder="Equipment location"
                disabled={!!selectedLab}
              />
            </div>

            <div className="flex gap-2 pt-4">
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
    </DashboardLayout>
  )
}

export default function LabManagementPage() {
  return (
    <Suspense fallback={
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    }>
      <LabManagementPageContent />
    </Suspense>
  )
}
