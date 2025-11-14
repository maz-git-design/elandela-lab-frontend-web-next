'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar, Clock, Search, ChevronLeft, ChevronRight, CheckSquare, UserPlus, Settings } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { getCurrentUserProfile, UserRole, canManageReservations } from '@/lib/auth/roles'

interface Reservation {
  id: string
  user_id: string
  desired_start_time: string
  desired_end_time: string
  status: string | null
  motivation: string | null
  priority: string
  reservation_type: string
  requested_at: string
  profiles?: { email: string; full_name: string }
  reservation_equipment?: Array<{ equipment: { name: string; code: string } }>
  reservation_activities?: Array<{ activities: { name: string } }>
  reservation_comments?: Array<{ comment_text: string }>
  attendance?: unknown
}

export default function ReservationsPage() {
  const router = useRouter()
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [labs, setLabs] = useState<{id: string; name: string}[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [labFilter, setLabFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [userRole, setUserRole] = useState<UserRole>('user')
  const [currentUserId, setCurrentUserId] = useState<string>('')

  const itemsPerPage = 10
  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      const profile = await getCurrentUserProfile()
      if (profile) {
        setUserRole(profile.role)
        setCurrentUserId(profile.id)
        await fetchReservations(profile.role, profile.id)
        await fetchLabs()
        setLoading(false)
      }
    }
    init()
  }, [])


  async function fetchLabs() {
    const { data } = await supabase
      .from('activities')
      .select('id, name')
      .eq('activity_type', 'lab_session')
      .order('name')
    if (data) setLabs(data)
  }

  async function fetchReservations(role?: UserRole, userId?: string) {
    let query = supabase
      .from('reservations')
      .select(`
        *,
        profiles:user_id(email, full_name),
        reservation_equipment(equipment(name, code)),
        reservation_activities(activities(id, name)),
        reservation_comments(comment_text),
        attendance(id, check_in, check_out)
      `)
      .order('requested_at', { ascending: false })

    const effectiveRole = role || userRole
    const effectiveUserId = userId || currentUserId

    if (effectiveRole === 'user' && effectiveUserId) {
      query = query.eq('user_id', effectiveUserId)
    }

    const { data, error } = await query
    if (error) console.error('Error fetching reservations:', error)
    if (data) setReservations(data as Reservation[])
  }


  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'approved':
      case 'confirmed':
        return 'bg-green-100 text-green-700 border-green-200'
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      case 'rejected':
      case 'cancelled':
        return 'bg-red-100 text-red-700 border-red-200'
      case 'suggested':
        return 'bg-purple-100 text-purple-700 border-purple-200'
      case 'completed':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300'
    }
  }

  const filteredReservations = reservations.filter(r => {
    const equipmentNames = r.reservation_equipment?.map(re => re.equipment.name).join(' ') || ''
    const matchesSearch = (
      r.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      equipmentNames.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.motivation?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    let matchesStatus = statusFilter === 'all' || r.status === statusFilter

    if (statusFilter === 'expired_checkin') {
      const now = new Date()
      const endTime = new Date(r.desired_end_time)
      const attendanceArray = Array.isArray(r.attendance) ? r.attendance : []
      const hasCheckIn = attendanceArray.some((att: { check_in?: string; check_out?: string | null }) => att.check_in && !att.check_out)
      matchesStatus = r.status === 'approved' && now > endTime && hasCheckIn
    }

    let matchesLab = labFilter === 'all'
    if (!matchesLab && r.reservation_activities && r.reservation_activities.length > 0) {
      const labName = r.reservation_activities[0].activities.name
      const selectedLab = labs.find(lab => lab.id === labFilter)
      matchesLab = selectedLab ? selectedLab.name === labName : false
    }

    return matchesSearch && matchesStatus && matchesLab
  })

  const totalPages = Math.ceil(filteredReservations.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedReservations = filteredReservations.slice(startIndex, startIndex + itemsPerPage)

  const stats = {
    total: reservations.length,
    pending: reservations.filter(r => r.status === 'pending').length,
    confirmed: reservations.filter(r => r.status === 'approved' || r.status === 'confirmed').length
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Reservations</h2>
            <p className="text-gray-600 mt-1">Manage equipment reservations</p>
          </div>
          <div className="flex gap-3">
            <Button onClick={() => router.push('/reservations/request')} className="bg-blue-600 hover:bg-blue-700">
              <UserPlus className="h-4 w-4 mr-2" />
              Request Reservation
            </Button>
            {canManageReservations(userRole) && (
              <Button onClick={() => router.push('/reservations/manage')} variant="outline">
                <CheckSquare className="h-4 w-4 mr-2" />
                Manage Requests
              </Button>
            )}
          </div>
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
                <Select value={labFilter} onValueChange={(value) => {
                  setLabFilter(value)
                  setCurrentPage(1)
                }}>
                  <SelectTrigger className="w-40 border-gray-300">
                    <SelectValue placeholder="Filter by lab" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Labs</SelectItem>
                    {labs.map(lab => (
                      <SelectItem key={lab.id} value={lab.id}>{lab.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={(value) => {
                  setStatusFilter(value)
                  setCurrentPage(1)
                }}>
                  <SelectTrigger className="w-40 border-gray-300">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="suggested">Suggested</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    {(userRole === 'lab_admin' || userRole === 'super_admin') && (
                      <SelectItem value="expired_checkin">Expired (Pending Check-Out)</SelectItem>
                    )}
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
            ) : paginatedReservations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Calendar className="w-16 h-16 text-gray-300 mb-4" />
                <p className="text-gray-500 text-lg font-medium">No reservations available</p>
                <p className="text-gray-400 text-sm mt-1">Start by creating a new reservation request</p>
              </div>
            ) : (
              <>
                <div className="relative overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 border-b border-gray-300">User</th>
                        <th className="px-6 py-3 border-b border-gray-300">Lab</th>
                        <th className="px-6 py-3 border-b border-gray-300">Equipment</th>
                        <th className="px-6 py-3 border-b border-gray-300">Start Time</th>
                        <th className="px-6 py-3 border-b border-gray-300">End Time</th>
                        <th className="px-6 py-3 border-b border-gray-300">Priority</th>
                        <th className="px-6 py-3 border-b border-gray-300">Status</th>
                        <th className="px-6 py-3 border-b border-gray-300">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedReservations.map((reservation) => (
                        <tr key={reservation.id} className="bg-white border-b border-gray-300 hover:bg-gray-50">
                          <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                            {reservation.profiles?.full_name || reservation.profiles?.email || 'Unknown'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {reservation.reservation_activities && reservation.reservation_activities.length > 0
                              ? reservation.reservation_activities[0].activities.name
                              : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {reservation.reservation_equipment && reservation.reservation_equipment.length > 0
                              ? reservation.reservation_equipment.map(re => re.equipment.name).join(', ')
                              : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">{new Date(reservation.desired_start_time).toLocaleString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">{new Date(reservation.desired_end_time).toLocaleString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge variant="outline" className="border-gray-300 capitalize">{reservation.priority}</Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge className={getStatusColor(reservation.status)}>
                              {reservation.status || 'pending'}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {canManageReservations(userRole) ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => router.push('/reservations/manage')}
                                className="border-gray-300"
                                title="Manage reservation workflow"
                              >
                                <Settings className="w-4 h-4 mr-2" />
                                Manage
                              </Button>
                            ) : (
                              <Badge className={getStatusColor(reservation.status)}>
                                {reservation.status || 'pending'}
                              </Badge>
                            )}
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
    </DashboardLayout>
  )
}
