import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import {
  Briefcase,
  Calendar as CalendarIcon,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Plus,
  Video,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent, CardHeader } from '@/src/components/ui/card';
import { ensureExternalHref, toJsDate } from '@/src/lib/utils';
import type { Interview, JobApplication, TaskItem } from '@/src/types/careerflow';

interface CalendarPageProps {
  interviews: Interview[];
  applications: JobApplication[];
  tasks: TaskItem[];
  onSelectInterview: (interview: Interview) => void;
  onSelectApplication: (applicationId: string) => void;
  onScheduleInterviewOnDate: (isoDate: string) => void;
  onScheduleTaskOnDate: (isoDate: string) => void;
  onOpenTasks: () => void;
  onOpenCreateApplication: () => void;
}

type CalendarEventKind = 'interview' | 'followUp' | 'task' | 'applied';

interface CalendarEventItem {
  id: string;
  kind: CalendarEventKind;
  dateKey: string;
  timeLabel?: string;
  title: string;
  subtitle: string;
  interview?: Interview;
  application?: JobApplication;
  task?: TaskItem;
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function CalendarPage({
  interviews,
  applications,
  tasks,
  onSelectInterview,
  onSelectApplication,
  onScheduleInterviewOnDate,
  onScheduleTaskOnDate,
  onOpenTasks,
  onOpenCreateApplication,
}: CalendarPageProps) {
  const [currentMonth, setCurrentMonth] = useState<Date>(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [showInterviews, setShowInterviews] = useState(true);
  const [showFollowUps, setShowFollowUps] = useState(true);
  const [showTasks, setShowTasks] = useState(true);
  const [showApplied, setShowApplied] = useState(true);

  const appById = useMemo(
    () => new Map(applications.map((a) => [a.id, a])),
    [applications]
  );

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEventItem[]>();
    const pushEvent = (evt: CalendarEventItem) => {
      const existing = map.get(evt.dateKey) ?? [];
      existing.push(evt);
      map.set(evt.dateKey, existing);
    };

    if (showInterviews) {
      for (const interview of interviews) {
        const dt = toJsDate(interview.scheduledAt);
        if (!dt) continue;
        const app = appById.get(interview.applicationId);
        pushEvent({
          id: `int-${interview.id}`,
          kind: 'interview',
          dateKey: format(dt, 'yyyy-MM-dd'),
          timeLabel: format(dt, 'HH:mm'),
          title: interview.roundName,
          subtitle: app
            ? `${app.companyName} · ${interview.interviewType}`
            : interview.interviewType,
          interview,
          application: app,
        });
      }
    }

    if (showFollowUps) {
      for (const app of applications) {
        if (!app.nextFollowUpDate) continue;
        const dt = toJsDate(app.nextFollowUpDate);
        if (!dt) continue;
        pushEvent({
          id: `fu-${app.id}`,
          kind: 'followUp',
          dateKey: format(dt, 'yyyy-MM-dd'),
          title: `Follow-up: ${app.companyName}`,
          subtitle: app.jobTitle,
          application: app,
        });
      }
    }

    if (showTasks) {
      for (const task of tasks) {
        if (!task.dueDate || task.status === 'Completed') continue;
        const dt = toJsDate(task.dueDate);
        if (!dt) continue;
        const app = task.applicationId ? appById.get(task.applicationId) : undefined;
        pushEvent({
          id: `tsk-${task.id}`,
          kind: 'task',
          dateKey: format(dt, 'yyyy-MM-dd'),
          title: task.title,
          subtitle: app ? `${task.category} · ${app.companyName}` : task.category,
          application: app,
          task,
        });
      }
    }

    if (showApplied) {
      for (const app of applications) {
        if (!app.appliedDate) continue;
        const dt = toJsDate(app.appliedDate);
        if (!dt) continue;
        pushEvent({
          id: `app-${app.id}`,
          kind: 'applied',
          dateKey: format(dt, 'yyyy-MM-dd'),
          title: `Applied: ${app.companyName}`,
          subtitle: app.jobTitle,
          application: app,
        });
      }
    }

    for (const [key, list] of map.entries()) {
      list.sort((a, b) => {
        const order = { interview: 0, task: 1, followUp: 2, applied: 3 };
        if (order[a.kind] !== order[b.kind]) return order[a.kind] - order[b.kind];
        return (a.timeLabel ?? '').localeCompare(b.timeLabel ?? '');
      });
      map.set(key, list);
    }

    return map;
  }, [
    interviews,
    applications,
    tasks,
    appById,
    showInterviews,
    showFollowUps,
    showTasks,
    showApplied,
  ]);

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const selectedDateKey = format(selectedDate, 'yyyy-MM-dd');
  const selectedEvents = eventsByDay.get(selectedDateKey) ?? [];

