'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { UserCheck, Calendar, Microscope, Users, Activity, TrendingUp, Package, Building } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useTranslation } from '@/lib/i18n/use-translation'

export default function DashboardPage() {
  const { t } = useTranslation()
  const [stats, setStats] = useState({
    attendances: 0,
    reservations: 0,
    equipment: 0,
    users: 0,
    attendanceTrend: 0,
    reservationTrend: 0
  })

  const [topLabs, setTopLabs] = useState<Array<{ name: string; count: number }>>([])
  const [topEquipment, setTopEquipment] = useState<Array<{ name: string; count: number }>>([])
  const [recentActivities, setRecentActivities] = useState<Array<{ user: string; action: string; time: string; type: string }>>([])
  const [monthlyTrend, setMonthlyTrend] = useState<Array<{ month: string; attendances: number; reservations: number }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    setLoading(true)

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const sixtyDaysAgo = new Date()
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)

    const [
      attendancesData,
      attendancesLast30,
      attendancesLast60,
      reservationsData,
      reservationsLast30,
      reservationsLast60,
      equipmentData,
      usersData
    ] = await Promise.all([
      supabase.from('attendance').select('*, activities(name)', { count: 'exact' }),
      supabase.from('attendance').select('id', { count: 'exact' }).gte('check_in', thirtyDaysAgo.toISOString()),
      supabase.from('attendance').select('id', { count: 'exact' }).gte('check_in', sixtyDaysAgo.toISOString()).lt('check_in', thirtyDaysAgo.toISOString()),
      supabase.from('reservations').select('*, reservation_equipment(equipment(name))', { count: 'exact' }),
      supabase.from('reservations').select('id', { count: 'exact' }).gte('desired_start_time', thirtyDaysAgo.toISOString()),
      supabase.from('reservations').select('id', { count: 'exact' }).gte('desired_start_time', sixtyDaysAgo.toISOString()).lt('desired_start_time', thirtyDaysAgo.toISOString()),
      supabase.from('equipment').select('id', { count: 'exact' }),
      supabase.from('profiles').select('id', { count: 'exact' })
    ])

    // Calculate trends
    const attendanceTrend = attendancesLast60.count && attendancesLast60.count > 0
      ? Math.round(((attendancesLast30.count || 0) - attendancesLast60.count) / attendancesLast60.count * 100)
      : 0

    const reservationTrend = reservationsLast60.count && reservationsLast60.count > 0
      ? Math.round(((reservationsLast30.count || 0) - reservationsLast60.count) / reservationsLast60.count * 100)
      : 0

    setStats({
      attendances: attendancesData.count || 0,
      reservations: reservationsData.count || 0,
      equipment: equipmentData.count || 0,
      users: usersData.count || 0,
      attendanceTrend,
      reservationTrend
    })

    // Top Labs by attendance
    const labCounts: Record<string, number> = {}
    attendancesData.data?.forEach((att) => {
      const lab = att.activities?.name || 'Unknown'
      labCounts[lab] = (labCounts[lab] || 0) + 1
    })
    const topLabsArray = Object.entries(labCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }))
    setTopLabs(topLabsArray)

    // Top Equipment by reservations
    const equipCounts: Record<string, number> = {}
    reservationsData.data?.forEach((res) => {
      res.reservation_equipment?.forEach((re: { equipment?: { name?: string } }) => {
        const equip = re.equipment?.name || 'Unknown'
        equipCounts[equip] = (equipCounts[equip] || 0) + 1
      })
    })
    const topEquipArray = Object.entries(equipCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }))
    setTopEquipment(topEquipArray)

    // Monthly trend (last 6 months)
    const months = []
    for (let i = 5; i >= 0; i--) {
      const date = new Date()
      date.setMonth(date.getMonth() - i)
      const monthName = date.toLocaleDateString('en-US', { month: 'short' })

      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1).toISOString()
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59).toISOString()

      const [attCount, resCount] = await Promise.all([
        supabase.from('attendance').select('id', { count: 'exact' }).gte('check_in', monthStart).lte('check_in', monthEnd),
        supabase.from('reservations').select('id', { count: 'exact' }).gte('desired_start_time', monthStart).lte('desired_start_time', monthEnd)
      ])

      months.push({
        month: monthName,
        attendances: attCount.count || 0,
        reservations: resCount.count || 0
      })
    }
    setMonthlyTrend(months)

    // Recent activities
    const recentAtt = await supabase
      .from('attendance')
      .select('*, profiles(full_name), activities(name)')
      .order('check_in', { ascending: false })
      .limit(5)

    const activities = recentAtt.data?.map((att) => ({
      user: att.profiles?.full_name || 'Unknown User',
      action: `checked in for ${att.activities?.name || 'Lab Session'}`,
      time: new Date(att.check_in).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      type: 'attendance'
    })) || []

    setRecentActivities(activities)
    setLoading(false)
  }

  const maxLabValue = Math.max(...topLabs.map(l => l.count), 1)
  const maxEquipValue = Math.max(...topEquipment.map(e => e.count), 1)
  const maxTrendValue = Math.max(...monthlyTrend.map(m => Math.max(m.attendances, m.reservations)), 1)

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">{t('dashboard', 'title')}</h1>
          <p className="text-gray-600 mt-1">{t('dashboard', 'subtitle')}</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="border-gray-200 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Total Attendances</CardTitle>
                  <div className="bg-blue-50 text-blue-600 rounded-lg p-2">
                    <UserCheck className="h-5 w-5" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.attendances.toLocaleString()}</div>
                  <p className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                    {stats.attendanceTrend > 0 ? (
                      <><TrendingUp className="h-3 w-3 text-green-600" /><span className="text-green-600">+{stats.attendanceTrend}%</span></>
                    ) : (
                      <span>No change</span>
                    )}
                    <span>from last month</span>
                  </p>
                </CardContent>
              </Card>

              <Card className="border-gray-200 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Active Reservations</CardTitle>
                  <div className="bg-green-50 text-green-600 rounded-lg p-2">
                    <Calendar className="h-5 w-5" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.reservations.toLocaleString()}</div>
                  <p className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                    {stats.reservationTrend > 0 ? (
                      <><TrendingUp className="h-3 w-3 text-green-600" /><span className="text-green-600">+{stats.reservationTrend}%</span></>
                    ) : (
                      <span>No change</span>
                    )}
                    <span>from last month</span>
                  </p>
                </CardContent>
              </Card>

              <Card className="border-gray-200 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Lab Equipment</CardTitle>
                  <div className="bg-purple-50 text-purple-600 rounded-lg p-2">
                    <Microscope className="h-5 w-5" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.equipment}</div>
                  <p className="text-xs text-gray-600 mt-1">Available in labs</p>
                </CardContent>
              </Card>

              <Card className="border-gray-200 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Active Users</CardTitle>
                  <div className="bg-orange-50 text-orange-600 rounded-lg p-2">
                    <Users className="h-5 w-5" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.users}</div>
                  <p className="text-xs text-gray-600 mt-1">Registered in system</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card className="border-gray-200 shadow-sm">
                <CardHeader>
                  <CardTitle>Most Visited Labs</CardTitle>
                  <CardDescription>Top 5 labs by attendance</CardDescription>
                </CardHeader>
                <CardContent>
                  {topLabs.length === 0 ? (
                    <div className="text-center py-8">
                      <Building className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No data available</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {topLabs.map((lab, index) => (
                        <div key={index}>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-gray-700 font-medium truncate flex-1">{lab.name}</span>
                            <span className="font-bold text-gray-900 ml-2">{lab.count}</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2">
                            <div
                              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${(lab.count / maxLabValue) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-gray-200 shadow-sm">
                <CardHeader>
                  <CardTitle>Most Used Equipment</CardTitle>
                  <CardDescription>Top 5 equipment by reservations</CardDescription>
                </CardHeader>
                <CardContent>
                  {topEquipment.length === 0 ? (
                    <div className="text-center py-8">
                      <Package className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No data available</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {topEquipment.map((equip, index) => (
                        <div key={index}>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-gray-700 font-medium truncate flex-1">{equip.name}</span>
                            <span className="font-bold text-gray-900 ml-2">{equip.count}</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2">
                            <div
                              className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${(equip.count / maxEquipValue) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className="border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle>6-Month Trend</CardTitle>
                <CardDescription>Attendances and reservations over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {monthlyTrend.map((month, index) => (
                    <div key={index}>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-gray-700 font-medium w-12">{month.month}</span>
                        <div className="flex-1 flex gap-2">
                          <div className="flex-1">
                            <div className="text-xs text-gray-600 mb-1 flex justify-between">
                              <span>Attendances</span>
                              <span className="font-semibold">{month.attendances}</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2">
                              <div
                                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${(month.attendances / maxTrendValue) * 100}%` }}
                              />
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="text-xs text-gray-600 mb-1 flex justify-between">
                              <span>Reservations</span>
                              <span className="font-semibold">{month.reservations}</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2">
                              <div
                                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${(month.reservations / maxTrendValue) * 100}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest check-ins and actions</CardDescription>
              </CardHeader>
              <CardContent>
                {recentActivities.length === 0 ? (
                  <div className="text-center py-8">
                    <Activity className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No recent activities</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentActivities.map((activity, index) => (
                      <div key={index} className="flex items-start gap-4">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50">
                          <Activity className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-medium leading-none">{activity.user}</p>
                          <p className="text-sm text-gray-600">{activity.action}</p>
                          <p className="text-xs text-gray-500">{activity.time}</p>
                        </div>
                      </div>
                    ))}
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
