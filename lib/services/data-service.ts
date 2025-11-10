import { supabase } from '@/lib/supabase/client'
import { apiClient } from './api-client'
import { getDataSourceConfig } from '@/lib/config/data-source'

export interface DataServiceResponse<T> {
  data: T | null
  error: Error | null
}

type ReservationData = Record<string, unknown>
type LabData = Record<string, unknown>
type UserData = Record<string, unknown>
type AttendanceData = Record<string, unknown>
type EquipmentData = Record<string, unknown>
type DashboardStatsData = Record<string, unknown>
type UpdateData = Record<string, unknown>

class DataService {
  private get isUsingApi(): boolean {
    return getDataSourceConfig().type === 'api'
  }

  async fetchReservations(): Promise<DataServiceResponse<ReservationData[]>> {
    try {
      if (this.isUsingApi) {
        const data = await apiClient.get<ReservationData[]>('/reservations')
        return { data, error: null }
      } else {
        const { data, error } = await supabase
          .from('reservations')
          .select(`
            *,
            profiles:user_id (full_name, email),
            reservation_activities (
              activities (name)
            ),
            reservation_equipment (
              equipment (name, code)
            ),
            reservation_comments (comment_text)
          `)
          .order('requested_at', { ascending: false })

        return { data, error: error ? new Error(error.message) : null }
      }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async fetchLabs(): Promise<DataServiceResponse<LabData[]>> {
    try {
      if (this.isUsingApi) {
        const data = await apiClient.get<LabData[]>('/labs')
        return { data, error: null }
      } else {
        const { data, error } = await supabase
          .from('activities')
          .select('id, name, description, capacity')
          .order('name')

        return { data, error: error ? new Error(error.message) : null }
      }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async fetchUsers(): Promise<DataServiceResponse<UserData[]>> {
    try {
      if (this.isUsingApi) {
        const data = await apiClient.get<UserData[]>('/users')
        return { data, error: null }
      } else {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false })

        return { data, error: error ? new Error(error.message) : null }
      }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async fetchAttendances(): Promise<DataServiceResponse<AttendanceData[]>> {
    try {
      if (this.isUsingApi) {
        const data = await apiClient.get<AttendanceData[]>('/attendances')
        return { data, error: null }
      } else {
        const { data, error } = await supabase
          .from('attendance_logs')
          .select(`
            *,
            profiles:user_id (full_name, email, student_id),
            activities:activity_id (name)
          `)
          .order('clock_in_time', { ascending: false })

        return { data, error: error ? new Error(error.message) : null }
      }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async fetchEquipment(): Promise<DataServiceResponse<EquipmentData[]>> {
    try {
      if (this.isUsingApi) {
        const data = await apiClient.get<EquipmentData[]>('/equipment')
        return { data, error: null }
      } else {
        const { data, error } = await supabase
          .from('equipment')
          .select('*')
          .order('name')

        return { data, error: error ? new Error(error.message) : null }
      }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async fetchDashboardStats(): Promise<DataServiceResponse<DashboardStatsData>> {
    try {
      if (this.isUsingApi) {
        const data = await apiClient.get<DashboardStatsData>('/dashboard/stats')
        return { data, error: null }
      } else {
        const [reservations, users, labs, attendance] = await Promise.all([
          supabase.from('reservations').select('id, status'),
          supabase.from('profiles').select('id, role'),
          supabase.from('activities').select('id'),
          supabase.from('attendance_logs').select('id, clock_in_time').gte('clock_in_time', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        ])

        const stats = {
          totalReservations: reservations.data?.length || 0,
          pendingReservations: reservations.data?.filter(r => r.status === 'pending').length || 0,
          activeUsers: users.data?.filter(u => u.role === 'student' || u.role === 'teacher').length || 0,
          activeLabs: labs.data?.length || 0,
          weeklyAttendance: attendance.data?.length || 0,
        }

        return { data: stats, error: null }
      }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async updateReservation(id: string, updates: UpdateData): Promise<DataServiceResponse<ReservationData>> {
    try {
      if (this.isUsingApi) {
        const data = await apiClient.patch<ReservationData>(`/reservations/${id}`, updates)
        return { data, error: null }
      } else {
        const { data, error } = await supabase
          .from('reservations')
          .update(updates)
          .eq('id', id)
          .select()
          .single()

        return { data, error: error ? new Error(error.message) : null }
      }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async createReservation(reservation: ReservationData): Promise<DataServiceResponse<ReservationData>> {
    try {
      if (this.isUsingApi) {
        const data = await apiClient.post<ReservationData>('/reservations', reservation)
        return { data, error: null }
      } else {
        const { data, error } = await supabase
          .from('reservations')
          .insert(reservation)
          .select()
          .single()

        return { data, error: error ? new Error(error.message) : null }
      }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async createLab(lab: LabData): Promise<DataServiceResponse<LabData>> {
    try {
      if (this.isUsingApi) {
        const data = await apiClient.post<LabData>('/labs', lab)
        return { data, error: null }
      } else {
        const { data, error } = await supabase
          .from('activities')
          .insert(lab)
          .select()
          .single()

        return { data, error: error ? new Error(error.message) : null }
      }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async updateLab(id: string, updates: UpdateData): Promise<DataServiceResponse<LabData>> {
    try {
      if (this.isUsingApi) {
        const data = await apiClient.patch<LabData>(`/labs/${id}`, updates)
        return { data, error: null }
      } else {
        const { data, error } = await supabase
          .from('activities')
          .update(updates)
          .eq('id', id)
          .select()
          .single()

        return { data, error: error ? new Error(error.message) : null }
      }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }

  async deleteLab(id: string): Promise<DataServiceResponse<LabData>> {
    try {
      if (this.isUsingApi) {
        const data = await apiClient.delete<LabData>(`/labs/${id}`)
        return { data, error: null }
      } else {
        const { data, error } = await supabase
          .from('activities')
          .delete()
          .eq('id', id)
          .select()
          .single()

        return { data, error: error ? new Error(error.message) : null }
      }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }
}

export const dataService = new DataService()
