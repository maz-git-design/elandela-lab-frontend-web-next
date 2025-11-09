'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, Plus, Clock } from 'lucide-react'

const reservations = [
  {
    id: '1',
    user: 'John Doe',
    equipment: 'Microscope A1',
    startTime: '2025-11-10 09:00',
    endTime: '2025-11-10 11:00',
    status: 'confirmed',
    purpose: 'Cell biology research',
  },
  {
    id: '2',
    user: 'Jane Smith',
    equipment: 'Centrifuge B3',
    startTime: '2025-11-10 14:00',
    endTime: '2025-11-10 16:00',
    status: 'pending',
    purpose: 'Sample preparation',
  },
  {
    id: '3',
    user: 'Mike Johnson',
    equipment: 'Spectrophotometer C2',
    startTime: '2025-11-09 10:00',
    endTime: '2025-11-09 12:00',
    status: 'completed',
    purpose: 'Protein analysis',
  },
  {
    id: '4',
    user: 'Sarah Williams',
    equipment: 'PCR Machine D1',
    startTime: '2025-11-11 08:00',
    endTime: '2025-11-11 10:00',
    status: 'pending',
    purpose: 'DNA amplification',
  },
]

function getStatusColor(status: string) {
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

export default function ReservationsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Reservations</h1>
            <p className="text-gray-600 mt-1">Manage equipment reservations</p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Reservation
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Reservations</CardTitle>
              <Calendar className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">45</div>
              <p className="text-xs text-gray-600 mt-1">+5 from last week</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">8</div>
              <p className="text-xs text-gray-600 mt-1">Awaiting confirmation</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Today&apos;s Bookings</CardTitle>
              <Calendar className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12</div>
              <p className="text-xs text-gray-600 mt-1">Active reservations</p>
            </CardContent>
          </Card>
        </div>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>All Reservations</CardTitle>
            <CardDescription>View and manage equipment bookings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                  <tr>
                    <th className="px-6 py-3">User</th>
                    <th className="px-6 py-3">Equipment</th>
                    <th className="px-6 py-3">Start Time</th>
                    <th className="px-6 py-3">End Time</th>
                    <th className="px-6 py-3">Purpose</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reservations.map((reservation) => (
                    <tr key={reservation.id} className="bg-white border-b hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {reservation.user}
                      </td>
                      <td className="px-6 py-4">{reservation.equipment}</td>
                      <td className="px-6 py-4">{reservation.startTime}</td>
                      <td className="px-6 py-4">{reservation.endTime}</td>
                      <td className="px-6 py-4">{reservation.purpose}</td>
                      <td className="px-6 py-4">
                        <Badge className={getStatusColor(reservation.status)}>
                          {reservation.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Button variant="outline" size="sm">
                          View
                        </Button>
                      </td>
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
