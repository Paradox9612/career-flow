import {
  AlertCircle,
  BookmarkCheck,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  FileText,
  History,
  Info,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent, CardHeader } from '@/src/components/ui/card';
import { EmptyState } from '@/src/components/ui/empty-state';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { Select } from '@/src/components/ui/select';
import { Textarea } from '@/src/components/ui/textarea';
import { formatDateTime, formatRelativeTime } from '@/src/lib/utils';
import {
  AiRequestError,
  analyzeJobDescription,
  analyzeResume,
  deleteAiHistoryItem,
  fetchAiStatus,
  generateCoverLetter,
  generateInterviewQuestions,
  matchResumeToJob,
  saveAiHistoryItem,
} from '@/src/services/aiService';
import { createDocument } from '@/src/services/documentService';
import {
  type AiHistoryItem,
  type AiOperationType,
  type AiStatusResponse,
  type CoverLetterResult,
  type DocumentRecord,
  type InterviewQuestionItem,
  type InterviewQuestionsResult,
  type JdAnalysisResult,
  type JobApplication,
  type ResumeAnalysisResult,
  type ResumeJobMatchResult,
  type UserProfile,
} from '@/src/types/careerflow';

type AiTab = 'resume' | 'jd' | 'match' | 'cover' | 'questions' | 'history';

const OPERATION_LABELS: Record<AiOperationType, string> = {
  RESUME_ANALYSIS: 'Resume Analysis',
  JD_ANALYSIS: 'Job Description Analysis',
  RESUME_JOB_MATCH: 'Resume-to-Job Match',
  COVER_LETTER: 'Cover Letter Draft',
  INTERVIEW_QUESTIONS: 'Interview Questions',
};

interface AiAssistantPageProps {
  userId: string;
  profile: UserProfile | null;
  applications: JobApplication[];
  documents: DocumentRecord[];
  aiHistory: AiHistoryItem[];
  historyLoading: boolean;
  historyError: string | null;
  initialApplicationId?: string | null;
  onClearInitialApplication?: () => void;
  onAttachCoverLetterToApplication: (
    application: JobApplication,
    coverLetter: string
  ) => Promise<void>;
  onSelectApplication: (applicationId: string) => void;
}