  const monthStats = useMemo(() => {
    const monthPrefix = format(currentMonth, 'yyyy-MM');
    let interviewCount = 0;
    let followUpCount = 0;
    for (const [key, items] of eventsByDay.entries()) {
      if (!key.startsWith(monthPrefix)) continue;
      for (const item of items) {
        if (item.kind === 'interview') interviewCount += 1;
        if (item.kind === 'followUp') followUpCount += 1;
      }
    }
    return { interviewCount, followUpCount };
  }, [eventsByDay, currentMonth]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Calendar</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Monthly view of scheduled interviews, follow-up dates, and submitted applications.
          </p>
        </div>

        <Button
          type="button"
          size="sm"
          onClick={() =>
            applications.length > 0
              ? onScheduleInterviewOnDate(selectedDateKey)
              : onOpenCreateApplication()
          }
        >
          <Plus className="h-4 w-4" />
          <span>
            {applications.length > 0 ? 'Schedule Interview' : 'Add Application First'}
          </span>
        </Button>
      </div>

      {/* Month Toolbar & Layer Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label="Previous month"
            onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="font-display text-lg font-semibold min-w-[160px] text-center">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label="Next month"
            onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              const now = new Date();
              setCurrentMonth(startOfMonth(now));
              setSelectedDate(now);
            }}
          >
            Today
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showInterviews}
              onChange={(e) => setShowInterviews(e.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="h-2 w-2 rounded-full bg-blue-600 inline-block" />
            <span>Interviews</span>
          </label>
          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showFollowUps}
              onChange={(e) => setShowFollowUps(e.target.checked)}
              className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
            />
            <span className="h-2 w-2 rounded-full bg-amber-500 inline-block" />
            <span>Follow-ups</span>
          </label>
          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showTasks}
              onChange={(e) => setShowTasks(e.target.checked)}
              className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
            />
            <span className="h-2 w-2 rounded-full bg-violet-600 inline-block" />
            <span>Tasks</span>
          </label>
          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showApplied}
              onChange={(e) => setShowApplied(e.target.checked)}
              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="h-2 w-2 rounded-full bg-emerald-600 inline-block" />
            <span>Applied Dates</span>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Monthly Grid */}
        <Card className="lg:col-span-8 overflow-hidden">
          <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 divide-x divide-y divide-slate-200 dark:divide-slate-800">
            {calendarDays.map((day) => {
              const key = format(day, 'yyyy-MM-dd');
              const items = eventsByDay.get(key) ?? [];
              const inCurrentMonth = isSameMonth(day, currentMonth);
              const isSelected = isSameDay(day, selectedDate);
              const today = isToday(day);

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedDate(day)}
                  className={`min-h-[86px] sm:min-h-[104px] p-1.5 sm:p-2 text-left flex flex-col justify-between transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50/70 dark:bg-blue-950/30 ring-1 ring-inset ring-blue-500'
                      : inCurrentMonth
                      ? 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      : 'bg-slate-50/60 dark:bg-slate-950/60 text-slate-400 dark:text-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`text-xs font-mono tabular-nums h-6 w-6 inline-flex items-center justify-center rounded-full ${
                        today
                          ? 'bg-blue-600 text-white font-semibold'
                          : inCurrentMonth
                          ? 'text-slate-800 dark:text-slate-200 font-medium'
                          : 'text-slate-400 dark:text-slate-600'
                      }`}
                    >
                      {format(day, 'd')}
                    </span>
                    {items.length > 0 && (
                      <span className="text-[10px] font-mono tabular-nums text-slate-400 sm:hidden">
                        {items.length}
                      </span>
                    )}
                  </div>

                  {/* Mobile dot indicators */}
                  <div className="flex sm:hidden flex-wrap gap-1 mt-1">
                    {items.slice(0, 4).map((evt) => (
                      <span
                        key={evt.id}
                        className={`h-1.5 w-1.5 rounded-full ${
                          evt.kind === 'interview'
                            ? 'bg-blue-600'
                            : evt.kind === 'task'
                            ? 'bg-violet-600'
                            : evt.kind === 'followUp'
                            ? 'bg-amber-500'
                            : 'bg-emerald-600'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Desktop compact event rows */}
                  <div className="hidden sm:flex flex-col gap-1 w-full mt-1">
                    {items.slice(0, 2).map((evt) => (
                      <div
                        key={evt.id}
                        className={`truncate rounded px-1.5 py-0.5 text-[11px] font-medium ${
                          evt.kind === 'interview'
                            ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                            : evt.kind === 'task'
                            ? 'bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300'
                            : evt.kind === 'followUp'
                            ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300'
                            : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                        }`}
                      >
                        {evt.timeLabel ? `${evt.timeLabel} ` : ''}
                        {evt.title}
                      </div>
                    ))}
                    {items.length > 2 && (
                      <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 px-1">
                        +{items.length - 2} more
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Selected Day Agenda */}
        <Card className="lg:col-span-4">
          <CardHeader className="flex flex-row items-start justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold">
                {format(selectedDate, 'EEEE, MMM d')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono tabular-nums">
                {monthStats.interviewCount} interviews · {monthStats.followUpCount} follow-ups this month
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onScheduleTaskOnDate(selectedDateKey)}
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Task</span>
              </Button>
              {applications.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onScheduleInterviewOnDate(selectedDateKey)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Interview</span>
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {selectedEvents.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <CalendarIcon className="h-7 w-7 text-slate-300 dark:text-slate-700 mx-auto" />
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  No events on this day
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Select another highlighted day or schedule a task or interview for{' '}
                  <span className="font-mono">{selectedDateKey}</span>.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {selectedEvents.map((evt) => {
                  const meetingHref =
                    evt.kind === 'interview'
                      ? ensureExternalHref(evt.interview?.meetingUrl)
                      : null;

                  return (
                    <li key={evt.id} className="py-3 first:pt-0 last:pb-0 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (evt.kind === 'interview' && evt.interview) {
                              onSelectInterview(evt.interview);
                            } else if (evt.application) {
                              onSelectApplication(evt.application.id);
                            } else if (evt.kind === 'task') {
                              onOpenTasks();
                            }
                          }}
                          className="text-left group min-w-0 cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={`h-2 w-2 rounded-full shrink-0 ${
                                evt.kind === 'interview'
                                  ? 'bg-blue-600'
                                  : evt.kind === 'task'
                                  ? 'bg-violet-600'
                                  : evt.kind === 'followUp'
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-600'
                              }`}
                            />
                            <p className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
                              {evt.title}
                            </p>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 pl-4">
                            {evt.subtitle}
                          </p>
                        </button>

                        {evt.timeLabel && (
                          <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400 shrink-0 inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{evt.timeLabel}</span>
                          </span>
                        )}
                      </div>

                      {evt.kind === 'interview' && evt.interview && (
                        <div className="pl-4 flex flex-wrap items-center gap-3 text-xs">
                          <span className="text-slate-500 dark:text-slate-400">
                            {evt.interview.status} · {evt.interview.durationMinutes ?? 45} min
                          </span>
                          {meetingHref && (
                            <a
                              href={meetingHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline font-medium"
                            >
                              <Video className="h-3 w-3" />
                              <span>Join Meeting</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      )}

                      {evt.kind === 'task' && evt.task && (
                        <div className="pl-4 text-xs text-slate-500 dark:text-slate-400 inline-flex items-center gap-1.5">
                          <CheckSquare className="h-3 w-3" />
                          <span>
                            {evt.task.status} · {evt.task.priority} priority
                          </span>
                        </div>
                      )}

                      {(evt.kind === 'followUp' || evt.kind === 'applied') && evt.application && (
                        <div className="pl-4 text-xs text-slate-500 dark:text-slate-400 inline-flex items-center gap-1.5">
                          <Briefcase className="h-3 w-3" />
                          <span>Status: {evt.application.status}</span>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
