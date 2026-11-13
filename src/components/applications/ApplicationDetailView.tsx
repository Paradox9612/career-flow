import {
  ArrowLeft,
  Building2,
  Calendar,
  CalendarClock,
  CheckSquare,
  Clock,
  Download,
  Edit3,
  ExternalLink,
  FileText,
  Globe,
  Linkedin,
  Mail,
  MapPin,
  Plus,
  Sparkles,
  Square,
  Trash2,
  User,
  UserCheck,
  Video,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent, CardHeader } from '@/src/components/ui/card';
import { Dialog } from '@/src/components/ui/dialog';
import { Select } from '@/src/components/ui/select';
import {
  ensureExternalHref,
  formatDateTime,
  formatRelativeTime,
  formatShortDate,
} from '@/src/lib/utils';
import { getLocalFile, triggerBlobDownload } from '@/src/lib/localFileStore';
import {
  subscribeToActivityLogs,
  updateApplicationPriority,
  updateApplicationStatus,
} from '@/src/services/applicationService';
import { findMatchingDocumentForApplication } from '@/src/services/documentService';
import { isTaskOverdue } from '@/src/services/taskService';
import {
  APPLICATION_STATUSES,
  INTERVIEW_RESULT_META,
  INTERVIEW_STATUS_META,
  PRIORITIES,
  PRIORITY_META,
  STATUS_META,
  type ActivityLog,
  type ApplicationStatus,
  type DocumentRecord,
  type Interview,
  type JobApplication,
  type Priority,
  type TaskItem,
  type TaskStatus,
} from '@/src/types/careerflow';

interface ApplicationDetailViewProps {
  userId: string;
  application: JobApplication;
  interviews: Interview[];
  tasks: TaskItem[];
  documents?: DocumentRecord[];
  onBack: () => void;
  onEdit: (app: JobApplication) => void;
  onDelete: (app: JobApplication) => Promise<void>;
  onScheduleInterview: (applicationId: string) => void;
  onSelectInterview: (interview: Interview) => void;
  onAddTask: (applicationId: string) => void;
  onEditTask: (task: TaskItem) => void;
  onToggleTaskStatus: (task: TaskItem, nextStatus: TaskStatus) => Promise<void>;
  onOpenFollowUpTemplates: (applicationId: string) => void;
  onOpenDocuments?: () => void;
  onOpenAiAssistant?: (applicationId: string) => void;
}

