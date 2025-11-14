'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Search, Clock, Calendar, User, CheckCircle, XCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

interface ReservationWithDetails {
  id: string
  user_id: string
  desired_start_time: string
  desired_end_time: string
  status: string
  motivation?: string
  profiles: unknown
  reservation_activities?: unknown
  reservation_equipment?: unknown
  attendance?: unknown
}

interface AttendanceRecord {
  id: string
  user_id: string
  reservation_id: string
  check_in: string
  check_out: string | null
  status: string
  profiles: unknown
}

export default function AttendancesPage() {
  const [reservations, setReservations] = useState<ReservationWithDetails[]>([])
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('active')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      await Promise.all([fetchReservations(), fetchRecentAttendances()])
      setLoading(false)
    }
    init()
  }, [])

  const fetchReservations = async () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()

    const { data, error } = await supabase
      .from('reservations')
      .select(`
        id,
        user_id,
        desired_start_time,
        desired_end_time,
        status,
        motivation,
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

  const fetchRecentAttendances = async () => {
    const { data, error } = await supabase
      .from('attendance')
      .select(`
        id,
        user_id,
        reservation_id,
        check_in,
        check_out,
        status,
        profiles:user_id(full_name, email)
      `)
      .not('reservation_id', 'is', null)
      .order('check_in', { ascending: false })
      .limit(20)

    if (error) {
      console.error('Error fetching attendances:', error)
      return
    }

    setAttendances(data || [])
  }

  const handleCheckInOut = async (reservation: ReservationWithDetails) => {
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

    await Promise.all([fetchReservations(), fetchRecentAttendances()])
  }

  const getReservationStatus = (reservation: ReservationWithDetails) => {
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

  const filteredReservations = reservations.filter(reservation => {
    const status = getReservationStatus(reservation)
    const profile = Array.isArray(reservation.profiles) ? reservation.profiles[0] : reservation.profiles
    const matchesSearch = searchTerm === '' ||
      reservation.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (profile?.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (profile?.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())

    if (statusFilter === 'active') {
      return matchesSearch && (status.label === 'Active' || status.label === 'Checked In')
    }
    if (statusFilter === 'expired') {
      const attendanceArray = Array.isArray(reservation.attendance) ? reservation.attendance : []
      const attendance = attendanceArray[0] as { check_out?: string | null } | undefined
      return matchesSearch && status.label === 'Expired' && !attendance?.check_out
    }
    if (statusFilter === 'completed') {
      return matchesSearch && status.label === 'Completed'
    }
    return matchesSearch
  })

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Attendance Management</h1>
          <p className="text-gray-600 mt-2">Manage check-ins and check-outs for approved reservations</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              type="text"
              placeholder="Search by Reservation ID, name, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={statusFilter === 'active' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('active')}
            >
              Active
            </Button>
            <Button
              variant={statusFilter === 'expired' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('expired')}
            >
              Expired
            </Button>
            <Button
              variant={statusFilter === 'completed' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('completed')}
            >
              Completed
            </Button>
            <Button
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('all')}
            >
              All
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading reservations...</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredReservations.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-gray-500">No reservations found</p>
                </CardContent>
              </Card>
            ) : (
              filteredReservations.map((reservation) => {
                const status = getReservationStatus(reservation)
                const attendanceArray = Array.isArray(reservation.attendance) ? reservation.attendance : []
                const existingAttendance = attendanceArray[0] as { id?: string; check_in?: string; check_out?: string | null } | undefined
                const profile = Array.isArray(reservation.profiles) ? reservation.profiles[0] : reservation.profiles

                return (
                  <Card key={reservation.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row gap-4 justify-between">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-lg">{profile?.full_name}</h3>
                                <Badge className={status.color}>{status.label}</Badge>
                              </div>
                              <p className="text-sm text-gray-600">{profile?.email}</p>
                              <p className="text-xs text-gray-500 mt-1 font-mono">ID: {reservation.id}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-gray-400" />
                              <div>
                                <p className="text-gray-500">Start Time</p>
                                <p className="font-medium">{formatDateTime(reservation.desired_start_time)}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-gray-400" />
                              <div>
                                <p className="text-gray-500">End Time</p>
                                <p className="font-medium">{formatDateTime(reservation.desired_end_time)}</p>
                              </div>
                            </div>
                          </div>

                          {Array.isArray(reservation.reservation_activities) && reservation.reservation_activities.length > 0 && (
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Labs/Activities:</p>
                              <div className="flex flex-wrap gap-1">
                                {reservation.reservation_activities.map((ra: {activities?: {name?: string}}, idx: number) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {(ra.activities as {name?: string})?.name}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {Array.isArray(reservation.reservation_equipment) && reservation.reservation_equipment.length > 0 && (
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Equipment:</p>
                              <div className="flex flex-wrap gap-1">
                                {reservation.reservation_equipment.map((re: {equipment?: {name?: string; code?: string}}, idx: number) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {(re.equipment as {name?: string; code?: string})?.name} ({(re.equipment as {name?: string; code?: string})?.code})
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {existingAttendance && existingAttendance.check_in && (
                            <div className="bg-gray-50 p-3 rounded-lg space-y-1">
                              <div className="flex items-center gap-2 text-sm">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <span className="font-medium">Checked In:</span>
                                <span>{formatDateTime(existingAttendance.check_in)}</span>
                              </div>
                              {existingAttendance.check_out && (
                                <div className="flex items-center gap-2 text-sm">
                                  <XCircle className="h-4 w-4 text-blue-600" />
                                  <span className="font-medium">Checked Out:</span>
                                  <span>{formatDateTime(existingAttendance.check_out)}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col justify-center gap-2">
                          {status.action && (
                            <Button
                              onClick={() => handleCheckInOut(reservation)}
                              className="w-full lg:w-32"
                              variant={status.action === 'Check Out' ? 'destructive' : 'default'}
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
        )}

        {statusFilter === 'active' && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Attendance Activity</CardTitle>
              <CardDescription>Latest check-ins and check-outs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {attendances.slice(0, 5).map((attendance) => {
                  const attProfile = Array.isArray(attendance.profiles) ? attendance.profiles[0] : attendance.profiles as { full_name?: string; email?: string } | undefined
                  return (
                  <div key={attendance.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                    <div className="flex items-center gap-3">
                      <User className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="font-medium text-sm">{attProfile?.full_name}</p>
                        <p className="text-xs text-gray-500">{attProfile?.email}</p>
                      </div>
                    </div>
                    <div className="text-right text-xs">
                      <p className="text-gray-500">In: {formatDateTime(attendance.check_in)}</p>
                      {attendance.check_out && (
                        <p className="text-gray-500">Out: {formatDateTime(attendance.check_out)}</p>
                      )}
                    </div>
                  </div>
                  )
                })}
                {attendances.length === 0 && (
                  <p className="text-center text-gray-500 py-4">No recent activity</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
