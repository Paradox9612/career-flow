import {
  differenceInCalendarDays,
  endOfWeek,
  format,
  isWithinInterval,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from 'date-fns';
import { toJsDate } from '@/src/lib/utils';
import {
  APPLICATION_STATUSES,
  type ApplicationStatus,
  type JobApplication,
} from '@/src/types/careerflow';

const PRE_SUBMIT_STATUSES = new Set<ApplicationStatus>(['Interested', 'Preparing']);
const INTERVIEW_STATUSES = new Set<ApplicationStatus>([
  'HR Interview',
  'Technical Interview',
  'Managerial Interview',
  'Final Interview',
]);
const OFFER_STATUSES = new Set<ApplicationStatus>([
  'Offer Received',
  'Offer Accepted',
  'Offer Rejected',
]);
const POSITIVE_OFFER_STATUSES = new Set<ApplicationStatus>([
  'Offer Received',
  'Offer Accepted',
]);
const REJECTED_STATUSES = new Set<ApplicationStatus>(['Rejected', 'Offer Rejected']);
const CLOSED_STATUSES = new Set<ApplicationStatus>([
  'Rejected',
  'Offer Rejected',
  'Withdrawn',
  'Offer Accepted',
]);

export function getApplicationActivityDate(app: JobApplication): Date {
  if (app.appliedDate) {
    const parsed = parseISO(app.appliedDate);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return toJsDate(app.createdAt) ?? new Date();
}

export interface DashboardKpis {
  total: number;
  applied: number;
  inProgress: number;
  interviews: number;
  offers: number;
  rejected: number;
  pendingFollowUps: number;
}

export function computeKpiCounts(applications: JobApplication[]): DashboardKpis {
  let applied = 0;
  let inProgress = 0;
  let interviews = 0;
  let offers = 0;
  let rejected = 0;
  let pendingFollowUps = 0;

  for (const app of applications) {
    if (app.status === 'Applied') applied += 1;
    if (app.status === 'Assessment' || INTERVIEW_STATUSES.has(app.status)) {
      inProgress += 1;
    }
    if (INTERVIEW_STATUSES.has(app.status)) interviews += 1;
    if (POSITIVE_OFFER_STATUSES.has(app.status)) offers += 1;
    if (REJECTED_STATUSES.has(app.status)) rejected += 1;
    if (app.nextFollowUpDate && !CLOSED_STATUSES.has(app.status)) {
      pendingFollowUps += 1;
    }
  }

  return {
    total: applications.length,
    applied,
    inProgress,
    interviews,
    offers,
    rejected,
    pendingFollowUps,
  };
}

export interface FunnelStageDatum {
  stage: string;
  count: number;
  currentInStage: number;
  conversionPct: number;
}

export function computeApplicationFunnel(applications: JobApplication[]): FunnelStageDatum[] {
  const total = applications.length;
  const countOf = (statuses: ApplicationStatus[]) =>
    applications.filter((a) => statuses.includes(a.status)).length;

  const interestedExact = countOf(['Interested']);
  const preparingExact = countOf(['Preparing']);
  const appliedExact = countOf(['Applied']);
  const assessmentExact = countOf(['Assessment']);
  const interviewExact = countOf([
    'HR Interview',
    'Technical Interview',
    'Managerial Interview',
    'Final Interview',
  ]);
  const offerExact = countOf(['Offer Received', 'Offer Accepted', 'Offer Rejected']);
  const acceptedExact = countOf(['Offer Accepted']);

  // Cumulative progression through pipeline stages
  const preparingReached = total - interestedExact;
  const appliedReached = applications.filter((a) => !PRE_SUBMIT_STATUSES.has(a.status)).length;
  const assessmentReached =
    assessmentExact + interviewExact + offerExact;
  const interviewReached = interviewExact + offerExact;
  const offerReached = offerExact;
  const acceptedReached = acceptedExact;

  const rows = [
    { stage: 'Interested', count: total, currentInStage: interestedExact },
    { stage: 'Preparing', count: preparingReached, currentInStage: preparingExact },
    { stage: 'Applied', count: appliedReached, currentInStage: appliedExact },
    { stage: 'Assessment', count: assessmentReached, currentInStage: assessmentExact },
    { stage: 'Interview', count: interviewReached, currentInStage: interviewExact },
    { stage: 'Offer', count: offerReached, currentInStage: offerExact },
    { stage: 'Accepted', count: acceptedReached, currentInStage: acceptedExact },
  ];

  return rows.map((row) => ({
    ...row,
    conversionPct: total > 0 ? Math.round((row.count / total) * 100) : 0,
  }));
}

export interface StatusDistributionDatum {
  status: ApplicationStatus;
  count: number;
  fill: string;
}

const STATUS_CHART_COLORS: Record<ApplicationStatus, string> = {
  Interested: '#64748b',
  Preparing: '#475569',
  Applied: '#2563eb',
  Assessment: '#d97706',
  'HR Interview': '#4f46e5',
  'Technical Interview': '#4338ca',
  'Managerial Interview': '#6366f1',
  'Final Interview': '#7c3aed',
  'Offer Received': '#16a34a',
  'Offer Accepted': '#15803d',
  'Offer Rejected': '#64748b',
  Rejected: '#dc2626',
  Withdrawn: '#94a3b8',
  'No Response': '#f59e0b',
};

export function computeStatusDistribution(
  applications: JobApplication[]
): StatusDistributionDatum[] {
  const counts = new Map<ApplicationStatus, number>();
  for (const app of applications) {
    counts.set(app.status, (counts.get(app.status) ?? 0) + 1);
  }

  return APPLICATION_STATUSES.filter((status) => (counts.get(status) ?? 0) > 0).map(
    (status) => ({
      status,
      count: counts.get(status) ?? 0,
      fill: STATUS_CHART_COLORS[status],
    })
  );
}

export interface TrendDatum {
  label: string;
  applications: number;
  submitted: number;
}

export interface TrendSummary {
  series: TrendDatum[];
  currentMonthCount: number;
  previousMonthCount: number;
  monthDelta: number;
}

export function computeApplicationTrend(
  applications: JobApplication[],
  granularity: 'weekly' | 'monthly'
): TrendSummary {
  const now = new Date();
  const currentMonthStart = startOfMonth(now);
  const prevMonthStart = startOfMonth(subMonths(now, 1));

  let currentMonthCount = 0;
  let previousMonthCount = 0;

  for (const app of applications) {
    const d = getApplicationActivityDate(app);
    const monthBucket = startOfMonth(d);
    if (monthBucket.getTime() === currentMonthStart.getTime()) {
      currentMonthCount += 1;
    } else if (monthBucket.getTime() === prevMonthStart.getTime()) {
      previousMonthCount += 1;
    }
  }

  const series: TrendDatum[] = [];

  if (granularity === 'weekly') {
    for (let i = 7; i >= 0; i -= 1) {
      const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      const inWeek = applications.filter((app) =>
        isWithinInterval(getApplicationActivityDate(app), { start: weekStart, end: weekEnd })
      );
      series.push({
        label: format(weekStart, 'MMM d'),
        applications: inWeek.length,
        submitted: inWeek.filter((a) => !PRE_SUBMIT_STATUSES.has(a.status)).length,
      });
    }
  } else {
    for (let i = 5; i >= 0; i -= 1) {
      const mStart = startOfMonth(subMonths(now, i));
      const mKey = format(mStart, 'yyyy-MM');
      const inMonth = applications.filter(
        (app) => format(getApplicationActivityDate(app), 'yyyy-MM') === mKey
      );
      series.push({
        label: format(mStart, 'MMM yyyy'),
        applications: inMonth.length,
        submitted: inMonth.filter((a) => !PRE_SUBMIT_STATUSES.has(a.status)).length,
      });
    }
  }

  return {
    series,
    currentMonthCount,
    previousMonthCount,
    monthDelta: currentMonthCount - previousMonthCount,
  };
}

export interface WeeklyGoalSummary {
  target: number;
  submitted: number;
  remaining: number;
  percentage: number;
}

export function computeWeeklyGoalProgress(
  applications: JobApplication[],
  targetGoal = 10
): WeeklyGoalSummary {
  const safeTarget = Math.max(1, targetGoal);
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const submitted = applications.filter((app) => {
    if (PRE_SUBMIT_STATUSES.has(app.status)) return false;
    const d = getApplicationActivityDate(app);
    return isWithinInterval(d, { start: weekStart, end: weekEnd });
  }).length;

  return {
    target: safeTarget,
    submitted,
    remaining: Math.max(0, safeTarget - submitted),
    percentage: Math.min(100, Math.round((submitted / safeTarget) * 100)),
  };
}

export interface UpcomingReminderItem {
  application: JobApplication;
  kind: 'followUp' | 'assessment';
  dueDate?: string;
  urgency: 'overdue' | 'today' | 'upcoming' | 'pending';
  daysOffset: number;
}

export function computeUpcomingReminders(
  applications: JobApplication[]
): UpcomingReminderItem[] {
  const today = startOfDay(new Date());
  const items: UpcomingReminderItem[] = [];

  for (const app of applications) {
    if (app.nextFollowUpDate && !CLOSED_STATUSES.has(app.status)) {
      const parsed = parseISO(app.nextFollowUpDate);
      if (!Number.isNaN(parsed.getTime())) {
        const diff = differenceInCalendarDays(startOfDay(parsed), today);
        items.push({
          application: app,
          kind: 'followUp',
          dueDate: app.nextFollowUpDate,
          urgency: diff < 0 ? 'overdue' : diff === 0 ? 'today' : 'upcoming',
          daysOffset: diff,
        });
      }
    } else if (app.status === 'Assessment') {
      items.push({
        application: app,
        kind: 'assessment',
        urgency: 'pending',
        daysOffset: 999,
      });
    }
  }

  items.sort((a, b) => a.daysOffset - b.daysOffset);
  return items;
}

export type AnalyticsDateRange = '7d' | '30d' | '90d' | '180d' | 'all' | 'custom';

export function filterApplicationsByDateRange(
  applications: JobApplication[],
  range: AnalyticsDateRange,
  customStart?: string,
  customEnd?: string
): JobApplication[] {
  if (range === 'all') return applications;

  const now = new Date();
  let start: Date | null = null;
  let end: Date = now;

  if (range === '7d') start = subDays(startOfDay(now), 7);
  if (range === '30d') start = subDays(startOfDay(now), 30);
  if (range === '90d') start = subDays(startOfDay(now), 90);
  if (range === '180d') start = subDays(startOfDay(now), 180);
  if (range === 'custom') {
    if (customStart) {
      const parsedStart = parseISO(customStart);
      if (!Number.isNaN(parsedStart.getTime())) start = startOfDay(parsedStart);
    }
    if (customEnd) {
      const parsedEnd = parseISO(customEnd);
      if (!Number.isNaN(parsedEnd.getTime())) {
        end = new Date(parsedEnd.getTime() + 86399999);
      }
    }
  }

  return applications.filter((app) => {
    const d = getApplicationActivityDate(app);
    if (start && d < start) return false;
    if (d > end) return false;
    return true;
  });
}

export interface SourcePerformanceDatum {
  source: string;
  total: number;
  interviews: number;
  offers: number;
  interviewRate: number;
}

export interface AnalyticsMetrics {
  total: number;
  submitted: number;
  interviewConversionRate: number;
  offerConversionRate: number;
  rejectionRate: number;
  responseRate: number;
  avgApplicationsPerWeek: number;
  sourcePerformance: SourcePerformanceDatum[];
  outcomesBreakdown: { name: string; value: number; fill: string }[];
}

export function computeAnalyticsMetrics(
  applications: JobApplication[]
): AnalyticsMetrics {
  const total = applications.length;
  const submittedApps = applications.filter((a) => !PRE_SUBMIT_STATUSES.has(a.status));
  const submitted = submittedApps.length;

  const reachedInterview = submittedApps.filter(
    (a) => INTERVIEW_STATUSES.has(a.status) || OFFER_STATUSES.has(a.status)
  ).length;
  const offers = submittedApps.filter((a) => OFFER_STATUSES.has(a.status)).length;
  const rejected = submittedApps.filter((a) => REJECTED_STATUSES.has(a.status)).length;
  const responded = submittedApps.filter(
    (a) => a.status !== 'Applied' && a.status !== 'No Response' && a.status !== 'Withdrawn'
  ).length;

  // Span in weeks for avg/week
  let avgApplicationsPerWeek = 0;
  if (total > 0) {
    const timestamps = applications.map((a) => getApplicationActivityDate(a).getTime());
    const minTs = Math.min(...timestamps);
    const weeksSpan = Math.max(1, differenceInCalendarDays(new Date(), new Date(minTs)) / 7);
    avgApplicationsPerWeek = Number((total / weeksSpan).toFixed(1));
  }

  const bySource = new Map<
    string,
    { total: number; interviews: number; offers: number }
  >();
  for (const app of applications) {
    const key = app.source?.trim() || 'Unspecified';
    const current = bySource.get(key) ?? { total: 0, interviews: 0, offers: 0 };
    current.total += 1;
    if (INTERVIEW_STATUSES.has(app.status) || OFFER_STATUSES.has(app.status)) {
      current.interviews += 1;
    }
    if (OFFER_STATUSES.has(app.status)) {
      current.offers += 1;
    }
    bySource.set(key, current);
  }

  const sourcePerformance: SourcePerformanceDatum[] = Array.from(bySource.entries())
    .map(([source, stats]) => ({
      source,
      total: stats.total,
      interviews: stats.interviews,
      offers: stats.offers,
      interviewRate: stats.total > 0 ? Math.round((stats.interviews / stats.total) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);

  const activeCount = applications.filter(
    (a) =>
      a.status === 'Applied' ||
      a.status === 'Assessment' ||
      INTERVIEW_STATUSES.has(a.status)
  ).length;
  const offerCount = applications.filter((a) => POSITIVE_OFFER_STATUSES.has(a.status)).length;
  const rejectedCount = applications.filter((a) => REJECTED_STATUSES.has(a.status)).length;
  const inactiveCount = applications.filter(
    (a) =>
      PRE_SUBMIT_STATUSES.has(a.status) ||
      a.status === 'Withdrawn' ||
      a.status === 'No Response'
  ).length;

  const outcomesBreakdown = [
    { name: 'Active / Interviewing', value: activeCount, fill: '#2563eb' },
    { name: 'Offers', value: offerCount, fill: '#16a34a' },
    { name: 'Rejected', value: rejectedCount, fill: '#dc2626' },
    { name: 'Draft / Inactive', value: inactiveCount, fill: '#94a3b8' },
  ].filter((item) => item.value > 0);

  return {
    total,
    submitted,
    interviewConversionRate: submitted > 0 ? Math.round((reachedInterview / submitted) * 100) : 0,
    offerConversionRate: submitted > 0 ? Math.round((offers / submitted) * 100) : 0,
    rejectionRate: submitted > 0 ? Math.round((rejected / submitted) * 100) : 0,
    responseRate: submitted > 0 ? Math.round((responded / submitted) * 100) : 0,
    avgApplicationsPerWeek,
    sourcePerformance,
    outcomesBreakdown,
  };
}
