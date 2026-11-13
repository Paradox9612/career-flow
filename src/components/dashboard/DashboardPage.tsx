import {
  ArrowRight,
  BarChart3,
  Briefcase,
  Calendar,
  CalendarClock,
  Check,
  CheckSquare,
  Clock,
  Edit2,
  Plus,
  Square,
  Target,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ApplicationQuickFilter } from '@/src/components/applications/ApplicationsWorkspace';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent, CardHeader } from '@/src/components/ui/card';
import { EmptyState } from '@/src/components/ui/empty-state';
import { Input } from '@/src/components/ui/input';
import {
  computeApplicationFunnel,
  computeApplicationTrend,
  computeKpiCounts,
  computeStatusDistribution,
  computeUpcomingReminders,
  computeWeeklyGoalProgress,
} from '@/src/lib/analytics';
import { formatDateTime, formatRelativeTime, formatShortDate, todayIsoDate, toJsDate } from '@/src/lib/utils';
import { subscribeToRecentActivityLogs } from '@/src/services/applicationService';
import { isTaskDueToday, isTaskOverdue } from '@/src/services/taskService';
import { updateUserProfile } from '@/src/services/userService';
import type { ActivityLog, Interview, JobApplication, TaskItem, TaskStatus, UserProfile } from '@/src/types/careerflow';

interface DashboardPageProps {
  userId: string;
  profile: UserProfile | null;
  applications: JobApplication[];
  interviews: Interview[];
  tasks: TaskItem[];
  loading: boolean;
  error: string | null;
  onNavigateFiltered: (filter: ApplicationQuickFilter) => void;
  onSelectApplication: (applicationId: string) => void;
  onSelectInterview: (interview: Interview) => void;
  onToggleTaskStatus: (task: TaskItem, nextStatus: TaskStatus) => Promise<void>;
  onOpenCreateApplication: () => void;
  onOpenAnalytics: () => void;
  onOpenCalendar: () => void;
  onOpenTasks: () => void;
}