export function AiAssistantPage({
  userId,
  profile,
  applications,
  documents,
  aiHistory,
  historyLoading,
  historyError,
  initialApplicationId,
  onClearInitialApplication,
  onAttachCoverLetterToApplication,
  onSelectApplication,
}: AiAssistantPageProps) {
  const [activeTab, setActiveTab] = useState<AiTab>(
    initialApplicationId ? 'match' : 'resume'
  );
  const [status, setStatus] = useState<AiStatusResponse | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);

  // Shared context inputs
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const [resumeText, setResumeText] = useState<string>('');
  const [targetRole, setTargetRole] = useState<string>('');

  const [selectedAppId, setSelectedAppId] = useState<string>(
    initialApplicationId || ''
  );
  const [companyName, setCompanyName] = useState<string>('');
  const [jobTitle, setJobTitle] = useState<string>('');
  const [jobDescription, setJobDescription] = useState<string>('');

  const [coverTone, setCoverTone] = useState<string>('Professional');
  const [questionFocus, setQuestionFocus] = useState<string>('Balanced');

  // Consent & persistence
  const [autoSaveConsent, setAutoSaveConsent] = useState<boolean>(false);
  const [savingHistory, setSavingHistory] = useState<boolean>(false);
  const [savedFeedback, setSavedFeedback] = useState<string | null>(null);

  // Results
  const [running, setRunning] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const [resumeResult, setResumeResult] = useState<ResumeAnalysisResult | null>(null);
  const [jdResult, setJdResult] = useState<JdAnalysisResult | null>(null);
  const [matchResult, setMatchResult] = useState<ResumeJobMatchResult | null>(null);
  const [coverResult, setCoverResult] = useState<CoverLetterResult | null>(null);
  const [editableCoverLetter, setEditableCoverLetter] = useState<string>('');
  const [questionsResult, setQuestionsResult] =
    useState<InterviewQuestionsResult | null>(null);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [expandedQuestions, setExpandedQuestions] = useState<Record<string, boolean>>({});
  const [attachingCover, setAttachingCover] = useState<boolean>(false);
  const [savingCoverDoc, setSavingCoverDoc] = useState<boolean>(false);
  const [inspectedHistoryItem, setInspectedHistoryItem] =
    useState<AiHistoryItem | null>(null);

  const resumeDocs = useMemo(
    () => documents.filter((d) => d.documentType === 'Resume'),
    [documents]
  );

  const checkAiStatus = async () => {
    setStatusLoading(true);
    const res = await fetchAiStatus();
    setStatus(res);
    setStatusLoading(false);
  };

  useEffect(() => {
    void checkAiStatus();
  }, []);

  // Pre-fill initial application if routed from ApplicationDetailView
  useEffect(() => {
    if (!initialApplicationId) return;
    const app = applications.find((a) => a.id === initialApplicationId);
    if (app) {
      setSelectedAppId(app.id);
      setCompanyName(app.companyName);
      setJobTitle(app.jobTitle);
      setJobDescription(app.jobDescription || '');
      setActiveTab('match');
    }
    onClearInitialApplication?.();
  }, [initialApplicationId, applications, onClearInitialApplication]);

  const handleSelectResumeDoc = (docId: string) => {
    setSelectedDocId(docId);
    const found = resumeDocs.find((d) => d.id === docId);
    if (found) {
      if ((found.content ?? '').trim()) {
        setResumeText(found.content!.trim());
      }
      if (!targetRole && found.experience) {
        setTargetRole(found.experience);
      }
    }
  };

  const handleSelectApplication = (appId: string) => {
    setSelectedAppId(appId);
    const found = applications.find((a) => a.id === appId);
    if (found) {
      setCompanyName(found.companyName);
      setJobTitle(found.jobTitle);
      setJobDescription(found.jobDescription || '');
    }
  };

  const handleFillFromProfile = () => {
    if (!profile) return;
    const lines: string[] = [];
    if (profile.name) lines.push(`Candidate: ${profile.name}`);
    if (profile.currentRole) lines.push(`Current Role: ${profile.currentRole}`);
    if (profile.experience) lines.push(`Experience: ${profile.experience}`);
    if (profile.education) lines.push(`Education: ${profile.education}`);
    if ((profile.skills?.length ?? 0) > 0) {
      lines.push(`Skills: ${profile.skills!.join(', ')}`);
    }
    if ((profile.preferredRoles?.length ?? 0) > 0) {
      lines.push(`Target Roles: ${profile.preferredRoles!.join(', ')}`);
    }
    if (lines.length > 0) {
      setResumeText((prev) =>
        prev.trim() ? `${prev.trim()}\n\n${lines.join('\n')}` : lines.join('\n')
      );
    }
  };

  const handleCopy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1800);
    } catch {
      // Clipboard blocked
    }
  };

  const persistHistoryWithConsent = async (params: {
    operationType: AiOperationType;
    title: string;
    inputSummary: string;
    result: Record<string, unknown>;
  }) => {
    setSavingHistory(true);
    setSavedFeedback(null);
    try {
      await saveAiHistoryItem(userId, {
        applicationId: selectedAppId || '',
        ...params,
      });
      setSavedFeedback('Saved to your AI History.');
      setTimeout(() => setSavedFeedback(null), 3000);
    } catch (err) {
      setAiError(
        err instanceof Error ? err.message : 'Unable to save result to AI History.'
      );
    } finally {
      setSavingHistory(false);
    }
  };

  const handleRunResumeAnalysis = async () => {
    setRunning(true);
    setAiError(null);
    setSavedFeedback(null);
    try {
      const res = await analyzeResume({ resumeText, targetRole });
      setResumeResult(res);
      if (autoSaveConsent) {
        await persistHistoryWithConsent({
          operationType: 'RESUME_ANALYSIS',
          title: targetRole
            ? `Resume Analysis · ${targetRole}`
            : 'Resume Analysis',
          inputSummary: `Resume (${resumeText.trim().length} chars)${
            targetRole ? ` · Target: ${targetRole}` : ''
          }`,
          result: res as unknown as Record<string, unknown>,
        });
      }
    } catch (err) {
      setAiError(
        err instanceof AiRequestError || err instanceof Error
          ? err.message
          : 'Unable to analyze resume.'
      );
    } finally {
      setRunning(false);
    }
  };

  const handleRunJdAnalysis = async () => {
    setRunning(true);
    setAiError(null);
    setSavedFeedback(null);
    try {
      const res = await analyzeJobDescription({
        jobTitle,
        companyName,
        jobDescription,
      });
      setJdResult(res);
      if (autoSaveConsent) {
        await persistHistoryWithConsent({
          operationType: 'JD_ANALYSIS',
          title: `JD Analysis · ${jobTitle || 'Role'}${
            companyName ? ` at ${companyName}` : ''
          }`,
          inputSummary: `${companyName || 'Company'} — ${
            jobTitle || 'Role'
          } (${jobDescription.trim().length} chars)`,
          result: res as unknown as Record<string, unknown>,
        });
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Unable to analyze JD.');
    } finally {
      setRunning(false);
    }
  };

  const handleRunMatch = async () => {
    setRunning(true);
    setAiError(null);
    setSavedFeedback(null);
    try {
      const res = await matchResumeToJob({
        resumeText,
        jobTitle,
        companyName,
        jobDescription,
      });
      setMatchResult(res);
      if (autoSaveConsent) {
        await persistHistoryWithConsent({
          operationType: 'RESUME_JOB_MATCH',
          title: `Match (${res.matchPercentage}%) · ${jobTitle || 'Role'}${
            companyName ? ` at ${companyName}` : ''
          }`,
          inputSummary: `${companyName || 'Company'} — ${
            jobTitle || 'Role'
          } vs Resume (${resumeText.trim().length} chars)`,
          result: res as unknown as Record<string, unknown>,
        });
      }
    } catch (err) {
      setAiError(
        err instanceof Error ? err.message : 'Unable to score resume match.'
      );
    } finally {
      setRunning(false);
    }
  };

  const handleRunCoverLetter = async () => {
    setRunning(true);
    setAiError(null);
    setSavedFeedback(null);
    try {
      const res = await generateCoverLetter({
        resumeText,
        companyName,
        jobTitle,
        jobDescription,
        tone: coverTone,
        candidateName: profile?.name || '',
      });
      setCoverResult(res);
      setEditableCoverLetter(res.coverLetter);
      if (autoSaveConsent) {
        await persistHistoryWithConsent({
          operationType: 'COVER_LETTER',
          title: `Cover Letter · ${companyName} — ${jobTitle}`,
          inputSummary: `Tone: ${coverTone} · ${companyName} — ${jobTitle}`,
          result: res as unknown as Record<string, unknown>,
        });
      }
    } catch (err) {
      setAiError(
        err instanceof Error ? err.message : 'Unable to generate cover letter.'
      );
    } finally {
      setRunning(false);
    }
  };

  const handleRunQuestions = async () => {
    setRunning(true);
    setAiError(null);
    setSavedFeedback(null);
    try {
      const res = await generateInterviewQuestions({
        jobTitle,
        companyName,
        jobDescription,
        resumeText,
        focus: questionFocus,
      });
      setQuestionsResult(res);
      setExpandedQuestions({});
      if (autoSaveConsent) {
        await persistHistoryWithConsent({
          operationType: 'INTERVIEW_QUESTIONS',
          title: `Interview Prep · ${jobTitle}${
            companyName ? ` at ${companyName}` : ''
          }`,
          inputSummary: `Focus: ${questionFocus} · ${companyName || 'Company'} — ${jobTitle}`,
          result: res as unknown as Record<string, unknown>,
        });
      }
    } catch (err) {
      setAiError(
        err instanceof Error
          ? err.message
          : 'Unable to generate interview questions.'
      );
    } finally {
      setRunning(false);
    }
  };

  const handleAttachCoverLetterToApp = async () => {
    const app = applications.find((a) => a.id === selectedAppId);
    if (!app || !editableCoverLetter.trim()) return;
    setAttachingCover(true);
    setAiError(null);
    try {
      await onAttachCoverLetterToApplication(app, editableCoverLetter);
      setSavedFeedback(
        `Attached cover letter to ${app.companyName} — ${app.jobTitle}.`
      );
      setTimeout(() => setSavedFeedback(null), 3500);
    } catch (err) {
      setAiError(
        err instanceof Error ? err.message : 'Unable to attach cover letter.'
      );
    } finally {
      setAttachingCover(false);
    }
  };

  const handleSaveCoverLetterAsDocument = async () => {
    if (!editableCoverLetter.trim()) return;
    setSavingCoverDoc(true);
    setAiError(null);
    try {
      await createDocument(userId, {
        name: `${companyName || 'Target'} — ${jobTitle || 'Role'} Cover Letter`,
        documentType: 'Cover Letter',
        version: 'v1.0',
        skills: [],
        experience: '',
        content: editableCoverLetter,
        notes: `Drafted with AI Assistant (${coverTone} tone).`,
      });
      setSavedFeedback('Saved to Resumes & Documents.');
      setTimeout(() => setSavedFeedback(null), 3500);
    } catch (err) {
      setAiError(
        err instanceof Error ? err.message : 'Unable to save cover letter document.'
      );
    } finally {
      setSavingCoverDoc(false);
    }
  };

  const handleInspectHistoryItem = (item: AiHistoryItem) => {
    setInspectedHistoryItem(item);
  };

  const selectedResumeDoc = resumeDocs.find((d) => d.id === selectedDocId);

  const renderResumeContextInput = () => (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label htmlFor="ai-resume-text">Resume Content *</Label>
        <div className="flex flex-wrap items-center gap-2">
          {resumeDocs.length > 0 && (
            <select
              aria-label="Load saved resume text"
              value={selectedDocId}
              onChange={(e) => handleSelectResumeDoc(e.target.value)}
              className="h-8 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 text-xs text-slate-700 dark:text-slate-200"
            >
              <option value="">Load saved resume...</option>
              {resumeDocs.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.name} ({doc.version})
                  {doc.content ? '' : ' — no text'}
                </option>
              ))}
            </select>
          )}
          {profile && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleFillFromProfile}
            >
              Use Profile Summary
            </Button>
          )}
        </div>
      </div>

      {selectedResumeDoc && !(selectedResumeDoc.content ?? '').trim() && (
        <p className="text-xs text-amber-700 dark:text-amber-400">
          “{selectedResumeDoc.name}” does not have extracted text saved yet. Paste your resume text below so Gemini can evaluate it.
        </p>
      )}

      <Textarea
        id="ai-resume-text"
        rows={6}
        value={resumeText}
        onChange={(e) => setResumeText(e.target.value)}
        placeholder="Paste your resume text here (or pick a saved resume with text above)..."
      />
      <p className="text-[11px] font-mono tabular-nums text-slate-400 text-right">
        {resumeText.length} / 18,000 chars
      </p>
    </div>
  );

  const renderJobContextInputs = (requireCompanyAndTitle: boolean) => (
    <div className="space-y-3">
      {applications.length > 0 && (
        <div>
          <Label htmlFor="ai-app-picker">Load from Tracked Application</Label>
          <Select
            id="ai-app-picker"
            value={selectedAppId}
            onChange={(e) => handleSelectApplication(e.target.value)}
          >
            <option value="">Custom job posting (enter manually)</option>
            {applications.map((app) => (
              <option key={app.id} value={app.id}>
                {app.companyName} — {app.jobTitle} ({app.status})
              </option>
            ))}
          </Select>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label htmlFor="ai-company">
            Company Name {requireCompanyAndTitle ? '*' : ''}
          </Label>
          <Input
            id="ai-company"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="e.g. Stripe"
          />
        </div>
        <div>
          <Label htmlFor="ai-job-title">
            Job Title {requireCompanyAndTitle ? '*' : ''}
          </Label>
          <Input
            id="ai-job-title"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            placeholder="e.g. Senior Frontend Engineer"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="ai-jd-text">Job Description *</Label>
        <Textarea
          id="ai-jd-text"
          rows={6}
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          placeholder="Paste the job responsibilities, required skills, and qualifications..."
        />
        <p className="text-[11px] font-mono tabular-nums text-slate-400 text-right mt-1">
          {jobDescription.length} / 18,000 chars
        </p>
      </div>
    </div>
  );

  const renderQuestionList = (
    heading: string,
    keyPrefix: string,
    items: InterviewQuestionItem[]
  ) => {
    if (!items || items.length === 0) return null;
    return (
      <div className="space-y-2.5">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
          {heading}
        </h3>
        <ul className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg">
          {items.map((item, idx) => {
            const qKey = `${keyPrefix}-${idx}`;
            const expanded = Boolean(expandedQuestions[qKey]);
            return (
              <li key={qKey} className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedQuestions((prev) => ({
                        ...prev,
                        [qKey]: !prev[qKey],
                      }))
                    }
                    className="text-left text-sm font-medium text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 flex items-start gap-2 cursor-pointer flex-1"
                  >
                    {expanded ? (
                      <ChevronUp className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                    )}
                    <span>{item.question}</span>
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      void handleCopy(
                        `Q: ${item.question}\n\nSuggested Answer:\n${item.suggestedAnswer}\n\nWhy interviewers ask this:\n${item.explanation}`,
                        qKey
                      )
                    }
                    aria-label="Copy question and answer"
                  >
                    {copiedKey === qKey ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>

                {expanded && (
                  <div className="pl-6 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                    <div>
                      <p className="font-semibold text-slate-700 dark:text-slate-200">
                        Suggested Approach
                      </p>
                      <p className="mt-0.5 leading-relaxed whitespace-pre-wrap">
                        {item.suggestedAnswer}
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-700 dark:text-slate-200">
                        What Interviewers Look For
                      </p>
                      <p className="mt-0.5 leading-relaxed text-slate-500 dark:text-slate-400">
                        {item.explanation}
                      </p>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">
            AI Career Assistant
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Optional Gemini Free Tier guidance for resume reviews, JD breakdowns, alignment scoring, cover letters, and interview prep.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span>
            {statusLoading
              ? 'Checking AI service...'
              : status?.available
              ? `Connected (${status.model})`
              : 'AI service unavailable'}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void checkAiStatus()}
            aria-label="Refresh AI status"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Privacy & Explicit Initiation Disclosure */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Your resume and job descriptions are only sent to the server Gemini API when you click an Analyze or Generate action. AI scores and suggestions are advisory only and never represent an official employer ATS result.
          </p>
        </div>

        <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-200 shrink-0 cursor-pointer">
          <input
            type="checkbox"
            checked={autoSaveConsent}
            onChange={(e) => setAutoSaveConsent(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span>Auto-save results to History</span>
        </label>
      </div>

      {!statusLoading && status && !status.available && (
        <div
          role="status"
          className="rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 flex items-start gap-3 text-xs text-amber-900 dark:text-amber-200"
        >
          <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">AI Career Assistant is currently unavailable</p>
            <p>
              {status.reason ||
                'Gemini Free Tier API is not configured or reachable right now.'}{' '}
              All non-AI CareerFlow features (applications, interviews, tasks, documents, and analytics) continue working normally.
            </p>
          </div>
        </div>
      )}

      {aiError && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-4 py-3 flex items-start justify-between gap-3 text-sm text-red-700 dark:text-red-300"
        >
          <div className="flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{aiError}</span>
          </div>
          <button
            type="button"
            onClick={() => setAiError(null)}
            className="text-xs underline shrink-0 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {savedFeedback && (
        <div
          role="status"
          className="rounded-lg border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-2.5 text-xs text-emerald-800 dark:text-emerald-300 font-medium"
        >
          {savedFeedback}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-x-auto max-w-full w-fit">
        {(
          [
            { id: 'resume', label: 'Resume Analyzer' },
            { id: 'jd', label: 'JD Analyzer' },
            { id: 'match', label: 'Resume-Job Match' },
            { id: 'cover', label: 'Cover Letter' },
            { id: 'questions', label: 'Interview Questions' },
            { id: 'history', label: `Saved History (${aiHistory.length})` },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setActiveTab(tab.id);
              setAiError(null);
            }}
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

      {/* TAB 1: Resume Analyzer */}
      {activeTab === 'resume' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <Card className="lg:col-span-5">
            <CardHeader>
              <h2 className="text-base font-semibold">Resume Input</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Get structured feedback, detected skills, and formatting recommendations.
              </p>
            </CardHeader>
            <CardContent className="p-5 pt-0 space-y-4">
              <div>
                <Label htmlFor="ai-target-role">Target Role (Optional)</Label>
                <Input
                  id="ai-target-role"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  placeholder="e.g. Senior React Engineer"
                />
              </div>

              {renderResumeContextInput()}

              <Button
                type="button"
                className="w-full"
                disabled={running || resumeText.trim().length < 40}
                onClick={() => void handleRunResumeAnalysis()}
              >
                {running ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                <span>{running ? 'Analyzing Resume...' : 'Analyze Resume'}</span>
              </Button>
            </CardContent>
          </Card>

          <Card className="lg:col-span-7">
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">Resume Analysis</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Advisory AI feedback grounded in your submitted text.
                </p>
              </div>
              {resumeResult && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={savingHistory}
                  onClick={() =>
                    void persistHistoryWithConsent({
                      operationType: 'RESUME_ANALYSIS',
                      title: targetRole
                        ? `Resume Analysis · ${targetRole}`
                        : 'Resume Analysis',
                      inputSummary: `Resume (${resumeText.trim().length} chars)`,
                      result: resumeResult as unknown as Record<string, unknown>,
                    })
                  }
                >
                  <BookmarkCheck className="h-3.5 w-3.5" />
                  <span>Save to History</span>
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-5 pt-0">
              {running ? (
                <div className="space-y-3 py-6">
                  <div className="h-5 w-2/3 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
                  <div className="h-24 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
                  <div className="h-24 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
                </div>
              ) : !resumeResult ? (
                <EmptyState
                  icon={FileText}
                  title="Ready to review your resume"
                  description="Select a saved resume or paste your resume text on the left, then click Analyze Resume."
                />
              ) : (
                <div className="space-y-5 text-sm">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Summary
                    </h3>
                    <p className="mt-1.5 text-slate-700 dark:text-slate-300 leading-relaxed">
                      {resumeResult.summary}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Experience Overview
                    </h3>
                    <p className="mt-1.5 text-slate-700 dark:text-slate-300 leading-relaxed">
                      {resumeResult.experienceSummary}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Skills Detected
                    </h3>
                    <p className="mt-1.5 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                      {resumeResult.skillsDetected.join(' · ') || 'None detected'}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div>
                      <h3 className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1.5">
                        Strengths
                      </h3>
                      <ul className="list-disc pl-4 space-y-1 text-xs text-slate-700 dark:text-slate-300">
                        {resumeResult.strengths.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h3 className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1.5">
                        Areas to Strengthen
                      </h3>
                      <ul className="list-disc pl-4 space-y-1 text-xs text-slate-700 dark:text-slate-300">
                        {resumeResult.weaknesses.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div>
                      <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                        Missing Information
                      </h3>
                      <ul className="list-disc pl-4 space-y-1 text-xs text-slate-600 dark:text-slate-400">
                        {resumeResult.missingInformation.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h3 className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1.5">
                        Improvement Recommendations
                      </h3>
                      <ul className="list-disc pl-4 space-y-1 text-xs text-slate-700 dark:text-slate-300">
                        {resumeResult.improvementRecommendations.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                      ATS-Oriented Formatting Suggestions (Advisory)
                    </h3>
                    <ul className="list-disc pl-4 space-y-1 text-xs text-slate-600 dark:text-slate-400">
                      {resumeResult.atsFormattingSuggestions.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 2: JD Analyzer */}
      {activeTab === 'jd' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <Card className="lg:col-span-5">
            <CardHeader>
              <h2 className="text-base font-semibold">Job Posting Input</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Break down required skills, preferred qualifications, and keywords.
              </p>
            </CardHeader>
            <CardContent className="p-5 pt-0 space-y-4">
              {renderJobContextInputs(false)}
              <Button
                type="button"
                className="w-full"
                disabled={running || jobDescription.trim().length < 40}
                onClick={() => void handleRunJdAnalysis()}
              >
                {running ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                <span>{running ? 'Analyzing Posting...' : 'Analyze Job Description'}</span>
              </Button>
            </CardContent>
          </Card>

          <Card className="lg:col-span-7">
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">Job Requirements Breakdown</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Structured signals extracted directly from the job description.
                </p>
              </div>
              {jdResult && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={savingHistory}
                  onClick={() =>
                    void persistHistoryWithConsent({
                      operationType: 'JD_ANALYSIS',
                      title: `JD Analysis · ${jobTitle || 'Role'}${
                        companyName ? ` at ${companyName}` : ''
                      }`,
                      inputSummary: `${companyName || 'Company'} — ${
                        jobTitle || 'Role'
                      }`,
                      result: jdResult as unknown as Record<string, unknown>,
                    })
                  }
                >
                  <BookmarkCheck className="h-3.5 w-3.5" />
                  <span>Save to History</span>
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-5 pt-0">
              {running ? (
                <div className="space-y-3 py-6">
                  <div className="h-5 w-2/3 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
                  <div className="h-24 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
                </div>
              ) : !jdResult ? (
                <EmptyState
                  icon={Sparkles}
                  title="Analyze a job description"
                  description="Choose one of your tracked applications or paste a job description to extract skills and keywords."
                />
              ) : (
                <div className="space-y-5 text-sm">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Role Overview
                    </h3>
                    <p className="mt-1.5 text-slate-700 dark:text-slate-300 leading-relaxed">
                      {jdResult.summary}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div>
                      <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                        Experience Requirements
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        {jdResult.experienceRequirements || 'Not specified'}
                      </p>
                    </div>
                    <div>
                      <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                        Education Requirements
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        {jdResult.educationRequirements || 'Not specified'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div>
                      <h3 className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1.5">
                        Required Skills
                      </h3>
                      <ul className="list-disc pl-4 space-y-1 text-xs text-slate-700 dark:text-slate-300">
                        {jdResult.requiredSkills.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                        Preferred / Nice-to-Have
                      </h3>
                      <ul className="list-disc pl-4 space-y-1 text-xs text-slate-600 dark:text-slate-400">
                        {jdResult.preferredSkills.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                      Key Responsibilities
                    </h3>
                    <ul className="list-disc pl-4 space-y-1 text-xs text-slate-700 dark:text-slate-300">
                      {jdResult.responsibilities.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                      Important Keywords
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {jdResult.importantKeywords.join(' · ')}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 3: Resume-to-Job Match */}
      {activeTab === 'match' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <Card className="lg:col-span-5">
            <CardHeader>
              <h2 className="text-base font-semibold">Compare Resume &amp; Role</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Evaluate skill coverage, gaps, and alignment recommendations.
              </p>
            </CardHeader>
            <CardContent className="p-5 pt-0 space-y-4">
              {renderResumeContextInput()}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                {renderJobContextInputs(false)}
              </div>
              <Button
                type="button"
                className="w-full"
                disabled={
                  running ||
                  resumeText.trim().length < 40 ||
                  jobDescription.trim().length < 40
                }
                onClick={() => void handleRunMatch()}
              >
                {running ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                <span>{running ? 'Calculating Alignment...' : 'Calculate Match'}</span>
              </Button>
            </CardContent>
          </Card>

          <Card className="lg:col-span-7">
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">Match &amp; Skill Gap Report</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Advisory AI comparison—not an official employer ATS score.
                </p>
              </div>
              {matchResult && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={savingHistory}
                  onClick={() =>
                    void persistHistoryWithConsent({
                      operationType: 'RESUME_JOB_MATCH',
                      title: `Match (${matchResult.matchPercentage}%) · ${
                        jobTitle || 'Role'
                      }${companyName ? ` at ${companyName}` : ''}`,
                      inputSummary: `${companyName || 'Company'} — ${
                        jobTitle || 'Role'
                      }`,
                      result: matchResult as unknown as Record<string, unknown>,
                    })
                  }
                >
                  <BookmarkCheck className="h-3.5 w-3.5" />
                  <span>Save to History</span>
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-5 pt-0">
              {running ? (
                <div className="space-y-3 py-6">
                  <div className="h-12 w-1/3 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
                  <div className="h-24 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
                </div>
              ) : !matchResult ? (
                <EmptyState
                  icon={Sparkles}
                  title="Score resume-to-role alignment"
                  description="Provide both your resume text and a job description to see matched skills, gaps, and tailored edits."
                />
              ) : (
                <div className="space-y-5">
                  <div className="space-y-2 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        Estimated Alignment Score
                      </span>
                      <span
                        className={`font-display text-3xl font-bold font-mono tabular-nums ${
                          matchResult.matchPercentage >= 75
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : matchResult.matchPercentage >= 50
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {matchResult.matchPercentage}%
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          matchResult.matchPercentage >= 75
                            ? 'bg-emerald-600'
                            : matchResult.matchPercentage >= 50
                            ? 'bg-blue-600'
                            : 'bg-amber-500'
                        }`}
                        style={{ width: `${matchResult.matchPercentage}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pt-1">
                      {matchResult.scoreExplanation}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <h3 className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1.5">
                        Matched Skills
                      </h3>
                      <ul className="list-disc pl-4 space-y-1 text-xs text-slate-700 dark:text-slate-300">
                        {matchResult.matchedSkills.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h3 className="text-xs font-semibold text-red-700 dark:text-red-400 mb-1.5">
                        Missing / Unstated Skills
                      </h3>
                      <ul className="list-disc pl-4 space-y-1 text-xs text-slate-700 dark:text-slate-300">
                        {matchResult.missingSkills.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                      Relevant Experience Highlights
                    </h3>
                    <ul className="list-disc pl-4 space-y-1 text-xs text-slate-700 dark:text-slate-300">
                      {matchResult.relevantExperience.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <h3 className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1.5">
                      Tailoring Recommendations
                    </h3>
                    <ul className="list-disc pl-4 space-y-1 text-xs text-slate-700 dark:text-slate-300">
                      {matchResult.recommendations.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 4: Cover Letter Generator */}
      {activeTab === 'cover' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <Card className="lg:col-span-5">
            <CardHeader>
              <h2 className="text-base font-semibold">Cover Letter Context</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Draft a tailored cover letter grounded strictly in your experience.
              </p>
            </CardHeader>
            <CardContent className="p-5 pt-0 space-y-4">
              <div>
                <Label htmlFor="ai-cover-tone">Tone Preference</Label>
                <Select
                  id="ai-cover-tone"
                  value={coverTone}
                  onChange={(e) => setCoverTone(e.target.value)}
                >
                  <option value="Professional">Professional &amp; Direct</option>
                  <option value="Enthusiastic">Warm &amp; Enthusiastic</option>
                  <option value="Concise">Ultra-Concise</option>
                  <option value="Executive">Strategic &amp; Senior</option>
                </Select>
              </div>

              {renderJobContextInputs(true)}

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                {renderResumeContextInput()}
              </div>

              <Button
                type="button"
                className="w-full"
                disabled={
                  running ||
                  !companyName.trim() ||
                  !jobTitle.trim() ||
                  resumeText.trim().length < 40 ||
                  jobDescription.trim().length < 40
                }
                onClick={() => void handleRunCoverLetter()}
              >
                {running ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                <span>
                  {running
                    ? 'Drafting Cover Letter...'
                    : coverResult
                    ? 'Regenerate Cover Letter'
                    : 'Generate Cover Letter'}
                </span>
              </Button>
            </CardContent>
          </Card>

          <Card className="lg:col-span-7">
            <CardHeader className="flex flex-wrap flex-row items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">Editable Draft</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Refine the generated text, copy it, or save directly to your records.
                </p>
              </div>
              {coverResult && (
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      void handleCopy(editableCoverLetter, 'cover-letter')
                    }
                  >
                    {copiedKey === 'cover-letter' ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    <span>{copiedKey === 'cover-letter' ? 'Copied' : 'Copy'}</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={savingHistory}
                    onClick={() =>
                      void persistHistoryWithConsent({
                        operationType: 'COVER_LETTER',
                        title: `Cover Letter · ${companyName} — ${jobTitle}`,
                        inputSummary: `Tone: ${coverTone} · ${companyName} — ${jobTitle}`,
                        result: {
                          subjectLine: coverResult.subjectLine,
                          coverLetter: editableCoverLetter,
                          keyHighlights: coverResult.keyHighlights,
                        },
                      })
                    }
                  >
                    <BookmarkCheck className="h-3.5 w-3.5" />
                    <span>Save History</span>
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="p-5 pt-0 space-y-4">
              {running ? (
                <div className="space-y-3 py-6">
                  <div className="h-5 w-1/2 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
                  <div className="h-56 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
                </div>
              ) : !coverResult ? (
                <EmptyState
                  icon={FileText}
                  title="Draft a tailored cover letter"
                  description="Provide the company, role, job description, and your resume content to generate an editable draft."
                />
              ) : (
                <>
                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Suggested Subject Line
                    </p>
                    <p className="text-sm font-medium text-slate-900 dark:text-white mt-0.5">
                      {coverResult.subjectLine}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="ai-editable-cover">Cover Letter Body</Label>
                    <Textarea
                      id="ai-editable-cover"
                      rows={13}
                      value={editableCoverLetter}
                      onChange={(e) => setEditableCoverLetter(e.target.value)}
                    />
                  </div>

                  {coverResult.keyHighlights.length > 0 && (
                    <div className="text-xs text-slate-600 dark:text-slate-300">
                      <span className="font-semibold">Highlighted Angles: </span>
                      {coverResult.keyHighlights.join(' · ')}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={savingCoverDoc || !editableCoverLetter.trim()}
                      onClick={() => void handleSaveCoverLetterAsDocument()}
                    >
                      {savingCoverDoc ? 'Saving...' : 'Save to Documents'}
                    </Button>
                    {selectedAppId && (
                      <Button
                        type="button"
                        size="sm"
                        disabled={attachingCover || !editableCoverLetter.trim()}
                        onClick={() => void handleAttachCoverLetterToApp()}
                      >
                        {attachingCover
                          ? 'Attaching...'
                          : 'Attach to Application'}
                      </Button>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 5: Interview Question Generator */}
      {activeTab === 'questions' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <Card className="lg:col-span-5">
            <CardHeader>
              <h2 className="text-base font-semibold">Interview Prep Context</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Generate role-specific technical, HR, behavioral, and system design practice questions.
              </p>
            </CardHeader>
            <CardContent className="p-5 pt-0 space-y-4">
              <div>
                <Label htmlFor="ai-q-focus">Question Focus</Label>
                <Select
                  id="ai-q-focus"
                  value={questionFocus}
                  onChange={(e) => setQuestionFocus(e.target.value)}
                >
                  <option value="Balanced">Balanced (All Rounds)</option>
                  <option value="Technical">Technical Deep Dive</option>
                  <option value="Behavioral">Behavioral &amp; Leadership</option>
                  <option value="System Design">Architecture &amp; System Design</option>
                </Select>
              </div>

              {renderJobContextInputs(true)}

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                <Label htmlFor="ai-q-resume">
                  Resume Context (Optional)
                </Label>
                <Textarea
                  id="ai-q-resume"
                  rows={4}
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  placeholder="Optional: paste resume text to tailor follow-up questions to your background..."
                />
              </div>

              <Button
                type="button"
                className="w-full"
                disabled={
                  running ||
                  !jobTitle.trim() ||
                  jobDescription.trim().length < 40
                }
                onClick={() => void handleRunQuestions()}
              >
                {running ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                <span>
                  {running ? 'Generating Questions...' : 'Generate Practice Questions'}
                </span>
              </Button>
            </CardContent>
          </Card>

          <Card className="lg:col-span-7">
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">Practice Question Bank</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Click any question to reveal suggested answer strategy and interviewer rationale.
                </p>
              </div>
              {questionsResult && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={savingHistory}
                  onClick={() =>
                    void persistHistoryWithConsent({
                      operationType: 'INTERVIEW_QUESTIONS',
                      title: `Interview Prep · ${jobTitle}${
                        companyName ? ` at ${companyName}` : ''
                      }`,
                      inputSummary: `Focus: ${questionFocus} · ${
                        companyName || 'Company'
                      } — ${jobTitle}`,
                      result: questionsResult as unknown as Record<string, unknown>,
                    })
                  }
                >
                  <BookmarkCheck className="h-3.5 w-3.5" />
                  <span>Save to History</span>
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-5 pt-0">
              {running ? (
                <div className="space-y-3 py-6">
                  <div className="h-14 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
                  <div className="h-14 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
                  <div className="h-14 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
                </div>
              ) : !questionsResult ? (
                <EmptyState
                  icon={Sparkles}
                  title="Generate targeted interview questions"
                  description="Pick a tracked application or enter role details to create tailored practice prompts and suggested answers."
                />
              ) : (
                <div className="space-y-5">
                  {renderQuestionList('Technical Questions', 'tech', questionsResult.technical)}
                  {renderQuestionList('Role-Specific Questions', 'role', questionsResult.roleSpecific)}
                  {renderQuestionList('Behavioral Questions', 'behav', questionsResult.behavioral)}
                  {renderQuestionList('HR & Culture Questions', 'hr', questionsResult.hr)}
                  {renderQuestionList('System Design Questions', 'sys', questionsResult.systemDesign)}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 6: Saved AI History */}
      {activeTab === 'history' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <Card className="lg:col-span-5">
            <CardHeader>
              <h2 className="text-base font-semibold">Saved AI History</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Only analyses you explicitly saved or opted into appear here.
              </p>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              {historyError && (
                <p className="text-xs text-red-600 dark:text-red-400 mb-3">
                  {historyError}
                </p>
              )}
              {historyLoading ? (
                <div className="space-y-2.5">
                  <div className="h-14 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
                  <div className="h-14 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
                </div>
              ) : aiHistory.length === 0 ? (
                <EmptyState
                  icon={History}
                  title="No saved AI history yet"
                  description="Run an analysis and click Save to History (or enable Auto-save) to keep a record here."
                />
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg">
                  {aiHistory.map((item) => {
                    const isSelected = inspectedHistoryItem?.id === item.id;
                    return (
                      <li
                        key={item.id}
                        className={`p-3.5 flex items-start justify-between gap-3 ${
                          isSelected ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleInspectHistoryItem(item)}
                          className="min-w-0 flex-1 text-left cursor-pointer"
                        >
                          <p className="text-[11px] font-medium text-blue-700 dark:text-blue-400">
                            {OPERATION_LABELS[item.operationType]}
                          </p>
                          <p className="text-sm font-medium text-slate-900 dark:text-white truncate mt-0.5">
                            {item.title}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {item.inputSummary}
                          </p>
                          <p className="text-[11px] font-mono tabular-nums text-slate-400 mt-1">
                            {formatRelativeTime(item.createdAt)}
                          </p>
                        </button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-red-600 dark:text-red-400 shrink-0"
                          onClick={() => {
                            void deleteAiHistoryItem(item.id);
                            if (inspectedHistoryItem?.id === item.id) {
                              setInspectedHistoryItem(null);
                            }
                          }}
                          aria-label={`Delete ${item.title}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-7">
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">
                  {inspectedHistoryItem
                    ? inspectedHistoryItem.title
                    : 'Saved Output Preview'}
                </h2>
                {inspectedHistoryItem && (
                  <p className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400 mt-0.5">
                    {OPERATION_LABELS[inspectedHistoryItem.operationType]} ·{' '}
                    {formatDateTime(inspectedHistoryItem.createdAt)}
                  </p>
                )}
              </div>
              {inspectedHistoryItem?.applicationId && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    onSelectApplication(inspectedHistoryItem.applicationId)
                  }
                >
                  Open Application
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-5 pt-0">
              {!inspectedHistoryItem ? (
                <EmptyState
                  icon={History}
                  title="Select a saved item"
                  description="Click any entry on the left to review its stored analysis or generated content."
                />
              ) : (
                <div className="space-y-4 text-xs text-slate-700 dark:text-slate-300">
                  {Object.entries(inspectedHistoryItem.result).map(([key, val]) => (
                    <div
                      key={key}
                      className="pb-3 border-b border-slate-100 dark:border-slate-800 last:border-b-0"
                    >
                      <p className="font-semibold uppercase tracking-wide text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </p>
                      {Array.isArray(val) ? (
                        <ul className="list-disc pl-4 space-y-1">
                          {val.map((entry, idx) => (
                            <li key={idx}>
                              {typeof entry === 'string'
                                ? entry
                                : typeof entry === 'object' && entry !== null
                                ? `${(entry as InterviewQuestionItem).question ?? ''} — ${(entry as InterviewQuestionItem).suggestedAnswer ?? ''}`
                                : String(entry)}
                            </li>
                          ))}
                        </ul>
                      ) : typeof val === 'string' || typeof val === 'number' ? (
                        <p className="whitespace-pre-wrap leading-relaxed">
                          {String(val)}
                        </p>
                      ) : (
                        <p className="text-slate-500">{String(val)}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