export function ApplicationDetailView({
  userId,
  application,
  interviews,
  tasks,
  documents = [],
  onBack,
  onEdit,
  onDelete,
  onScheduleInterview,
  onSelectInterview,
  onAddTask,
  onEditTask,
  onToggleTaskStatus,
  onOpenFollowUpTemplates,
  onOpenDocuments,
  onOpenAiAssistant,
}: ApplicationDetailViewProps) {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'interviews' | 'tasks' | 'description' | 'cover' | 'recruiter'
  >('overview');
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logsError, setLogsError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [updatingPriority, setUpdatingPriority] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    setLogsLoading(true);
    setLogsError(null);
    const unsub = subscribeToActivityLogs(
      userId,
      application.id,
      (items) => {
        setLogs(items);
        setLogsLoading(false);
      },
      (err) => {
        setLogsError(err.message);
        setLogsLoading(false);
      }
    );
    return () => unsub();
  }, [userId, application.id]);

  const handleStatusChange = async (nextStatus: ApplicationStatus) => {
    setUpdatingStatus(true);
    setActionError(null);
    try {
      await updateApplicationStatus(userId, application, nextStatus);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to update status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handlePriorityChange = async (nextPriority: Priority) => {
    setUpdatingPriority(true);
    setActionError(null);
    try {
      await updateApplicationPriority(application, nextPriority);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to update priority.');
    } finally {
      setUpdatingPriority(false);
    }
  };

  const handleConfirmDelete = async () => {
    setDeleting(true);
    setActionError(null);
    try {
      await onDelete(application);
      setDeleteDialogOpen(false);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to delete application.');
      setDeleting(false);
    }
  };

  const matchedDocument = findMatchingDocumentForApplication(documents, application);

  const handleDownloadMatchedResume = async () => {
    if (!matchedDocument?.localStorageReference) return;
    const stored = await getLocalFile(matchedDocument.localStorageReference);
    if (!stored) {
      setActionError(
        'This resume file is stored on another browser or device. Open Resumes & Documents to re-attach it locally.'
      );
      return;
    }
    triggerBlobDownload(stored.blob, matchedDocument.fileName || stored.fileName);
  };

  const jobHref = ensureExternalHref(application.jobUrl);
  const websiteHref = ensureExternalHref(application.companyWebsite);
  const linkedinHref = ensureExternalHref(application.recruiterLinkedinUrl);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to applications</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {onOpenAiAssistant && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenAiAssistant(application.id)}
            >
              <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span>AI Assistant</span>
            </Button>
          )}
          <Button type="button" variant="outline" size="sm" onClick={() => onEdit(application)}>
            <Edit3 className="h-4 w-4" />
            <span>Edit</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
            <span>Delete</span>
          </Button>
        </div>
      </div>

      {actionError && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-300"
        >
          {actionError}
        </div>
      )}

      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5 sm:gap-6">
            <div className="space-y-2.5">
              <div className="flex items-center gap-3">
                {application.companyLogo ? (
                  <img
                    src={application.companyLogo}
                    alt={application.companyName}
                    referrerPolicy="no-referrer"
                    className="h-11 w-11 rounded-lg object-contain border border-slate-200 dark:border-slate-800 bg-white p-1 shrink-0"
                  />
                ) : (
                  <div className="h-11 w-11 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center font-display font-bold text-base shrink-0">
                    {application.companyName.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {application.companyName}
                    </span>
                    {application.industry && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{application.industry}</span>
                      </>
                    )}
                    {application.location && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{application.location}</span>
                      </>
                    )}
                  </div>
                  <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-0.5 break-words">
                    {application.jobTitle}
                  </h1>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400 pt-1">
                <span>{application.workMode}</span>
                <span aria-hidden="true">·</span>
                <span>{application.employmentType}</span>
                {application.salary && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums text-slate-700 dark:text-slate-300">
                      {application.salary}
                    </span>
                  </>
                )}
                {application.source && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>Source: {application.source}</span>
                  </>
                )}
                {jobHref && (
                  <>
                    <span aria-hidden="true">·</span>
                    <a
                      href={jobHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      <span>Job posting</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </>
                )}
                {websiteHref && (
                  <>
                    <span aria-hidden="true">·</span>
                    <a
                      href={websiteHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      <span>Company site</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:items-center gap-3 shrink-0">
              <div className="sm:min-w-[170px]">
                <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Application Status
                </span>
                <Select
                  aria-label="Application status"
                  value={application.status}
                  disabled={updatingStatus}
                  onChange={(e) => handleStatusChange(e.target.value as ApplicationStatus)}
                  className={STATUS_META[application.status].toneClass}
                >
                  {APPLICATION_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="sm:min-w-[130px]">
                <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Priority
                </span>
                <Select
                  aria-label="Application priority"
                  value={application.priority}
                  disabled={updatingPriority}
                  onChange={(e) => handlePriorityChange(e.target.value as Priority)}
                  className={PRIORITY_META[application.priority].textClass}
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 min-w-0 space-y-4">
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg w-full sm:w-fit overflow-x-auto max-w-full">
            {(
              [
                { id: 'overview', label: 'Overview & Notes' },
                { id: 'interviews', label: `Interviews (${interviews.length})` },
                { id: 'tasks', label: `Tasks (${tasks.length})` },
                { id: 'description', label: 'Job Description' },
                { id: 'cover', label: 'Cover Letter' },
                { id: 'recruiter', label: 'Recruiter & Follow-up' },
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

          <Card>
            <CardContent className="p-4 sm:p-6">
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-start gap-2.5">
                      <Calendar className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Applied Date</p>
                        <p className="text-sm font-medium font-mono tabular-nums mt-0.5">
                          {application.appliedDate ? formatShortDate(application.appliedDate) : 'Not applied yet'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <Clock className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Next Follow-Up</p>
                        <p className="text-sm font-medium font-mono tabular-nums mt-0.5">
                          {application.nextFollowUpDate
                            ? formatShortDate(application.nextFollowUpDate)
                            : 'None scheduled'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <FileText className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Resume Version</p>
                        <p className="text-sm font-medium mt-0.5">
                          {application.resumeVersion || 'Not specified'}
                        </p>
                        {matchedDocument && (
                          <div className="flex items-center gap-3 mt-1 text-xs">
                            {matchedDocument.localStorageReference && (
                              <button
                                type="button"
                                onClick={() => void handleDownloadMatchedResume()}
                                className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                              >
                                <Download className="h-3 w-3" />
                                <span>Download file</span>
                              </button>
                            )}
                            {onOpenDocuments && (
                              <button
                                type="button"
                                onClick={onOpenDocuments}
                                className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white underline cursor-pointer"
                              >
                                Open in Documents
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <Building2 className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Experience Required</p>
                        <p className="text-sm font-medium mt-0.5">
                          {application.experienceRequired || 'Not specified'}
                        </p>
                      </div>
                    </div>

                    {application.companyLocation && (
                      <div className="flex items-start gap-2.5">
                        <MapPin className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Company HQ</p>
                          <p className="text-sm font-medium mt-0.5">
                            {application.companyLocation}
                          </p>
                        </div>
                      </div>
                    )}

                    {websiteHref && (
                      <div className="flex items-start gap-2.5">
                        <Globe className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Website</p>
                          <a
                            href={websiteHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline mt-0.5 inline-block"
                          >
                            {application.companyWebsite}
                          </a>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold mb-2">Personal Notes</h3>
                    {application.notes ? (
                      <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                        {application.notes}
                      </p>
                    ) : (
                      <p className="text-sm text-slate-400">
                        No notes recorded yet. Click Edit to add referral context, interview prep, or compensation details.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'interviews' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold">Interview Rounds</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Manage scheduled rounds, preparation checklists, and post-interview feedback.
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => onScheduleInterview(application.id)}
                    >
                      <Plus className="h-4 w-4" />
                      <span>Schedule Interview</span>
                    </Button>
                  </div>

                  {interviews.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-200 dark:border-slate-800 py-8 px-4 text-center space-y-2">
                      <CalendarClock className="h-6 w-6 text-slate-400 mx-auto" />
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        No interview rounds recorded yet
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Schedule your first HR, technical, or final round for this role.
                      </p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg">
                      {interviews.map((round) => {
                        const meetingHref = ensureExternalHref(round.meetingUrl);
                        const checklist = round.preparationChecklist ?? [];
                        const doneCount = checklist.filter((c) => c.done).length;
                        return (
                          <li key={round.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="min-w-0 space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => onSelectInterview(round)}
                                  className="text-sm font-semibold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer text-left"
                                >
                                  {round.roundName}
                                </button>
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                  · {round.interviewType}
                                </span>
                                <span className={`text-xs font-medium ${INTERVIEW_STATUS_META[round.status].toneClass}`}>
                                  · {round.status}
                                </span>
                                <span className={`text-xs font-medium ${INTERVIEW_RESULT_META[round.result].toneClass}`}>
                                  · {round.result}
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                                <span className="font-mono tabular-nums">
                                  {formatDateTime(round.scheduledAt)}
                                </span>
                                {round.interviewer && (
                                  <span className="inline-flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    <span>{round.interviewer}</span>
                                  </span>
                                )}
                                {checklist.length > 0 && (
                                  <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                                    <CheckSquare className="h-3 w-3" />
                                    <span>
                                      {doneCount}/{checklist.length} prep
                                    </span>
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {meetingHref && (
                                <a
                                  href={meetingHref}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs font-medium hover:bg-blue-100 dark:hover:bg-blue-950/70"
                                >
                                  <Video className="h-3.5 w-3.5" />
                                  <span>Join</span>
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => onSelectInterview(round)}
                              >
                                Open Prep
                              </Button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}

              {activeTab === 'tasks' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold">Application Tasks & Follow-ups</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Track follow-ups, assessment deadlines, and interview prep linked to this role.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onOpenFollowUpTemplates(application.id)}
                      >
                        <Mail className="h-4 w-4" />
                        <span>Email Templates</span>
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => onAddTask(application.id)}
                      >
                        <Plus className="h-4 w-4" />
                        <span>Add Task</span>
                      </Button>
                    </div>
                  </div>

                  {tasks.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-200 dark:border-slate-800 py-8 px-4 text-center space-y-2">
                      <CheckSquare className="h-6 w-6 text-slate-400 mx-auto" />
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        No tasks linked to this application yet
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Add a recruiter follow-up, assessment deadline, or prep task.
                      </p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg">
                      {tasks.map((task) => {
                        const isCompleted = task.status === 'Completed';
                        const overdue = isTaskOverdue(task);
                        return (
                          <li
                            key={task.id}
                            className="p-3.5 flex items-center justify-between gap-3"
                          >
                            <div className="flex items-start gap-2.5 min-w-0">
                              <button
                                type="button"
                                onClick={() =>
                                  onToggleTaskStatus(
                                    task,
                                    isCompleted ? 'Pending' : 'Completed'
                                  )
                                }
                                aria-label={
                                  isCompleted
                                    ? `Mark ${task.title} pending`
                                    : `Mark ${task.title} completed`
                                }
                                className="mt-0.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer shrink-0"
                              >
                                {isCompleted ? (
                                  <CheckSquare className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                ) : (
                                  <Square className="h-4 w-4" />
                                )}
                              </button>
                              <div className="min-w-0">
                                <p
                                  className={`text-sm font-medium truncate ${
                                    isCompleted
                                      ? 'line-through text-slate-400 dark:text-slate-500'
                                      : 'text-slate-900 dark:text-white'
                                  }`}
                                >
                                  {task.title}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                  <span>{task.category}</span>
                                  <span aria-hidden="true"> · </span>
                                  <span className={PRIORITY_META[task.priority].textClass}>
                                    {task.priority}
                                  </span>
                                  {task.dueDate && (
                                    <>
                                      <span aria-hidden="true"> · </span>
                                      <span
                                        className={`font-mono tabular-nums ${
                                          overdue
                                            ? 'text-red-600 dark:text-red-400 font-medium'
                                            : ''
                                        }`}
                                      >
                                        {overdue ? 'Overdue: ' : 'Due '}
                                        {formatShortDate(task.dueDate)}
                                      </span>
                                    </>
                                  )}
                                </p>
                              </div>
                            </div>

                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => onEditTask(task)}
                              aria-label={`Edit ${task.title}`}
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </Button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}

              {activeTab === 'description' && (
                <div>
                  <h3 className="text-sm font-semibold mb-3">Job Description</h3>
                  {application.jobDescription ? (
                    <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                      {application.jobDescription}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">
                      No job description saved for this application yet.
                    </p>
                  )}
                </div>
              )}

              {activeTab === 'cover' && (
                <div>
                  <h3 className="text-sm font-semibold mb-3">Cover Letter</h3>
                  {application.coverLetter ? (
                    <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                      {application.coverLetter}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">
                      No cover letter attached to this application yet.
                    </p>
                  )}
                </div>
              )}

              {activeTab === 'recruiter' && (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold">Recruiter Contact</h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onOpenFollowUpTemplates(application.id)}
                    >
                      <Mail className="h-3.5 w-3.5" />
                      <span>Draft Follow-up Email</span>
                    </Button>
                  </div>
                  {application.recruiterName ||
                  application.recruiterEmail ||
                  application.recruiterLinkedinUrl ? (
                    <div className="space-y-3 text-sm">
                      {application.recruiterName && (
                        <div className="flex items-center gap-2.5">
                          <UserCheck className="h-4 w-4 text-slate-400 shrink-0" />
                          <span className="font-medium">{application.recruiterName}</span>
                        </div>
                      )}
                      {application.recruiterEmail && (
                        <div className="flex items-center gap-2.5">
                          <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                          <a
                            href={`mailto:${application.recruiterEmail}`}
                            className="text-blue-600 dark:text-blue-400 hover:underline break-all"
                          >
                            {application.recruiterEmail}
                          </a>
                        </div>
                      )}
                      {linkedinHref && (
                        <div className="flex items-center gap-2.5">
                          <Linkedin className="h-4 w-4 text-slate-400 shrink-0" />
                          <a
                            href={linkedinHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                          >
                            <span>LinkedIn Profile</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">
                      No recruiter contact added yet. Use Edit to add recruiter name, email, or LinkedIn URL.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-4 min-w-0">
          <Card>
            <CardHeader>
              <h2 className="text-base font-semibold">Activity Timeline</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Every creation, status transition, and edit is logged automatically.
              </p>
            </CardHeader>
            <CardContent className="p-4 sm:p-5">
              {logsLoading ? (
                <div className="space-y-3">
                  <div className="h-10 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
                  <div className="h-10 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
                </div>
              ) : logsError ? (
                <p className="text-xs text-red-600 dark:text-red-400">{logsError}</p>
              ) : logs.length === 0 ? (
                <p className="text-xs text-slate-400">No timeline events recorded yet.</p>
              ) : (
                <ol className="space-y-4">
                  {logs.map((log, index) => (
                    <li
                      key={log.id}
                      className={`text-xs space-y-1 ${
                        index !== logs.length - 1
                          ? 'pb-4 border-b border-slate-100 dark:border-slate-800'
                          : ''
                      }`}
                    >
                      <p className="text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                        {log.description}
                      </p>
                      <p className="font-mono tabular-nums text-[11px] text-slate-400">
                        {formatDateTime(log.createdAt)} · {formatRelativeTime(log.createdAt)}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        title="Delete job application"
        description="This action permanently deletes the application, its linked interview rounds, linked tasks, and its activity timeline."
        maxWidthClass="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Are you sure you want to delete{' '}
            <strong className="font-semibold text-slate-900 dark:text-white">
              {application.jobTitle}
            </strong>{' '}
            at{' '}
            <strong className="font-semibold text-slate-900 dark:text-white">
              {application.companyName}
            </strong>
            ?
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting}
              onClick={handleConfirmDelete}
            >
              {deleting ? 'Deleting...' : 'Delete Application'}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
