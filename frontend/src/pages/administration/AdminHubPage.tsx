import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Building2,
  Layers,
  Stethoscope,
  Users,
  Plus,
  ArrowRight,
} from 'lucide-react'
import { hospitalApi } from '../../services/api/hospitalApi'
import { PageHeader } from '../../components/ui'
import { StatCard, SectionHeader } from '../../components/dashboard'

export const AdminHubPage: React.FC = () => {
  const navigate = useNavigate()

  // Fetch counts
  const { data: hospitals = [], isLoading: isLoadingHospitals } = useQuery({
    queryKey: ['hospitals'],
    queryFn: () => hospitalApi.getHospitals(),
  })

  const { data: departments = [], isLoading: isLoadingDepartments } = useQuery({
    queryKey: ['departments'],
    queryFn: () => hospitalApi.getDepartments(),
  })

  const { data: doctors = [], isLoading: isLoadingDoctors } = useQuery({
    queryKey: ['doctors'],
    queryFn: () => hospitalApi.getDoctors(),
  })

  const { data: staff = [], isLoading: isLoadingStaff } = useQuery({
    queryKey: ['staff'],
    queryFn: () => hospitalApi.getStaffList(),
  })

  const sections = [
    {
      title: 'Hospital Facilities',
      count: hospitals.length,
      description: 'Physical locations, licenses, and address profiles',
      icon: Building2,
      viewLink: '/hospitals',
      createLink: '/hospitals/new',
      createLabel: 'Add Hospital',
      color: 'text-blue-600 bg-blue-50 border-blue-100',
    },
    {
      title: 'Departments & Units',
      count: departments.length,
      description: 'Clinical specialties, wards, and administrative wings',
      icon: Layers,
      viewLink: '/departments',
      createLink: '/departments/new',
      createLabel: 'Add Department',
      color: 'text-indigo-600 bg-indigo-50 border-indigo-100',
    },
    {
      title: 'Doctor Directory',
      count: doctors.length,
      description: 'Physicians, qualifications, licenses, and consultation fees',
      icon: Stethoscope,
      viewLink: '/doctors',
      createLink: '/doctors/new',
      createLabel: 'Add Doctor',
      color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    },
    {
      title: 'Staff Personnel',
      count: staff.length,
      description: 'Nurses, receptionists, pharmacists, technicians, accountants',
      icon: Users,
      viewLink: '/staff',
      createLink: '/staff/new',
      createLabel: 'Add Staff Member',
      color: 'text-amber-600 bg-amber-50 border-amber-100',
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hospital Administration Hub"
        subtitle="Manage hospital organization structure, clinical departments, physician rosters, and staff profiles"
      />

      {/* Aggregate Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Hospital Facilities"
          value={isLoadingHospitals ? '...' : hospitals.length}
          description="Registered healthcare centers"
          icon={Building2}
        />
        <StatCard
          title="Active Departments"
          value={isLoadingDepartments ? '...' : departments.length}
          description="Clinical & operations units"
          icon={Layers}
        />
        <StatCard
          title="Physicians & Specialists"
          value={isLoadingDoctors ? '...' : doctors.length}
          description="Consultant doctor profiles"
          icon={Stethoscope}
        />
        <StatCard
          title="Staff Personnel"
          value={isLoadingStaff ? '...' : staff.length}
          description="Nurses, receptionists, technicians"
          icon={Users}
        />
      </div>

      {/* Module Hub Navigation Cards */}
      <div>
        <SectionHeader
          title="Organization Modules"
          description="Manage institutional hierarchy and clinical staffing"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {sections.map((sec) => {
            const Icon = sec.icon
            return (
              <div
                key={sec.title}
                className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs hover:border-slate-300 transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-lg border flex items-center justify-center shrink-0 ${sec.color}`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">{sec.title}</h3>
                        <span className="text-xs font-semibold text-slate-500">
                          {sec.count} record{sec.count === 1 ? '' : 's'} registered
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => navigate(sec.createLink)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{sec.createLabel}</span>
                    </button>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed mb-4">
                    {sec.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-medium">
                    Authorized: Super Admin & Hospital Admin
                  </span>
                  <Link
                    to={sec.viewLink}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    <span>Browse Directory</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default AdminHubPage
