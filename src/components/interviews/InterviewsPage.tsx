import {
  Calendar,
  CalendarClock,
  CheckSquare,
  Clock,
  Edit3,
  ExternalLink,
  Plus,
  Search,
  Trash2,
  User,
  Video,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent } from '@/src/components/ui/card';
import { Dialog } from '@/src/components/ui/dialog';
import { EmptyState } from '@/src/components/ui/empty-state';
import { Input } from '@/src/components/ui/input';
import { Select } from '@/src/components/ui/select';
import { ensureExternalHref, formatDateTime, toJsDate } from '@/src/lib/utils';
import {
  INTERVIEW_RESULT_META,
  INTERVIEW_STATUSES,
  INTERVIEW_STATUS_META,
  INTERVIEW_TYPES,
  type Interview,
  type InterviewStatus,
  type InterviewType,
  type JobApplication,
} from '@/src/types/careerflow';

interface InterviewsPageProps {
  userId: string;
  interviews: Interview[];
  applications: JobApplication[];
  loading: boolean;
  error: string | null;
  onScheduleClick: () => void;
  onEditInterview: (interview: Interview) => void;
  onSelectInterview: (interview: Interview) => void;
  onSelectApplication: (applicationId: string) => void;
  onStatusChange: (interview: Interview, nextStatus: InterviewStatus) => Promise<void>;
  onDeleteInterview: (interview: Interview) => Promise<void>;
  onOpenCreateApplication: () => void;
}

type InterviewScopeTab = 'upcoming' | 'all' | 'past';

