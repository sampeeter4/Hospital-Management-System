import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { laboratoryApi } from '../../services/api/laboratoryApi'
import { LabTest } from '../../types/laboratory'
import { PageHeader, SearchInput, Pagination } from '../../components/ui'

export const LabCataloguePage: React.FC = () => {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['lab-tests-catalogue', { page, search, category: categoryFilter }],
    queryFn: () =>
      laboratoryApi.getLabTests({
        page,
        search: search || undefined,
        category: categoryFilter || undefined,
        is_active: true,
      }),
  })

  const tests = data?.results || []
  const totalCount = data?.count || 0
  const pageSize = 10
  const totalPages = Math.ceil(totalCount / pageSize) || 1

  return (
    <div className="space-y-6">
      <PageHeader
        title="Diagnostic Tests Catalogue"
        subtitle="Standardized laboratory investigation directory, specimen matrixes, and reference protocols"
        backTo="/laboratory"
        backLabel="Back to Laboratory Orders"
      />

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-3.5 rounded-lg border border-slate-200">
        <SearchInput
          value={search}
          onChange={(val) => {
            setSearch(val)
            setPage(1)
          }}
          placeholder="Search by test code, name, methodology..."
          className="w-full sm:w-72"
        />

        <div className="flex items-center space-x-2">
          <label htmlFor="cat-filter" className="text-xs font-medium text-slate-500">
            Category:
          </label>
          <select
            id="cat-filter"
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value)
              setPage(1)
            }}
            className="text-xs border border-slate-200 rounded-md px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Categories</option>
            <option value="HEMATOLOGY">Hematology</option>
            <option value="BIOCHEMISTRY">Biochemistry</option>
            <option value="MICROBIOLOGY">Microbiology</option>
            <option value="IMMUNOLOGY">Immunology</option>
            <option value="PATHOLOGY">Pathology</option>
          </select>
        </div>
      </div>

      {/* Tests Grid */}
      {isLoading ? (
        <div className="p-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      ) : tests.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-lg border border-slate-200 text-xs text-slate-500">
          No diagnostic tests found matching the search criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tests.map((test: LabTest) => (
            <div
              key={test.id}
              className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5 mb-2.5">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {test.code}
                    </span>
                    <h4 className="text-xs font-bold text-slate-800">{test.name}</h4>
                  </div>
                  <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    {test.category_display || test.category}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  <div>
                    <span className="text-slate-400 text-[11px] block">Specimen Matrix</span>
                    <span className="font-medium text-slate-700">{test.specimen_type}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Turnaround Time</span>
                    <span className="font-medium text-slate-700">
                      {test.turnaround_time_hours ? `~${test.turnaround_time_hours} hours` : 'Standard'}
                    </span>
                  </div>
                </div>

                {test.description && (
                  <p className="text-xs text-slate-600 mb-3">{test.description}</p>
                )}

                {test.parameters && test.parameters.length > 0 && (
                  <div className="bg-slate-50 rounded-md p-2.5 border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                      Analytes & Parameters ({test.parameters.length})
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {test.parameters.map((p) => (
                        <span
                          key={p.id}
                          className="inline-block text-[11px] bg-white text-slate-700 px-2 py-0.5 rounded border border-slate-200 font-medium"
                        >
                          {p.name} {p.unit && `(${p.unit})`}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={totalCount}
          pageSize={pageSize}
          onPageChange={setPage}
        />
      )}
    </div>
  )
}
export default LabCataloguePage