export function DashboardPage({
  userId,
  profile,
  applications,
  interviews,
  tasks,
  loading,
  error,
  onNavigateFiltered,
  onSelectApplication,
  onSelectInterview,
  onToggleTaskStatus,
  onOpenCreateApplication,
  onOpenAnalytics,
  onOpenCalendar,
  onOpenTasks,
}: DashboardPageProps) {
  const [trendGranularity, setTrendGranularity] = useState<'weekly' | 'monthly'>('weekly');
  const [recentLogs, setRecentLogs] = useState<ActivityLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalDraft, setGoalDraft] = useState<string>(
    String(profile?.weeklyApplicationGoal ?? 10)
  );
  const [savingGoal, setSavingGoal] = useState(false);

  useEffect(() => {
    setGoalDraft(String(profile?.weeklyApplicationGoal ?? 10));
  }, [profile?.weeklyApplicationGoal]);

  useEffect(() => {
    setLogsLoading(true);
    const unsub = subscribeToRecentActivityLogs(
      userId,
      8,
      (logs) => {
        setRecentLogs(logs);
        setLogsLoading(false);
      },
      () => {
        setLogsLoading(false);
      }
    );
    return () => unsub();
  }, [userId]);

  const kpis = useMemo(() => computeKpiCounts(applications), [applications]);
  const funnelData = useMemo(() => computeApplicationFunnel(applications), [applications]);
  const statusData = useMemo(() => computeStatusDistribution(applications), [applications]);
  const trendSummary = useMemo(
    () => computeApplicationTrend(applications, trendGranularity),
    [applications, trendGranularity]
  );
  const weeklyGoal = useMemo(
    () => computeWeeklyGoalProgress(applications, profile?.weeklyApplicationGoal ?? 10),
    [applications, profile?.weeklyApplicationGoal]
  );
  const reminders = useMemo(
    () => computeUpcomingReminders(applications).slice(0, 5),
    [applications]
  );
  const upcomingInterviews = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    return interviews
      .filter((item) => {
        if (item.status !== 'Scheduled' && item.status !== 'Rescheduled') return false;
        const dt = toJsDate(item.scheduledAt);
        return !dt || dt.getTime() >= startOfToday.getTime();
      })
      .slice(0, 4);
  }, [interviews]);
  const activeTasks = useMemo(
    () => tasks.filter((t) => t.status !== 'Completed').slice(0, 5),
    [tasks]
  );

  const handleSaveGoal = async () => {
    const parsed = Math.min(100, Math.max(1, Math.round(Number(goalDraft) || 10)));
    setSavingGoal(true);
    try {
      await updateUserProfile(userId, { weeklyApplicationGoal: parsed });
      setEditingGoal(false);
    } finally {
      setSavingGoal(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-3">
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <div
              key={n}
              className="h-24 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 animate-pulse"
            />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 h-80 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 animate-pulse" />
          <div className="lg:col-span-5 h-80 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 animate-pulse" />
        </div>
      </div>
    );
  }

  const kpiCards: {
    label: string;
    value: number;
    filter: ApplicationQuickFilter;
    tone?: string;
  }[] = [
    { label: 'Total Applications', value: kpis.total, filter: 'ALL' },
    { label: 'Applied', value: kpis.applied, filter: 'APPLIED', tone: 'text-blue-600 dark:text-blue-400' },
    { label: 'In Progress', value: kpis.inProgress, filter: 'ACTIVE', tone: 'text-amber-600 dark:text-amber-400' },
    { label: 'Interviews', value: kpis.interviews, filter: 'INTERVIEWS', tone: 'text-indigo-600 dark:text-indigo-400' },
    { label: 'Offers Received', value: kpis.offers, filter: 'OFFERS', tone: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Rejected', value: kpis.rejected, filter: 'REJECTED', tone: 'text-red-600 dark:text-red-400' },
    { label: 'Pending Follow-ups', value: kpis.pendingFollowUps, filter: 'FOLLOWUPS' },
  ];

  const appById = new Map(applications.map((a) => [a.id, a]));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">
            Dashboard
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Live overview of your job search pipeline, weekly pacing, and follow-up schedule.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onOpenAnalytics}>
            <BarChart3 className="h-4 w-4" />
            <span>Full Analytics</span>
          </Button>
          <Button type="button" size="sm" onClick={onOpenCreateApplication}>
            <Plus className="h-4 w-4" />
            <span>New Application</span>
          </Button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-300"
        >
          {error}
        </div>
      )}

      {/* 7 KPI Cards — Clickable to navigate straight to filtered application lists */}
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-3">
        {kpiCards.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => onNavigateFiltered(item.filter)}
            className="text-left rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3.5 hover:border-blue-500 dark:hover:border-blue-500 transition-colors cursor-pointer group"
          >
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
              {item.label}
            </p>
            <div className="mt-2 flex items-baseline justify-between gap-2">
              <span
                className={`font-display text-2xl font-bold font-mono tabular-nums ${
                  item.tone ?? 'text-slate-900 dark:text-white'
                }`}
              >
                {item.value}
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors shrink-0" />
            </div>
          </button>
        ))}
      </div>

      {applications.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="Welcome to your CareerFlow workspace"
          description="Your dashboard metrics, conversion funnel, trend charts, and weekly goal progress populate automatically from your real Firestore applications. Add your first role to get started."
          action={
            <Button type="button" onClick={onOpenCreateApplication}>
              <Plus className="h-4 w-4" />
              <span>Add First Application</span>
            </Button>
          }
        />
      ) : (
        <>
          {/* Row 1: Weekly Goal + Application Trend */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            <Card className="lg:col-span-4 flex flex-col justify-between">
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-semibold">Weekly Application Goal</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Monday–Sunday submission pacing
                  </p>
                </div>
                {!editingGoal && (
                  <button
                    type="button"
                    onClick={() => setEditingGoal(true)}
                    aria-label="Edit weekly target"
                    className="h-8 px-2.5 inline-flex items-center gap-1.5 rounded-md text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    <span>Edit target</span>
                  </button>
                )}
              </CardHeader>
              <CardContent className="space-y-5 flex-1 flex flex-col justify-between">
                {editingGoal ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={goalDraft}
                      onChange={(e) => setGoalDraft(e.target.value)}
                      className="w-24 font-mono tabular-nums"
                      aria-label="Weekly application target"
                    />
                    <Button
                      type="button"
                      size="sm"
                      disabled={savingGoal}
                      onClick={handleSaveGoal}
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>{savingGoal ? 'Saving' : 'Save'}</span>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setGoalDraft(String(weeklyGoal.target));
                        setEditingGoal(false);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-display text-3xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                        {weeklyGoal.submitted}
                      </span>
                      <span className="text-sm text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                        / {weeklyGoal.target} target
                      </span>
                    </div>
                    <span className="text-sm font-semibold font-mono tabular-nums text-blue-600 dark:text-blue-400">
                      {weeklyGoal.percentage}%
                    </span>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        weeklyGoal.percentage >= 100
                          ? 'bg-emerald-600'
                          : 'bg-blue-600'
                      }`}
                      style={{ width: `${weeklyGoal.percentage}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1.5">
                      <Target className="h-3.5 w-3.5" />
                      <span>
                        {weeklyGoal.remaining === 0
                          ? 'Weekly target reached'
                          : `${weeklyGoal.remaining} remaining this week`}
                      </span>
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="text-slate-500 dark:text-slate-400">This Month</p>
                    <p className="mt-1 text-lg font-semibold font-mono tabular-nums text-slate-900 dark:text-white">
                      {trendSummary.currentMonthCount}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500 dark:text-slate-400">Previous Month</p>
                    <p className="mt-1 text-lg font-semibold font-mono tabular-nums text-slate-900 dark:text-white">
                      {trendSummary.previousMonthCount}
                      <span
                        className={`ml-2 text-xs ${
                          trendSummary.monthDelta >= 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {trendSummary.monthDelta >= 0
                          ? `+${trendSummary.monthDelta}`
                          : trendSummary.monthDelta}
                      </span>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-8">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold">Application Trend</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Tracked vs submitted applications over time
                  </p>
                </div>
                <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg w-fit">
                  {(
                    [
                      { id: 'weekly', label: 'Weekly (8w)' },
                      { id: 'monthly', label: 'Monthly (6m)' },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setTrendGranularity(opt.id)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        trendGranularity === opt.id
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[240px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={trendSummary.series}
                      margin={{ top: 8, right: 12, left: -16, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="cfTrendFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.22} />
                          <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.4} />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          fontSize: '12px',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="applications"
                        name="Total Added"
                        stroke="#94a3b8"
                        strokeWidth={1.5}
                        fill="transparent"
                      />
                      <Area
                        type="monotone"
                        dataKey="submitted"
                        name="Submitted"
                        stroke="#2563eb"
                        strokeWidth={2}
                        fill="url(#cfTrendFill)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Row 2: Application Funnel + Status Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            <Card className="lg:col-span-6">
              <CardHeader>
                <h2 className="text-base font-semibold">Application Funnel</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Pipeline progression from initial interest through offer acceptance
                </p>
              </CardHeader>
              <CardContent>
                <div className="h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={funnelData}
                      layout="vertical"
                      margin={{ top: 4, right: 24, left: 16, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.35} horizontal={false} />
                      <XAxis
                        type="number"
                        allowDecimals={false}
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="stage"
                        width={84}
                        tick={{ fontSize: 12, fill: '#64748b' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        formatter={(value, _name, item) => [
                          `${value} (${item.payload.conversionPct}% of total · ${item.payload.currentInStage} currently here)`,
                          'Reached Stage',
                        ]}
                        contentStyle={{
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          fontSize: '12px',
                        }}
                      />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]} fill="#2563eb" barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-6">
              <CardHeader>
                <h2 className="text-base font-semibold">Status Distribution</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Current breakdown across active and closed application stages
                </p>
              </CardHeader>
              <CardContent>
                <div className="h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={statusData}
                      layout="vertical"
                      margin={{ top: 4, right: 24, left: 24, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.35} horizontal={false} />
                      <XAxis
                        type="number"
                        allowDecimals={false}
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="status"
                        width={126}
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        formatter={(value) => [`${value} applications`, 'Count']}
                        contentStyle={{
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          fontSize: '12px',
                        }}
                      />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={18}>
                        {statusData.map((entry) => (
                          <Cell key={entry.status} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Row 3: Upcoming Reminders + Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <Card className="lg:col-span-6">
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-semibold">Upcoming Interviews, Tasks & Follow-ups</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Scheduled interviews, active task reminders, and recruiter follow-ups
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={onOpenTasks}
                    className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    Tasks
                  </button>
                  <button
                    type="button"
                    onClick={onOpenCalendar}
                    className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    Calendar
                  </button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {upcomingInterviews.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Upcoming Interviews
                    </p>
                    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                      {upcomingInterviews.map((round) => {
                        const linkedApp = appById.get(round.applicationId);
                        return (
                          <li key={round.id} className="py-2.5 first:pt-0 last:pb-0">
                            <button
                              type="button"
                              onClick={() => onSelectInterview(round)}
                              className="w-full flex items-center justify-between gap-3 text-left group cursor-pointer"
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
                                  {round.roundName}
                                  {linkedApp ? ` — ${linkedApp.companyName}` : ''}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
                                  <CalendarClock className="h-3 w-3 text-blue-600 dark:text-blue-400 shrink-0" />
                                  <span>{round.interviewType}</span>
                                  <span aria-hidden="true">·</span>
                                  <span>{round.status}</span>
                                </p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-xs font-mono tabular-nums text-blue-600 dark:text-blue-400 font-medium">
                                  {formatDateTime(round.scheduledAt)}
                                </p>
                              </div>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {activeTasks.length > 0 && (
                  <div className="space-y-2">
                    {upcomingInterviews.length > 0 && (
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                        Active Tasks & Reminders
                      </p>
                    )}
                    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                      {activeTasks.map((task) => {
                        const linkedApp = task.applicationId
                          ? appById.get(task.applicationId)
                          : undefined;
                        const todayIso = todayIsoDate();
                        const overdue = isTaskOverdue(task, todayIso);
                        const dueToday = isTaskDueToday(task, todayIso);
                        return (
                          <li
                            key={task.id}
                            className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3"
                          >
                            <div className="flex items-start gap-2.5 min-w-0">
                              <button
                                type="button"
                                onClick={() => void onToggleTaskStatus(task, 'Completed')}
                                aria-label={`Complete task ${task.title}`}
                                className="mt-0.5 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer shrink-0"
                              >
                                <Square className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  linkedApp ? onSelectApplication(linkedApp.id) : onOpenTasks()
                                }
                                className="text-left min-w-0 group cursor-pointer"
                              >
                                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
                                  {task.title}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                                  {task.category}
                                  {linkedApp ? ` · ${linkedApp.companyName}` : ''}
                                </p>
                              </button>
                            </div>

                            {task.dueDate && (
                              <div className="text-right shrink-0">
                                <p
                                  className={`text-xs font-medium ${
                                    overdue
                                      ? 'text-red-600 dark:text-red-400'
                                      : dueToday
                                      ? 'text-amber-600 dark:text-amber-400'
                                      : 'text-slate-600 dark:text-slate-300'
                                  }`}
                                >
                                  {overdue ? 'Overdue' : dueToday ? 'Due Today' : 'Due'}
                                </p>
                                <p className="text-xs font-mono tabular-nums text-slate-400">
                                  {formatShortDate(task.dueDate)}
                                </p>
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {reminders.length > 0 && (
                  <div className="space-y-2">
                    {(upcomingInterviews.length > 0 || activeTasks.length > 0) && (
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                        Application Follow-ups & Assessments
                      </p>
                    )}
                    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                      {reminders.map((item) => (
                        <li key={`${item.application.id}-${item.kind}`} className="py-2.5 first:pt-0 last:pb-0">
                          <button
                            type="button"
                            onClick={() => onSelectApplication(item.application.id)}
                            className="w-full flex items-center justify-between gap-3 text-left group cursor-pointer"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
                                {item.application.jobTitle} — {item.application.companyName}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                                <span>
                                  {item.kind === 'followUp'
                                    ? 'Recruiter follow-up'
                                    : 'Pending assessment'}
                                </span>
                                <span aria-hidden="true">·</span>
                                <span>{item.application.status}</span>
                              </p>
                            </div>

                            <div className="text-right shrink-0">
                              {item.dueDate ? (
                                <>
                                  <p
                                    className={`text-xs font-medium ${
                                      item.urgency === 'overdue'
                                        ? 'text-red-600 dark:text-red-400'
                                        : item.urgency === 'today'
                                        ? 'text-amber-600 dark:text-amber-400'
                                        : 'text-slate-600 dark:text-slate-300'
                                    }`}
                                  >
                                    {item.urgency === 'overdue'
                                      ? 'Overdue'
                                      : item.urgency === 'today'
                                      ? 'Due Today'
                                      : 'Upcoming'}
                                  </p>
                                  <p className="text-xs font-mono tabular-nums text-slate-400 inline-flex items-center gap-1 mt-0.5">
                                    <Calendar className="h-3 w-3" />
                                    <span>{formatShortDate(item.dueDate)}</span>
                                  </p>
                                </>
                              ) : (
                                <span className="text-xs font-medium text-amber-600 dark:text-amber-400 inline-flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  <span>In progress</span>
                                </span>
                              )}
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {upcomingInterviews.length === 0 && activeTasks.length === 0 && reminders.length === 0 && (
                  <p className="text-sm text-slate-400 py-4">
                    No upcoming interviews, tasks, or follow-up dates right now. Schedule an interview or add a task to see reminders here.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-6">
              <CardHeader>
                <h2 className="text-base font-semibold">Recent Activity</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Latest updates across your applications
                </p>
              </CardHeader>
              <CardContent>
                {logsLoading ? (
                  <div className="space-y-3">
                    <div className="h-10 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
                    <div className="h-10 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
                  </div>
                ) : recentLogs.length === 0 ? (
                  <p className="text-sm text-slate-400 py-4">
                    Activity events will appear here as you create and update applications.
                  </p>
                ) : (
                  <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                    {recentLogs.map((log) => {
                      const appExists = appById.has(log.applicationId);
                      return (
                        <li key={log.id} className="py-3 first:pt-0 last:pb-0">
                          <button
                            type="button"
                            disabled={!appExists}
                            onClick={() => {
                              if (appExists) onSelectApplication(log.applicationId);
                            }}
                            className={`w-full text-left flex items-start justify-between gap-3 ${
                              appExists ? 'cursor-pointer group' : 'cursor-default opacity-80'
                            }`}
                          >
                            <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {log.description}
                            </p>
                            <span className="text-[11px] font-mono tabular-nums text-slate-400 whitespace-nowrap shrink-0">
                              {formatRelativeTime(log.createdAt)}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
