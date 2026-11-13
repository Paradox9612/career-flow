import { useEffect, useMemo, useState } from 'react';
import { AiAssistantPage } from '@/src/components/ai/AiAssistantPage';
import { AnalyticsPage } from '@/src/components/analytics/AnalyticsPage';
import { ApplicationDetailView } from '@/src/components/applications/ApplicationDetailView';
import { ApplicationFormModal } from '@/src/components/applications/ApplicationFormModal';
import {
  ApplicationsWorkspace,
  type ApplicationQuickFilter,
  type ApplicationsViewMode,
} from '@/src/components/applications/ApplicationsWorkspace';
import { AuthPage } from '@/src/components/auth/AuthPage';
import { VerifyEmailScreen } from '@/src/components/auth/VerifyEmailScreen';
import { CalendarPage } from '@/src/components/calendar/CalendarPage';
import { DashboardPage } from '@/src/components/dashboard/DashboardPage';
import { DocumentFormModal } from '@/src/components/documents/DocumentFormModal';
import { DocumentsPage } from '@/src/components/documents/DocumentsPage';
import { ErrorBoundary } from '@/src/components/ErrorBoundary';
import { InterviewDetailView } from '@/src/components/interviews/InterviewDetailView';
import { InterviewFormModal } from '@/src/components/interviews/InterviewFormModal';
import { InterviewsPage } from '@/src/components/interviews/InterviewsPage';
import { AppShell, type ActiveRoute } from '@/src/components/layout/AppShell';
import { ProfilePage } from '@/src/components/profile/ProfilePage';
import { FollowUpTemplatesModal } from '@/src/components/tasks/FollowUpTemplatesModal';
import { TaskFormModal } from '@/src/components/tasks/TaskFormModal';
import { TasksPage } from '@/src/components/tasks/TasksPage';
import { AuthProvider, useAuth } from '@/src/contexts/AuthContext';
import { ThemeProvider } from '@/src/contexts/ThemeContext';
import { subscribeToAiHistory } from '@/src/services/aiService';
import {
  deleteApplication,
  subscribeToApplications,
  updateApplicationCoverLetter,
  updateApplicationResumeVersion,
  updateApplicationStatus,
} from '@/src/services/applicationService';
import {
  deleteDocument,
  subscribeToDocuments,
} from '@/src/services/documentService';
import {
  deleteInterview,
  subscribeToInterviews,
  updateInterviewStatusResult,
} from '@/src/services/interviewService';
import {
  deleteTask,
  subscribeToTasks,
  updateTaskStatus,
} from '@/src/services/taskService';
import type {
  AiHistoryItem,
  ApplicationStatus,
  DocumentRecord,
  DocumentType,
  Interview,
  InterviewStatus,
  JobApplication,
  TaskItem,
  TaskStatus,
} from '@/src/types/careerflow';

