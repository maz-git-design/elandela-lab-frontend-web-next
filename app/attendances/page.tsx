'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { UserCheck, Hand, Camera, QrCode, Plus, Search, Edit, Trash2, ChevronLeft, ChevronRight, Check, Calendar, Clock, X } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { getCurrentUserProfile, UserRole, canManageReservations } from '@/lib/auth/roles'
import { cn } from '@/lib/utils'

interface Attendance {
  id: string
  user_id: string
  activity_id?: string
  reservation_id?: string
  check_in: string
  check_out?: string
  type: 'manual' | 'face' | 'qr'
  status: 'present' | 'late' | 'absent'
  notes?: string
  profiles?: {
    full_name: string
    email: string
  }
  activities?: {
    name: string
    activity_type: string
  }
}

interface User {
  id: string
  full_name: string
  email: string
}

interface Activity {
  id: string
  name: string
  activity_type: string
}

interface Reservation {
  id: string
  desired_start_time: string
  desired_end_time: string
  status: string
  reservation_activities?: Array<{ activities: Array<{ name: string }> }>
  reservation_equipment?: Array<{ equipment: Array<{ name: string }> }>
}

function getStatusColor(status: string) {
  switch (status) {
    case 'present':
      return 'bg-green-100 text-green-700 border-green-200'
    case 'late':
      return 'bg-yellow-100 text-yellow-700 border-yellow-200'
    case 'absent':
      return 'bg-red-100 text-red-700 border-red-200'
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200'
  }
}

function getTypeIcon(type: string) {
  switch (type) {
    case 'manual':
      return <Hand className="h-4 w-4" />
    case 'face':
      return <Camera className="h-4 w-4" />
    case 'qr':
      return <QrCode className="h-4 w-4" />
    default:
      return <UserCheck className="h-4 w-4" />
  }
}

