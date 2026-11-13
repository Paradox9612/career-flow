import {
  ArrowDownUp,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit3,
  ExternalLink,
  Kanban,
  LayoutList,
  Plus,
  RotateCcw,
  Search,
  Table2,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { KanbanBoard } from '@/src/components/applications/KanbanBoard';
import { Button } from '@/src/components/ui/button';
import { Dialog } from '@/src/components/ui/dialog';
import { EmptyState } from '@/src/components/ui/empty-state';
import { Input } from '@/src/components/ui/input';
import { Select } from '@/src/components/ui/select';
import {
  ensureExternalHref,
  exportApplicationsToCsv,
  formatRelativeTime,
  formatShortDate,
  toJsDate,
} from '@/src/lib/utils';
import {
  APPLICATION_STATUSES,
  EMPLOYMENT_TYPES,
  PRIORITIES,
  PRIORITY_META,
  STATUS_META,
  WORK_MODES,
  type ApplicationStatus,
  type JobApplication,
  type Priority,
} from '@/src/types/careerflow';

export type ApplicationsViewMode = 'table' | 'list' | 'kanban';
export type ApplicationQuickFilter =
  | 'ALL'
  | 'APPLIED'
  | 'ACTIVE'
  | 'INTERVIEWS'
  | 'OFFERS'
  | 'REJECTED'
  | 'FOLLOWUPS';
type SortKey = 'updatedDesc' | 'appliedDesc' | 'companyAsc' | 'priorityDesc';

interface ApplicationsWorkspaceProps {
  applications: JobApplication[];
  loading: boolean;
  error: string | null;
  viewMode: ApplicationsViewMode;
  onViewModeChange: (mode: ApplicationsViewMode) => void;
  quickFilter?: ApplicationQuickFilter;
  onQuickFilterChange?: (filter: ApplicationQuickFilter) => void;
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  onCreateClick: () => void;
  onEditClick: (app: JobApplication) => void;
  onSelectApplication: (app: JobApplication) => void;
  onStatusChange: (app: JobApplication, nextStatus: ApplicationStatus) => Promise<void>;
  onDeleteApplication: (app: JobApplication) => Promise<void>;
}

const PRIORITY_RANK: Record<Priority, number> = {
  Urgent: 4,
  High: 3,
  Medium: 2,
  Low: 1,
};

const INTERVIEW_STATUSES = new Set<ApplicationStatus>([
  'HR Interview',
  'Technical Interview',
  'Managerial Interview',
  'Final Interview',
]);

const OFFER_STATUSES = new Set<ApplicationStatus>([
  'Offer Received',
  'Offer Accepted',
]);

const ACTIVE_STATUSES = new Set<ApplicationStatus>([
  'Applied',
  'Assessment',
  'HR Interview',
  'Technical Interview',
  'Managerial Interview',
  'Final Interview',
]);

const CLOSED_STATUSES = new Set<ApplicationStatus>([
  'Rejected',
  'Offer Rejected',
  'Withdrawn',
  'Offer Accepted',
]);

const REJECTED_STATUSES = new Set<ApplicationStatus>([
  'Rejected',
  'Offer Rejected',
]);

export function ApplicationsWorkspace({
  applications,
  loading,
  error,
  viewMode,
  onViewModeChange,
  quickFilter,
  onQuickFilterChange,
  searchQuery,
  onSearchQueryChange,
  onCreateClick,
  onEditClick,
  onSelectApplication,
  onStatusChange,
  onDeleteApplication,
}: ApplicationsWorkspaceProps) {
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [groupFilter, setGroupFilter] = useState<ApplicationQuickFilter>(quickFilter ?? 'ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [workModeFilter, setWorkModeFilter] = useState<string>('ALL');
  const [employmentFilter, setEmploymentFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<SortKey>('updatedDesc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pendingDelete, setPendingDelete] = useState<JobApplication | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (quickFilter) {
      setGroupFilter(quickFilter);
      setStatusFilter('ALL');
      setPage(1);
    }
  }, [quickFilter]);

  const setGroupAndSync = (next: ApplicationQuickFilter) => {
    setGroupFilter(next);
    onQuickFilterChange?.(next);
  };

  const metrics = useMemo(() => {
    const total = applications.length;
    const active = applications.filter((a) => ACTIVE_STATUSES.has(a.status)).length;
    const interviews = applications.filter((a) => INTERVIEW_STATUSES.has(a.status)).length;
    const offers = applications.filter((a) => OFFER_STATUSES.has(a.status)).length;
    return { total, active, interviews, offers };
  }, [applications]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = applications.filter((app) => {
      if (groupFilter === 'APPLIED' && app.status !== 'Applied') return false;
      if (groupFilter === 'ACTIVE' && !ACTIVE_STATUSES.has(app.status)) return false;
      if (groupFilter === 'INTERVIEWS' && !INTERVIEW_STATUSES.has(app.status)) return false;
      if (groupFilter === 'OFFERS' && !OFFER_STATUSES.has(app.status)) return false;
      if (groupFilter === 'REJECTED' && !REJECTED_STATUSES.has(app.status)) return false;
      if (
        groupFilter === 'FOLLOWUPS' &&
        (!app.nextFollowUpDate || CLOSED_STATUSES.has(app.status))
      ) {
        return false;
      }
      if (statusFilter !== 'ALL' && app.status !== statusFilter) return false;
      if (priorityFilter !== 'ALL' && app.priority !== priorityFilter) return false;
      if (workModeFilter !== 'ALL' && app.workMode !== workModeFilter) return false;
      if (employmentFilter !== 'ALL' && app.employmentType !== employmentFilter) return false;

      if (q) {
        const haystack = [
          app.companyName,
          app.jobTitle,
          app.location,
          app.recruiterName,
          app.source,
          app.notes,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    const sorted = [...list];
    sorted.sort((a, b) => {
      if (sortBy === 'companyAsc') {
        return a.companyName.localeCompare(b.companyName);
      }
      if (sortBy === 'priorityDesc') {
        return PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority];
      }
      if (sortBy === 'appliedDesc') {
        const dA = a.appliedDate ? new Date(a.appliedDate).getTime() : 0;
        const dB = b.appliedDate ? new Date(b.appliedDate).getTime() : 0;
        return dB - dA;
      }
      const uA = toJsDate(a.updatedAt)?.getTime() ?? 0;
      const uB = toJsDate(b.updatedAt)?.getTime() ?? 0;
      return uB - uA;
    });

    return sorted;
  }, [
    applications,
    searchQuery,
    groupFilter,
    statusFilter,
    priorityFilter,
    workModeFilter,
    employmentFilter,
    sortBy,
  ]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, safePage, pageSize]);

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    groupFilter !== 'ALL' ||
    statusFilter !== 'ALL' ||
    priorityFilter !== 'ALL' ||
    workModeFilter !== 'ALL' ||
    employmentFilter !== 'ALL';

  const resetFilters = () => {
    onSearchQueryChange('');
    setGroupAndSync('ALL');
    setStatusFilter('ALL');
    setPriorityFilter('ALL');
    setWorkModeFilter('ALL');
    setEmploymentFilter('ALL');
    setPage(1);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await onDeleteApplication(pendingDelete);
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="h-20 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 animate-pulse"
            />
          ))}
        </div>
        <div className="h-96 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Live Firestore Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {(
          [
            { key: 'ALL', label: 'Total Applications', count: metrics.total },
            { key: 'ACTIVE', label: 'Active Pipeline', count: metrics.active },
            { key: 'INTERVIEWS', label: 'In Interviews', count: metrics.interviews },
            { key: 'OFFERS', label: 'Offers', count: metrics.offers },
          ] as const
        ).map((item) => {
          const isSelected = groupFilter === item.key && statusFilter === 'ALL';
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                setStatusFilter('ALL');
                setGroupAndSync(item.key);
                setPage(1);
              }}
              className={`text-left rounded-xl border px-5 py-4 transition-colors cursor-pointer ${
                isSelected
                  ? 'border-blue-600 bg-blue-50/40 dark:bg-blue-950/20'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {item.label}
              </p>
              <p className="mt-1.5 font-display text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                {item.count}
              </p>
            </button>
          );
        })}
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-300"
        >
          {error}
        </div>
      )}

      {/* Filter & View Bar */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
            <Input
              value={searchQuery}
              onChange={(e) => {
                onSearchQueryChange(e.target.value);
                setPage(1);
              }}
              placeholder="Search company, role, location, recruiter..."
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
              {(
                [
                  { id: 'table', label: 'Table', Icon: Table2 },
                  { id: 'list', label: 'List', Icon: LayoutList },
                  { id: 'kanban', label: 'Kanban', Icon: Kanban },
                ] as const
              ).map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => onViewModeChange(id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    viewMode === id
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{label}</span>
                </button>
              ))}
            </div>

            {applications.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => exportApplicationsToCsv(filtered)}
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export CSV</span>
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-1">
          <Select
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setGroupAndSync('ALL');
              setPage(1);
            }}
            className="h-9 text-xs"
          >
            <option value="ALL">All Statuses</option>
            {APPLICATION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>

          <Select
            aria-label="Filter by priority"
            value={priorityFilter}
            onChange={(e) => {
              setPriorityFilter(e.target.value);
              setPage(1);
            }}
            className="h-9 text-xs"
          >
            <option value="ALL">All Priorities</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>

          <Select
            aria-label="Filter by work mode"
            value={workModeFilter}
            onChange={(e) => {
              setWorkModeFilter(e.target.value);
              setPage(1);
            }}
            className="h-9 text-xs"
          >
            <option value="ALL">All Work Modes</option>
            {WORK_MODES.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </Select>

          <Select
            aria-label="Filter by employment type"
            value={employmentFilter}
            onChange={(e) => {
              setEmploymentFilter(e.target.value);
              setPage(1);
            }}
            className="h-9 text-xs"
          >
            <option value="ALL">All Employment Types</option>
            {EMPLOYMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>

          <div className="relative">
            <ArrowDownUp className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
            <Select
              aria-label="Sort applications"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className="h-9 pl-8 text-xs"
            >
              <option value="updatedDesc">Recently Updated</option>
              <option value="appliedDesc">Applied Date (Newest)</option>
              <option value="companyAsc">Company (A–Z)</option>
              <option value="priorityDesc">Priority (Highest)</option>
            </Select>
          </div>

          <div className="flex items-center justify-between gap-2">
            {hasActiveFilters ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full h-9 text-xs"
                onClick={resetFilters}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset</span>
              </Button>
            ) : (
              <span className="text-xs font-mono tabular-nums text-slate-400 px-2">
                {filtered.length} {filtered.length === 1 ? 'record' : 'records'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Empty States */}
      {applications.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No job applications tracked yet"
          description="Add your first target role to organize statuses, recruiter contacts, follow-up dates, and your application timeline."
          action={
            <Button type="button" onClick={onCreateClick}>
              <Plus className="h-4 w-4" />
              <span>Add First Application</span>
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No applications match your filters"
          description="Try clearing your search term or switching back to all statuses."
          action={
            <Button type="button" variant="outline" onClick={resetFilters}>
              <RotateCcw className="h-4 w-4" />
              <span>Clear Filters</span>
            </Button>
          }
        />
      ) : viewMode === 'kanban' ? (
        <KanbanBoard
          applications={filtered}
          onStatusChange={onStatusChange}
          onSelectApplication={onSelectApplication}
        />
      ) : viewMode === 'list' ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
          {paginatedRows.map((app) => (
            <div
              key={app.id}
              className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
            >
              <button
                type="button"
                onClick={() => onSelectApplication(app)}
                className="text-left min-w-0 flex-1 cursor-pointer group"
              >
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {app.jobTitle}
                  </span>
                  <span className="text-xs text-slate-400">at</span>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {app.companyName}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                  <span className={`font-medium ${STATUS_META[app.status].toneClass}`}>
                    {app.status}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className={PRIORITY_META[app.priority].textClass}>
                    {app.priority} Priority
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{app.workMode}</span>
                  {app.location && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{app.location}</span>
                    </>
                  )}
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">
                    Updated {formatRelativeTime(app.updatedAt)}
                  </span>
                </div>
              </button>

              <div className="flex items-center gap-2 shrink-0">
                <Select
                  aria-label={`Status for ${app.jobTitle}`}
                  value={app.status}
                  onChange={(e) => onStatusChange(app, e.target.value as ApplicationStatus)}
                  className="h-9 text-xs w-[165px]"
                >
                  {APPLICATION_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Edit ${app.jobTitle}`}
                  onClick={() => onEditClick(app)}
                >
                  <Edit3 className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Delete ${app.jobTitle}`}
                  className="text-slate-500 hover:text-red-600 dark:hover:text-red-400"
                  onClick={() => setPendingDelete(app)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Table View */
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <th className="py-3 pl-5 pr-3 whitespace-nowrap">Company & Role</th>
                  <th className="py-3 px-3 whitespace-nowrap">Status</th>
                  <th className="py-3 px-3 whitespace-nowrap">Priority</th>
                  <th className="py-3 px-3 whitespace-nowrap">Work Mode</th>
                  <th className="py-3 px-3 whitespace-nowrap">Applied</th>
                  <th className="py-3 px-3 whitespace-nowrap">Follow-Up</th>
                  <th className="py-3 pl-3 pr-5 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                {paginatedRows.map((app) => {
                  const jobHref = ensureExternalHref(app.jobUrl);
                  return (
                    <tr
                      key={app.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 pl-5 pr-3 min-w-[240px]">
                        <button
                          type="button"
                          onClick={() => onSelectApplication(app)}
                          className="text-left group cursor-pointer block"
                        >
                          <span className="block font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {app.jobTitle}
                          </span>
                          <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {app.companyName}
                            {app.location ? ` · ${app.location}` : ''}
                            {app.salary ? ` · ${app.salary}` : ''}
                          </span>
                        </button>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <select
                          aria-label={`Change status for ${app.jobTitle}`}
                          value={app.status}
                          onChange={(e) =>
                            onStatusChange(app, e.target.value as ApplicationStatus)
                          }
                          className={`h-8 rounded-md border border-slate-200 dark:border-slate-800 bg-transparent px-2 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                            STATUS_META[app.status].toneClass
                          }`}
                        >
                          {APPLICATION_STATUSES.map((s) => (
                            <option key={s} value={s} className="text-slate-900 bg-white dark:bg-slate-900 dark:text-slate-100">
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`text-xs font-medium ${PRIORITY_META[app.priority].textClass}`}>
                          {app.priority}
                        </span>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap text-xs text-slate-600 dark:text-slate-300">
                        {app.workMode} · {app.employmentType}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap text-xs font-mono tabular-nums text-slate-600 dark:text-slate-300">
                        {app.appliedDate ? formatShortDate(app.appliedDate) : '—'}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap text-xs font-mono tabular-nums text-slate-600 dark:text-slate-300">
                        {app.nextFollowUpDate ? formatShortDate(app.nextFollowUpDate) : '—'}
                      </td>
                      <td className="py-3 pl-3 pr-5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          {jobHref && (
                            <a
                              href={jobHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`Open external posting for ${app.jobTitle}`}
                              className="h-8 w-8 inline-flex items-center justify-center rounded-md text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => onEditClick(app)}
                            aria-label={`Edit ${app.jobTitle}`}
                            className="h-8 w-8 inline-flex items-center justify-center rounded-md text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setPendingDelete(app)}
                            aria-label={`Delete ${app.jobTitle}`}
                            className="h-8 w-8 inline-flex items-center justify-center rounded-md text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Footer (Table & List views) */}
      {filtered.length > 0 && viewMode !== 'kanban' && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <Select
              aria-label="Rows per page"
              value={String(pageSize)}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="h-8 w-20 text-xs"
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
            </Select>
            <span className="font-mono tabular-nums">
              Showing {(safePage - 1) * pageSize + 1}–
              {Math.min(safePage * pageSize, filtered.length)} of {filtered.length}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Previous</span>
            </Button>
            <span className="px-2 font-mono tabular-nums">
              Page {safePage} / {totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              <span>Next</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Dialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        title="Delete job application"
        description="This action permanently deletes the application and its activity timeline."
        maxWidthClass="max-w-md"
      >
        {pendingDelete && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Delete{' '}
              <strong className="font-semibold text-slate-900 dark:text-white">
                {pendingDelete.jobTitle}
              </strong>{' '}
              at{' '}
              <strong className="font-semibold text-slate-900 dark:text-white">
                {pendingDelete.companyName}
              </strong>
              ?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPendingDelete(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={deleting}
                onClick={confirmDelete}
              >
                {deleting ? 'Deleting...' : 'Delete Application'}
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
