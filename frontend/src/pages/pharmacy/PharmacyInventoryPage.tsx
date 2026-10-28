import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Package,
  AlertTriangle,
  Clock,
  ArrowLeft,
} from 'lucide-react'
import { pharmacyApi } from '../../services/api/pharmacyApi'
import { Medicine, AggregatedStock, MedicineBatch } from '../../types/pharmacy'
import {
  PageHeader,
  DataTable,
  SearchInput,
  Pagination,
} from '../../components/ui'

export const PharmacyInventoryPage: React.FC = () => {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 10

  // Fetch Medicines catalogue
  const { data: medicinesData, isLoading: isLoadingMeds } = useQuery({
    queryKey: ['pharmacy-medicines', page, searchTerm],
    queryFn: () => pharmacyApi.getMedicines({ search: searchTerm || undefined }),
  })
  const medicines = medicinesData?.results || []
  const totalCount = medicinesData?.count || 0

  // Fetch Aggregated Stock
  const { data: stockItems = [] } = useQuery<AggregatedStock[], Error>({
    queryKey: ['pharmacy-stock-aggregated'],
    queryFn: () => pharmacyApi.getAggregatedStock(),
  })

  // Fetch Low Stock alert items
  const { data: lowStockMeds = [] } = useQuery<Medicine[], Error>({
    queryKey: ['pharmacy-low-stock'],
    queryFn: () => pharmacyApi.getLowStock(),
  })

  // Fetch Expiring Batches (within 30 days)
  const { data: expiringBatches = [] } = useQuery<MedicineBatch[], Error>({
    queryKey: ['pharmacy-expiring-batches'],
    queryFn: () => pharmacyApi.getExpiringBatches(30),
  })

  // Map medicine stock by medicine_id
  const stockMap = new Map<number, number>()
  stockItems.forEach((item) => {
    const cur = stockMap.get(item.medicine_id) || 0
    stockMap.set(item.medicine_id, cur + item.total_available)
  })

  const columns = [
    {
      key: 'code',
      header: 'Drug Code',
      render: (m: Medicine) => (
        <span className="font-mono text-xs font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
          {m.code}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Generic & Brand Name',
      render: (m: Medicine) => (
        <div>
          <div className="font-semibold text-xs text-slate-900">{m.generic_name}</div>
          <div className="text-[11px] text-slate-500 italic">{m.brand_name}</div>
        </div>
      ),
    },
    {
      key: 'details',
      header: 'Strength & Form',
      render: (m: Medicine) => (
        <div className="text-xs text-slate-700">
          <span className="font-medium">{m.strength}</span>
          <span className="text-slate-400 ml-1">({m.dosage_form})</span>
          <div className="text-[11px] text-slate-400 capitalize">{m.route_of_administration}</div>
        </div>
      ),
    },
    {
      key: 'stock',
      header: 'Current In-Stock',
      render: (m: Medicine) => {
        const total = stockMap.get(m.id) || 0
        const isLow = total <= m.low_stock_threshold
        return (
          <div className="text-xs">
            <span
              className={`font-mono font-bold ${
                isLow ? 'text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200' : 'text-emerald-700'
              }`}
            >
              {total} {m.dispensing_unit}s
            </span>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Alert threshold: {m.low_stock_threshold}
            </div>
          </div>
        )
      },
    },
    {
      key: 'manufacturer',
      header: 'Manufacturer',
      render: (m: Medicine) => (
        <div className="text-xs text-slate-700">{m.manufacturer}</div>
      ),
    },
    {
      key: 'rx',
      header: 'Prescription',
      render: (m: Medicine) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${
            m.requires_prescription
              ? 'bg-amber-50 text-amber-700 border-amber-200'
              : 'bg-slate-100 text-slate-600 border-slate-200'
          }`}
        >
          {m.requires_prescription ? 'Rx Required' : 'OTC'}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pharmacy Inventory & Medicine Stock"
        subtitle="Catalogue of approved pharmaceutical products, current shelf quantities, and batch expiration alerts"
        actions={
          <button
            onClick={() => navigate('/pharmacy/prescriptions')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-md transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Prescriptions
          </button>
        }
      />

      {/* Critical Stock Alerts Banners */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Low Stock Alert Card */}
        <div className="bg-white border border-amber-200 rounded-lg p-4 shadow-2xs">
          <div className="flex items-center gap-2 text-amber-800 font-bold text-xs mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            Low Stock Inventory Alerts ({lowStockMeds.length})
          </div>
          {lowStockMeds.length === 0 ? (
            <p className="text-xs text-slate-500">All medicine inventory levels are adequate.</p>
          ) : (
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {lowStockMeds.map((med) => (
                <div key={med.id} className="flex items-center justify-between text-xs py-1 border-b border-amber-50">
                  <span className="font-medium text-slate-800">{med.generic_name} ({med.strength})</span>
                  <span className="font-mono text-amber-700 font-bold">
                    Threshold: {med.low_stock_threshold}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Expiring Batches Card */}
        <div className="bg-white border border-rose-200 rounded-lg p-4 shadow-2xs">
          <div className="flex items-center gap-2 text-rose-800 font-bold text-xs mb-2">
            <Clock className="w-4 h-4 text-rose-600" />
            Batches Expiring Soon (Next 30 Days) ({expiringBatches.length})
          </div>
          {expiringBatches.length === 0 ? (
            <p className="text-xs text-slate-500">No active medication batches expiring in the next 30 days.</p>
          ) : (
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {expiringBatches.map((batch) => (
                <div key={batch.id} className="flex items-center justify-between text-xs py-1 border-b border-rose-50">
                  <span className="font-medium text-slate-800">
                    {batch.medicine_name || `Med #${batch.medicine}`} (Batch {batch.batch_number})
                  </span>
                  <span className="font-mono text-rose-700 font-bold">
                    Exp: {batch.expiry_date} ({batch.available_quantity} left)
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Search Input */}
      <div className="max-w-md">
        <SearchInput
          placeholder="Search by generic, brand name, code..."
          value={searchTerm}
          onChange={(val) => {
            setSearchTerm(val)
            setPage(1)
          }}
        />
      </div>

      {/* Main Medicine Table */}
      <DataTable
        columns={columns}
        data={medicines}
        isLoading={isLoadingMeds}
        keyExtractor={(m) => m.id}
        emptyState={
          <div className="py-12 text-center">
            <Package className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-xs font-semibold text-slate-700">No medicines found</p>
            <p className="text-[11px] text-slate-500 mt-1">
              Adjust search keywords or add new entries to the pharmacy catalogue.
            </p>
          </div>
        }
      />

      <Pagination
        currentPage={page}
        totalItems={totalCount}
        pageSize={pageSize}
        onPageChange={(newPage) => setPage(newPage)}
      />
    </div>
  )
}

export default PharmacyInventoryPage
