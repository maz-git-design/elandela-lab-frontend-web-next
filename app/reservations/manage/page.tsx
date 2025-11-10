'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Check, X, Clock, Calendar, User, Package, AlertCircle, MessageSquare } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

interface Reservation {
  id: string
  user_id: string
  desired_start_time: string
  desired_end_time: string
  motivation: string
  priority: string
  status: string
  reservation_type: string
  requester_role: string
  requested_at: string
  profiles?: { full_name: string; email: string }
  reservation_activities?: Array<{ activities: { name: string } }>
  reservation_equipment?: Array<{ equipment: { name: string; code: string } }>
  reservation_comments?: Array<{ comment_text: string }>
  manager_comments?: string
  activity_name?: string
}

export default function ManageReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [labs, setLabs] = useState<{id: string; name: string}[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'suggest'>('approve')
  const [managerComments, setManagerComments] = useState('')
  const [suggestion, setSuggestion] = useState({
    alternativeStartTime: '',
    alternativeEndTime: ''
  })
  const [processing, setProcessing] = useState(false)

  const [priorityFilter, setPriorityFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [labFilter, setLabFilter] = useState('all')
  const [timeFilter, setTimeFilter] = useState('all')
  const [customDateFrom, setCustomDateFrom] = useState('')
  const [customDateTo, setCustomDateTo] = useState('')
  const [showCustomDateInputs, setShowCustomDateInputs] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    await Promise.all([fetchReservations(), fetchLabs()])
    setLoading(false)
  }

  async function fetchLabs() {
    const { data } = await supabase
      .from('activities')
      .select('id, name')
      .eq('activity_type', 'lab_session')
      .order('name')
    if (data) setLabs(data)
  }

  async function fetchReservations() {
    const { data } = await supabase
      .from('reservations')
      .select(`
        *,
        profiles:user_id(full_name, email),
        reservation_activities(activities(name)),
        reservation_equipment(equipment(name, code)),
        reservation_comments(comment_text)
      `)
      .order('requested_at', { ascending: false })

    if (data) {
      setReservations(data as Reservation[])
      if (data.length > 0 && !selectedReservation) {
        setSelectedReservation(data[0] as Reservation)
      }
    }
  }

  async function handleAction() {
    if (!selectedReservation) return

    setProcessing(true)

    if (actionType === 'approve') {
      const { error } = await supabase
        .from('reservations')
        .update({
          status: 'approved',
          manager_comments: managerComments
        })
        .eq('id', selectedReservation.id)

      if (error) console.error('Error:', error)
    } else if (actionType === 'reject') {
      const { error } = await supabase
        .from('reservations')
        .update({
          status: 'rejected',
          manager_comments: managerComments
        })
        .eq('id', selectedReservation.id)

      if (error) console.error('Error:', error)
    } else if (actionType === 'suggest') {
      const { error } = await supabase
        .from('reservations')
        .update({
          status: 'suggested',
          manager_comments: managerComments,
          suggested_start_time: suggestion.alternativeStartTime,
          suggested_end_time: suggestion.alternativeEndTime
        })
        .eq('id', selectedReservation.id)

      if (error) console.error('Error:', error)
    }

    setProcessing(false)
    setShowDialog(false)
    setManagerComments('')
    setSuggestion({ alternativeStartTime: '', alternativeEndTime: '' })
    fetchReservations()
  }

  const openActionDialog = (type: 'approve' | 'reject' | 'suggest') => {
    setActionType(type)
    setShowDialog(true)
  }

  const getStatusColor = (status: string) => {
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
        return 'bg-blue-100 text-blue-700 border-blue-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-700 border-red-200'
      case 'high':
        return 'bg-orange-100 text-orange-700 border-orange-200'
      case 'normal':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'low':
        return 'bg-gray-100 text-gray-700 border-gray-300'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300'
    }
  }

  const filteredReservations = reservations.filter(reservation => {
    const matchesSearch = true
    const matchesPriority = priorityFilter === 'all' || reservation.priority === priorityFilter
    const matchesStatus = statusFilter === 'all' || reservation.status === statusFilter

    let matchesLab = labFilter === 'all'
    if (!matchesLab && reservation.reservation_activities && reservation.reservation_activities.length > 0) {
      const labName = reservation.reservation_activities[0].activities.name
      const selectedLab = labs.find(lab => lab.id === labFilter)
      matchesLab = selectedLab ? selectedLab.name === labName : false
    }

    let matchesTime = true
    if (timeFilter !== 'all') {
      const reservationDate = new Date(reservation.desired_start_time)
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

      if (timeFilter === 'today') {
        const reservationDay = new Date(reservationDate.getFullYear(), reservationDate.getMonth(), reservationDate.getDate())
        matchesTime = reservationDay.getTime() === today.getTime()
      } else if (timeFilter === 'week') {
        const weekAgo = new Date(today)
        weekAgo.setDate(weekAgo.getDate() - 7)
        matchesTime = reservationDate >= weekAgo && reservationDate <= now
      } else if (timeFilter === 'month') {
        const monthAgo = new Date(today)
        monthAgo.setMonth(monthAgo.getMonth() - 1)
        matchesTime = reservationDate >= monthAgo && reservationDate <= now
      } else if (timeFilter === 'custom') {
        if (customDateFrom && customDateTo) {
          const fromDate = new Date(customDateFrom)
          const toDate = new Date(customDateTo)
          toDate.setHours(23, 59, 59, 999)
          matchesTime = reservationDate >= fromDate && reservationDate <= toDate
        }
      }
    }

    return matchesSearch && matchesPriority && matchesStatus && matchesLab && matchesTime
  })

  const getLabName = (reservation: Reservation) => {
    if (reservation.reservation_activities && reservation.reservation_activities.length > 0) {
      return reservation.reservation_activities[0].activities.name
    }
    return 'No lab specified'
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getDaysToApply = (requestedAt: string) => {
    const now = new Date()
    const requested = new Date(requestedAt)
    const diffTime = now.getTime() - requested.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  useEffect(() => {
    if (filteredReservations.length > 0 && !selectedReservation) {
      setSelectedReservation(filteredReservations[0])
    }
  }, [statusFilter, priorityFilter, labFilter])

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-8">
        <Breadcrumb items={[
          { label: 'Reservations', href: '/reservations' },
          { label: 'Manage Requests' }
        ]} />

        <div>
          <h2 className="text-2xl font-bold text-gray-900">Manage Reservations</h2>
          <p className="text-sm text-gray-600">Review and approve pending reservation requests</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Select value={labFilter} onValueChange={setLabFilter}>
            <SelectTrigger className="w-48 border-blue-600 text-blue-600 font-medium">
              <SelectValue placeholder="Lab" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Labs</SelectItem>
              {labs.map(lab => (
                <SelectItem key={lab.id} value={lab.id}>{lab.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-48 border-gray-300">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48 border-gray-300">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="suggested">Suggested</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={timeFilter}
            onValueChange={(value) => {
              setTimeFilter(value)
              setShowCustomDateInputs(value === 'custom')
              if (value !== 'custom') {
                setCustomDateFrom('')
                setCustomDateTo('')
              }
            }}
          >
            <SelectTrigger className="w-48 border-gray-300">
              <SelectValue placeholder="Time Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="custom">Custom Period</SelectItem>
            </SelectContent>
          </Select>

          {(labFilter !== 'all' || priorityFilter !== 'all' || statusFilter !== 'all' || timeFilter !== 'all') && (
            <button
              onClick={() => {
                setLabFilter('all')
                setPriorityFilter('all')
                setStatusFilter('all')
                setTimeFilter('all')
                setShowCustomDateInputs(false)
                setCustomDateFrom('')
                setCustomDateTo('')
              }}
              className="text-blue-600 hover:underline font-medium flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              Clear
            </button>
          )}
        </div>

        {showCustomDateInputs && (
          <Card className="border-gray-300">
            <CardContent className="p-4">
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">From Date</Label>
                  <Input
                    type="date"
                    value={customDateFrom}
                    onChange={(e) => setCustomDateFrom(e.target.value)}
                    className="border-gray-300"
                  />
                </div>
                <div className="flex-1">
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">To Date</Label>
                  <Input
                    type="date"
                    value={customDateTo}
                    onChange={(e) => setCustomDateTo(e.target.value)}
                    className="border-gray-300"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="text-sm text-gray-600">
          {filteredReservations.length} results
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-6 h-[calc(100vh-300px)]">
            <div className="col-span-5 space-y-3 h-full overflow-y-auto pr-2">
              {filteredReservations.length === 0 ? (
                <Card className="border-gray-300">
                  <CardContent className="py-12">
                    <div className="text-center text-gray-500">
                      <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                      <p>No reservations match your filters</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                filteredReservations.map(reservation => (
                  <Card
                    key={reservation.id}
                    className={`cursor-pointer transition-all border-2 hover:shadow-md ${
                      selectedReservation?.id === reservation.id
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedReservation(reservation)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                          <User className="w-6 h-6 text-gray-600" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900 truncate">
                              {reservation.profiles?.full_name || 'Unknown'}
                            </h3>
                            <Badge className={getStatusColor(reservation.status)} style={{ fontSize: '10px', padding: '2px 6px' }}>
                              {reservation.status}
                            </Badge>
                          </div>

                          <p className="text-sm text-gray-900 font-medium mb-2">
                            {reservation.activity_name || getLabName(reservation)}
                          </p>

                          <p className="text-xs text-gray-600 mb-2">
                            {getLabName(reservation)}
                          </p>

                          <div className="flex items-center gap-2 text-xs">
                            <div className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded font-medium">
                              {getDaysToApply(reservation.requested_at)} days ago
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            <div className="col-span-7 h-full">
              {selectedReservation ? (
                <Card className="border-gray-300 h-full flex flex-col">
                  <CardContent className="p-6 overflow-y-auto flex-1">
                    <div className="space-y-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center">
                            <User className="w-8 h-8 text-gray-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h2 className="text-2xl font-bold text-gray-900">
                                {selectedReservation.profiles?.full_name || 'Unknown User'}
                              </h2>
                            </div>
                            <Button variant="outline" size="sm" className="mt-2">
                              Contact User
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                          {selectedReservation.activity_name || getLabName(selectedReservation)}
                        </h3>

                        <div className="flex items-center gap-2 mb-4">
                          <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded font-medium text-sm">
                            {getDaysToApply(selectedReservation.requested_at)} days ago
                          </div>
                          <span className="text-gray-600 text-sm">
                            REQUESTED: {formatDateTime(selectedReservation.requested_at)}
                          </span>
                        </div>

                        <div className="flex gap-2 mb-6">
                          <Button
                            onClick={() => openActionDialog('approve')}
                            className="bg-blue-600 hover:bg-blue-700"
                            disabled={selectedReservation.status !== 'pending'}
                          >
                            <Check className="w-4 h-4 mr-2" />
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => openActionDialog('reject')}
                            disabled={selectedReservation.status !== 'pending'}
                          >
                            <X className="w-4 h-4 mr-2" />
                            Reject
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => openActionDialog('suggest')}
                            disabled={selectedReservation.status !== 'pending'}
                          >
                            <Clock className="w-4 h-4 mr-2" />
                            Suggest Alternative
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2">Reservation Type</h4>
                          <p className="text-gray-600 capitalize">{selectedReservation.reservation_type}</p>
                        </div>

                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3">Reservation Details</h4>
                          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                            <div className="flex items-center gap-3">
                              <Calendar className="w-5 h-5 text-gray-500" />
                              <div>
                                <p className="text-sm text-gray-600">Start Time</p>
                                <p className="font-medium text-gray-900">{formatDateTime(selectedReservation.desired_start_time)}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Calendar className="w-5 h-5 text-gray-500" />
                              <div>
                                <p className="text-sm text-gray-600">End Time</p>
                                <p className="font-medium text-gray-900">{formatDateTime(selectedReservation.desired_end_time)}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <AlertCircle className="w-5 h-5 text-gray-500" />
                              <div>
                                <p className="text-sm text-gray-600">Priority</p>
                                <Badge className={getPriorityColor(selectedReservation.priority)}>
                                  {selectedReservation.priority.toUpperCase()}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <User className="w-5 h-5 text-gray-500" />
                              <div>
                                <p className="text-sm text-gray-600">Requester Role</p>
                                <p className="font-medium text-gray-900 capitalize">{selectedReservation.requester_role}</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {selectedReservation.reservation_equipment && selectedReservation.reservation_equipment.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-2">Equipment Requested</h4>
                            <div className="flex flex-wrap gap-2">
                              {selectedReservation.reservation_equipment.map((re, idx) => (
                                <div key={idx} className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-lg">
                                  <Package className="w-4 h-4 text-gray-600" />
                                  <span className="text-sm font-medium text-gray-900">{re.equipment.name}</span>
                                  <span className="text-xs text-gray-500">({re.equipment.code})</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {selectedReservation.motivation && (
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-2">Motivation</h4>
                            <div className="bg-gray-50 rounded-lg p-4">
                              <p className="text-gray-700 text-sm leading-relaxed">{selectedReservation.motivation}</p>
                            </div>
                          </div>
                        )}

                        {selectedReservation.manager_comments && (
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                              <MessageSquare className="w-5 h-5" />
                              Manager Comments
                            </h4>
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                              <p className="text-gray-700 text-sm leading-relaxed">{selectedReservation.manager_comments}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-gray-300 h-full flex flex-col">
                  <CardContent className="py-12 flex-1 flex items-center justify-center">
                    <div className="text-center text-gray-500">
                      <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                      <p>Select a reservation to view details</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {actionType === 'approve' && 'Approve Reservation'}
                {actionType === 'reject' && 'Reject Reservation'}
                {actionType === 'suggest' && 'Suggest Alternative Time'}
              </DialogTitle>
              <DialogDescription>
                {actionType === 'approve' && 'Confirm that this reservation can be approved.'}
                {actionType === 'reject' && 'Provide a reason for rejecting this reservation.'}
                {actionType === 'suggest' && 'Suggest an alternative time slot for this reservation.'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {actionType === 'suggest' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Alternative Start Time</Label>
                    <Input
                      type="datetime-local"
                      value={suggestion.alternativeStartTime}
                      onChange={(e) => setSuggestion({ ...suggestion, alternativeStartTime: e.target.value })}
                      className="border-gray-300"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Alternative End Time</Label>
                    <Input
                      type="datetime-local"
                      value={suggestion.alternativeEndTime}
                      onChange={(e) => setSuggestion({ ...suggestion, alternativeEndTime: e.target.value })}
                      className="border-gray-300"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Comments {actionType === 'reject' && '*'}</Label>
                <textarea
                  value={managerComments}
                  onChange={(e) => setManagerComments(e.target.value)}
                  placeholder={`Add ${actionType === 'approve' ? 'optional' : ''} comments...`}
                  className="w-full min-h-[100px] p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required={actionType === 'reject'}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAction}
                disabled={processing || (actionType === 'reject' && !managerComments)}
                className={actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                {processing ? 'Processing...' : 'Confirm'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
