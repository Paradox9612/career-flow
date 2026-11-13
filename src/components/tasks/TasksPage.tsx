import {
  AlertTriangle,
  Bell,
  Calendar,
  CheckSquare,
  Edit3,
  Mail,
  Plus,
  Search,
  Square,
  Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent } from '@/src/components/ui/card';
import { Dialog } from '@/src/components/ui/dialog';
import { EmptyState } from '@/src/components/ui/empty-state';
import { Input } from '@/src/components/ui/input';
import { Select } from '@/src/components/ui/select';
import { formatDateTime, formatShortDate, todayIsoDate } from '@/src/lib/utils';
import { isTaskDueToday, isTaskOverdue } from '@/src/services/taskService';
import {
  PRIORITIES,
  PRIORITY_META,
  TASK_CATEGORIES,
  TASK_STATUSES,
  TASK_STATUS_META,
  type JobApplication,
  type Priority,
  type TaskCategory,
  type TaskItem,
  type TaskStatus,
} from '@/src/types/careerflow';

interface TasksPageProps {
  tasks: TaskItem[];
  applications: JobApplication[];
  loading: boolean;
  error: string | null;
  onCreateTask: () => void;
  onEditTask: (task: TaskItem) => void;
  onStatusChange: (task: TaskItem, nextStatus: TaskStatus) => Promise<void>;
  onDeleteTask: (task: TaskItem) => Promise<void>;
  onSelectApplication: (applicationId: string) => void;
  onOpenTemplates: (applicationId?: string) => void;
}

type TaskTab = 'active' | 'overdue' | 'followups' | 'completed' | 'all';

