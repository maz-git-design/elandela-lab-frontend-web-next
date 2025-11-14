'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

interface LabHours {
  day_of_week: number
  opening_time: string
  closing_time: string
  is_open: boolean
}

interface Lab {
  id: string
  name: string
}

interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  status: string
  userName?: string
}

export function LabCalendar() {
  const [selectedLab, setSelectedLab] = useState<string>('all')
  const [labs, setLabs] = useState<Lab[]>([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<'month' | 'week' | 'day'>('week')
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [labHours, setLabHours] = useState<LabHours[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLabs()
  }, [])

  useEffect(() => {
    if (selectedLab && selectedLab !== 'all') {
      fetchLabHours()
      fetchReservations()
    } else if (selectedLab === 'all') {
      fetchReservations()
    }
  }, [selectedLab, currentDate, view])

  async function fetchLabs() {
    const { data } = await supabase
      .from('activities')
      .select('id, name')
      .eq('activity_type', 'lab_session')
      .order('name')

    if (data) {
      setLabs(data as Lab[])
      if (data.length > 0) {
        setSelectedLab(data[0].id)
      }
    }
  }

  async function fetchLabHours() {
    if (selectedLab === 'all') return

    const { data } = await supabase
      .from('lab_hours')
      .select('*')
      .eq('lab_id', selectedLab)

    if (data) {
      setLabHours(data as LabHours[])
    }
  }

  async function fetchReservations() {
    setLoading(true)
    const { start, end } = getDateRange()

    let query = supabase
      .from('reservations')
      .select(`
        id,
        desired_start_time,
        desired_end_time,
        status,
        profiles:user_id (full_name),
        reservation_activities!inner (activity_id)
      `)
      .gte('desired_start_time', start.toISOString())
      .lte('desired_start_time', end.toISOString())
      .in('status', ['approved', 'pending'])

    if (selectedLab !== 'all') {
      query = query.eq('reservation_activities.activity_id', selectedLab)
    }

    const { data } = await query

    if (data) {
      const calendarEvents: CalendarEvent[] = data.map((res) => {
        const resData = res as {
          id: string
          desired_start_time: string
          desired_end_time: string
          status: string
          profiles?: { full_name: string } | Array<{ full_name: string }>
        }
        const profile = Array.isArray(resData.profiles) ? resData.profiles[0] : resData.profiles
        return {
          id: resData.id,
          title: profile?.full_name || 'Reserved',
          start: new Date(resData.desired_start_time),
          end: new Date(resData.desired_end_time),
          status: resData.status,
          userName: profile?.full_name
        }
      })
      setEvents(calendarEvents)
    }
    setLoading(false)
  }

  function getDateRange() {
    const start = new Date(currentDate)
    const end = new Date(currentDate)

    if (view === 'month') {
      start.setDate(1)
      start.setHours(0, 0, 0, 0)
      end.setMonth(end.getMonth() + 1)
      end.setDate(0)
      end.setHours(23, 59, 59, 999)
    } else if (view === 'week') {
      const day = start.getDay()
      const diff = start.getDate() - day + (day === 0 ? -6 : 1)
      start.setDate(diff)
      start.setHours(0, 0, 0, 0)
      end.setDate(start.getDate() + 6)
      end.setHours(23, 59, 59, 999)
    } else {
      start.setHours(0, 0, 0, 0)
      end.setHours(23, 59, 59, 999)
    }

    return { start, end }
  }

  function navigate(direction: 'prev' | 'next') {
    const newDate = new Date(currentDate)

    if (view === 'month') {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1))
    } else if (view === 'week') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7))
    } else {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1))
    }

    setCurrentDate(newDate)
  }

  function goToToday() {
    setCurrentDate(new Date())
  }

  function getWeekDays() {
    const { start } = getDateRange()
    const days = []
    for (let i = 0; i < 7; i++) {
      const day = new Date(start)
      day.setDate(start.getDate() + i)
      days.push(day)
    }
    return days
  }

  function getMonthDays() {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)

    const startDate = new Date(firstDay)
    const day = startDate.getDay()
    startDate.setDate(startDate.getDate() - (day === 0 ? 6 : day - 1))

    const days = []
    const currentDay = new Date(startDate)

    while (currentDay <= lastDay || days.length % 7 !== 0) {
      days.push(new Date(currentDay))
      currentDay.setDate(currentDay.getDate() + 1)
    }

    return days
  }

  function getEventsForDate(date: Date) {
    return events.filter(event => {
      const eventDate = new Date(event.start)
      return eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
    })
  }

  function getEventsForTimeSlot(date: Date, hour: number) {
    return events.filter(event => {
      const eventStart = new Date(event.start)
      const eventEnd = new Date(event.end)
      const slotStart = new Date(date)
      slotStart.setHours(hour, 0, 0, 0)
      const slotEnd = new Date(date)
      slotEnd.setHours(hour + 1, 0, 0, 0)

      return (
        eventStart.getDate() === date.getDate() &&
        eventStart.getMonth() === date.getMonth() &&
        eventStart.getFullYear() === date.getFullYear() &&
        ((eventStart >= slotStart && eventStart < slotEnd) ||
          (eventEnd > slotStart && eventEnd <= slotEnd) ||
          (eventStart <= slotStart && eventEnd >= slotEnd))
      )
    })
  }

  function getLabHoursForDay(dayOfWeek: number) {
    return labHours.find(h => h.day_of_week === dayOfWeek)
  }

  function formatTime(date: Date) {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  function formatDateHeader() {
    if (view === 'month') {
      return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    } else if (view === 'week') {
      const { start, end } = getDateRange()
      return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    } else {
      return currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    }
  }

  function renderMonthView() {
    const days = getMonthDays()
    const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

    return (
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
          {weekDays.map(day => (
            <div key={day} className="p-2 text-center text-sm font-semibold text-gray-700">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day, index) => {
            const dayEvents = getEventsForDate(day)
            const isCurrentMonth = day.getMonth() === currentDate.getMonth()
            const isToday = day.toDateString() === new Date().toDateString()

            return (
              <div
                key={index}
                className={`min-h-24 p-2 border-r border-b border-gray-200 ${
                  !isCurrentMonth ? 'bg-gray-50' : ''
                } ${isToday ? 'bg-blue-50' : ''}`}
              >
                <div className={`text-sm mb-1 ${isToday ? 'font-bold text-blue-600' : isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}`}>
                  {day.getDate()}
                </div>
                <div className="space-y-1">
                  {dayEvents.slice(0, 2).map(event => (
                    <div
                      key={event.id}
                      className={`text-xs p-1 rounded truncate ${
                        event.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}
                      title={`${event.userName} - ${formatTime(event.start)} to ${formatTime(event.end)}`}
                    >
                      {formatTime(event.start)} {event.userName}
                    </div>
                  ))}
                  {dayEvents.length > 2 && (
                    <div className="text-xs text-gray-600">+{dayEvents.length - 2} more</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  function renderWeekView() {
    const days = getWeekDays()
    const hours = Array.from({ length: 14 }, (_, i) => i + 7)

    return (
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="grid grid-cols-8 bg-gray-50 border-b border-gray-200">
          <div className="p-2 text-center text-sm font-semibold text-gray-700 border-r border-gray-200">Time</div>
          {days.map(day => {
            const isToday = day.toDateString() === new Date().toDateString()
            return (
              <div key={day.toISOString()} className={`p-2 text-center border-r border-gray-200 ${isToday ? 'bg-blue-50' : ''}`}>
                <div className="text-xs text-gray-600">{day.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                <div className={`text-sm font-semibold ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>{day.getDate()}</div>
              </div>
            )
          })}
        </div>
        <div className="overflow-y-auto max-h-[600px]">
          {hours.map(hour => (
            <div key={hour} className="grid grid-cols-8 border-b border-gray-200">
              <div className="p-2 text-sm text-gray-600 border-r border-gray-200 bg-gray-50">
                {hour}:00
              </div>
              {days.map(day => {
                const slotEvents = getEventsForTimeSlot(day, hour)
                const dayHours = getLabHoursForDay(day.getDay() === 0 ? 7 : day.getDay())
                const isOpenHour = dayHours?.is_open && hour >= parseInt(dayHours.opening_time.split(':')[0]) && hour < parseInt(dayHours.closing_time.split(':')[0])

                return (
                  <div
                    key={`${day.toISOString()}-${hour}`}
                    className={`p-1 border-r border-gray-200 min-h-16 ${!isOpenHour && selectedLab !== 'all' ? 'bg-gray-100' : ''}`}
                  >
                    {slotEvents.map(event => (
                      <div
                        key={event.id}
                        className={`text-xs p-1 mb-1 rounded ${
                          event.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}
                        title={`${event.userName} - ${formatTime(event.start)} to ${formatTime(event.end)}`}
                      >
                        <div className="font-semibold truncate">{event.userName}</div>
                        <div>{formatTime(event.start)} - {formatTime(event.end)}</div>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    )
  }

  function renderDayView() {
    const hours = Array.from({ length: 14 }, (_, i) => i + 7)
    const dayHours = getLabHoursForDay(currentDate.getDay() === 0 ? 7 : currentDate.getDay())

    return (
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-50 border-b border-gray-200 p-4">
          <div className="text-center">
            <div className="text-sm text-gray-600">{currentDate.toLocaleDateString('en-US', { weekday: 'long' })}</div>
            <div className="text-2xl font-bold text-gray-900">{currentDate.getDate()}</div>
            {dayHours && dayHours.is_open && (
              <div className="text-sm text-gray-600 mt-1 flex items-center justify-center gap-1">
                <Clock className="w-4 h-4" />
                {dayHours.opening_time} - {dayHours.closing_time}
              </div>
            )}
          </div>
        </div>
        <div className="overflow-y-auto max-h-[600px]">
          {hours.map(hour => {
            const slotEvents = getEventsForTimeSlot(currentDate, hour)
            const isOpenHour = dayHours?.is_open && hour >= parseInt(dayHours.opening_time.split(':')[0]) && hour < parseInt(dayHours.closing_time.split(':')[0])

            return (
              <div key={hour} className="border-b border-gray-200">
                <div className="flex">
                  <div className="w-20 p-3 text-sm text-gray-600 bg-gray-50 border-r border-gray-200">
                    {hour}:00
                  </div>
                  <div className={`flex-1 p-2 min-h-20 ${!isOpenHour && selectedLab !== 'all' ? 'bg-gray-100' : ''}`}>
                    {slotEvents.map(event => (
                      <div
                        key={event.id}
                        className={`p-2 mb-2 rounded ${
                          event.status === 'approved' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                        }`}
                      >
                        <div className="font-semibold">{event.userName}</div>
                        <div className="text-sm">{formatTime(event.start)} - {formatTime(event.end)}</div>
                        <Badge className="mt-1" variant={event.status === 'approved' ? 'default' : 'secondary'}>
                          {event.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <Card className="border-gray-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Lab Availability Calendar</CardTitle>
            <CardDescription>View lab reservations and availability</CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <Select value={selectedLab} onValueChange={setSelectedLab}>
              <SelectTrigger className="w-48 border-gray-300">
                <SelectValue placeholder="Select a lab" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Labs</SelectItem>
                {labs.map(lab => (
                  <SelectItem key={lab.id} value={lab.id}>{lab.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-1 border border-gray-300 rounded-md">
              <Button
                variant={view === 'month' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setView('month')}
              >
                Month
              </Button>
              <Button
                variant={view === 'week' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setView('week')}
              >
                Week
              </Button>
              <Button
                variant={view === 'day' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setView('day')}
              >
                Day
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('prev')}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToToday}>
              Today
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('next')}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <div className="ml-2 font-semibold text-gray-900">{formatDateHeader()}</div>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-100 border border-green-200 rounded"></div>
              <span className="text-gray-600">Approved</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-100 border border-yellow-200 rounded"></div>
              <span className="text-gray-600">Pending</span>
            </div>
            {selectedLab !== 'all' && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-gray-100 border border-gray-200 rounded"></div>
                <span className="text-gray-600">Closed</span>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading calendar...</p>
          </div>
        ) : (
          <>
            {view === 'month' && renderMonthView()}
            {view === 'week' && renderWeekView()}
            {view === 'day' && renderDayView()}
          </>
        )}
      </CardContent>
    </Card>
  )
}
