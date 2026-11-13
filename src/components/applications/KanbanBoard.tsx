import { ArrowUpRight, Calendar, GripVertical } from 'lucide-react';
import { useState, type DragEvent } from 'react';
import { formatShortDate } from '@/src/lib/utils';
import {
  APPLICATION_STATUSES,
  PRIORITY_META,
  STATUS_META,
  type ApplicationStatus,
  type JobApplication,
} from '@/src/types/careerflow';

interface KanbanBoardProps {
  applications: JobApplication[];
  onStatusChange: (app: JobApplication, nextStatus: ApplicationStatus) => Promise<void>;
  onSelectApplication: (app: JobApplication) => void;
}

const ACTIVE_PIPELINE_STATUSES: ApplicationStatus[] = [
  'Interested',
  'Preparing',
  'Applied',
  'Assessment',
  'HR Interview',
  'Technical Interview',
  'Managerial Interview',
  'Final Interview',
  'Offer Received',
  'Offer Accepted',
];

export function KanbanBoard({
  applications,
  onStatusChange,
  onSelectApplication,
}: KanbanBoardProps) {
  const [stageScope, setStageScope] = useState<'active' | 'all'>('active');
  const [draggedAppId, setDraggedAppId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<ApplicationStatus | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const visibleStatuses =
    stageScope === 'all' ? [...APPLICATION_STATUSES] : ACTIVE_PIPELINE_STATUSES;

  const grouped = visibleStatuses.reduce<Record<string, JobApplication[]>>((acc, status) => {
    acc[status] = [];
    return acc;
  }, {});

  for (const app of applications) {
    if (grouped[app.status]) {
      grouped[app.status].push(app);
    }
  }

  const handleDragStart = (e: DragEvent<HTMLDivElement>, appId: string) => {
    setDraggedAppId(appId);
    e.dataTransfer.setData('text/plain', appId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>, targetStatus: ApplicationStatus) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || draggedAppId;
    setDraggedAppId(null);
    setDragOverStatus(null);
    if (!id) return;
    const app = applications.find((item) => item.id === id);
    if (!app || app.status === targetStatus) return;

    setUpdatingId(app.id);
    try {
      await onStatusChange(app, targetStatus);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleQuickStatus = async (app: JobApplication, nextStatus: ApplicationStatus) => {
    if (app.status === nextStatus) return;
    setUpdatingId(app.id);
    try {
      await onStatusChange(app, nextStatus);
    } finally {
      setUpdatingId(null);
    }
  };

  const closedCount = applications.filter(
    (a) => !ACTIVE_PIPELINE_STATUSES.includes(a.status)
  ).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
          <button
            type="button"
            onClick={() => setStageScope('active')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              stageScope === 'active'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Active Stages (10)
          </button>
          <button
            type="button"
            onClick={() => setStageScope('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              stageScope === 'all'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            All 14 Stages{closedCount > 0 ? ` (${closedCount} closed)` : ''}
          </button>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          Drag cards between columns or change status directly on a card.
        </p>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1">
        {visibleStatuses.map((status) => {
          const items = grouped[status] ?? [];
          const meta = STATUS_META[status];
          const isDropTarget = dragOverStatus === status;

          return (
            <div
              key={status}
              onDragOver={(e) => {
                e.preventDefault();
                if (dragOverStatus !== status) setDragOverStatus(status);
              }}
              onDragLeave={() => {
                if (dragOverStatus === status) setDragOverStatus(null);
              }}
              onDrop={(e) => handleDrop(e, status)}
              className={`w-[292px] shrink-0 rounded-xl border transition-colors flex flex-col max-h-[calc(100vh-280px)] min-h-[380px] ${
                isDropTarget
                  ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-950/20'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50'
              }`}
            >
              <div className="px-3.5 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0">
                <span className={`text-xs font-semibold truncate ${meta.toneClass}`}>
                  {meta.label}
                </span>
                <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400 shrink-0">
                  {items.length}
                </span>
              </div>

              <div className="p-2.5 space-y-2.5 overflow-y-auto flex-1">
                {items.length === 0 ? (
                  <div className="h-24 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center text-xs text-slate-400">
                    Drop application here
                  </div>
                ) : (
                  items.map((app) => {
                    const isUpdating = updatingId === app.id;
                    return (
                      <div
                        key={app.id}
                        draggable={!isUpdating}
                        onDragStart={(e) => handleDragStart(e, app.id)}
                        onDragEnd={() => {
                          setDraggedAppId(null);
                          setDragOverStatus(null);
                        }}
                        className={`rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 space-y-2.5 transition-opacity ${
                          draggedAppId === app.id || isUpdating ? 'opacity-60' : 'opacity-100'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => onSelectApplication(app)}
                            className="text-left group cursor-pointer min-w-0 flex-1"
                          >
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
                              {app.companyName}
                            </p>
                            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 mt-0.5">
                              {app.jobTitle}
                            </h4>
                          </button>
                          <span
                            className="text-slate-300 dark:text-slate-600 cursor-grab active:cursor-grabbing shrink-0 pt-0.5"
                            title="Drag to move column"
                          >
                            <GripVertical className="h-4 w-4" />
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                          <span className={PRIORITY_META[app.priority].textClass}>
                            {app.priority}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{app.workMode}</span>
                          {app.salary && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="truncate max-w-[110px]">{app.salary}</span>
                            </>
                          )}
                        </div>

                        {app.nextFollowUpDate && (
                          <div className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 font-mono tabular-nums">
                            <Calendar className="h-3.5 w-3.5 shrink-0" />
                            <span>Follow up {formatShortDate(app.nextFollowUpDate)}</span>
                          </div>
                        )}

                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                          <select
                            aria-label={`Change status for ${app.jobTitle}`}
                            value={app.status}
                            disabled={isUpdating}
                            onChange={(e) =>
                              handleQuickStatus(app, e.target.value as ApplicationStatus)
                            }
                            className="h-8 max-w-[175px] rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-2 text-xs text-slate-700 dark:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                          >
                            {APPLICATION_STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>

                          <button
                            type="button"
                            onClick={() => onSelectApplication(app)}
                            aria-label={`Open ${app.jobTitle} details`}
                            className="h-8 w-8 inline-flex items-center justify-center rounded-md text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                          >
                            <ArrowUpRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