export function TasksPage({
  tasks,
  applications,
  loading,
  error,
  onCreateTask,
  onEditTask,
  onStatusChange,
  onDeleteTask,
  onSelectApplication,
  onOpenTemplates,
}: TasksPageProps) {
  const [activeTab, setActiveTab] = useState<TaskTab>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | TaskCategory>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | Priority>('ALL');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deletingTarget, setDeletingTarget] = useState<TaskItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const todayIso = todayIsoDate();
  const appById = useMemo(
    () => new Map(applications.map((a) => [a.id, a])),
    [applications]
  );

  const summary = useMemo(() => {
    let active = 0;
    let overdue = 0;
    let dueToday = 0;
    let completed = 0;

    for (const task of tasks) {
      if (task.status === 'Completed') {
        completed += 1;
      } else {
        active += 1;
        if (isTaskOverdue(task, todayIso)) overdue += 1;
        if (isTaskDueToday(task, todayIso)) dueToday += 1;
      }
    }
    return { active, overdue, dueToday, completed };
  }, [tasks, todayIso]);

  const filteredTasks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return tasks.filter((task) => {
      if (activeTab === 'active' && task.status === 'Completed') return false;
      if (activeTab === 'overdue' && !isTaskOverdue(task, todayIso)) return false;
      if (activeTab === 'followups' && task.category !== 'Recruiter follow-up') return false;
      if (activeTab === 'completed' && task.status !== 'Completed') return false;

      if (categoryFilter !== 'ALL' && task.category !== categoryFilter) return false;
      if (priorityFilter !== 'ALL' && task.priority !== priorityFilter) return false;

      if (q) {
        const app = task.applicationId ? appById.get(task.applicationId) : undefined;
        const haystack = [
          task.title,
          task.description ?? '',
          task.category,
          app?.companyName ?? '',
          app?.jobTitle ?? '',
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [tasks, activeTab, categoryFilter, priorityFilter, searchQuery, todayIso, appById]);

  const handleToggleComplete = async (task: TaskItem) => {
    const nextStatus: TaskStatus = task.status === 'Completed' ? 'Pending' : 'Completed';
    setUpdatingId(task.id);
    setActionError(null);
    try {
      await onStatusChange(task, nextStatus);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to update task.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleStatusSelect = async (task: TaskItem, nextStatus: TaskStatus) => {
    setUpdatingId(task.id);
    setActionError(null);
    try {
      await onStatusChange(task, nextStatus);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to update task status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingTarget) return;
    setDeleting(true);
    setActionError(null);
    try {
      await onDeleteTask(deletingTarget);
      setDeletingTarget(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to delete task.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">
            Tasks & Follow-ups
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track follow-up reminders, assessment deadlines, interview prep tasks, and completion history.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenTemplates()}
          >
            <Mail className="h-4 w-4" />
            <span>Email Templates</span>
          </Button>
          <Button type="button" size="sm" onClick={onCreateTask}>
            <Plus className="h-4 w-4" />
            <span>New Task</span>
          </Button>
        </div>
      </div>

      {(error || actionError) && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-300"
        >
          {error || actionError}
        </div>
      )}

      {/* Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3.5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Active Tasks</p>
          <p className="mt-1.5 font-display text-2xl font-bold font-mono tabular-nums">
            {summary.active}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3.5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Due Today</p>
          <p className="mt-1.5 font-display text-2xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400">
            {summary.dueToday}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3.5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Overdue</p>
          <p className="mt-1.5 font-display text-2xl font-bold font-mono tabular-nums text-red-600 dark:text-red-400">
            {summary.overdue}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3.5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Completed</p>
          <p className="mt-1.5 font-display text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
            {summary.completed}
          </p>
        </div>
      </div>

      {/* Tabs & Filters */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg w-full sm:w-fit overflow-x-auto max-w-full">
          {(
            [
              { id: 'active', label: `Active (${summary.active})` },
              { id: 'overdue', label: `Overdue (${summary.overdue})` },
              { id: 'followups', label: 'Follow-ups' },
              { id: 'completed', label: `Completed (${summary.completed})` },
              { id: 'all', label: `All (${tasks.length})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1 xl:max-w-2xl">
          <div className="relative flex-1">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search task title, notes, or company..."
              className="pl-9"
              aria-label="Search tasks"
            />
          </div>

          <Select
            aria-label="Filter by category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as 'ALL' | TaskCategory)}
            className="sm:w-44"
          >
            <option value="ALL">All categories</option>
            {TASK_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>

          <Select
            aria-label="Filter by priority"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as 'ALL' | Priority)}
            className="sm:w-36"
          >
            <option value="ALL">All priorities</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Task List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-20 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 animate-pulse"
            />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="No tasks or follow-ups yet"
          description="Stay on top of recruiter check-ins, coding assessment deadlines, and interview prep by adding your first task."
          action={
            <Button type="button" onClick={onCreateTask}>
              <Plus className="h-4 w-4" />
              <span>Create First Task</span>
            </Button>
          }
        />
      ) : filteredTasks.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="No tasks match this view"
          description="Try switching tabs or resetting your category, priority, or search filters."
          action={
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setActiveTab('all');
                setSearchQuery('');
                setCategoryFilter('ALL');
                setPriorityFilter('ALL');
              }}
            >
              Reset Filters
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => {
            const app = task.applicationId ? appById.get(task.applicationId) : undefined;
            const overdue = isTaskOverdue(task, todayIso);
            const dueToday = isTaskDueToday(task, todayIso);
            const isCompleted = task.status === 'Completed';

            return (
              <Card
                key={task.id}
                className="hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
              >
                <CardContent className="p-4 sm:p-5">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <button
                        type="button"
                        disabled={updatingId === task.id}
                        onClick={() => handleToggleComplete(task)}
                        aria-label={
                          isCompleted
                            ? `Mark ${task.title} as pending`
                            : `Mark ${task.title} as completed`
                        }
                        className="mt-0.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer shrink-0"
                      >
                        {isCompleted ? (
                          <CheckSquare className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Square className="h-5 w-5" />
                        )}
                      </button>

                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                          <span
                            className={`text-sm font-semibold ${
                              isCompleted
                                ? 'line-through text-slate-400 dark:text-slate-500'
                                : 'text-slate-900 dark:text-white'
                            }`}
                          >
                            {task.title}
                          </span>

                          {overdue && (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              <span>Overdue</span>
                            </span>
                          )}
                          {!overdue && dueToday && (
                            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                              · Due Today
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                          <span>{task.category}</span>
                          <span aria-hidden="true">·</span>
                          <span className={PRIORITY_META[task.priority].textClass}>
                            {task.priority} priority
                          </span>
                          {app && (
                            <>
                              <span aria-hidden="true">·</span>
                              <button
                                type="button"
                                onClick={() => onSelectApplication(app.id)}
                                className="font-medium text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                              >
                                {app.companyName} — {app.jobTitle}
                              </button>
                            </>
                          )}
                          {task.dueDate && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span
                                className={`inline-flex items-center gap-1 font-mono tabular-nums ${
                                  overdue ? 'text-red-600 dark:text-red-400 font-medium' : ''
                                }`}
                              >
                                <Calendar className="h-3 w-3" />
                                <span>Due {formatShortDate(task.dueDate)}</span>
                              </span>
                            </>
                          )}
                          {task.reminderDate && !isCompleted && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                                <Bell className="h-3 w-3" />
                                <span>Remind {formatShortDate(task.reminderDate)}</span>
                              </span>
                            </>
                          )}
                          {isCompleted && task.completedAt && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                                Completed {formatDateTime(task.completedAt)}
                              </span>
                            </>
                          )}
                        </div>

                        {task.description && (
                          <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 pt-0.5">
                            {task.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0 w-full lg:w-auto">
                      {(task.category === 'Recruiter follow-up' || app) && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => onOpenTemplates(app?.id)}
                        >
                          <Mail className="h-3.5 w-3.5" />
                          <span>Template</span>
                        </Button>
                      )}

                      <Select
                        aria-label={`Status for ${task.title}`}
                        value={task.status}
                        disabled={updatingId === task.id}
                        onChange={(e) => handleStatusSelect(task, e.target.value as TaskStatus)}
                        className={`h-8 text-xs flex-1 min-w-[120px] sm:flex-initial sm:w-32 ${TASK_STATUS_META[task.status].toneClass}`}
                      >
                        {TASK_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </Select>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditTask(task)}
                        aria-label={`Edit ${task.title}`}
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                        onClick={() => setDeletingTarget(task)}
                        aria-label={`Delete ${task.title}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog
        open={Boolean(deletingTarget)}
        onClose={() => setDeletingTarget(null)}
        title="Delete task"
        description="This permanently deletes this task reminder."
        maxWidthClass="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Are you sure you want to delete{' '}
            <strong className="font-semibold text-slate-900 dark:text-white">
              {deletingTarget?.title}
            </strong>
            ?
          </p>
          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeletingTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting}
              onClick={handleConfirmDelete}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
