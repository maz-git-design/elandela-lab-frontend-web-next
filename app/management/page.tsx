'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Activity, Calendar, Building, Layers, Plus, Edit, Trash2, Search, ChevronLeft, ChevronRight, GraduationCap } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

interface ActivityType {
  id: string
  name: string
  description?: string
  cohort_id?: string
  is_active: boolean
  cohorts?: { name: string }
}

interface Department {
  id: string
  name: string
  code?: string
  description?: string
  head_of_department_id?: string
  deputy_chef_id?: string
  contact_email?: string
  contact_phone?: string
}

interface AcademicYear {
  id: string
  starting_year: number
  ending_year: number
  status: string
}

interface Cohort {
  id: string
  name: string
  academic_year_id?: string
  description?: string
  department_id?: string
  academic_years?: { starting_year: number; ending_year: number }
  departments?: { name: string }
}

interface EquipmentCategory {
  id: string
  name: string
  description?: string
  image_path?: string
}

export default function ManagementPage() {
  const [activities, setActivities] = useState<ActivityType[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([])
  const [cohorts, setCohorts] = useState<Cohort[]>([])
  const [categories, setCategories] = useState<EquipmentCategory[]>([])
  const [loading, setLoading] = useState(true)

  const [searchActivities, setSearchActivities] = useState('')
  const [searchDepartments, setSearchDepartments] = useState('')
  const [searchCohorts, setSearchCohorts] = useState('')
  const [searchCategories, setSearchCategories] = useState('')

  const [currentPageActivities, setCurrentPageActivities] = useState(1)
  const [currentPageDepartments, setCurrentPageDepartments] = useState(1)
  const [currentPageYears, setCurrentPageYears] = useState(1)
  const [currentPageCohorts, setCurrentPageCohorts] = useState(1)
  const [currentPageCategories, setCurrentPageCategories] = useState(1)
  const itemsPerPage = 4

  const [isActivityDialogOpen, setIsActivityDialogOpen] = useState(false)
  const [isDepartmentDialogOpen, setIsDepartmentDialogOpen] = useState(false)
  const [isYearDialogOpen, setIsYearDialogOpen] = useState(false)
  const [isCohortDialogOpen, setIsCohortDialogOpen] = useState(false)
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false)

  const [editingActivity, setEditingActivity] = useState<ActivityType | null>(null)
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null)
  const [editingYear, setEditingYear] = useState<AcademicYear | null>(null)
  const [editingCohort, setEditingCohort] = useState<Cohort | null>(null)
  const [editingCategory, setEditingCategory] = useState<EquipmentCategory | null>(null)

  const [activityForm, setActivityForm] = useState({ name: '', description: '', cohort_id: '', is_active: true })
  const [departmentForm, setDepartmentForm] = useState({ name: '', code: '', description: '', contact_email: '', contact_phone: '' })
  const [yearForm, setYearForm] = useState({ starting_year: new Date().getFullYear(), ending_year: new Date().getFullYear() + 1, status: 'active' })
  const [cohortForm, setCohortForm] = useState({ name: '', academic_year_id: '', description: '', department_id: '' })
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' })

  useEffect(() => {
    fetchAllData()
  }, [])

  const fetchAllData = async () => {
    setLoading(true)
    await Promise.all([
      fetchActivities(),
      fetchDepartments(),
      fetchAcademicYears(),
      fetchCohorts(),
      fetchCategories()
    ])
    setLoading(false)
  }

  const fetchActivities = async () => {
    const { data, error } = await supabase
      .from('activities')
      .select('*, cohorts(name)')
      .order('created_at', { ascending: false })
    if (!error) setActivities(data || [])
  }

  const fetchDepartments = async () => {
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .order('name')
    if (!error) setDepartments(data || [])
  }

  const fetchAcademicYears = async () => {
    const { data, error } = await supabase
      .from('academic_years')
      .select('*')
      .order('starting_year', { ascending: false })
    if (!error) setAcademicYears(data || [])
  }

  const fetchCohorts = async () => {
    const { data, error } = await supabase
      .from('cohorts')
      .select('*, academic_years(starting_year, ending_year), departments(name)')
      .order('name')
    if (!error) setCohorts(data || [])
  }

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('equipment_categories')
      .select('*')
      .order('name')
    if (!error) setCategories(data || [])
  }

  const handleSaveActivity = async () => {
    if (!activityForm.name) return
    if (editingActivity) {
      await supabase.from('activities').update(activityForm).eq('id', editingActivity.id)
    } else {
      await supabase.from('activities').insert([activityForm])
    }
    setIsActivityDialogOpen(false)
    setEditingActivity(null)
    setActivityForm({ name: '', description: '', cohort_id: '', is_active: true })
    fetchActivities()
  }

  const handleSaveDepartment = async () => {
    if (!departmentForm.name) return
    if (editingDepartment) {
      await supabase.from('departments').update(departmentForm).eq('id', editingDepartment.id)
    } else {
      await supabase.from('departments').insert([departmentForm])
    }
    setIsDepartmentDialogOpen(false)
    setEditingDepartment(null)
    setDepartmentForm({ name: '', code: '', description: '', contact_email: '', contact_phone: '' })
    fetchDepartments()
  }

  const handleSaveYear = async () => {
    if (editingYear) {
      await supabase.from('academic_years').update(yearForm).eq('id', editingYear.id)
    } else {
      await supabase.from('academic_years').insert([yearForm])
    }
    setIsYearDialogOpen(false)
    setEditingYear(null)
    setYearForm({ starting_year: new Date().getFullYear(), ending_year: new Date().getFullYear() + 1, status: 'active' })
    fetchAcademicYears()
  }

  const handleSaveCohort = async () => {
    if (!cohortForm.name) return
    if (editingCohort) {
      await supabase.from('cohorts').update(cohortForm).eq('id', editingCohort.id)
    } else {
      await supabase.from('cohorts').insert([cohortForm])
    }
    setIsCohortDialogOpen(false)
    setEditingCohort(null)
    setCohortForm({ name: '', academic_year_id: '', description: '', department_id: '' })
    fetchCohorts()
  }

  const handleSaveCategory = async () => {
    if (!categoryForm.name) return
    if (editingCategory) {
      await supabase.from('equipment_categories').update(categoryForm).eq('id', editingCategory.id)
    } else {
      await supabase.from('equipment_categories').insert([categoryForm])
    }
    setIsCategoryDialogOpen(false)
    setEditingCategory(null)
    setCategoryForm({ name: '', description: '' })
    fetchCategories()
  }

  const filteredActivities = activities.filter(a => a.name.toLowerCase().includes(searchActivities.toLowerCase()))
  const filteredDepartments = departments.filter(d => d.name.toLowerCase().includes(searchDepartments.toLowerCase()))
  const filteredCohorts = cohorts.filter(c => c.name.toLowerCase().includes(searchCohorts.toLowerCase()))
  const filteredCategories = categories.filter(c => c.name.toLowerCase().includes(searchCategories.toLowerCase()))

  const paginatedActivities = filteredActivities.slice((currentPageActivities - 1) * itemsPerPage, currentPageActivities * itemsPerPage)
  const paginatedDepartments = filteredDepartments.slice((currentPageDepartments - 1) * itemsPerPage, currentPageDepartments * itemsPerPage)
  const paginatedYears = academicYears.slice((currentPageYears - 1) * itemsPerPage, currentPageYears * itemsPerPage)
  const paginatedCohorts = filteredCohorts.slice((currentPageCohorts - 1) * itemsPerPage, currentPageCohorts * itemsPerPage)
  const paginatedCategories = filteredCategories.slice((currentPageCategories - 1) * itemsPerPage, currentPageCategories * itemsPerPage)

  const totalPagesActivities = Math.ceil(filteredActivities.length / itemsPerPage)
  const totalPagesDepartments = Math.ceil(filteredDepartments.length / itemsPerPage)
  const totalPagesYears = Math.ceil(academicYears.length / itemsPerPage)
  const totalPagesCohorts = Math.ceil(filteredCohorts.length / itemsPerPage)
  const totalPagesCategories = Math.ceil(filteredCategories.length / itemsPerPage)

  const Pagination = ({ currentPage, totalPages, onPageChange }: { currentPage: number; totalPages: number; onPageChange: (page: number) => void }) => {
    if (totalPages <= 1) return null
    return (
      <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-gray-200">
        <Button variant="outline" size="sm" onClick={() => onPageChange(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm text-gray-600">Page {currentPage} of {totalPages}</span>
        <Button variant="outline" size="sm" onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Management</h1>
          <p className="text-gray-600 mt-1">Manage activities, academic years, departments, cohorts and equipment categories</p>
        </div>

        <div className="grid gap-4 md:grid-cols-5">
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Activities</CardTitle>
              <div className="bg-blue-50 text-blue-600 rounded-lg p-2">
                <Activity className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activities.length}</div>
              <p className="text-xs text-gray-600 mt-1">Lab sessions & workshops</p>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Academic Years</CardTitle>
              <div className="bg-green-50 text-green-600 rounded-lg p-2">
                <Calendar className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{academicYears.length}</div>
              <p className="text-xs text-gray-600 mt-1">Active and archived</p>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Departments</CardTitle>
              <div className="bg-purple-50 text-purple-600 rounded-lg p-2">
                <Building className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{departments.length}</div>
              <p className="text-xs text-gray-600 mt-1">Across university</p>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Cohorts</CardTitle>
              <div className="bg-orange-50 text-orange-600 rounded-lg p-2">
                <GraduationCap className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{cohorts.length}</div>
              <p className="text-xs text-gray-600 mt-1">Student groups</p>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Categories</CardTitle>
              <div className="bg-teal-50 text-teal-600 rounded-lg p-2">
                <Layers className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{categories.length}</div>
              <p className="text-xs text-gray-600 mt-1">Equipment types</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Activities</CardTitle>
                <CardDescription>Manage lab sessions and workshops</CardDescription>
              </div>
              <div className="flex gap-2">
                <div className="relative w-48">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input placeholder="Search..." value={searchActivities} onChange={(e) => setSearchActivities(e.target.value)} className="pl-10 h-9 border-gray-200" />
                </div>
                <Button size="sm" className="gap-2" onClick={() => setIsActivityDialogOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Add
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : paginatedActivities.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No activities found</h3>
                  <p className="text-gray-600 mb-4">Get started by creating your first activity</p>
                  <Button size="sm" onClick={() => setIsActivityDialogOpen(true)}>Add Activity</Button>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {paginatedActivities.map((activity) => (
                      <div key={activity.id} className="flex items-start gap-4 p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                          <Activity className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{activity.name}</h4>
                          <p className="text-sm text-gray-600">{activity.description || 'No description'}</p>
                          <p className="text-xs text-gray-500 mt-1">{activity.cohorts?.name || 'No cohort'}</p>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => { setEditingActivity(activity); setActivityForm({ name: activity.name, description: activity.description || '', cohort_id: activity.cohort_id || '', is_active: activity.is_active }); setIsActivityDialogOpen(true); }}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={async () => { await supabase.from('activities').delete().eq('id', activity.id); fetchActivities(); }}>
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Pagination currentPage={currentPageActivities} totalPages={totalPagesActivities} onPageChange={setCurrentPageActivities} />
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Departments</CardTitle>
                <CardDescription>Academic departments</CardDescription>
              </div>
              <div className="flex gap-2">
                <div className="relative w-48">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input placeholder="Search..." value={searchDepartments} onChange={(e) => setSearchDepartments(e.target.value)} className="pl-10 h-9 border-gray-200" />
                </div>
                <Button size="sm" className="gap-2" onClick={() => setIsDepartmentDialogOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Add
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : paginatedDepartments.length === 0 ? (
                <div className="text-center py-8">
                  <Building className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No departments found</h3>
                  <p className="text-gray-600 mb-4">Create your first department</p>
                  <Button size="sm" onClick={() => setIsDepartmentDialogOpen(true)}>Add Department</Button>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {paginatedDepartments.map((dept) => (
                      <div key={dept.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                        <div className="flex items-center gap-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50">
                            <Building className="h-5 w-5 text-purple-600" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">{dept.name}</h4>
                            <p className="text-sm text-gray-600">Code: {dept.code || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => { setEditingDepartment(dept); setDepartmentForm({ name: dept.name, code: dept.code || '', description: dept.description || '', contact_email: dept.contact_email || '', contact_phone: dept.contact_phone || '' }); setIsDepartmentDialogOpen(true); }}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={async () => { await supabase.from('departments').delete().eq('id', dept.id); fetchDepartments(); }}>
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Pagination currentPage={currentPageDepartments} totalPages={totalPagesDepartments} onPageChange={setCurrentPageDepartments} />
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Academic Years</CardTitle>
                <CardDescription>Manage academic year periods</CardDescription>
              </div>
              <Button size="sm" className="gap-2" onClick={() => setIsYearDialogOpen(true)}>
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : paginatedYears.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No academic years found</h3>
                  <p className="text-gray-600 mb-4">Create your first academic year</p>
                  <Button size="sm" onClick={() => setIsYearDialogOpen(true)}>Add Academic Year</Button>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {paginatedYears.map((year) => (
                      <div key={year.id} className={`p-3 border rounded-lg ${year.status === 'active' ? 'border-blue-200 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold text-gray-900">{year.starting_year}-{year.ending_year}</h4>
                            <p className="text-sm text-gray-600">Status: {year.status}</p>
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => { setEditingYear(year); setYearForm({ starting_year: year.starting_year, ending_year: year.ending_year, status: year.status }); setIsYearDialogOpen(true); }}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={async () => { await supabase.from('academic_years').delete().eq('id', year.id); fetchAcademicYears(); }}>
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Pagination currentPage={currentPageYears} totalPages={totalPagesYears} onPageChange={setCurrentPageYears} />
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Cohorts</CardTitle>
                <CardDescription>Student cohorts and groups</CardDescription>
              </div>
              <div className="flex gap-2">
                <div className="relative w-48">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input placeholder="Search..." value={searchCohorts} onChange={(e) => setSearchCohorts(e.target.value)} className="pl-10 h-9 border-gray-200" />
                </div>
                <Button size="sm" className="gap-2" onClick={() => setIsCohortDialogOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Add
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : paginatedCohorts.length === 0 ? (
                <div className="text-center py-8">
                  <GraduationCap className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No cohorts found</h3>
                  <p className="text-gray-600 mb-4">Create your first cohort</p>
                  <Button size="sm" onClick={() => setIsCohortDialogOpen(true)}>Add Cohort</Button>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {paginatedCohorts.map((cohort) => (
                      <div key={cohort.id} className="flex items-start gap-4 p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50">
                          <GraduationCap className="h-5 w-5 text-orange-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{cohort.name}</h4>
                          <p className="text-sm text-gray-600">{cohort.description || 'No description'}</p>
                          <div className="flex gap-3 mt-1 text-xs text-gray-500">
                            {cohort.academic_years && <span>{cohort.academic_years.starting_year}-{cohort.academic_years.ending_year}</span>}
                            {cohort.departments && <span>{cohort.departments.name}</span>}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => { setEditingCohort(cohort); setCohortForm({ name: cohort.name, academic_year_id: cohort.academic_year_id || '', description: cohort.description || '', department_id: cohort.department_id || '' }); setIsCohortDialogOpen(true); }}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={async () => { await supabase.from('cohorts').delete().eq('id', cohort.id); fetchCohorts(); }}>
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Pagination currentPage={currentPageCohorts} totalPages={totalPagesCohorts} onPageChange={setCurrentPageCohorts} />
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Equipment Categories</CardTitle>
              <CardDescription>Lab equipment classification</CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input placeholder="Search..." value={searchCategories} onChange={(e) => setSearchCategories(e.target.value)} className="pl-10 border-gray-200" />
              </div>
              <Button size="sm" className="gap-2" onClick={() => setIsCategoryDialogOpen(true)}>
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : paginatedCategories.length === 0 ? (
              <div className="text-center py-8">
                <Layers className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No categories found</h3>
                <p className="text-gray-600 mb-4">Create your first equipment category</p>
                <Button size="sm" onClick={() => setIsCategoryDialogOpen(true)}>Add Category</Button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {paginatedCategories.map((category) => (
                    <div key={category.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50">
                          <Layers className="h-4 w-4 text-teal-600" />
                        </div>
                        <span className="font-medium text-gray-900">{category.name}</span>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => { setEditingCategory(category); setCategoryForm({ name: category.name, description: category.description || '' }); setIsCategoryDialogOpen(true); }}>
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={async () => { await supabase.from('equipment_categories').delete().eq('id', category.id); fetchCategories(); }}>
                          <Trash2 className="h-3 w-3 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <Pagination currentPage={currentPageCategories} totalPages={totalPagesCategories} onPageChange={setCurrentPageCategories} />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isActivityDialogOpen} onOpenChange={setIsActivityDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingActivity ? 'Edit Activity' : 'Create Activity'}</DialogTitle>
            <DialogDescription>Manage lab sessions and workshops</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={activityForm.name} onChange={(e) => setActivityForm({ ...activityForm, name: e.target.value })} placeholder="Physics Lab Session" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <textarea value={activityForm.description} onChange={(e) => setActivityForm({ ...activityForm, description: e.target.value })} placeholder="Description" className="w-full px-3 py-2 border border-gray-200 rounded-lg min-h-[80px]" />
            </div>
            <div className="space-y-2">
              <Label>Cohort</Label>
              <Select value={activityForm.cohort_id} onValueChange={(value) => setActivityForm({ ...activityForm, cohort_id: value })}>
                <SelectTrigger><SelectValue placeholder="Select cohort" /></SelectTrigger>
                <SelectContent>{cohorts.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <input type="checkbox" id="is_active" checked={activityForm.is_active} onChange={(e) => setActivityForm({ ...activityForm, is_active: e.target.checked })} className="w-4 h-4 text-blue-600 rounded" />
              <Label htmlFor="is_active" className="cursor-pointer">Is Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsActivityDialogOpen(false); setEditingActivity(null); }}>Cancel</Button>
            <Button onClick={handleSaveActivity}>{editingActivity ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDepartmentDialogOpen} onOpenChange={setIsDepartmentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDepartment ? 'Edit Department' : 'Create Department'}</DialogTitle>
            <DialogDescription>Manage academic departments</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input value={departmentForm.name} onChange={(e) => setDepartmentForm({ ...departmentForm, name: e.target.value })} placeholder="Computer Science" />
              </div>
              <div className="space-y-2">
                <Label>Code</Label>
                <Input value={departmentForm.code} onChange={(e) => setDepartmentForm({ ...departmentForm, code: e.target.value })} placeholder="CS" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <textarea value={departmentForm.description} onChange={(e) => setDepartmentForm({ ...departmentForm, description: e.target.value })} placeholder="Description" className="w-full px-3 py-2 border border-gray-200 rounded-lg min-h-[80px]" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Contact Email</Label>
                <Input type="email" value={departmentForm.contact_email} onChange={(e) => setDepartmentForm({ ...departmentForm, contact_email: e.target.value })} placeholder="dept@university.edu" />
              </div>
              <div className="space-y-2">
                <Label>Contact Phone</Label>
                <Input type="tel" value={departmentForm.contact_phone} onChange={(e) => setDepartmentForm({ ...departmentForm, contact_phone: e.target.value })} placeholder="+1234567890" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsDepartmentDialogOpen(false); setEditingDepartment(null); }}>Cancel</Button>
            <Button onClick={handleSaveDepartment}>{editingDepartment ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isYearDialogOpen} onOpenChange={setIsYearDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingYear ? 'Edit Academic Year' : 'Create Academic Year'}</DialogTitle>
            <DialogDescription>Manage academic year periods</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Starting Year *</Label>
                <Input type="number" value={yearForm.starting_year} onChange={(e) => setYearForm({ ...yearForm, starting_year: parseInt(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Ending Year *</Label>
                <Input type="number" value={yearForm.ending_year} onChange={(e) => setYearForm({ ...yearForm, ending_year: parseInt(e.target.value) })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={yearForm.status} onValueChange={(value) => setYearForm({ ...yearForm, status: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsYearDialogOpen(false); setEditingYear(null); }}>Cancel</Button>
            <Button onClick={handleSaveYear}>{editingYear ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCohortDialogOpen} onOpenChange={setIsCohortDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCohort ? 'Edit Cohort' : 'Create Cohort'}</DialogTitle>
            <DialogDescription>Manage student cohorts and groups</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={cohortForm.name} onChange={(e) => setCohortForm({ ...cohortForm, name: e.target.value })} placeholder="CS 2024" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <textarea value={cohortForm.description} onChange={(e) => setCohortForm({ ...cohortForm, description: e.target.value })} placeholder="Description" className="w-full px-3 py-2 border border-gray-200 rounded-lg min-h-[80px]" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Academic Year</Label>
                <Select value={cohortForm.academic_year_id} onValueChange={(value) => setCohortForm({ ...cohortForm, academic_year_id: value })}>
                  <SelectTrigger><SelectValue placeholder="Select year" /></SelectTrigger>
                  <SelectContent>{academicYears.map((y) => (<SelectItem key={y.id} value={y.id}>{y.starting_year}-{y.ending_year}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Select value={cohortForm.department_id} onValueChange={(value) => setCohortForm({ ...cohortForm, department_id: value })}>
                  <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                  <SelectContent>{departments.map((d) => (<SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>))}</SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsCohortDialogOpen(false); setEditingCohort(null); }}>Cancel</Button>
            <Button onClick={handleSaveCohort}>{editingCohort ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Edit Category' : 'Create Category'}</DialogTitle>
            <DialogDescription>Lab equipment classification</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} placeholder="Microscopes" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <textarea value={categoryForm.description} onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })} placeholder="Description" className="w-full px-3 py-2 border border-gray-200 rounded-lg min-h-[80px]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsCategoryDialogOpen(false); setEditingCategory(null); }}>Cancel</Button>
            <Button onClick={handleSaveCategory}>{editingCategory ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