function AuthenticatedWorkspace() {
  const { user, profile, profileError } = useAuth();
  const [route, setRoute] = useState<ActiveRoute>('dashboard');
  const [viewMode, setViewMode] = useState<ApplicationsViewMode>('table');
  const [quickFilter, setQuickFilter] = useState<ApplicationQuickFilter>('ALL');
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [appsLoading, setAppsLoading] = useState(true);
  const [appsError, setAppsError] = useState<string | null>(null);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [interviewsLoading, setInterviewsLoading] = useState(true);
  const [interviewsError, setInterviewsError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  const [selectedInterviewId, setSelectedInterviewId] = useState<string | null>(null);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingApplication, setEditingApplication] = useState<JobApplication | null>(null);
  const [interviewModalOpen, setInterviewModalOpen] = useState(false);
  const [editingInterview, setEditingInterview] = useState<Interview | null>(null);
  const [interviewDefaultAppId, setInterviewDefaultAppId] = useState<string | null>(null);
  const [interviewDefaultDate, setInterviewDefaultDate] = useState<string | null>(null);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [tasksError, setTasksError] = useState<string | null>(null);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [taskDefaultAppId, setTaskDefaultAppId] = useState<string | null>(null);
  const [taskDefaultDate, setTaskDefaultDate] = useState<string | null>(null);
  const [templatesModalOpen, setTemplatesModalOpen] = useState(false);
  const [templatesAppId, setTemplatesAppId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [docsError, setDocsError] = useState<string | null>(null);
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<DocumentRecord | null>(null);
  const [versionTemplateDoc, setVersionTemplateDoc] = useState<DocumentRecord | null>(null);
  const [docDefaultType, setDocDefaultType] = useState<DocumentType>('Resume');
  const [aiHistory, setAiHistory] = useState<AiHistoryItem[]>([]);
  const [aiHistoryLoading, setAiHistoryLoading] = useState(true);
  const [aiHistoryError, setAiHistoryError] = useState<string | null>(null);
  const [aiInitialAppId, setAiInitialAppId] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !user.emailVerified) return;
    setAppsLoading(true);
    setAppsError(null);
    const unsubApps = subscribeToApplications(
      user.uid,
      (items) => {
        setApplications(items);
        setAppsLoading(false);
      },
      (err) => {
        setAppsError(err.message);
        setAppsLoading(false);
      }
    );

    setInterviewsLoading(true);
    setInterviewsError(null);
    const unsubInterviews = subscribeToInterviews(
      user.uid,
      (items) => {
        setInterviews(items);
        setInterviewsLoading(false);
      },
      (err) => {
        setInterviewsError(err.message);
        setInterviewsLoading(false);
      }
    );

    setTasksLoading(true);
    setTasksError(null);
    const unsubTasks = subscribeToTasks(
      user.uid,
      (items) => {
        setTasks(items);
        setTasksLoading(false);
      },
      (err) => {
        setTasksError(err.message);
        setTasksLoading(false);
      }
    );

    setDocsLoading(true);
    setDocsError(null);
    const unsubDocs = subscribeToDocuments(
      user.uid,
      (items) => {
        setDocuments(items);
        setDocsLoading(false);
      },
      (err) => {
        setDocsError(err.message);
        setDocsLoading(false);
      }
    );

    setAiHistoryLoading(true);
    setAiHistoryError(null);
    const unsubAiHistory = subscribeToAiHistory(
      user.uid,
      (items) => {
        setAiHistory(items);
        setAiHistoryLoading(false);
      },
      (err) => {
        setAiHistoryError(err.message);
        setAiHistoryLoading(false);
      }
    );

    return () => {
      unsubApps();
      unsubInterviews();
      unsubTasks();
      unsubDocs();
      unsubAiHistory();
    };
  }, [user]);

  const selectedApplication = useMemo(
    () => applications.find((a) => a.id === selectedApplicationId) ?? null,
    [applications, selectedApplicationId]
  );

  const selectedInterview = useMemo(
    () => interviews.find((i) => i.id === selectedInterviewId) ?? null,
    [interviews, selectedInterviewId]
  );

  const selectedApplicationInterviews = useMemo(() => {
    if (!selectedApplication) return [];
    return interviews.filter((i) => i.applicationId === selectedApplication.id);
  }, [interviews, selectedApplication]);

  const selectedApplicationTasks = useMemo(() => {
    if (!selectedApplication) return [];
    return tasks.filter((t) => t.applicationId === selectedApplication.id);
  }, [tasks, selectedApplication]);

  const handleNavigate = (nextRoute: ActiveRoute) => {
    setRoute(nextRoute);
    setSelectedApplicationId(null);
    setSelectedInterviewId(null);
    if (nextRoute === 'pipeline') {
      setViewMode('kanban');
    } else if (nextRoute === 'applications' && viewMode === 'kanban') {
      setViewMode('table');
    }
  };

  const handleNavigateFiltered = (filter: ApplicationQuickFilter) => {
    setQuickFilter(filter);
    setSelectedApplicationId(null);
    setSelectedInterviewId(null);
    setViewMode('table');
    setRoute('applications');
  };

  const handleSelectApplicationById = (applicationId: string) => {
    setSelectedInterviewId(null);
    setRoute('applications');
    setSelectedApplicationId(applicationId);
  };

  const handleSelectInterview = (interview: Interview) => {
    setSelectedInterviewId(interview.id);
  };

  const handleViewModeChange = (mode: ApplicationsViewMode) => {
    setViewMode(mode);
    setRoute(mode === 'kanban' ? 'pipeline' : 'applications');
  };

  const handleOpenCreate = () => {
    setEditingApplication(null);
    setFormModalOpen(true);
  };

  const handleOpenEdit = (app: JobApplication) => {
    setEditingApplication(app);
    setFormModalOpen(true);
  };

  const handleOpenScheduleInterview = (options?: {
    applicationId?: string | null;
    date?: string | null;
  }) => {
    setEditingInterview(null);
    setInterviewDefaultAppId(options?.applicationId ?? null);
    setInterviewDefaultDate(options?.date ?? null);
    setInterviewModalOpen(true);
  };

  const handleOpenEditInterview = (interview: Interview) => {
    setEditingInterview(interview);
    setInterviewDefaultAppId(interview.applicationId);
    setInterviewDefaultDate(null);
    setInterviewModalOpen(true);
  };

  const handleStatusChange = async (
    app: JobApplication,
    nextStatus: ApplicationStatus
  ) => {
    if (!user) return;
    await updateApplicationStatus(user.uid, app, nextStatus);
  };

  const handleDeleteApplication = async (app: JobApplication) => {
    if (!user) return;
    await deleteApplication(user.uid, app.id);
    if (selectedApplicationId === app.id) {
      setSelectedApplicationId(null);
    }
    if (selectedInterview && selectedInterview.applicationId === app.id) {
      setSelectedInterviewId(null);
    }
  };

  const handleInterviewStatusChange = async (
    interview: Interview,
    nextStatus: InterviewStatus
  ) => {
    if (!user) return;
    const linkedApp = applications.find((a) => a.id === interview.applicationId);
    await updateInterviewStatusResult(user.uid, interview, linkedApp, nextStatus, interview.result);
  };

  const handleDeleteInterview = async (interview: Interview) => {
    await deleteInterview(interview.id);
    if (selectedInterviewId === interview.id) {
      setSelectedInterviewId(null);
    }
  };

  const handleOpenCreateTask = (options?: {
    applicationId?: string | null;
    date?: string | null;
  }) => {
    setEditingTask(null);
    setTaskDefaultAppId(options?.applicationId ?? null);
    setTaskDefaultDate(options?.date ?? null);
    setTaskModalOpen(true);
  };

  const handleOpenEditTask = (task: TaskItem) => {
    setEditingTask(task);
    setTaskDefaultAppId(task.applicationId || null);
    setTaskDefaultDate(null);
    setTaskModalOpen(true);
  };

  const handleTaskStatusChange = async (task: TaskItem, nextStatus: TaskStatus) => {
    if (!user) return;
    const linkedApp = task.applicationId
      ? applications.find((a) => a.id === task.applicationId)
      : undefined;
    await updateTaskStatus(user.uid, task, nextStatus, linkedApp);
  };

  const handleDeleteTask = async (task: TaskItem) => {
    await deleteTask(task.id);
  };

  const handleOpenTemplates = (applicationId?: string) => {
    setTemplatesAppId(applicationId ?? null);
    setTemplatesModalOpen(true);
  };

  const handleOpenCreateDocument = (defaultType: DocumentType = 'Resume') => {
    setEditingDocument(null);
    setVersionTemplateDoc(null);
    setDocDefaultType(defaultType);
    setDocModalOpen(true);
  };

  const handleOpenEditDocument = (docRecord: DocumentRecord) => {
    setEditingDocument(docRecord);
    setVersionTemplateDoc(null);
    setDocDefaultType(docRecord.documentType);
    setDocModalOpen(true);
  };

  const handleOpenNewDocumentVersion = (docRecord: DocumentRecord) => {
    setEditingDocument(null);
    setVersionTemplateDoc(docRecord);
    setDocDefaultType(docRecord.documentType);
    setDocModalOpen(true);
  };

  const handleDeleteDocument = async (docRecord: DocumentRecord) => {
    await deleteDocument(docRecord);
  };

  const handleLinkResumeToApplication = async (
    application: JobApplication,
    resumeVersion: string
  ) => {
    await updateApplicationResumeVersion(application, resumeVersion);
  };

  const handleAttachCoverLetterToApplication = async (
    application: JobApplication,
    coverLetter: string
  ) => {
    await updateApplicationCoverLetter(application, coverLetter);
  };

  const handleOpenAiForApplication = (applicationId: string) => {
    setAiInitialAppId(applicationId);
    setSelectedApplicationId(null);
    setSelectedInterviewId(null);
    setRoute('ai');
  };

  const breadcrumbTrail = useMemo(() => {
    if (selectedInterview) {
      return ['CareerFlow', 'Interviews', selectedInterview.roundName];
    }
    if (route === 'dashboard') return ['CareerFlow', 'Dashboard'];
    if (route === 'interviews') return ['CareerFlow', 'Interviews'];
    if (route === 'calendar') return ['CareerFlow', 'Calendar'];
    if (route === 'tasks') return ['CareerFlow', 'Tasks & Follow-ups'];
    if (route === 'documents') return ['CareerFlow', 'Resumes & Documents'];
    if (route === 'ai') return ['CareerFlow', 'AI Assistant'];
    if (route === 'analytics') return ['CareerFlow', 'Analytics'];
    if (route === 'profile') return ['CareerFlow', 'Profile & Settings'];
    const base = route === 'pipeline' ? 'Pipeline' : 'Applications';
    if (selectedApplication) {
      return ['CareerFlow', base, `${selectedApplication.companyName} — ${selectedApplication.jobTitle}`];
    }
    return ['CareerFlow', base];
  }, [route, selectedApplication, selectedInterview]);

  return (
    <AppShell
      activeRoute={route}
      onNavigate={handleNavigate}
      breadcrumbTrail={breadcrumbTrail}
      onQuickAddApplication={handleOpenCreate}
    >
      {profileError && (
        <div
          role="alert"
          className="mb-5 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-300"
        >
          {profileError}
        </div>
      )}

      {selectedInterview && user ? (
        <InterviewDetailView
          userId={user.uid}
          interview={selectedInterview}
          application={applications.find((a) => a.id === selectedInterview.applicationId)}
          onBack={() => setSelectedInterviewId(null)}
          onEdit={handleOpenEditInterview}
          onDelete={handleDeleteInterview}
          onSelectApplication={handleSelectApplicationById}
        />
      ) : route === 'profile' ? (
        <ProfilePage />
      ) : route === 'analytics' ? (
        <AnalyticsPage
          applications={applications}
          loading={appsLoading}
          onOpenCreateApplication={handleOpenCreate}
        />
      ) : route === 'interviews' && user ? (
        <InterviewsPage
          userId={user.uid}
          interviews={interviews}
          applications={applications}
          loading={interviewsLoading || appsLoading}
          error={interviewsError || appsError}
          onScheduleClick={() => handleOpenScheduleInterview()}
          onEditInterview={handleOpenEditInterview}
          onSelectInterview={handleSelectInterview}
          onSelectApplication={handleSelectApplicationById}
          onStatusChange={handleInterviewStatusChange}
          onDeleteInterview={handleDeleteInterview}
          onOpenCreateApplication={handleOpenCreate}
        />
      ) : route === 'calendar' ? (
        <CalendarPage
          interviews={interviews}
          applications={applications}
          tasks={tasks}
          onSelectInterview={handleSelectInterview}
          onSelectApplication={handleSelectApplicationById}
          onScheduleInterviewOnDate={(isoDate) =>
            handleOpenScheduleInterview({ date: isoDate })
          }
          onScheduleTaskOnDate={(isoDate) => handleOpenCreateTask({ date: isoDate })}
          onOpenTasks={() => handleNavigate('tasks')}
          onOpenCreateApplication={handleOpenCreate}
        />
      ) : route === 'tasks' ? (
        <TasksPage
          tasks={tasks}
          applications={applications}
          loading={tasksLoading || appsLoading}
          error={tasksError || appsError}
          onCreateTask={() => handleOpenCreateTask()}
          onEditTask={handleOpenEditTask}
          onStatusChange={handleTaskStatusChange}
          onDeleteTask={handleDeleteTask}
          onSelectApplication={handleSelectApplicationById}
          onOpenTemplates={handleOpenTemplates}
        />
      ) : route === 'documents' ? (
        <DocumentsPage
          documents={documents}
          applications={applications}
          loading={docsLoading || appsLoading}
          error={docsError || appsError}
          onCreateDocument={handleOpenCreateDocument}
          onEditDocument={handleOpenEditDocument}
          onNewVersion={handleOpenNewDocumentVersion}
          onDeleteDocument={handleDeleteDocument}
          onLinkResumeToApplication={handleLinkResumeToApplication}
          onSelectApplication={handleSelectApplicationById}
        />
      ) : route === 'ai' && user ? (
        <AiAssistantPage
          userId={user.uid}
          profile={profile}
          applications={applications}
          documents={documents}
          aiHistory={aiHistory}
          historyLoading={aiHistoryLoading}
          historyError={aiHistoryError}
          initialApplicationId={aiInitialAppId}
          onClearInitialApplication={() => setAiInitialAppId(null)}
          onAttachCoverLetterToApplication={handleAttachCoverLetterToApplication}
          onSelectApplication={handleSelectApplicationById}
        />
      ) : selectedApplication && user ? (
        <ApplicationDetailView
          userId={user.uid}
          application={selectedApplication}
          interviews={selectedApplicationInterviews}
          tasks={selectedApplicationTasks}
          documents={documents}
          onBack={() => setSelectedApplicationId(null)}
          onEdit={handleOpenEdit}
          onDelete={handleDeleteApplication}
          onScheduleInterview={(appId) =>
            handleOpenScheduleInterview({ applicationId: appId })
          }
          onSelectInterview={handleSelectInterview}
          onAddTask={(appId) => handleOpenCreateTask({ applicationId: appId })}
          onEditTask={handleOpenEditTask}
          onToggleTaskStatus={handleTaskStatusChange}
          onOpenFollowUpTemplates={(appId) => handleOpenTemplates(appId)}
          onOpenDocuments={() => handleNavigate('documents')}
          onOpenAiAssistant={handleOpenAiForApplication}
        />
      ) : route === 'dashboard' && user ? (
        <DashboardPage
          userId={user.uid}
          profile={profile}
          applications={applications}
          interviews={interviews}
          tasks={tasks}
          loading={appsLoading}
          error={appsError || interviewsError || tasksError}
          onNavigateFiltered={handleNavigateFiltered}
          onSelectApplication={handleSelectApplicationById}
          onSelectInterview={handleSelectInterview}
          onToggleTaskStatus={handleTaskStatusChange}
          onOpenCreateApplication={handleOpenCreate}
          onOpenAnalytics={() => handleNavigate('analytics')}
          onOpenCalendar={() => handleNavigate('calendar')}
          onOpenTasks={() => handleNavigate('tasks')}
        />
      ) : (
        <div className="space-y-5">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight">
              {route === 'pipeline' ? 'Application Pipeline' : 'Job Applications'}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {route === 'pipeline'
                ? 'Drag applications across stages or update status directly on any card.'
                : 'Track every role, filter by stage or priority, and inspect full application timelines.'}
            </p>
          </div>

          <ApplicationsWorkspace
            applications={applications}
            loading={appsLoading}
            error={appsError}
            viewMode={route === 'pipeline' ? 'kanban' : viewMode}
            onViewModeChange={handleViewModeChange}
            quickFilter={quickFilter}
            onQuickFilterChange={setQuickFilter}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            onCreateClick={handleOpenCreate}
            onEditClick={handleOpenEdit}
            onSelectApplication={(app) => setSelectedApplicationId(app.id)}
            onStatusChange={handleStatusChange}
            onDeleteApplication={handleDeleteApplication}
          />
        </div>
      )}

      {user && (
        <>
          <ApplicationFormModal
            open={formModalOpen}
            onClose={() => {
              setFormModalOpen(false);
              setEditingApplication(null);
            }}
            userId={user.uid}
            existingApplications={applications}
            documents={documents}
            editingApplication={editingApplication}
            onSaved={(savedId) => {
              if (selectedApplicationId) {
                setSelectedApplicationId(savedId);
              }
            }}
            onInspectDuplicate={(dupApp) => {
              setRoute('applications');
              setSelectedApplicationId(dupApp.id);
            }}
          />

          <InterviewFormModal
            open={interviewModalOpen}
            onClose={() => {
              setInterviewModalOpen(false);
              setEditingInterview(null);
              setInterviewDefaultAppId(null);
              setInterviewDefaultDate(null);
            }}
            userId={user.uid}
            applications={applications}
            editingInterview={editingInterview}
            defaultApplicationId={interviewDefaultAppId}
            defaultDate={interviewDefaultDate}
            onSaved={(savedId) => {
              if (selectedInterviewId) {
                setSelectedInterviewId(savedId);
              }
            }}
            onRequestCreateApplication={handleOpenCreate}
          />

          <TaskFormModal
            open={taskModalOpen}
            onClose={() => {
              setTaskModalOpen(false);
              setEditingTask(null);
              setTaskDefaultAppId(null);
              setTaskDefaultDate(null);
            }}
            userId={user.uid}
            applications={applications}
            editingTask={editingTask}
            defaultApplicationId={taskDefaultAppId}
            defaultDate={taskDefaultDate}
          />

          <FollowUpTemplatesModal
            open={templatesModalOpen}
            onClose={() => {
              setTemplatesModalOpen(false);
              setTemplatesAppId(null);
            }}
            applications={applications}
            initialApplicationId={templatesAppId}
            senderName={profile?.name || user.displayName || ''}
          />

          <DocumentFormModal
            open={docModalOpen}
            onClose={() => {
              setDocModalOpen(false);
              setEditingDocument(null);
              setVersionTemplateDoc(null);
            }}
            userId={user.uid}
            editingDocument={editingDocument}
            versionTemplate={versionTemplateDoc}
            defaultType={docDefaultType}
          />
        </>
      )}
    </AppShell>
  );
}

function RootRouter() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="space-y-3 text-center">
          <div className="h-8 w-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin mx-auto" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading CareerFlow...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  if (!user.emailVerified) {
    return <VerifyEmailScreen />;
  }

  return <AuthenticatedWorkspace />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <RootRouter />
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
