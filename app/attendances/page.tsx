'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { UserCheck, Hand, Camera, QrCode, Plus } from 'lucide-react'

const attendances = [
  {
    id: '1',
    user: 'John Doe',
    activity: 'Physics Lab Session',
    checkIn: '09:00 AM',
    checkOut: '11:30 AM',
    type: 'manual',
    status: 'present',
    date: '2025-11-09',
  },
  {
    id: '2',
    user: 'Jane Smith',
    activity: 'Chemistry Lab',
    checkIn: '10:15 AM',
    checkOut: '-',
    type: 'face',
    status: 'present',
    date: '2025-11-09',
  },
  {
    id: '3',
    user: 'Mike Johnson',
    activity: 'Biology Workshop',
    checkIn: '08:30 AM',
    checkOut: '12:00 PM',
    type: 'qr',
    status: 'late',
    date: '2025-11-09',
  },
  {
    id: '4',
    user: 'Sarah Williams',
    activity: 'Computer Lab',
    checkIn: '-',
    checkOut: '-',
    type: 'manual',
    status: 'absent',
    date: '2025-11-09',
  },
]

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
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Attendances</h1>
            <p className="text-gray-600 mt-1">Track and manage attendance records</p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Mark Attendance
          </Button>
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
              <div className="bg-purple-50 text-purple-600 rounded-lg p-2">
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
            <CardTitle>Attendance Records</CardTitle>
            <CardDescription>Recent attendance entries</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                  <tr>
                    <th className="px-6 py-3">User</th>
                    <th className="px-6 py-3">Activity</th>
                    <th className="px-6 py-3">Check In</th>
                    <th className="px-6 py-3">Check Out</th>
                    <th className="px-6 py-3">Type</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {attendances.map((attendance) => (
                    <tr key={attendance.id} className="bg-white border-b hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {attendance.user}
                      </td>
                      <td className="px-6 py-4">{attendance.activity}</td>
                      <td className="px-6 py-4">{attendance.checkIn}</td>
                      <td className="px-6 py-4">{attendance.checkOut}</td>
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
