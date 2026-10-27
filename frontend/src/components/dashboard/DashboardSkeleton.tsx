import React from 'react'

export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Loading dashboard">
      {/* Header Skeleton */}
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <div className="h-6 w-56 bg-slate-200 rounded-md" />
            <div className="h-4 w-72 bg-slate-100 rounded-md" />
          </div>
          <div className="flex gap-2">
            <div className="h-8 w-28 bg-slate-100 rounded-md" />
            <div className="h-8 w-32 bg-slate-100 rounded-md" />
          </div>
        </div>
      </div>

      {/* Stat Cards Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
            <div className="flex justify-between items-center">
              <div className="h-3.5 w-24 bg-slate-100 rounded-xs" />
              <div className="h-7 w-7 bg-slate-100 rounded-md" />
            </div>
            <div className="h-8 w-16 bg-slate-200 rounded-md" />
            <div className="h-3 w-36 bg-slate-100 rounded-xs" />
          </div>
        ))}
      </div>

      {/* Main Content Columns Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="h-4 w-40 bg-slate-200 rounded-xs" />
          <div className="bg-white border border-slate-200 rounded-lg h-64 p-4 space-y-3">
            <div className="h-10 bg-slate-100 rounded-md" />
            <div className="h-10 bg-slate-100 rounded-md" />
            <div className="h-10 bg-slate-100 rounded-md" />
          </div>
        </div>

        <div className="space-y-4">
          <div className="h-4 w-32 bg-slate-200 rounded-xs" />
          <div className="bg-white border border-slate-200 rounded-lg h-64 p-4 space-y-3">
            <div className="h-12 bg-slate-100 rounded-md" />
            <div className="h-12 bg-slate-100 rounded-md" />
            <div className="h-12 bg-slate-100 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardSkeleton
