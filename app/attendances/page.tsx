'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { UserCheck, Hand, Camera, QrCode, Plus, Search, Edit, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

interface Attendance {
  id: string
  user_id: string
  activity: string
  check_in?: string
  check_out?: string
  type: 'manual' | 'face' | 'qr'
  status: 'present' | 'late' | 'absent'
  date: string
  user?: {
    full_name: string
  }
}

interface User {
  id: string
  full_name: string
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
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingAttendance, setEditingAttendance] = useState<Attendance | null>(null)
  const itemsPerPage = 10

  const [formData, setFormData] = useState({
    user_id: '',
    activity: '',
    check_in: '',
    check_out: '',
    type: 'manual' as 'manual' | 'face' | 'qr',
    status: 'present' as 'present' | 'late' | 'absent',
    date: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    fetchAttendances()
    fetchUsers()
  }, [])

  const fetchAttendances = async () => {
    const { data, error } = await supabase
      .from('attendance')
      .select(`
        *,
        user:profiles(full_name)
      `)
      .order('date', { ascending: false })

    if (error) {
      console.error('Error fetching attendances:', error)
      return
    }

    setAttendances(data || [])
  }

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name')
      .order('full_name')

    if (error) {
      console.error('Error fetching users:', error)
      return
    }

    setUsers(data || [])
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
      activity: attendance.activity,
      check_in: attendance.check_in || '',
      check_out: attendance.check_out || '',
      type: attendance.type,
      status: attendance.status,
      date: attendance.date
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
      activity: '',
      check_in: '',
      check_out: '',
      type: 'manual',
      status: 'present',
      date: new Date().toISOString().split('T')[0]
    })
  }

  const filteredAttendances = attendances.filter(attendance => {
    const searchLower = searchTerm.toLowerCase()
    const userName = attendance.user?.full_name || ''
    return (
      userName.toLowerCase().includes(searchLower) ||
      attendance.activity.toLowerCase().includes(searchLower) ||
      attendance.type.toLowerCase().includes(searchLower) ||
      attendance.status.toLowerCase().includes(searchLower)
    )
  })

  const totalPages = Math.ceil(filteredAttendances.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedAttendances = filteredAttendances.slice(startIndex, startIndex + itemsPerPage)

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Attendances</h1>
            <p className="text-gray-600 mt-1">Track and manage attendance records</p>
          </div>
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
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingAttendance ? 'Edit Attendance' : 'Mark Attendance'}</DialogTitle>
                <DialogDescription>
                  {editingAttendance ? 'Update attendance record details' : 'Record new attendance entry'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="user_id">User</Label>
                    <Select
                      value={formData.user_id}
                      onValueChange={(value) => setFormData({ ...formData, user_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select user" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="activity">Activity</Label>
                    <Input
                      id="activity"
                      value={formData.activity}
                      onChange={(e) => setFormData({ ...formData, activity: e.target.value })}
                      placeholder="Enter activity name"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="check_in">Check In</Label>
                      <Input
                        id="check_in"
                        type="time"
                        value={formData.check_in}
                        onChange={(e) => setFormData({ ...formData, check_in: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="check_out">Check Out</Label>
                      <Input
                        id="check_out"
                        type="time"
                        value={formData.check_out}
                        onChange={(e) => setFormData({ ...formData, check_out: e.target.value })}
                      />
                    </div>
                  </div>

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
                <DialogFooter>
                  <Button type="submit">
                    {editingAttendance ? 'Update' : 'Create'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-none shadow-sm hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Manual Check-in</CardTitle>
              <div className="bg-blue-50 text-blue-600 rounded-lg p-2">
                <Hand className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Traditional manual attendance marking by instructor
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Face Recognition</CardTitle>
              <div className="bg-green-50 text-green-600 rounded-lg p-2">
                <Camera className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Automated attendance using facial recognition technology
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">QR Code Scan</CardTitle>
              <div className="bg-gray-50 text-gray-600 rounded-lg p-2">
                <QrCode className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Quick attendance marking using QR code scanning
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Attendance Records</CardTitle>
                <CardDescription>Recent attendance entries</CardDescription>
              </div>
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
          </CardHeader>
          <CardContent>
            <div className="relative overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 border-b border-gray-200">User</th>
                    <th className="px-6 py-3 border-b border-gray-200">Activity</th>
                    <th className="px-6 py-3 border-b border-gray-200">Check In</th>
                    <th className="px-6 py-3 border-b border-gray-200">Check Out</th>
                    <th className="px-6 py-3 border-b border-gray-200">Type</th>
                    <th className="px-6 py-3 border-b border-gray-200">Status</th>
                    <th className="px-6 py-3 border-b border-gray-200">Date</th>
                    <th className="px-6 py-3 border-b border-gray-200">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedAttendances.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                        No attendance records found
                      </td>
                    </tr>
                  ) : (
                    paginatedAttendances.map((attendance) => (
                      <tr key={attendance.id} className="bg-white border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-900">
                          {attendance.user?.full_name || 'Unknown User'}
                        </td>
                        <td className="px-6 py-4">{attendance.activity}</td>
                        <td className="px-6 py-4">{attendance.check_in || '-'}</td>
                        <td className="px-6 py-4">{attendance.check_out || '-'}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {getTypeIcon(attendance.type)}
                            <span className="capitalize">{attendance.type}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge className={getStatusColor(attendance.status)}>
                            {attendance.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">{attendance.date}</td>
                        <td className="px-6 py-4">
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
