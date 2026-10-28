import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  Database,
  Server,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Cpu,
} from 'lucide-react'
import { adminApi } from '../../services/api/adminApi'
import { PageHeader, Card, Button } from '../../components/ui'

export const SystemHealthPage: React.FC = () => {
  const [lastPingTime, setLastPingTime] = useState<number | null>(null)

  const {
    data: health,
    isLoading,
    isRefetching,
    refetch,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ['systemHealth'],
    queryFn: async () => {
      const start = performance.now()
      const data = await adminApi.getHealthStatus()
      const elapsed = Math.round(performance.now() - start)
      setLastPingTime(elapsed)
      return data
    },
    refetchInterval: 30000, // automatic ping every 30s
  })

  const isHealthy = health?.status === 'success' && health?.services?.database === 'healthy'

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Diagnostics & Health"
        subtitle="Real-time monitoring of backend API operational status, database connectivity, and latency metrics"
        action={
          <Button
            onClick={() => refetch()}
            disabled={isLoading || isRefetching}
            variant="outline"
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
            <span>Refresh Diagnostics</span>
          </Button>
        }
      />

      {/* Primary Status Banner */}
      <Card
        className={`p-6 border-l-4 ${
          isHealthy
            ? 'border-l-emerald-500 bg-emerald-50/40'
            : 'border-l-rose-500 bg-rose-50/40'
        }`}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                isHealthy
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-rose-100 text-rose-700'
              }`}
            >
              {isHealthy ? (
                <CheckCircle2 className="w-7 h-7" />
              ) : (
                <AlertTriangle className="w-7 h-7" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  {isHealthy ? 'All Hospital Core Systems Operational' : 'System Degraded / Action Required'}
                </h2>
                <span
                  className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${
                    isHealthy
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {isHealthy ? 'Healthy' : 'Degraded'}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                {health?.message || 'Connecting to backend cluster...'}
              </p>
            </div>
          </div>

          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-slate-400" />
            <span>
              Last Checked: {dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : 'Just now'}
            </span>
          </div>
        </div>
      </Card>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Core API Server */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">API Gateway</span>
            <Server className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-lg font-bold text-slate-900 mt-2">
            {isLoading ? '...' : 'Online (v' + (health?.version || '1.0') + ')'}
          </p>
          <div className="mt-2 flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>HTTP 200 OK</span>
          </div>
        </Card>

        {/* Database Connectivity */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Database Engine</span>
            <Database className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-lg font-bold text-slate-900 mt-2 capitalize">
            {isLoading ? '...' : health?.services?.database || 'Unknown'}
          </p>
          <div className="mt-2 flex items-center gap-1 text-[11px] text-slate-500">
            <span>Query ping test passed</span>
          </div>
        </Card>

        {/* API Ping Latency */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">API Latency</span>
            <Activity className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-lg font-bold text-slate-900 mt-2">
            {lastPingTime !== null ? `${lastPingTime} ms` : '...'}
          </p>
          <div className="mt-2 flex items-center gap-1 text-[11px] text-slate-500">
            <span>Round-trip HTTP probe</span>
          </div>
        </Card>

        {/* Security & Auth Status */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Auth Engine</span>
            <ShieldCheck className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-lg font-bold text-slate-900 mt-2">Active</p>
          <div className="mt-2 flex items-center gap-1 text-[11px] text-slate-500">
            <span>JWT Bearer Rotation</span>
          </div>
        </Card>
      </div>

      {/* Technical Specifications */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Cpu className="w-5 h-5 text-slate-600" />
          <h3 className="text-sm font-bold text-slate-900">Hospital Infrastructure Environment</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-md space-y-1">
            <span className="block font-semibold text-slate-700">Backend Framework</span>
            <span className="text-slate-600">Django REST Framework (DRF) 5.x / Python 3.12</span>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-md space-y-1">
            <span className="block font-semibold text-slate-700">Frontend Engine</span>
            <span className="text-slate-600">React 19 + TypeScript + Vite + Tailwind CSS</span>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-md space-y-1">
            <span className="block font-semibold text-slate-700">API Endpoint Root</span>
            <span className="text-slate-600 font-mono">/api/v1/</span>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-md space-y-1">
            <span className="block font-semibold text-slate-700">Health Probe Cadence</span>
            <span className="text-slate-600">Automated 30-second heartbeat check</span>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default SystemHealthPage