export function InterviewsPage({
  interviews,
  applications,
  loading,
  error,
  onScheduleClick,
  onEditInterview,
  onSelectInterview,
  onSelectApplication,
  onStatusChange,
  onDeleteInterview,
  onOpenCreateApplication,
}: InterviewsPageProps) {
  const [scopeTab, setScopeTab] = useState<InterviewScopeTab>('upcoming');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | InterviewType>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | InterviewStatus>('ALL');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deletingTarget, setDeletingTarget] = useState<Interview | null>(null);
  const [deleting, setDeleting] = useState(false);

  const appById = useMemo(
    () => new Map(applications.map((a) => [a.id, a])),
    [applications]
  );

  const summary = useMemo(() => {
    let upcoming = 0;
    let completed = 0;
    let passed = 0;
    for (const item of interviews) {
      if (item.status === 'Scheduled' || item.status === 'Rescheduled') upcoming += 1;
      if (item.status === 'Completed') completed += 1;
      if (item.result === 'Passed') passed += 1;
    }
    return {
      total: interviews.length,
      upcoming,
      completed,
      passed,
    };
  }, [interviews]);

  const filteredInterviews = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = interviews.filter((item) => {
      if (scopeTab === 'upcoming') {
        if (item.status !== 'Scheduled' && item.status !== 'Rescheduled') return false;
      } else if (scopeTab === 'past') {
        if (item.status !== 'Completed' && item.status !== 'Cancelled') return false;
      }

      if (typeFilter !== 'ALL' && item.interviewType !== typeFilter) return false;
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;

      if (q) {
        const app = appById.get(item.applicationId);
        const haystack = [
          item.roundName,
          item.interviewType,
          item.interviewer ?? '',
          app?.companyName ?? '',
          app?.jobTitle ?? '',
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    if (scopeTab === 'past') {
      return [...list].sort((a, b) => {
        const tsA = toJsDate(a.scheduledAt)?.getTime() ?? 0;
        const tsB = toJsDate(b.scheduledAt)?.getTime() ?? 0;
        return tsB - tsA;
      });
    }

    return list;
  }, [interviews, scopeTab, typeFilter, statusFilter, searchQuery, appById]);

  const handleQuickStatus = async (item: Interview, nextStatus: InterviewStatus) => {
    setUpdatingId(item.id);
    setActionError(null);
    try {
      await onStatusChange(item, nextStatus);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to update interview status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingTarget) return;
    setDeleting(true);
    setActionError(null);
    try {
      await onDeleteInterview(deletingTarget);
      setDeletingTarget(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to delete interview.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Interviews</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Schedule rounds, manage preparation checklists, and log post-interview feedback.
          </p>
        </div>

        <Button
          type="button"
          size="sm"
          onClick={applications.length > 0 ? onScheduleClick : onOpenCreateApplication}
        >
          <Plus className="h-4 w-4" />
          <span>{applications.length > 0 ? 'Schedule Interview' : 'Add Application First'}</span>
        </Button>
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
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Rounds</p>
          <p className="mt-1.5 font-display text-2xl font-bold font-mono tabular-nums">
            {summary.total}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3.5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Upcoming</p>
          <p className="mt-1.5 font-display text-2xl font-bold font-mono tabular-nums text-blue-600 dark:text-blue-400">
            {summary.upcoming}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3.5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Completed</p>
          <p className="mt-1.5 font-display text-2xl font-bold font-mono tabular-nums">
            {summary.completed}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3.5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Passed</p>
          <p className="mt-1.5 font-display text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
            {summary.passed}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg w-full sm:w-fit overflow-x-auto max-w-full">
          {(
            [
              { id: 'upcoming', label: `Upcoming (${summary.upcoming})` },
              { id: 'all', label: `All (${summary.total})` },
              { id: 'past', label: 'Completed & Past' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setScopeTab(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                scopeTab === tab.id
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1 lg:max-w-2xl">
          <div className="relative flex-1">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search round, company, role, or interviewer..."
              className="pl-9"
              aria-label="Search interviews"
            />
          </div>

          <Select
            aria-label="Filter by interview type"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as 'ALL' | InterviewType)}
            className="sm:w-44"
          >
            <option value="ALL">All types</option>
            {INTERVIEW_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>

          <Select
            aria-label="Filter by interview status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'ALL' | InterviewStatus)}
            className="sm:w-40"
          >
            <option value="ALL">All statuses</option>
            {INTERVIEW_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-24 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 animate-pulse"
            />
          ))}
        </div>
      ) : interviews.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="No interviews scheduled yet"
          description={
            applications.length > 0
              ? 'Schedule your first interview round to track meeting links, preparation checklists, practice questions, and feedback.'
              : 'Track a job application first, then schedule interview rounds against it.'
          }
          action={
            <Button
              type="button"
              onClick={applications.length > 0 ? onScheduleClick : onOpenCreateApplication}
            >
              <Plus className="h-4 w-4" />
              <span>
                {applications.length > 0 ? 'Schedule First Interview' : 'Add Job Application'}
              </span>
            </Button>
          }
        />
      ) : filteredInterviews.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="No interviews match your filters"
          description="Try switching tabs or clearing your search and type filters."
          action={
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setScopeTab('all');
                setSearchQuery('');
                setTypeFilter('ALL');
                setStatusFilter('ALL');
              }}
            >
              Reset Filters
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredInterviews.map((item) => {
            const app = appById.get(item.applicationId);
            const meetingHref = ensureExternalHref(item.meetingUrl);
            const checklist = item.preparationChecklist ?? [];
            const doneCount = checklist.filter((c) => c.done).length;

            return (
              <Card key={item.id} className="hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                        <button
                          type="button"
                          onClick={() => onSelectInterview(item)}
                          className="text-base font-semibold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left cursor-pointer"
                        >
                          {item.roundName}
                        </button>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {item.interviewType}
                        </span>
                        <span
                          className={`text-xs font-medium ${INTERVIEW_RESULT_META[item.result].toneClass}`}
                        >
                          · Outcome: {item.result}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                        {app ? (
                          <button
                            type="button"
                            onClick={() => onSelectApplication(app.id)}
                            className="font-medium text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                          >
                            {app.companyName} — {app.jobTitle}
                          </button>
                        ) : (
                          <span>Linked application</span>
                        )}
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1 font-mono tabular-nums text-slate-700 dark:text-slate-300">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          <span>{formatDateTime(item.scheduledAt)}</span>
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          <span>{item.durationMinutes ?? 45} min</span>
                        </span>
                        {item.interviewer && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="inline-flex items-center gap-1">
                              <User className="h-3.5 w-3.5 text-slate-400" />
                              <span>{item.interviewer}</span>
                            </span>
                          </>
                        )}
                        {checklist.length > 0 && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                              <CheckSquare className="h-3.5 w-3.5 text-slate-400" />
                              <span>
                                {doneCount}/{checklist.length} prep
                              </span>
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto shrink-0">
                      {meetingHref && (
                        <a
                          href={meetingHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs font-medium hover:bg-blue-100 dark:hover:bg-blue-950/70 transition-colors"
                        >
                          <Video className="h-3.5 w-3.5" />
                          <span>Join</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}

                      <Select
                        aria-label={`Status for ${item.roundName}`}
                        value={item.status}
                        disabled={updatingId === item.id}
                        onChange={(e) =>
                          handleQuickStatus(item, e.target.value as InterviewStatus)
                        }
                        className={`h-8 text-xs flex-1 min-w-[120px] sm:flex-initial sm:w-32 ${INTERVIEW_STATUS_META[item.status].toneClass}`}
                      >
                        {INTERVIEW_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </Select>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onSelectInterview(item)}
                      >
                        Prep & Feedback
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditInterview(item)}
                        aria-label={`Edit ${item.roundName}`}
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                        onClick={() => setDeletingTarget(item)}
                        aria-label={`Delete ${item.roundName}`}
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
        title="Delete interview round"
        description="This permanently deletes the interview round and its prep/feedback records."
        maxWidthClass="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Are you sure you want to delete{' '}
            <strong className="font-semibold text-slate-900 dark:text-white">
              {deletingTarget?.roundName}
            </strong>
            ?
          </p>
          <div className="flex justify-end gap-2 pt-2">
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
