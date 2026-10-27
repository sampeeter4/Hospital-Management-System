import React from 'react'
import { CheckSquare } from 'lucide-react'
import StatusBadge from './StatusBadge'
import EmptyDashboardState from './EmptyDashboardState'

export interface TaskItem {
  id: string | number
  title: string
  subtitle?: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  dueTime?: string
  completed?: boolean
}

interface TaskListProps {
  tasks: TaskItem[]
  onToggleTask?: (id: string | number) => void
  emptyMessage?: string
  className?: string
}

export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  onToggleTask,
  emptyMessage = 'All tasks completed for your shift.',
  className = '',
}) => {
  if (tasks.length === 0) {
    return (
      <EmptyDashboardState
        title="No Pending Tasks"
        description={emptyMessage}
        icon={CheckSquare}
        className={className}
      />
    )
  }

  return (
    <div className={`bg-white border border-slate-200 rounded-lg divide-y divide-slate-100 ${className}`}>
      {tasks.map((task) => (
        <div
          key={task.id}
          className="p-3 flex items-start gap-3 hover:bg-slate-50/50 transition-colors"
        >
          <input
            type="checkbox"
            checked={task.completed || false}
            onChange={() => onToggleTask?.(task.id)}
            disabled={!onToggleTask}
            className="mt-1 h-3.5 w-3.5 rounded-xs border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            aria-label={`Mark "${task.title}" as completed`}
          />
          <div className="flex-1 min-w-0">
            <p
              className={`text-xs font-medium text-slate-900 ${
                task.completed ? 'line-through text-slate-400' : ''
              }`}
            >
              {task.title}
            </p>
            {task.subtitle && (
              <p className="text-[11px] text-slate-500 mt-0.5">{task.subtitle}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {task.dueTime && (
              <span className="text-[10px] text-slate-400 font-mono">{task.dueTime}</span>
            )}
            <StatusBadge status={task.priority} size="sm" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default TaskList
