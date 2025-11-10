'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Check, X, Clock, Calendar, Search, ChevronLeft, ChevronRight } from 'lucide-react'
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

export default function ManageReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([])
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

  const [searchTerm, setSearchTerm] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5

  useEffect(() => {
    fetchReservations()
  }, [])

  async function fetchReservations() {
    setLoading(true)
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

    if (data) setReservations(data as Reservation[])
    setLoading(false)
  }

  async function handleAction() {
    if (!selectedReservation) return

    setProcessing(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const updateData: Record<string, string | undefined> = {
        manager_id: user.id,
        manager_decision_at: new Date().toISOString(),
        manager_comments: managerComments
      }

      if (actionType === 'approve') {
        updateData.status = 'approved'
      } else if (actionType === 'reject') {
        updateData.status = 'rejected'
      } else if (actionType === 'suggest') {
        updateData.status = 'suggested'
        updateData.alternative_start_time = suggestion.alternativeStartTime
        updateData.alternative_end_time = suggestion.alternativeEndTime
      }

      const { error } = await supabase
        .from('reservations')
        .update(updateData)
        .eq('id', selectedReservation.id)

      if (error) throw error

      await supabase.from('reservation_history').insert({
        reservation_id: selectedReservation.id,
        status: updateData.status,
        changed_by: user.id,
        comment: managerComments || `Manager ${actionType}d the reservation`
      })

      alert(`Reservation ${actionType}d successfully!`)
      setShowDialog(false)
      setSelectedReservation(null)
      setManagerComments('')
      setSuggestion({ alternativeStartTime: '', alternativeEndTime: '' })
      fetchReservations()
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('Error processing reservation:', error)
      alert('Error: ' + errorMessage)
    } finally {
      setProcessing(false)
    }
  }

  function openDialog(reservation: Reservation, action: 'approve' | 'reject' | 'suggest') {
    setSelectedReservation(reservation)
    setActionType(action)
    setShowDialog(true)
    setManagerComments(reservation.manager_comments || '')
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-700 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-700 border-orange-200'
      case 'normal': return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'low': return 'bg-gray-100 text-gray-700 border-gray-300'
      default: return 'bg-gray-100 text-gray-700 border-gray-300'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      case 'suggested': return 'bg-purple-100 text-purple-700 border-purple-200'
      case 'approved': return 'bg-green-100 text-green-700 border-green-200'
      case 'rejected': return 'bg-red-100 text-red-700 border-red-200'
      default: return 'bg-gray-100 text-gray-700 border-gray-300'
    }
  }

  const getActivityName = (reservation: Reservation) => {
    if (reservation.reservation_comments && reservation.reservation_comments.length > 0) {
      const activityComment = reservation.reservation_comments.find(c => c.comment_text.startsWith('Activity:'))
      if (activityComment) {
        return activityComment.comment_text.replace('Activity: ', '')
      }
    }
    return 'No activity specified'
  }

  const filteredReservations = reservations.filter(reservation => {
    const matchesSearch = searchTerm === '' ||
      reservation.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reservation.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reservation.motivation?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesPriority = priorityFilter === 'all' || reservation.priority === priorityFilter
    const matchesStatus = statusFilter === 'all' || reservation.status === statusFilter

    return matchesSearch && matchesPriority && matchesStatus
  })

  const totalPages = Math.ceil(filteredReservations.length / itemsPerPage)
  const paginatedReservations = filteredReservations.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, priorityFilter, statusFilter])

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Breadcrumb items={[
          { label: 'Reservations', href: '/reservations' },
          { label: 'Manage Requests' }
        ]} />

        <div>
          <h2 className="text-2xl font-bold text-gray-900">Manage Reservations</h2>
          <p className="text-sm text-gray-600">Review and approve pending reservation requests</p>
        </div>

        <Card className="border-gray-300">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    placeholder="Search by user, email, or motivation..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 border-gray-300"
                  />
                </div>
              </div>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-full md:w-40 border-gray-300">
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
                <SelectTrigger className="w-full md:w-40 border-gray-300">
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
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredReservations.length === 0 ? (
          <Card className="border-gray-300">
            <CardContent className="py-12">
              <div className="text-center text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p>No reservations match your filters</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="space-y-4">
              {paginatedReservations.map(reservation => (
                <Card key={reservation.id} className="border-gray-300">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-3 flex-wrap">
                          <Badge className={getPriorityColor(reservation.priority)}>
                            {reservation.priority.toUpperCase()}
                          </Badge>
                          <Badge className={getStatusColor(reservation.status)}>
                            {reservation.status.toUpperCase()}
                          </Badge>
                          <Badge variant="outline" className="border-gray-300">
                            {reservation.reservation_type}
                          </Badge>
                          <Badge variant="outline" className="border-gray-300">
                            {reservation.requester_role}
                          </Badge>
                        </div>

                        <div>
                          <div className="font-semibold text-gray-900">
                            {reservation.profiles?.full_name || 'Unknown User'}
                          </div>
                          <div className="text-sm text-gray-600">
                            {reservation.profiles?.email}
                          </div>
                        </div>

                        <div className="grid gap-2 md:grid-cols-2">
                          <div className="text-sm">
                            <span className="font-medium text-gray-700">Start:</span>{' '}
                            <span className="text-gray-600">
                              {new Date(reservation.desired_start_time).toLocaleString()}
                            </span>
                          </div>
                          <div className="text-sm">
                            <span className="font-medium text-gray-700">End:</span>{' '}
                            <span className="text-gray-600">
                              {new Date(reservation.desired_end_time).toLocaleString()}
                            </span>
                          </div>
                        </div>

                        <div className="text-sm">
                          <span className="font-medium text-gray-700">Activity:</span>{' '}
                          <span className="text-gray-600">{getActivityName(reservation)}</span>
                        </div>

                        {reservation.reservation_activities && reservation.reservation_activities.length > 0 && (
                          <div className="text-sm">
                            <span className="font-medium text-gray-700">Lab:</span>{' '}
                            {reservation.reservation_activities.map(ra => ra.activities.name).join(', ')}
                          </div>
                        )}

                        {reservation.reservation_equipment && reservation.reservation_equipment.length > 0 && (
                          <div className="text-sm">
                            <span className="font-medium text-gray-700">Equipment:</span>{' '}
                            <div className="flex flex-wrap gap-1 mt-1">
                              {reservation.reservation_equipment.map((re, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs border-gray-300">
                                  {re.equipment.name}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="bg-gray-100 p-4 rounded-lg border border-gray-300">
                          <div className="text-sm font-medium text-gray-700 mb-2">Motivation:</div>
                          <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                            {reservation.motivation}
                          </p>
                        </div>

                        {reservation.manager_comments && (
                          <div className="text-sm bg-blue-50 p-3 rounded-lg border border-blue-200">
                            <span className="font-medium text-blue-900">Manager Comments:</span>
                            <p className="text-blue-800 mt-1">{reservation.manager_comments}</p>
                          </div>
                        )}
                      </div>

                      {reservation.status === 'pending' && (
                        <div className="flex flex-col gap-2">
                          <Button
                            size="sm"
                            onClick={() => openDialog(reservation, 'approve')}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openDialog(reservation, 'suggest')}
                            className="border-gray-300"
                          >
                            <Clock className="w-4 h-4 mr-1" />
                            Suggest
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openDialog(reservation, 'reject')}
                            className="text-red-600 border-red-300 hover:bg-red-50"
                          >
                            <X className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredReservations.length)} of {filteredReservations.length} results
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="border-gray-300"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <div className="flex items-center gap-1">
                    {currentPage > 2 && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(1)}
                          className="border-gray-300"
                        >
                          1
                        </Button>
                        {currentPage > 3 && <span className="px-2 text-gray-500">...</span>}
                      </>
                    )}

                    {currentPage > 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(currentPage - 1)}
                        className="border-gray-300"
                      >
                        {currentPage - 1}
                      </Button>
                    )}

                    <Button
                      variant="default"
                      size="sm"
                      className="bg-blue-600"
                    >
                      {currentPage}
                    </Button>

                    {currentPage < totalPages && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(currentPage + 1)}
                        className="border-gray-300"
                      >
                        {currentPage + 1}
                      </Button>
                    )}

                    {currentPage < totalPages - 1 && (
                      <>
                        {currentPage < totalPages - 2 && <span className="px-2 text-gray-500">...</span>}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(totalPages)}
                          className="border-gray-300"
                        >
                          {totalPages}
                        </Button>
                      </>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="border-gray-300"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-2xl border-gray-300">
            <DialogHeader>
              <DialogTitle>
                {actionType === 'approve' && 'Approve Reservation'}
                {actionType === 'reject' && 'Reject Reservation'}
                {actionType === 'suggest' && 'Suggest Alternative'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {actionType === 'suggest' && (
                <div className="grid gap-4 md:grid-cols-2">
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
                <Label>Comments / Notes</Label>
                <textarea
                  className="w-full min-h-[100px] p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={`Add ${actionType === 'reject' ? 'reason for rejection' : 'comments or instructions'}...`}
                  value={managerComments}
                  onChange={(e) => setManagerComments(e.target.value)}
                />
              </div>

              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowDialog(false)}
                  disabled={processing}
                  className="border-gray-300"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAction}
                  disabled={processing || (actionType === 'suggest' && (!suggestion.alternativeStartTime || !suggestion.alternativeEndTime))}
                  className={actionType === 'reject' ? 'bg-red-600 hover:bg-red-700' : ''}
                >
                  {processing ? 'Processing...' : `Confirm ${actionType.charAt(0).toUpperCase() + actionType.slice(1)}`}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
