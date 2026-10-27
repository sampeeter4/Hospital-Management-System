import { ReactNode } from 'react'
import { Inbox } from 'lucide-react'

export interface Column<T> {
  key: string
  header?: string
  title?: string
  render?: (item: T) => ReactNode
  className?: string
  align?: 'left' | 'center' | 'right'
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyExtractor: (item: T) => string | number
  isLoading?: boolean
  emptyMessage?: string
  emptyTitle?: string
  emptyState?: ReactNode
  className?: string
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  isLoading = false,
  emptyMessage = 'No records found matching your filters.',
  emptyTitle = 'No Records',
  emptyState,
  className = '',
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-8 animate-pulse space-y-4">
        <div className="h-4 bg-slate-200 rounded w-1/4" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-8 bg-slate-100 rounded" />
          ))}
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    if (emptyState) {
      return (
        <div className={`bg-white border border-slate-200 rounded-lg p-6 shadow-2xs ${className}`}>
          {emptyState}
        </div>
      )
    }
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-10 text-center">
        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-3">
          <Inbox className="w-5 h-5" />
        </div>
        <h4 className="text-sm font-semibold text-slate-800">{emptyTitle}</h4>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className={`bg-white border border-slate-200 rounded-lg overflow-hidden shadow-2xs ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`py-3 px-4 ${
                    col.align === 'right'
                      ? 'text-right'
                      : col.align === 'center'
                      ? 'text-center'
                      : 'text-left'
                  } ${col.className || ''}`}
                >
                  {col.header || col.title || ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs text-slate-800">
            {data.map((item) => (
              <tr key={keyExtractor(item)} className="hover:bg-slate-50/60 transition-colors">
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`py-3 px-4 ${
                      col.align === 'right'
                        ? 'text-right'
                        : col.align === 'center'
                        ? 'text-center'
                        : 'text-left'
                    } ${col.className || ''}`}
                  >
                    {col.render
                      ? col.render(item)
                      : String((item as Record<string, unknown>)[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default DataTable