export default function AttendancesPage() {
  const [attendances, setAttendances] = useState<Attendance[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [userReservations, setUserReservations] = useState<Reservation[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingAttendance, setEditingAttendance] = useState<Attendance | null>(null)
  const [userRole, setUserRole] = useState<UserRole>('user')
  const itemsPerPage = 10

  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [selectedReservation, setSelectedReservation] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    user_id: '',
    activity_id: '',
    reservation_id: '',
    check_in: new Date().toISOString(),
    check_out: '',
    type: 'manual' as 'manual' | 'face' | 'qr',
    status: 'present' as 'present' | 'late' | 'absent',
    notes: ''
  })

  useEffect(() => {
    const init = async () => {
      const profile = await getCurrentUserProfile()
      if (profile) {
        setUserRole(profile.role)
      }
      await Promise.all([fetchAttendances(), fetchUsers(), fetchActivities()])
    }
    init()
  }, [])

  const fetchAttendances = async () => {
    const { data, error } = await supabase
      .from('attendance')
      .select(`
        *,
        profiles:user_id(full_name, email),
        activities:activity_id(name, activity_type)
      `)
      .order('check_in', { ascending: false })

    if (error) {
      console.error('Error fetching attendances:', error)
      return
    }

    setAttendances(data || [])
  }

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .order('full_name')

    if (error) {
      console.error('Error fetching users:', error)
      return
    }

    setUsers(data || [])
  }

  const fetchActivities = async () => {
    const { data, error } = await supabase
      .from('activities')
      .select('id, name, activity_type')
      .eq('activity_type', 'lab_session')
      .order('name')

    if (error) {
      console.error('Error fetching activities:', error)
      return
    }

    setActivities(data || [])
  }

  const fetchUserReservations = async (userId: string) => {
    const { data, error } = await supabase
      .from('reservations')
      .select(`
        id,
        desired_start_time,
        desired_end_time,
        status,
        reservation_activities(activities(name)),
        reservation_equipment(equipment(name))
      `)
      .eq('user_id', userId)
      .in('status', ['approved', 'confirmed', 'pending'])
      .order('desired_start_time', { ascending: false })

    if (error) {
      console.error('Error fetching user reservations:', error)
      return
    }

    setUserReservations(data || [])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (editingAttendance) {
      const { error } = await supabase
        .from('attendance')
        .update(formData)
        .eq('id', editingAttendance.id)

      if (error) {
        console.error('Error updating attendance:', error)
        return
      }
    } else {
      const { error } = await supabase
        .from('attendance')
        .insert([formData])

      if (error) {
        console.error('Error creating attendance:', error)
        return
      }
    }

    setIsDialogOpen(false)
    setEditingAttendance(null)
    resetForm()
    fetchAttendances()
  }

  const handleEdit = (attendance: Attendance) => {
    setEditingAttendance(attendance)
    setFormData({
      user_id: attendance.user_id,
      activity_id: attendance.activity_id || '',
      reservation_id: attendance.reservation_id || '',
      check_in: attendance.check_in,
      check_out: attendance.check_out || '',
      type: attendance.type,
      status: attendance.status,
      notes: attendance.notes || ''
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this attendance record?')) return

    const { error } = await supabase
      .from('attendance')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting attendance:', error)
      return
    }

    fetchAttendances()
  }

  const resetForm = () => {
    setFormData({
      user_id: '',
      activity_id: '',
      reservation_id: '',
      check_in: new Date().toISOString(),
      check_out: '',
      type: 'manual',
      status: 'present',
      notes: ''
    })
    setSelectedUser(null)
    setSelectedReservation(null)
    setUserReservations([])
  }

  const handleUserSelect = async (user: User) => {
    setSelectedUser(user)
    setFormData({ ...formData, user_id: user.id })
    await fetchUserReservations(user.id)
  }

  const handleReservationSelect = (reservationId: string) => {
    setSelectedReservation(reservationId)
    const reservation = userReservations.find(r => r.id === reservationId)
    if (reservation && reservation.reservation_activities && reservation.reservation_activities.length > 0) {
      const activities_arr = reservation.reservation_activities[0].activities
      if (activities_arr.length > 0) {
        const activityName = activities_arr[0].name
        const activity = activities.find(a => a.name === activityName)
        if (activity) {
          setFormData({ ...formData, reservation_id: reservationId, activity_id: activity.id })
        }
      }
    } else {
      setFormData({ ...formData, reservation_id: reservationId })
    }
  }

  const filteredUsers = users.filter(user =>
    user.full_name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(userSearchQuery.toLowerCase())
  )

  const filteredAttendances = attendances.filter(attendance => {
    const searchLower = searchTerm.toLowerCase()
    const userName = attendance.profiles?.full_name || ''
    const activityName = attendance.activities?.name || ''
    const matchesSearch = (
      userName.toLowerCase().includes(searchLower) ||
      activityName.toLowerCase().includes(searchLower) ||
      attendance.type.toLowerCase().includes(searchLower) ||
      attendance.status.toLowerCase().includes(searchLower)
    )
    const matchesStatus = statusFilter === 'all' || attendance.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const totalPages = Math.ceil(filteredAttendances.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedAttendances = filteredAttendances.slice(startIndex, startIndex + itemsPerPage)

  const stats = {
    total: attendances.length,
    present: attendances.filter(a => a.status === 'present').length,
    late: attendances.filter(a => a.status === 'late').length,
    absent: attendances.filter(a => a.status === 'absent').length
  }

  const isReservationActive = (reservation: Reservation) => {
    const now = new Date()
    const startTime = new Date(reservation.desired_start_time)
    const endTime = new Date(reservation.desired_end_time)
    return now >= startTime && now <= endTime
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Attendances</h1>
            <p className="text-gray-600 mt-1">Track and manage attendance records</p>
          </div>
          {canManageReservations(userRole) && (
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open)
              if (!open) {
                setEditingAttendance(null)
                resetForm()
              }
            }}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Mark Attendance
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </DialogClose>
                <DialogHeader>
                  <DialogTitle>{editingAttendance ? 'Edit Attendance' : 'Mark Attendance'}</DialogTitle>
                  <DialogDescription>
                    {editingAttendance ? 'Update attendance record details' : 'Record new attendance entry'}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Select User</Label>
                      <div className="relative">
                        {selectedUser ? (
                          <div className="flex items-center justify-between p-3 border border-gray-300 rounded-lg bg-gray-50">
                            <div>
                              <p className="font-medium text-gray-900">{selectedUser.full_name}</p>
                              <p className="text-sm text-gray-600">{selectedUser.email}</p>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(null)
                                setUserReservations([])
                                setSelectedReservation(null)
                                setFormData({ ...formData, user_id: '', reservation_id: '', activity_id: '' })
                              }}
                            >
                              Change
                            </Button>
                          </div>
                        ) : (
                          <Command className="border rounded-lg">
                            <CommandInput
                              placeholder="Search users by name or email..."
                              value={userSearchQuery}
                              onValueChange={setUserSearchQuery}
                            />
                            <CommandList>
                              <CommandEmpty>No users found.</CommandEmpty>
                              <CommandGroup>
                                {filteredUsers.slice(0, 8).map((user) => (
                                  <CommandItem
                                    key={user.id}
                                    onSelect={() => handleUserSelect(user)}
                                    className="cursor-pointer"
                                  >
                                    <div className="flex flex-col">
                                      <span className="font-medium">{user.full_name}</span>
                                      <span className="text-sm text-gray-600">{user.email}</span>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        )}
                      </div>
                    </div>

                    {selectedUser && userReservations.length > 0 && (
                      <div className="space-y-2">
                        <Label>Select Reservation (Optional)</Label>
                        <div className="grid grid-cols-1 gap-3 max-h-60 overflow-y-auto">
                          {userReservations.map((reservation) => {
                            const isActive = isReservationActive(reservation)
                            const isSelected = selectedReservation === reservation.id
                            return (
                              <div
                                key={reservation.id}
                                onClick={() => handleReservationSelect(reservation.id)}
                                className={cn(
                                  "relative p-4 border-2 rounded-lg cursor-pointer transition-all",
                                  isSelected ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300",
                                  isActive && "ring-2 ring-green-500 ring-opacity-50"
                                )}
                              >
                                {isSelected && (
                                  <div className="absolute top-2 right-2">
                                    <Check className="h-5 w-5 text-blue-600" />
                                  </div>
                                )}
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Badge className={isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                                        {isActive ? 'Active Now' : 'Inactive'}
                                      </Badge>
                                      <Badge variant="outline" className="capitalize">
                                        {reservation.status}
                                      </Badge>
                                    </div>
                                    {reservation.reservation_activities && reservation.reservation_activities.length > 0 && reservation.reservation_activities[0].activities.length > 0 && (
                                      <p className="font-medium text-gray-900 mb-1">
                                        {reservation.reservation_activities[0].activities[0].name}
                                      </p>
                                    )}
                                    {reservation.reservation_equipment && reservation.reservation_equipment.length > 0 && (
                                      <p className="text-sm text-gray-600 mb-2">
                                        Equipment: {reservation.reservation_equipment.map(re => re.equipment.length > 0 ? re.equipment[0].name : '').filter(Boolean).join(', ')}
                                      </p>
                                    )}
                                    <div className="flex items-center gap-4 text-xs text-gray-500">
                                      <div className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        {new Date(reservation.desired_start_time).toLocaleDateString()}
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {new Date(reservation.desired_start_time).toLocaleTimeString()} - {new Date(reservation.desired_end_time).toLocaleTimeString()}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {selectedUser && userReservations.length === 0 && (
                      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm text-yellow-800">This user has no active reservations</p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="activity_id">Lab/Activity</Label>
                      <Select
                        value={formData.activity_id}
                        onValueChange={(value) => setFormData({ ...formData, activity_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select lab or activity" />
                        </SelectTrigger>
                        <SelectContent>
                          {activities.map((activity) => (
                            <SelectItem key={activity.id} value={activity.id}>
                              {activity.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="check_in">Check In</Label>
                        <Input
                          id="check_in"
                          type="datetime-local"
                          value={formData.check_in ? new Date(formData.check_in).toISOString().slice(0, 16) : ''}
                          onChange={(e) => setFormData({ ...formData, check_in: new Date(e.target.value).toISOString() })}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="check_out">Check Out</Label>
                        <Input
                          id="check_out"
                          type="datetime-local"
                          value={formData.check_out ? new Date(formData.check_out).toISOString().slice(0, 16) : ''}
                          onChange={(e) => setFormData({ ...formData, check_out: e.target.value ? new Date(e.target.value).toISOString() : '' })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="type">Type</Label>
                        <Select
                          value={formData.type}
                          onValueChange={(value) => setFormData({ ...formData, type: value as 'manual' | 'face' | 'qr' })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="manual">Manual</SelectItem>
                            <SelectItem value="face">Face Recognition</SelectItem>
                            <SelectItem value="qr">QR Code</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="status">Status</Label>
                        <Select
                          value={formData.status}
                          onValueChange={(value) => setFormData({ ...formData, status: value as 'present' | 'late' | 'absent' })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="present">Present</SelectItem>
                            <SelectItem value="late">Late</SelectItem>
                            <SelectItem value="absent">Absent</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes</Label>
                      <textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Add any additional notes about this attendance record..."
                        className="w-full min-h-[100px] p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <DialogFooter className="gap-2">
                    <DialogClose asChild>
                      <Button type="button" variant="outline">
                        Cancel
                      </Button>
                    </DialogClose>
                    <Button type="submit" disabled={!selectedUser}>
                      {editingAttendance ? 'Update' : 'Create'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-gray-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Attendances</CardTitle>
              <div className="bg-blue-50 text-blue-600 rounded-lg p-2">
                <UserCheck className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-gray-600 mt-1">All records</p>
            </CardContent>
          </Card>

          <Card className="border-gray-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Present</CardTitle>
              <div className="bg-green-50 text-green-600 rounded-lg p-2">
                <UserCheck className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.present}</div>
              <p className="text-xs text-gray-600 mt-1">On time</p>
            </CardContent>
          </Card>

          <Card className="border-gray-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Late</CardTitle>
              <div className="bg-yellow-50 text-yellow-600 rounded-lg p-2">
                <UserCheck className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.late}</div>
              <p className="text-xs text-gray-600 mt-1">Arrived late</p>
            </CardContent>
          </Card>

          <Card className="border-gray-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Absent</CardTitle>
              <div className="bg-red-50 text-red-600 rounded-lg p-2">
                <UserCheck className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.absent}</div>
              <p className="text-xs text-gray-600 mt-1">Did not attend</p>
            </CardContent>
          </Card>
        </div>

        <Card className="border-gray-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Attendance Records</CardTitle>
                <CardDescription>Recent attendance entries</CardDescription>
              </div>
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={(value) => {
                  setStatusFilter(value)
                  setCurrentPage(1)
                }}>
                  <SelectTrigger className="w-40 border-gray-300">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="present">Present</SelectItem>
                    <SelectItem value="late">Late</SelectItem>
                    <SelectItem value="absent">Absent</SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search attendances..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value)
                      setCurrentPage(1)
                    }}
                    className="pl-9"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 border-b border-gray-300">User</th>
                    <th className="px-6 py-3 border-b border-gray-300">Lab/Activity</th>
                    <th className="px-6 py-3 border-b border-gray-300">Check In</th>
                    <th className="px-6 py-3 border-b border-gray-300">Check Out</th>
                    <th className="px-6 py-3 border-b border-gray-300">Type</th>
                    <th className="px-6 py-3 border-b border-gray-300">Status</th>
                    {canManageReservations(userRole) && (
                      <th className="px-6 py-3 border-b border-gray-300">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {paginatedAttendances.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                        No attendance records found
                      </td>
                    </tr>
                  ) : (
                    paginatedAttendances.map((attendance) => (
                      <tr key={attendance.id} className="bg-white border-b border-gray-300 hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                          {attendance.profiles?.full_name || 'Unknown User'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {attendance.activities?.name || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">{new Date(attendance.check_in).toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{attendance.check_out ? new Date(attendance.check_out).toLocaleString() : '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {getTypeIcon(attendance.type)}
                            <span className="capitalize">{attendance.type}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge className={getStatusColor(attendance.status)}>
                            {attendance.status}
                          </Badge>
                        </td>
                        {canManageReservations(userRole) && (
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(attendance)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(attendance.id)}
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-600">
                  Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredAttendances.length)} of {filteredAttendances.length} records
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
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
