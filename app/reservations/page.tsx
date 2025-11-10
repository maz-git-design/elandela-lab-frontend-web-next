'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar, Plus, Clock, Search, ChevronLeft, ChevronRight, Edit, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Reservation {
  id: string
  user_id: string
  equipment_id: string
  start_time: string
  end_time: string
  status: string | null
  purpose: string | null
  created_at: string
  profiles?: { email: string; full_name: string }
  equipment?: { name: string; code: string }
}

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [equipment, setEquipment] = useState<{id: string; name: string}[]>([])
  const [users, setUsers] = useState<{id: string; email: string; full_name: string | null}[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [showDialog, setShowDialog] = useState(false)
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null)

  const [reservationForm, setReservationForm] = useState({
    user_id: '',
    equipment_id: '',
    start_time: '',
    end_time: '',
    status: 'pending',
    purpose: ''
  })

  const itemsPerPage = 10
  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    await Promise.all([
      fetchReservations(),
      fetchEquipment(),
      fetchUsers()
    ])
    setLoading(false)
  }

  async function fetchReservations() {
    const { data, error } = await supabase
      .from('reservations')
      .select(`
        *,
        profiles(email, full_name),
        equipment(name, code)
      `)
      .order('created_at', { ascending: false })
    if (error) console.error('Error fetching reservations:', error)
    if (data) setReservations(data as Reservation[])
  }

  async function fetchEquipment() {
    const { data, error } = await supabase
      .from('equipment')
      .select('*')
      .order('name')
    if (error) console.error('Error fetching equipment:', error)
    if (data) setEquipment(data)
  }

  async function fetchUsers() {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .order('full_name')
    if (error) console.error('Error fetching users:', error)
    if (data) setUsers(data)
  }

  async function handleSaveReservation() {
    if (!reservationForm.user_id || !reservationForm.equipment_id || !reservationForm.start_time || !reservationForm.end_time) return

    if (editingReservation) {
      await supabase
        .from('reservations')
        .update(reservationForm)
        .eq('id', editingReservation.id)
    } else {
      await supabase.from('reservations').insert(reservationForm)
    }

    setShowDialog(false)
    setReservationForm({
      user_id: '',
      equipment_id: '',
      start_time: '',
      end_time: '',
      status: 'pending',
      purpose: ''
    })
    setEditingReservation(null)
    fetchReservations()
  }

  async function handleDeleteReservation(id: string) {
    await supabase.from('reservations').delete().eq('id', id)
    fetchReservations()
  }

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-700 border-green-200'
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      case 'cancelled':
        return 'bg-red-100 text-red-700 border-red-200'
      case 'completed':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const filteredReservations = reservations.filter(r => {
    const matchesSearch = (
      r.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.equipment?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.purpose?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const totalPages = Math.ceil(filteredReservations.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedReservations = filteredReservations.slice(startIndex, startIndex + itemsPerPage)

  const stats = {
    total: reservations.length,
    pending: reservations.filter(r => r.status === 'pending').length,
    confirmed: reservations.filter(r => r.status === 'confirmed').length
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Reservations</h2>
            <p className="text-gray-600 mt-1">Manage equipment reservations</p>
          </div>
          <Button onClick={() => setShowDialog(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            New Reservation
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-gray-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Reservations</CardTitle>
              <Calendar className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-gray-600 mt-1">All time</p>
            </CardContent>
          </Card>

          <Card className="border-gray-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending}</div>
              <p className="text-xs text-gray-600 mt-1">Awaiting confirmation</p>
            </CardContent>
          </Card>

          <Card className="border-gray-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Confirmed</CardTitle>
              <Calendar className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.confirmed}</div>
              <p className="text-xs text-gray-600 mt-1">Active reservations</p>
            </CardContent>
          </Card>
        </div>

        <Card className="border-gray-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>All Reservations</CardTitle>
                <CardDescription>View and manage equipment bookings</CardDescription>
              </div>
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={(value) => {
                  setStatusFilter(value)
                  setCurrentPage(1)
                }}>
                  <SelectTrigger className="w-40 border-gray-200">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search reservations..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value)
                      setCurrentPage(1)
                    }}
                    className="pl-10 border-gray-200"
                  />
                </div>
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
                        <th className="px-6 py-3 border-b border-gray-200">User</th>
                        <th className="px-6 py-3 border-b border-gray-200">Equipment</th>
                        <th className="px-6 py-3 border-b border-gray-200">Start Time</th>
                        <th className="px-6 py-3 border-b border-gray-200">End Time</th>
                        <th className="px-6 py-3 border-b border-gray-200">Purpose</th>
                        <th className="px-6 py-3 border-b border-gray-200">Status</th>
                        <th className="px-6 py-3 border-b border-gray-200">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedReservations.map((reservation) => (
                        <tr key={reservation.id} className="bg-white border-b border-gray-200 hover:bg-gray-50">
                          <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                            {reservation.profiles?.full_name || reservation.profiles?.email || 'Unknown'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">{reservation.equipment?.name || 'Unknown'}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{new Date(reservation.start_time).toLocaleString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{new Date(reservation.end_time).toLocaleString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{reservation.purpose || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge className={getStatusColor(reservation.status)}>
                              {reservation.status || 'pending'}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingReservation(reservation)
                                  setReservationForm({
                                    user_id: reservation.user_id,
                                    equipment_id: reservation.equipment_id,
                                    start_time: reservation.start_time.slice(0, 16),
                                    end_time: reservation.end_time.slice(0, 16),
                                    status: reservation.status || 'pending',
                                    purpose: reservation.purpose || ''
                                  })
                                  setShowDialog(true)
                                }}
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteReservation(reservation.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-gray-600">
                      Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredReservations.length)} of {filteredReservations.length} results
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <span className="flex items-center px-3 text-sm">
                        Page {currentPage} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogClose onClick={() => {
            setShowDialog(false)
            setEditingReservation(null)
            setReservationForm({
              user_id: '',
              equipment_id: '',
              start_time: '',
              end_time: '',
              status: 'pending',
              purpose: ''
            })
          }} />
          <DialogHeader>
            <DialogTitle>{editingReservation ? 'Edit Reservation' : 'New Reservation'}</DialogTitle>
            <DialogDescription>Create or update equipment reservation</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="user" className="text-sm font-medium">User *</Label>
                <Select
                  value={reservationForm.user_id}
                  onValueChange={(value) => setReservationForm({ ...reservationForm, user_id: value })}
                >
                  <SelectTrigger className="mt-1 border-gray-200">
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="equipment" className="text-sm font-medium">Equipment *</Label>
                <Select
                  value={reservationForm.equipment_id}
                  onValueChange={(value) => setReservationForm({ ...reservationForm, equipment_id: value })}
                >
                  <SelectTrigger className="mt-1 border-gray-200">
                    <SelectValue placeholder="Select equipment" />
                  </SelectTrigger>
                  <SelectContent>
                    {equipment.map(e => (
                      <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="startTime" className="text-sm font-medium">Start Time *</Label>
                <Input
                  id="startTime"
                  type="datetime-local"
                  value={reservationForm.start_time}
                  onChange={(e) => setReservationForm({ ...reservationForm, start_time: e.target.value })}
                  className="mt-1 border-gray-200"
                />
              </div>
              <div>
                <Label htmlFor="endTime" className="text-sm font-medium">End Time *</Label>
                <Input
                  id="endTime"
                  type="datetime-local"
                  value={reservationForm.end_time}
                  onChange={(e) => setReservationForm({ ...reservationForm, end_time: e.target.value })}
                  className="mt-1 border-gray-200"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="status" className="text-sm font-medium">Status</Label>
              <Select
                value={reservationForm.status}
                onValueChange={(value) => setReservationForm({ ...reservationForm, status: value })}
              >
                <SelectTrigger className="mt-1 border-gray-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="purpose" className="text-sm font-medium">Purpose</Label>
              <textarea
                id="purpose"
                value={reservationForm.purpose}
                onChange={(e) => setReservationForm({ ...reservationForm, purpose: e.target.value })}
                placeholder="Purpose of reservation"
                className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 min-h-[60px] text-sm"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDialog(false)
                  setEditingReservation(null)
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveReservation}
                disabled={!reservationForm.user_id || !reservationForm.equipment_id || !reservationForm.start_time || !reservationForm.end_time}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {editingReservation ? 'Update' : 'Create'} Reservation
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
