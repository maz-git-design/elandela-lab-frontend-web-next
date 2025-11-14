import { supabase } from '@/lib/supabase/client'

export type UserRole = 'user' | 'lab_admin' | 'super_admin'

export interface UserProfile {
  id: string
  email: string
  full_name: string
  role: UserRole
  managed_labs?: string[]
}

export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select(`
      id,
      email,
      full_name,
      roles!inner(name)
    `)
    .eq('id', user.id)
    .maybeSingle()

  if (!profile) return null

  let managed_labs: string[] = []

  if ((profile.roles as unknown as { name: string }).name === 'lab_admin') {
    const { data: labs } = await supabase
      .from('managed_labs')
      .select('lab_id')
      .eq('lab_admin_id', user.id)

    if (labs) {
      managed_labs = labs.map(l => l.lab_id)
    }
  }

  return {
    id: profile.id,
    email: profile.email,
    full_name: profile.full_name,
    role: (profile.roles as unknown as { name: string }).name as UserRole,
    managed_labs,
  }
}

export function isUser(role: UserRole): boolean {
  return role === 'user'
}

export function isLabAdmin(role: UserRole): boolean {
  return role === 'lab_admin'
}

export function isSuperAdmin(role: UserRole): boolean {
  return role === 'super_admin'
}

export function canManageLabs(role: UserRole): boolean {
  return role === 'super_admin' || role === 'lab_admin'
}

export function canManageUsers(role: UserRole): boolean {
  return role === 'super_admin'
}

export function canAccessAdminPanel(role: UserRole): boolean {
  return role === 'super_admin'
}

export function canManageReservations(role: UserRole): boolean {
  return role === 'super_admin' || role === 'lab_admin'
}

export function canViewAllAttendances(role: UserRole): boolean {
  return role === 'super_admin'
}

export function canViewLabAttendances(role: UserRole): boolean {
  return role === 'super_admin' || role === 'lab_admin'
}

export function canCreateReservation(): boolean {
  return true
}
