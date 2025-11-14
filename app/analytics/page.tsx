'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BarChart3, TrendingUp, Users, Calendar, Activity } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { getCurrentUserProfile, UserRole } from '@/lib/auth/roles'

interface FilterOptions {
  cohorts: Array<{ id: string; name: string }>
  academicYears: Array<{ id: string; start_date: string; end_date: string }>
  labs: Array<{ id: string; name: string }>
  activities: Array<{ id: string; name: string }>
  departments: Array<{ id: string; name: string }>
  users: Array<{ id: string; full_name: string; email: string }>
}

interface AttendanceStats {
  total: number
  byStatus: Record<string, number>
  byCohort: Record<string, number>
  byLab: Record<string, number>
  byMonth: Record<string, number>
}

interface ReservationStats {
  total: number
  byStatus: Record<string, number>
  byCohort: Record<string, number>
  byEquipment: Record<string, number>
  byMonth: Record<string, number>
}

export default function AnalyticsPage() {
  const [filters, setFilters] = useState({
    cohort_id: 'all',
    academic_year_id: 'all',
    lab_id: 'all',
    activity_id: 'all',
    department_id: 'all',
    date_from: '',
    date_to: '',
    user_id: 'all',
    period: 'month' as 'day' | 'month' | 'year'
  })

  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    cohorts: [],
    academicYears: [],
    labs: [],
    activities: [],
    departments: [],
    users: []
  })

  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats>({
    total: 0,
    byStatus: {},
    byCohort: {},
    byLab: {},
    byMonth: {}
  })

  const [reservationStats, setReservationStats] = useState<ReservationStats>({
    total: 0,
    byStatus: {},
    byCohort: {},
    byEquipment: {},
    byMonth: {}
  })

  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<UserRole>('user')
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [managedLabIds, setManagedLabIds] = useState<string[]>([])

  useEffect(() => {
    const init = async () => {
      const profile = await getCurrentUserProfile()
      if (profile) {
        setUserRole(profile.role)
        setCurrentUserId(profile.id)
        if (profile.role === 'lab_admin' && profile.managed_labs) {
          setManagedLabIds(profile.managed_labs)
          if (profile.managed_labs.length > 0) {
            setFilters(prev => ({ ...prev, lab_id: profile.managed_labs![0] }))
          }
        } else if (profile.role === 'user') {
          setFilters(prev => ({ ...prev, user_id: profile.id }))
        }
      }
      await fetchFilterOptions()
      await fetchAnalytics()
    }
    init()
  }, [])

  useEffect(() => {
    if (userRole) {
      fetchAnalytics()
    }
  }, [filters])

  const fetchFilterOptions = async () => {
    let labsQuery = supabase.from('activities').select('id, name').order('name')

    if (userRole === 'lab_admin' && managedLabIds.length > 0) {
      labsQuery = labsQuery.in('id', managedLabIds)
    }

    const [cohorts, academicYears, labs, activities, departments, users] = await Promise.all([
      supabase.from('cohorts').select('id, name').order('name'),
      supabase.from('academic_years').select('id, start_date, end_date').order('start_date', { ascending: false }),
      labsQuery,
      supabase.from('activities').select('id, name').order('name'),
      supabase.from('departments').select('id, name').order('name'),
      supabase.from('profiles').select('id, full_name, email').order('full_name')
    ])

    setFilterOptions({
      cohorts: cohorts.data || [],
      academicYears: academicYears.data || [],
      labs: labs.data || [],
      activities: activities.data || [],
      departments: departments.data || [],
      users: users.data || []
    })
  }

  const fetchAnalytics = async () => {
    setLoading(true)
    await Promise.all([fetchAttendanceStats(), fetchReservationStats()])
    setLoading(false)
  }

  const fetchAttendanceStats = async () => {
    let query = supabase.from('attendance').select('*, profiles:user_id(cohort_id, cohorts(name)), activities:activity_id(name)')

    if (userRole === 'user') {
      query = query.eq('user_id', currentUserId)
    } else if (userRole === 'lab_admin' && managedLabIds.length > 0) {
      query = query.in('activity_id', managedLabIds)
    }

    if (filters.cohort_id !== 'all') {
      query = query.eq('profiles.cohort_id', filters.cohort_id)
    }
    if (filters.activity_id !== 'all') {
      query = query.eq('activity_id', filters.activity_id)
    }
    if (filters.user_id !== 'all' && userRole === 'super_admin') {
      query = query.eq('user_id', filters.user_id)
    }
    if (filters.date_from) {
      query = query.gte('check_in', filters.date_from)
    }
    if (filters.date_to) {
      query = query.lte('check_in', filters.date_to)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching attendance stats:', error)
    }

    if (!error && data) {
      const stats: AttendanceStats = {
        total: data.length,
        byStatus: {},
        byCohort: {},
        byLab: {},
        byMonth: {}
      }

      data.forEach((attendance) => {
        const status = attendance.status || 'unknown'
        stats.byStatus[status] = (stats.byStatus[status] || 0) + 1

        const cohort = attendance.profiles?.cohorts?.name || 'Unknown'
        stats.byCohort[cohort] = (stats.byCohort[cohort] || 0) + 1

        const activity = attendance.activities?.name || 'Unknown'
        stats.byLab[activity] = (stats.byLab[activity] || 0) + 1

        if (attendance.check_in) {
          let periodKey = ''
          const date = new Date(attendance.check_in)

          if (filters.period === 'day') {
            periodKey = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          } else if (filters.period === 'month') {
            periodKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
          } else if (filters.period === 'year') {
            periodKey = date.getFullYear().toString()
          }

          stats.byMonth[periodKey] = (stats.byMonth[periodKey] || 0) + 1
        }
      })

      setAttendanceStats(stats)
    }
  }

  const fetchReservationStats = async () => {
    let query = supabase.from('reservations').select('*, profiles:user_id(cohort_id, cohorts(name)), reservation_equipment(equipment(name, category_id)), reservation_activities(activities(id, name))')

    if (userRole === 'user') {
      query = query.eq('user_id', currentUserId)
    } else if (userRole === 'lab_admin' && managedLabIds.length > 0) {
      query = query.filter('reservation_activities.activities.id', 'in', `(${managedLabIds.join(',')})`)
    }

    if (filters.cohort_id !== 'all') {
      query = query.eq('profiles.cohort_id', filters.cohort_id)
    }
    if (filters.user_id !== 'all' && userRole === 'super_admin') {
      query = query.eq('user_id', filters.user_id)
    }
    if (filters.date_from) {
      query = query.gte('desired_start_time', filters.date_from)
    }
    if (filters.date_to) {
      query = query.lte('desired_end_time', filters.date_to)
    }

    const { data, error } = await query

    if (!error && data) {
      const stats: ReservationStats = {
        total: data.length,
        byStatus: {},
        byCohort: {},
        byEquipment: {},
        byMonth: {}
      }

      data.forEach((reservation) => {
        const status = reservation.status || 'unknown'
        stats.byStatus[status] = (stats.byStatus[status] || 0) + 1

        const cohort = reservation.profiles?.cohorts?.name || 'Unknown'
        stats.byCohort[cohort] = (stats.byCohort[cohort] || 0) + 1

        if (reservation.reservation_equipment && reservation.reservation_equipment.length > 0) {
          reservation.reservation_equipment.forEach((re: { equipment?: { name?: string } }) => {
            const equipment = re.equipment?.name || 'Unknown'
            stats.byEquipment[equipment] = (stats.byEquipment[equipment] || 0) + 1
          })
        }

        if (reservation.desired_start_time) {
          let periodKey = ''
          const date = new Date(reservation.desired_start_time)

          if (filters.period === 'day') {
            periodKey = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          } else if (filters.period === 'month') {
            periodKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
          } else if (filters.period === 'year') {
            periodKey = date.getFullYear().toString()
          }

          stats.byMonth[periodKey] = (stats.byMonth[periodKey] || 0) + 1
        }
      })

      setReservationStats(stats)
    }
  }


  const StatCard = ({ title, value, icon: Icon, color, description }: { title: string; value: number; icon: React.ComponentType<{ className?: string }>; color: string; description: string }) => (
    <Card className="border-gray-200">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
        <div className={`${color} rounded-lg p-2`}>
          <Icon className="h-5 w-5" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-gray-600 mt-1">{description}</p>
      </CardContent>
    </Card>
  )

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Analytics</h1>
          <p className="text-gray-600 mt-1">Comprehensive analysis of attendances, reservations, and usage patterns</p>
        </div>

        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Filter data by various parameters</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Time Period</label>
                <Select value={filters.period} onValueChange={(value) => setFilters({ ...filters, period: value as 'day' | 'month' | 'year' })}>
                  <SelectTrigger className="border-gray-200">
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Daily</SelectItem>
                    <SelectItem value="month">Monthly</SelectItem>
                    <SelectItem value="year">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">User</label>
                <Select value={filters.user_id} onValueChange={(value) => setFilters({ ...filters, user_id: value })}>
                  <SelectTrigger className="border-gray-200">
                    <SelectValue placeholder="All Users" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    {filterOptions.users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">From Date</label>
                <input
                  type="date"
                  value={filters.date_from}
                  onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">To Date</label>
                <input
                  type="date"
                  value={filters.date_to}
                  onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Cohort</label>
                <Select value={filters.cohort_id} onValueChange={(value) => setFilters({ ...filters, cohort_id: value })}>
                  <SelectTrigger className="border-gray-200">
                    <SelectValue placeholder="All Cohorts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Cohorts</SelectItem>
                    {filterOptions.cohorts.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Department</label>
                <Select value={filters.department_id} onValueChange={(value) => setFilters({ ...filters, department_id: value })}>
                  <SelectTrigger className="border-gray-200">
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {filterOptions.departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Academic Year</label>
                <Select value={filters.academic_year_id} onValueChange={(value) => setFilters({ ...filters, academic_year_id: value })}>
                  <SelectTrigger className="border-gray-200">
                    <SelectValue placeholder="All Years" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    {filterOptions.academicYears.map((y) => (
                      <SelectItem key={y.id} value={y.id}>{y.start_date}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Lab</label>
                <Select value={filters.lab_id} onValueChange={(value) => setFilters({ ...filters, lab_id: value })}>
                  <SelectTrigger className="border-gray-200">
                    <SelectValue placeholder="All Labs" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Labs</SelectItem>
                    {filterOptions.labs.map((l) => (
                      <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Activity</label>
                <Select value={filters.activity_id} onValueChange={(value) => setFilters({ ...filters, activity_id: value })}>
                  <SelectTrigger className="border-gray-200">
                    <SelectValue placeholder="All Activities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Activities</SelectItem>
                    {filterOptions.activities.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={fetchAnalytics} className="bg-blue-600 hover:bg-blue-700">
                <BarChart3 className="h-4 w-4 mr-2" />
                Apply Filters
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setFilters({ cohort_id: 'all', academic_year_id: 'all', lab_id: 'all', activity_id: 'all', department_id: 'all', date_from: '', date_to: '', user_id: 'all', period: 'month' })
                }}
              >
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="attendances" className="space-y-6">
          <TabsList className="bg-gray-100">
            <TabsTrigger value="attendances" className="gap-2">
              <Users className="w-4 h-4" />
              Attendances
            </TabsTrigger>
            <TabsTrigger value="reservations" className="gap-2">
              <Calendar className="w-4 h-4" />
              Reservations
            </TabsTrigger>
          </TabsList>

          <TabsContent value="attendances" className="space-y-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-4">
                  <StatCard
                    title="Total Attendances"
                    value={attendanceStats.total}
                    icon={Users}
                    color="bg-blue-50 text-blue-600"
                    description="All time records"
                  />
                  <StatCard
                    title="Present"
                    value={attendanceStats.byStatus['present'] || 0}
                    icon={TrendingUp}
                    color="bg-green-50 text-green-600"
                    description="Checked in"
                  />
                  <StatCard
                    title="Absent"
                    value={attendanceStats.byStatus['absent'] || 0}
                    icon={Users}
                    color="bg-red-50 text-red-600"
                    description="Did not attend"
                  />
                  <StatCard
                    title="Late"
                    value={attendanceStats.byStatus['late'] || 0}
                    icon={Activity}
                    color="bg-yellow-50 text-yellow-600"
                    description="Checked in late"
                  />
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <Card className="border-gray-200">
                    <CardHeader>
                      <CardTitle className="text-lg">Attendances by Cohort</CardTitle>
                      <CardDescription>Distribution across student groups</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={Object.entries(attendanceStats.byCohort).map(([name, value]) => ({ name, value }))} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis type="number" stroke="#64748b" style={{ fontSize: '12px' }} />
                            <YAxis type="category" dataKey="name" stroke="#64748b" style={{ fontSize: '11px' }} width={100} />
                            <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
                            <Bar dataKey="value" fill="rgb(59, 130, 246)" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-gray-200">
                    <CardHeader>
                      <CardTitle className="text-lg">Attendances by Activity</CardTitle>
                      <CardDescription>Most attended activities</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={Object.entries(attendanceStats.byLab).map(([name, value]) => ({ name, value }))} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis type="number" stroke="#64748b" style={{ fontSize: '12px' }} />
                            <YAxis type="category" dataKey="name" stroke="#64748b" style={{ fontSize: '11px' }} width={100} />
                            <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
                            <Bar dataKey="value" fill="rgb(168, 85, 247)" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card className="border-gray-200">
                  <CardHeader>
                    <CardTitle className="text-lg">Attendance Trend Over Time</CardTitle>
                    <CardDescription>
                      Attendance evolution by {filters.period === 'day' ? 'day' : filters.period === 'month' ? 'month' : 'year'}
                      {filters.user_id !== 'all' ? ' for selected user' : ''}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={Object.entries(attendanceStats.byMonth).map(([name, value]) => ({ name, value }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: '12px' }} />
                          <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
                          <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
                          <Legend />
                          <Line type="monotone" dataKey="value" stroke="rgb(20, 184, 166)" strokeWidth={2} dot={{ r: 4 }} name="Attendances" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {filters.user_id !== 'all' && (
                  <Card className="border-gray-200">
                    <CardHeader>
                      <CardTitle className="text-lg">User Attendance History</CardTitle>
                      <CardDescription>
                        Detailed attendance tracking for selected user over time
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={Object.entries(attendanceStats.byMonth).map(([name, value]) => ({ name, attendances: value }))}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: '12px' }} />
                            <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
                            <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
                            <Legend />
                            <Line type="monotone" dataKey="attendances" stroke="#3b82f6" strokeWidth={3} dot={{ r: 5, fill: '#3b82f6' }} name="Attendances" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="reservations" className="space-y-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-4">
                  <StatCard
                    title="Total Reservations"
                    value={reservationStats.total}
                    icon={Calendar}
                    color="bg-blue-50 text-blue-600"
                    description="All time bookings"
                  />
                  <StatCard
                    title="Confirmed"
                    value={reservationStats.byStatus['confirmed'] || 0}
                    icon={TrendingUp}
                    color="bg-green-50 text-green-600"
                    description="Approved bookings"
                  />
                  <StatCard
                    title="Pending"
                    value={reservationStats.byStatus['pending'] || 0}
                    icon={Activity}
                    color="bg-yellow-50 text-yellow-600"
                    description="Awaiting approval"
                  />
                  <StatCard
                    title="Cancelled"
                    value={reservationStats.byStatus['cancelled'] || 0}
                    icon={Calendar}
                    color="bg-red-50 text-red-600"
                    description="Cancelled bookings"
                  />
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <Card className="border-gray-200">
                    <CardHeader>
                      <CardTitle className="text-lg">Top Equipment Reserved</CardTitle>
                      <CardDescription>Most popular equipment</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={Object.entries(reservationStats.byEquipment).map(([name, value]) => ({ name, value }))} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis type="number" stroke="#64748b" style={{ fontSize: '12px' }} />
                            <YAxis type="category" dataKey="name" stroke="#64748b" style={{ fontSize: '11px' }} width={120} />
                            <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
                            <Bar dataKey="value" fill="rgb(249, 115, 22)" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-gray-200">
                    <CardHeader>
                      <CardTitle className="text-lg">Reservations by Cohort</CardTitle>
                      <CardDescription>Usage across groups</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={Object.entries(reservationStats.byCohort).map(([name, value]) => ({ name, value }))} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis type="number" stroke="#64748b" style={{ fontSize: '12px' }} />
                            <YAxis type="category" dataKey="name" stroke="#64748b" style={{ fontSize: '11px' }} width={100} />
                            <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
                            <Bar dataKey="value" fill="rgb(99, 102, 241)" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card className="border-gray-200">
                  <CardHeader>
                    <CardTitle className="text-lg">Reservation Trend Over Time</CardTitle>
                    <CardDescription>
                      Reservation evolution by {filters.period === 'day' ? 'day' : filters.period === 'month' ? 'month' : 'year'}
                      {filters.user_id !== 'all' ? ' for selected user' : ''}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={Object.entries(reservationStats.byMonth).map(([name, value]) => ({ name, value }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: '12px' }} />
                          <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
                          <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
                          <Legend />
                          <Line type="monotone" dataKey="value" stroke="rgb(236, 72, 153)" strokeWidth={2} dot={{ r: 4 }} name="Reservations" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {filters.user_id !== 'all' && (
                  <Card className="border-gray-200">
                    <CardHeader>
                      <CardTitle className="text-lg">User Reservation History</CardTitle>
                      <CardDescription>
                        Detailed reservation tracking for selected user over time
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={Object.entries(reservationStats.byMonth).map(([name, value]) => ({ name, reservations: value }))}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: '12px' }} />
                            <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
                            <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
                            <Legend />
                            <Line type="monotone" dataKey="reservations" stroke="#ec4899" strokeWidth={3} dot={{ r: 5, fill: '#ec4899' }} name="Reservations" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
