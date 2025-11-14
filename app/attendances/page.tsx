'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Search, Plus, Clock, Calendar, CheckCircle, XCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { supabase } from '@/lib/supabase/client'
import { getCurrentUserProfile, UserRole } from '@/lib/auth/roles'

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

interface ReservationForAttendance {
  id: string
  user_id: string
  desired_start_time: string
  desired_end_time: string
  status: string
  profiles: unknown
  reservation_activities?: unknown
  reservation_equipment?: unknown
  attendance?: unknown
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

export default function AttendancesPage() {
  const [attendances, setAttendances] = useState<Attendance[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [isMarkAttendanceOpen, setIsMarkAttendanceOpen] = useState(false)
  const [userRole, setUserRole] = useState<UserRole>('user')

  const [reservations, setReservations] = useState<ReservationForAttendance[]>([])
  const [reservationSearch, setReservationSearch] = useState('')

  const itemsPerPage = 10

  useEffect(() => {
    const init = async () => {
      const profile = await getCurrentUserProfile()
      if (profile) {
        setUserRole(profile.role)
      }
      await fetchAttendances()
      setLoading(false)
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

  const fetchReservationsForMarking = async () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()

    const { data, error } = await supabase
      .from('reservations')
      .select(`
        id,
        user_id,
        desired_start_time,
        desired_end_time,
        status,
        profiles:user_id(full_name, email),
        reservation_activities(activities(name)),
        reservation_equipment(equipment(name, code)),
        attendance(id, check_in, check_out)
      `)
      .eq('status', 'approved')
      .gte('desired_end_time', threeDaysAgo)
      .order('desired_start_time', { ascending: false })

    if (error) {
      console.error('Error fetching reservations:', error)
      return
    }

    setReservations(data || [])
  }

  const handleMarkAttendance = async (reservation: ReservationForAttendance) => {
    const attendanceArray = Array.isArray(reservation.attendance) ? reservation.attendance : []
    const existingAttendance = attendanceArray[0] as { id?: string; check_in?: string; check_out?: string | null } | undefined
    const now = new Date().toISOString()

    if (existingAttendance && !existingAttendance.check_out) {
      const { error } = await supabase
        .from('attendance')
        .update({ check_out: now })
        .eq('id', existingAttendance.id)

      if (error) {
        console.error('Error checking out:', error)
        alert('Failed to check out')
        return
      }

      alert('Check-out successful!')
    } else {
      const { error } = await supabase
        .from('attendance')
        .insert({
          user_id: reservation.user_id,
          reservation_id: reservation.id,
          check_in: now,
          type: 'manual',
          status: 'present'
        })

      if (error) {
        console.error('Error checking in:', error)
        alert('Failed to check in')
        return
      }

      alert('Check-in successful!')
    }

    await Promise.all([fetchAttendances(), fetchReservationsForMarking()])
  }

  const getReservationStatus = (reservation: ReservationForAttendance) => {
    const now = new Date()
    const startTime = new Date(reservation.desired_start_time)
    const endTime = new Date(reservation.desired_end_time)
    const attendanceArray = Array.isArray(reservation.attendance) ? reservation.attendance : []
    const existingAttendance = attendanceArray[0] as { id?: string; check_in?: string; check_out?: string | null } | undefined

    if (existingAttendance && !existingAttendance.check_out) {
      return { label: 'Checked In', color: 'bg-blue-100 text-blue-700', action: 'Check Out' }
    }

    if (existingAttendance && existingAttendance.check_out) {
      return { label: 'Completed', color: 'bg-green-100 text-green-700', action: null }
    }

    if (now >= startTime && now <= endTime) {
      return { label: 'Active', color: 'bg-yellow-100 text-yellow-700', action: 'Check In' }
    }

    if (now > endTime) {
      return { label: 'Expired', color: 'bg-red-100 text-red-700', action: 'Check In' }
    }

    return { label: 'Upcoming', color: 'bg-gray-100 text-gray-700', action: 'Check In' }
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const filteredAttendances = attendances.filter(attendance => {
    const profile = Array.isArray(attendance.profiles) ? attendance.profiles[0] : attendance.profiles
    const matchesSearch = searchTerm === '' ||
      (profile?.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (profile?.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'all' || attendance.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const filteredReservations = reservations.filter(reservation => {
    const profile = Array.isArray(reservation.profiles) ? reservation.profiles[0] : reservation.profiles as { full_name?: string; email?: string } | undefined
    return reservationSearch === '' ||
      reservation.id.toLowerCase().includes(reservationSearch.toLowerCase()) ||
      (profile?.full_name?.toLowerCase() || '').includes(reservationSearch.toLowerCase()) ||
      (profile?.email?.toLowerCase() || '').includes(reservationSearch.toLowerCase())
  })

  const totalPages = Math.ceil(filteredAttendances.length / itemsPerPage)
  const paginatedAttendances = filteredAttendances.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Attendance Records</h1>
            <p className="text-gray-600 mt-2">View and manage attendance records</p>
          </div>
          {(userRole === 'lab_admin' || userRole === 'super_admin') && (
            <Dialog open={isMarkAttendanceOpen} onOpenChange={(open) => {
              setIsMarkAttendanceOpen(open)
              if (open) {
                fetchReservationsForMarking()
              }
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Mark Attendance
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Mark Attendance</DialogTitle>
                <DialogDescription>
                  Select a reservation to mark check-in or check-out
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    type="text"
                    placeholder="Search by Reservation ID, name, or email..."
                    value={reservationSearch}
                    onChange={(e) => setReservationSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div className="space-y-3">
                  {filteredReservations.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No approved reservations found
                    </div>
                  ) : (
                    filteredReservations.map((reservation) => {
                      const status = getReservationStatus(reservation)
                      const attendanceArray = Array.isArray(reservation.attendance) ? reservation.attendance : []
                      const existingAttendance = attendanceArray[0] as { id?: string; check_in?: string; check_out?: string | null } | undefined
                      const profile = Array.isArray(reservation.profiles) ? reservation.profiles[0] : reservation.profiles as { full_name?: string; email?: string } | undefined

                      return (
                        <Card key={reservation.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex flex-col sm:flex-row gap-4 justify-between">
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold">{profile?.full_name}</h3>
                                  <Badge className={status.color}>{status.label}</Badge>
                                </div>
                                <p className="text-sm text-gray-600">{profile?.email}</p>
                                <p className="text-xs text-gray-500 font-mono">ID: {reservation.id}</p>

                                <div className="flex gap-4 text-xs text-gray-600">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {formatDateTime(reservation.desired_start_time)}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {formatDateTime(reservation.desired_end_time)}
                                  </div>
                                </div>

                                {Array.isArray(reservation.reservation_activities) && reservation.reservation_activities.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {reservation.reservation_activities.map((ra: {activities?: {name?: string}}, idx: number) => (
                                      <Badge key={idx} variant="outline" className="text-xs">
                                        {(ra.activities as {name?: string})?.name}
                                      </Badge>
                                    ))}
                                  </div>
                                )}

                                {existingAttendance && existingAttendance.check_in && (
                                  <div className="bg-gray-50 p-2 rounded text-xs space-y-1">
                                    <div className="flex items-center gap-2">
                                      <CheckCircle className="h-3 w-3 text-green-600" />
                                      <span>In: {formatDateTime(existingAttendance.check_in)}</span>
                                    </div>
                                    {existingAttendance.check_out && (
                                      <div className="flex items-center gap-2">
                                        <XCircle className="h-3 w-3 text-blue-600" />
                                        <span>Out: {formatDateTime(existingAttendance.check_out)}</span>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center">
                                {status.action && (
                                  <Button
                                    onClick={() => handleMarkAttendance(reservation)}
                                    variant={status.action === 'Check Out' ? 'destructive' : 'default'}
                                    size="sm"
                                  >
                                    {status.action}
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-gray-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Records</CardTitle>
              <CheckCircle className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{attendances.length}</div>
              <p className="text-xs text-gray-600 mt-1">All attendance records</p>
            </CardContent>
          </Card>

          <Card className="border-gray-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Present</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{attendances.filter(a => a.status === 'present').length}</div>
              <p className="text-xs text-gray-600 mt-1">Marked present</p>
            </CardContent>
          </Card>

          <Card className="border-gray-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Late</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{attendances.filter(a => a.status === 'late').length}</div>
              <p className="text-xs text-gray-600 mt-1">Arrived late</p>
            </CardContent>
          </Card>

          <Card className="border-gray-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Absent</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{attendances.filter(a => a.status === 'absent').length}</div>
              <p className="text-xs text-gray-600 mt-1">Did not attend</p>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading attendance records...</p>
          </div>
        ) : (
          <>
            <Card className="border-gray-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Attendance Records</CardTitle>
                    <CardDescription>View and manage attendance records</CardDescription>
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
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        placeholder="Search by name or email..."
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
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 border-b border-gray-200">
                      <TableHead className="font-semibold text-gray-700">User</TableHead>
                      <TableHead className="font-semibold text-gray-700">Activity/Lab</TableHead>
                      <TableHead className="font-semibold text-gray-700">Check In</TableHead>
                      <TableHead className="font-semibold text-gray-700">Check Out</TableHead>
                      <TableHead className="font-semibold text-gray-700">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedAttendances.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                          No attendance records found
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedAttendances.map((attendance) => {
                        const profile = Array.isArray(attendance.profiles) ? attendance.profiles[0] : attendance.profiles
                        const activity = Array.isArray(attendance.activities) ? attendance.activities[0] : attendance.activities
                        return (
                          <TableRow key={attendance.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{profile?.full_name}</p>
                                <p className="text-sm text-gray-600">{profile?.email}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              {activity?.name || 'N/A'}
                            </TableCell>
                            <TableCell>
                              {formatDateTime(attendance.check_in)}
                            </TableCell>
                            <TableCell>
                              {attendance.check_out ? formatDateTime(attendance.check_out) : '-'}
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(attendance.status)}>
                                {attendance.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-600">
                      Page {currentPage} of {totalPages}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
