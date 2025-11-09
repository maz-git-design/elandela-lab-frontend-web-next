'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Microscope, Plus, Package, Wrench, AlertTriangle } from 'lucide-react'

const equipment = [
  {
    id: '1',
    name: 'Microscope A1',
    code: 'MIC-001',
    category: 'Microscopes',
    status: 'available',
    location: 'Lab Room 101',
    lastMaintenance: '2025-10-15',
  },
  {
    id: '2',
    name: 'Centrifuge B3',
    code: 'CEN-003',
    category: 'Centrifuges',
    status: 'in_use',
    location: 'Lab Room 102',
    lastMaintenance: '2025-09-20',
  },
  {
    id: '3',
    name: 'Spectrophotometer C2',
    code: 'SPE-002',
    category: 'Spectrophotometers',
    status: 'maintenance',
    location: 'Lab Room 103',
    lastMaintenance: '2025-11-01',
  },
  {
    id: '4',
    name: 'PCR Machine D1',
    code: 'PCR-001',
    category: 'PCR Machines',
    status: 'available',
    location: 'Lab Room 104',
    lastMaintenance: '2025-10-28',
  },
]

function getStatusColor(status: string) {
  switch (status) {
    case 'available':
      return 'bg-green-100 text-green-700 border-green-200'
    case 'in_use':
      return 'bg-blue-100 text-blue-700 border-blue-200'
    case 'maintenance':
      return 'bg-yellow-100 text-yellow-700 border-yellow-200'
    case 'retired':
      return 'bg-red-100 text-red-700 border-red-200'
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200'
  }
}

export default function LabsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Lab Equipment</h1>
            <p className="text-gray-600 mt-1">Manage and track laboratory equipment</p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Equipment
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Equipment</CardTitle>
              <Package className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">89</div>
              <p className="text-xs text-gray-600 mt-1">Across all labs</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Available</CardTitle>
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">45</div>
              <p className="text-xs text-gray-600 mt-1">Ready for use</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">In Use</CardTitle>
              <div className="h-2 w-2 rounded-full bg-blue-500"></div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">32</div>
              <p className="text-xs text-gray-600 mt-1">Currently reserved</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Maintenance</CardTitle>
              <Wrench className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12</div>
              <p className="text-xs text-gray-600 mt-1">Under repair</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Microscopes</CardTitle>
              <Microscope className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">15</div>
              <p className="text-sm text-gray-600 mt-1">12 available</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Centrifuges</CardTitle>
              <Package className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">8</div>
              <p className="text-sm text-gray-600 mt-1">6 available</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">PCR Machines</CardTitle>
              <AlertTriangle className="h-5 w-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">6</div>
              <p className="text-sm text-gray-600 mt-1">4 available</p>
            </CardContent>
          </Card>
        </div>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Equipment Inventory</CardTitle>
            <CardDescription>Complete list of laboratory equipment</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                  <tr>
                    <th className="px-6 py-3">Name</th>
                    <th className="px-6 py-3">Code</th>
                    <th className="px-6 py-3">Category</th>
                    <th className="px-6 py-3">Location</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Last Maintenance</th>
                    <th className="px-6 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {equipment.map((item) => (
                    <tr key={item.id} className="bg-white border-b hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {item.name}
                      </td>
                      <td className="px-6 py-4">{item.code}</td>
                      <td className="px-6 py-4">{item.category}</td>
                      <td className="px-6 py-4">{item.location}</td>
                      <td className="px-6 py-4">
                        <Badge className={getStatusColor(item.status)}>
                          {item.status.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">{item.lastMaintenance}</td>
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
