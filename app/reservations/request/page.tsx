'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Activity {
  id: string
  name: string
  description: string
}

interface Equipment {
  id: string
  name: string
  code: string
  status: string
}

interface AvailabilityCheck {
  activityAvailable: boolean
  unavailableEquipment: string[]
  conflictingReservations: number
}

export default function RequestReservationPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [activities, setActivities] = useState<Activity[]>([])
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([])
  const [availability, setAvailability] = useState<AvailabilityCheck | null>(null)
  const [checkingAvailability, setCheckingAvailability] = useState(false)

  const [formData, setFormData] = useState({
    activityId: '',
    desiredStartTime: '',
    desiredEndTime: '',
    motivation: '',
    priority: 'normal',
    reservationType: 'individual',
    requesterRole: 'student'
  })

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    const [activitiesRes, equipmentRes] = await Promise.all([
      supabase.from('activities').select('id, name, description').order('name'),
      supabase.from('equipment').select('id, name, code, status').order('name')
    ])

    if (activitiesRes.data) setActivities(activitiesRes.data)
    if (equipmentRes.data) setEquipment(equipmentRes.data.filter(e => e.status === 'available' || e.status === 'operational'))
    setLoading(false)
  }

  async function checkAvailability() {
    if (!formData.activityId || !formData.desiredStartTime || !formData.desiredEndTime) {
      return
    }

    setCheckingAvailability(true)

    const { data: conflicts } = await supabase
      .from('reservations')
      .select('id, reservation_equipment(equipment_id)')
      .or(`status.eq.approved,status.eq.confirmed`)
      .gte('desired_end_time', formData.desiredStartTime)
      .lte('desired_start_time', formData.desiredEndTime)

    const conflictingEquipmentIds = new Set<string>()
    conflicts?.forEach(reservation => {
      if (reservation.reservation_equipment) {
        (reservation.reservation_equipment as Array<{ equipment_id: string }>).forEach(re => {
          conflictingEquipmentIds.add(re.equipment_id)
        })
      }
    })

    const unavailableEquipment = selectedEquipment.filter(eqId =>
      conflictingEquipmentIds.has(eqId)
    )

    const unavailableNames = unavailableEquipment.map(eqId => {
      const eq = equipment.find(e => e.id === eqId)
      return eq?.name || 'Unknown'
    })

    setAvailability({
      activityAvailable: true,
      unavailableEquipment: unavailableNames,
      conflictingReservations: conflicts?.length || 0
    })

    setCheckingAvailability(false)
  }

  useEffect(() => {
    if (formData.activityId && formData.desiredStartTime && formData.desiredEndTime && selectedEquipment.length > 0) {
      const debounce = setTimeout(() => {
        checkAvailability()
      }, 500)
      return () => clearTimeout(debounce)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.activityId, formData.desiredStartTime, formData.desiredEndTime, selectedEquipment])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!formData.motivation.trim()) {
      alert('Please provide a motivation for your reservation')
      return
    }

    if (availability && availability.unavailableEquipment.length > 0) {
      const confirm = window.confirm('Some equipment is unavailable during this time. Do you want to submit anyway? The admin may suggest alternatives.')
      if (!confirm) return
    }

    setSubmitting(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: reservation, error: reservationError } = await supabase
        .from('reservations')
        .insert({
          user_id: user.id,
          desired_start_time: formData.desiredStartTime,
          desired_end_time: formData.desiredEndTime,
          motivation: formData.motivation,
          priority: formData.priority,
          reservation_type: formData.reservationType,
          requester_role: formData.requesterRole,
          status: 'pending',
          requested_at: new Date().toISOString()
        })
        .select()
        .single()

      if (reservationError) throw reservationError

      if (formData.activityId) {
        await supabase.from('reservation_activities').insert({
          reservation_id: reservation.id,
          activity_id: formData.activityId
        })
      }

      if (selectedEquipment.length > 0) {
        await supabase.from('reservation_equipment').insert(
          selectedEquipment.map(equipmentId => ({
            reservation_id: reservation.id,
            equipment_id: equipmentId
          }))
        )
      }

      await supabase.from('reservation_history').insert({
        reservation_id: reservation.id,
        status: 'pending',
        changed_by: user.id,
        comment: 'Reservation request created'
      })

      alert('Reservation request submitted successfully!')
      router.push('/reservations')
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('Error creating reservation:', error)
      alert('Error: ' + errorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  const toggleEquipment = (equipmentId: string) => {
    setSelectedEquipment(prev =>
      prev.includes(equipmentId)
        ? prev.filter(id => id !== equipmentId)
        : [...prev, equipmentId]
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Request Reservation</h2>
          <p className="text-sm text-gray-600">Submit a new lab and equipment reservation request</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle>Reservation Details</CardTitle>
              <CardDescription>Provide information about your reservation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="activity">Lab/Activity *</Label>
                  <Select
                    value={formData.activityId}
                    onValueChange={(value) => setFormData({ ...formData, activityId: value })}
                  >
                    <SelectTrigger id="activity">
                      <SelectValue placeholder="Select lab or activity" />
                    </SelectTrigger>
                    <SelectContent>
                      {activities.map(activity => (
                        <SelectItem key={activity.id} value={activity.id}>
                          {activity.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reservationType">Reservation Type *</Label>
                  <Select
                    value={formData.reservationType}
                    onValueChange={(value) => setFormData({ ...formData, reservationType: value })}
                  >
                    <SelectTrigger id="reservationType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Individual</SelectItem>
                      <SelectItem value="group">Group</SelectItem>
                      <SelectItem value="lecturerUse">Lecturer Use</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="startTime">Desired Start Time *</Label>
                  <Input
                    id="startTime"
                    type="datetime-local"
                    value={formData.desiredStartTime}
                    onChange={(e) => setFormData({ ...formData, desiredStartTime: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endTime">Desired End Time *</Label>
                  <Input
                    id="endTime"
                    type="datetime-local"
                    value={formData.desiredEndTime}
                    onChange={(e) => setFormData({ ...formData, desiredEndTime: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => setFormData({ ...formData, priority: value })}
                  >
                    <SelectTrigger id="priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Your Role</Label>
                  <Select
                    value={formData.requesterRole}
                    onValueChange={(value) => setFormData({ ...formData, requesterRole: value })}
                  >
                    <SelectTrigger id="role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="lecturer">Lecturer</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="motivation">Motivation / Purpose *</Label>
                <textarea
                  id="motivation"
                  className="w-full min-h-[100px] p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Explain why you need this reservation..."
                  value={formData.motivation}
                  onChange={(e) => setFormData({ ...formData, motivation: e.target.value })}
                  required
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle>Equipment Selection</CardTitle>
              <CardDescription>Select the equipment you need (optional)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {equipment.map(item => (
                  <div
                    key={item.id}
                    onClick={() => toggleEquipment(item.id)}
                    className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedEquipment.includes(item.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">{item.name}</div>
                        <div className="text-xs text-gray-500">{item.code}</div>
                      </div>
                      {selectedEquipment.includes(item.id) && (
                        <CheckCircle className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-sm text-gray-600">
                {selectedEquipment.length} equipment item(s) selected
              </div>
            </CardContent>
          </Card>

          {checkingAvailability && (
            <Card className="border-gray-200">
              <CardContent className="py-6">
                <div className="flex items-center justify-center gap-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  <span className="text-sm text-gray-600">Checking availability...</span>
                </div>
              </CardContent>
            </Card>
          )}

          {!checkingAvailability && availability && (
            <Card className={`border-2 ${availability.unavailableEquipment.length > 0 ? 'border-orange-300 bg-orange-50' : 'border-green-300 bg-green-50'}`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {availability.unavailableEquipment.length > 0 ? (
                    <>
                      <AlertCircle className="w-5 h-5 text-orange-600" />
                      <span className="text-orange-900">Availability Issues Detected</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-green-900">All Resources Available</span>
                    </>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {availability.conflictingReservations > 0 && (
                  <div className="text-sm text-gray-700">
                    <strong>{availability.conflictingReservations}</strong> existing reservation(s) during this time period
                  </div>
                )}

                {availability.unavailableEquipment.length > 0 ? (
                  <div>
                    <div className="text-sm font-medium text-orange-900 mb-2">Unavailable Equipment:</div>
                    <div className="space-y-1">
                      {availability.unavailableEquipment.map((name, idx) => (
                        <Badge key={idx} variant="outline" className="bg-white border-orange-300 text-orange-700">
                          {name}
                        </Badge>
                      ))}
                    </div>
                    <div className="mt-3 text-sm text-orange-800">
                      You can still submit this request. The admin may suggest alternatives or approve with available equipment only.
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-green-800">
                    All selected equipment is available for the requested time period.
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/reservations')}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !formData.motivation.trim()}>
              {submitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </form>
        )}
      </div>
    </DashboardLayout>
  )
}
