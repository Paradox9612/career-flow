import {
  ArrowLeft,
  Calendar,
  Check,
  CheckSquare,
  Clock,
  Edit3,
  ExternalLink,
  Plus,
  Square,
  Trash2,
  User,
  Video,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent, CardHeader } from '@/src/components/ui/card';
import { Dialog } from '@/src/components/ui/dialog';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { Select } from '@/src/components/ui/select';
import { Textarea } from '@/src/components/ui/textarea';
import { ensureExternalHref, formatDateTime, generateSafeId } from '@/src/lib/utils';
import {
  updateInterviewFeedback,
  updateInterviewPrep,
  updateInterviewStatusResult,
} from '@/src/services/interviewService';
import {
  FIELD_LIMITS,
  INTERVIEW_RESULTS,
  INTERVIEW_RESULT_META,
  INTERVIEW_STATUSES,
  INTERVIEW_STATUS_META,
  type ChecklistItem,
  type Interview,
  type InterviewResult,
  type InterviewStatus,
  type JobApplication,
} from '@/src/types/careerflow';

interface InterviewDetailViewProps {
  userId: string;
  interview: Interview;
  application?: JobApplication;
  onBack: () => void;
  onEdit: (interview: Interview) => void;
  onDelete: (interview: Interview) => Promise<void>;
  onSelectApplication?: (applicationId: string) => void;
}

export function InterviewDetailView({
  userId,
  interview,
  application,
  onBack,
  onEdit,
  onDelete,
  onSelectApplication,
}: InterviewDetailViewProps) {
  const [updatingHeader, setUpdatingHeader] = useState(false);
  const [headerError, setHeaderError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Preparation state
  const [checklist, setChecklist] = useState<ChecklistItem[]>(
    interview.preparationChecklist ?? []
  );
  const [newChecklistLabel, setNewChecklistLabel] = useState('');
  const [topics, setTopics] = useState<string[]>(interview.topicsToRevise ?? []);
  const [newTopic, setNewTopic] = useState('');
  const [practiceQuestions, setPracticeQuestions] = useState<string[]>(
    interview.questionsToPractice ?? []
  );
  const [newQuestion, setNewQuestion] = useState('');
  const [prepNotes, setPrepNotes] = useState(interview.preparationNotes ?? '');
  const [savingPrep, setSavingPrep] = useState(false);
  const [prepSaved, setPrepSaved] = useState(false);
  const [prepError, setPrepError] = useState<string | null>(null);

  // Post-interview feedback state
  const [feedbackStatus, setFeedbackStatus] = useState<InterviewStatus>(interview.status);
  const [feedbackResult, setFeedbackResult] = useState<InterviewResult>(interview.result);
  const [questionsAsked, setQuestionsAsked] = useState(interview.questionsAsked ?? '');
  const [feedbackNotes, setFeedbackNotes] = useState(interview.feedback ?? '');
  const [savingFeedback, setSavingFeedback] = useState(false);
  const [feedbackSaved, setFeedbackSaved] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  useEffect(() => {
    setChecklist(interview.preparationChecklist ?? []);
    setTopics(interview.topicsToRevise ?? []);
    setPracticeQuestions(interview.questionsToPractice ?? []);
    setPrepNotes(interview.preparationNotes ?? '');
    setFeedbackStatus(interview.status);
    setFeedbackResult(interview.result);
    setQuestionsAsked(interview.questionsAsked ?? '');
    setFeedbackNotes(interview.feedback ?? '');
    setPrepSaved(false);
    setFeedbackSaved(false);
  }, [interview]);

  const meetingHref = ensureExternalHref(interview.meetingUrl);
  const completedCount = checklist.filter((c) => c.done).length;

  const handleHeaderStatusChange = async (nextStatus: InterviewStatus) => {
    setUpdatingHeader(true);
    setHeaderError(null);
    try {
      await updateInterviewStatusResult(userId, interview, application, nextStatus, interview.result);
    } catch (err) {
      setHeaderError(err instanceof Error ? err.message : 'Unable to update status.');
    } finally {
      setUpdatingHeader(false);
    }
  };

  const handleHeaderResultChange = async (nextResult: InterviewResult) => {
    setUpdatingHeader(true);
    setHeaderError(null);
    try {
      await updateInterviewStatusResult(userId, interview, application, interview.status, nextResult);
    } catch (err) {
      setHeaderError(err instanceof Error ? err.message : 'Unable to update result.');
    } finally {
      setUpdatingHeader(false);
    }
  };

  const persistPrep = async (
    nextTopics: string[],
    nextQuestions: string[],
    nextChecklist: ChecklistItem[],
    nextNotes: string
  ) => {
    setSavingPrep(true);
    setPrepError(null);
    setPrepSaved(false);
    try {
      await updateInterviewPrep(interview, {
        topicsToRevise: nextTopics,
        questionsToPractice: nextQuestions,
        preparationChecklist: nextChecklist,
        preparationNotes: nextNotes,
      });
      setPrepSaved(true);
    } catch (err) {
      setPrepError(err instanceof Error ? err.message : 'Unable to save preparation.');
    } finally {
      setSavingPrep(false);
    }
  };

  const handleAddChecklistItem = () => {
    const trimmed = newChecklistLabel.trim().slice(0, FIELD_LIMITS.CHECKLIST_LABEL_MAX);
    if (!trimmed || checklist.length >= FIELD_LIMITS.CHECKLIST_MAX) return;
    const nextChecklist = [
      ...checklist,
      { id: generateSafeId('chk'), label: trimmed, done: false },
    ];
    setChecklist(nextChecklist);
    setNewChecklistLabel('');
    void persistPrep(topics, practiceQuestions, nextChecklist, prepNotes);
  };

  const handleToggleChecklistItem = (id: string) => {
    const nextChecklist = checklist.map((item) =>
      item.id === id ? { ...item, done: !item.done } : item
    );
    setChecklist(nextChecklist);
    void persistPrep(topics, practiceQuestions, nextChecklist, prepNotes);
  };

  const handleRemoveChecklistItem = (id: string) => {
    const nextChecklist = checklist.filter((item) => item.id !== id);
    setChecklist(nextChecklist);
    void persistPrep(topics, practiceQuestions, nextChecklist, prepNotes);
  };

  const handleAddTopic = () => {
    const trimmed = newTopic.trim().slice(0, FIELD_LIMITS.PREP_TOPIC_LEN);
    if (!trimmed || topics.length >= FIELD_LIMITS.PREP_TOPICS_MAX) return;
    if (topics.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
      setNewTopic('');
      return;
    }
    const nextTopics = [...topics, trimmed];
    setTopics(nextTopics);
    setNewTopic('');
    setPrepSaved(false);
  };

  const handleAddPracticeQuestion = () => {
    const trimmed = newQuestion.trim().slice(0, FIELD_LIMITS.PREP_QUESTION_LEN);
    if (!trimmed || practiceQuestions.length >= FIELD_LIMITS.PREP_QUESTIONS_MAX) return;
    const nextQuestions = [...practiceQuestions, trimmed];
    setPracticeQuestions(nextQuestions);
    setNewQuestion('');
    setPrepSaved(false);
  };

  const handleSaveFeedback = async () => {
    setSavingFeedback(true);
    setFeedbackError(null);
    setFeedbackSaved(false);
    try {
      await updateInterviewFeedback(userId, interview, application, {
        status: feedbackStatus,
        questionsAsked,
        feedback: feedbackNotes,
        result: feedbackResult,
      });
      setFeedbackSaved(true);
    } catch (err) {
      setFeedbackError(err instanceof Error ? err.message : 'Unable to save feedback.');
    } finally {
      setSavingFeedback(false);
    }
  };

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(interview);
      setDeleteDialogOpen(false);
    } catch (err) {
      setHeaderError(err instanceof Error ? err.message : 'Unable to delete interview.');
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {meetingHref && (
            <a
              href={meetingHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors"
            >
              <Video className="h-3.5 w-3.5" />
              <span>Join Meeting</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
          <Button type="button" variant="outline" size="sm" onClick={() => onEdit(interview)}>
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

      {headerError && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-300"
        >
          {headerError}
        </div>
      )}

      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5 sm:gap-6">
            <div className="space-y-2 min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                {application ? (
                  onSelectApplication ? (
                    <button
                      type="button"
                      onClick={() => onSelectApplication(application.id)}
                      className="font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer text-left"
                    >
                      {application.companyName} — {application.jobTitle}
                    </button>
                  ) : (
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {application.companyName} — {application.jobTitle}
                    </span>
                  )
                ) : (
                  <span>Linked Application</span>
                )}
                <span aria-hidden="true">·</span>
                <span>{interview.interviewType}</span>
              </div>

              <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white break-words">
                {interview.roundName}
              </h1>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500 dark:text-slate-400 pt-1">
                <span className="inline-flex items-center gap-1.5 font-mono tabular-nums text-slate-700 dark:text-slate-300">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  <span>{formatDateTime(interview.scheduledAt)}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 font-mono tabular-nums">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  <span>{interview.durationMinutes ?? 45} min</span>
                </span>
                {interview.interviewer && (
                  <span className="inline-flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-slate-400" />
                    <span>{interview.interviewer}</span>
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:items-center gap-3 shrink-0">
              <div className="sm:min-w-[150px]">
                <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Interview Status
                </span>
                <Select
                  aria-label="Interview status"
                  value={interview.status}
                  disabled={updatingHeader}
                  onChange={(e) => handleHeaderStatusChange(e.target.value as InterviewStatus)}
                  className={INTERVIEW_STATUS_META[interview.status].toneClass}
                >
                  {INTERVIEW_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="sm:min-w-[130px]">
                <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Outcome
                </span>
                <Select
                  aria-label="Interview result"
                  value={interview.result}
                  disabled={updatingHeader}
                  onChange={(e) => handleHeaderResultChange(e.target.value as InterviewResult)}
                  className={INTERVIEW_RESULT_META[interview.result].toneClass}
                >
                  {INTERVIEW_RESULTS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Preparation Workspace */}
        <Card className="lg:col-span-7 min-w-0">
          <CardHeader className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">Interview Preparation</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Checklist, revision topics, practice questions, and prep notes
              </p>
            </div>
            {checklist.length > 0 && (
              <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                {completedCount}/{checklist.length} ready
              </span>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {prepError && (
              <div
                role="alert"
                className="rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-3.5 py-2 text-xs text-red-700 dark:text-red-300"
              >
                {prepError}
              </div>
            )}

            {/* Preparation Checklist */}
            <div className="space-y-2.5">
              <Label>Preparation Checklist</Label>
              <div className="flex gap-2">
                <Input
                  value={newChecklistLabel}
                  onChange={(e) => setNewChecklistLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddChecklistItem();
                    }
                  }}
                  placeholder="e.g. Review system architecture notes"
                  maxLength={FIELD_LIMITS.CHECKLIST_LABEL_MAX}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddChecklistItem}
                  disabled={!newChecklistLabel.trim() || checklist.length >= FIELD_LIMITS.CHECKLIST_MAX}
                >
                  <Plus className="h-4 w-4" />
                  <span>Add</span>
                </Button>
              </div>
              {checklist.length > 0 ? (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg">
                  {checklist.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
                    >
                      <button
                        type="button"
                        onClick={() => handleToggleChecklistItem(item.id)}
                        className="flex items-center gap-2.5 text-left flex-1 min-w-0 cursor-pointer"
                      >
                        {item.done ? (
                          <CheckSquare className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        ) : (
                          <Square className="h-4 w-4 text-slate-400 shrink-0" />
                        )}
                        <span
                          className={`truncate ${
                            item.done
                              ? 'line-through text-slate-400 dark:text-slate-500'
                              : 'text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          {item.label}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveChecklistItem(item.id)}
                        aria-label={`Remove checklist item ${item.label}`}
                        className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 p-1 cursor-pointer shrink-0"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-400">
                  No checklist items yet. Add steps to track readiness before the interview.
                </p>
              )}
            </div>

            {/* Topics to Revise */}
            <div className="space-y-2.5">
              <Label>Topics to Revise</Label>
              <div className="flex gap-2">
                <Input
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTopic();
                    }
                  }}
                  placeholder="e.g. React concurrency, Distributed caching"
                  maxLength={FIELD_LIMITS.PREP_TOPIC_LEN}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddTopic}
                  disabled={!newTopic.trim() || topics.length >= FIELD_LIMITS.PREP_TOPICS_MAX}
                >
                  <Plus className="h-4 w-4" />
                  <span>Add</span>
                </Button>
              </div>
              {topics.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {topics.map((topic) => (
                    <span
                      key={topic}
                      className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200"
                    >
                      <span>{topic}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setTopics(topics.filter((t) => t !== topic));
                          setPrepSaved(false);
                        }}
                        aria-label={`Remove topic ${topic}`}
                        className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Questions to Practice */}
            <div className="space-y-2.5">
              <Label>Questions to Practice</Label>
              <div className="flex gap-2">
                <Input
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddPracticeQuestion();
                    }
                  }}
                  placeholder="e.g. Walk through a time you resolved a production bottleneck"
                  maxLength={FIELD_LIMITS.PREP_QUESTION_LEN}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddPracticeQuestion}
                  disabled={
                    !newQuestion.trim() ||
                    practiceQuestions.length >= FIELD_LIMITS.PREP_QUESTIONS_MAX
                  }
                >
                  <Plus className="h-4 w-4" />
                  <span>Add</span>
                </Button>
              </div>
              {practiceQuestions.length > 0 && (
                <ul className="space-y-1.5">
                  {practiceQuestions.map((q, idx) => (
                    <li
                      key={`${idx}-${q.slice(0, 20)}`}
                      className="flex items-start justify-between gap-2 rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs text-slate-700 dark:text-slate-300"
                    >
                      <span className="leading-relaxed">
                        <span className="font-mono text-slate-400 mr-2">{idx + 1}.</span>
                        {q}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setPracticeQuestions(practiceQuestions.filter((_, i) => i !== idx));
                          setPrepSaved(false);
                        }}
                        aria-label="Remove practice question"
                        className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 p-0.5 cursor-pointer shrink-0"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Personal Prep Notes */}
            <div>
              <Label htmlFor="detail-prep-notes">Personal Preparation Notes</Label>
              <Textarea
                id="detail-prep-notes"
                rows={5}
                value={prepNotes}
                onChange={(e) => {
                  setPrepNotes(e.target.value);
                  setPrepSaved(false);
                }}
                placeholder="Key stories, architecture diagrams to sketch, questions to ask the interviewer..."
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
              {prepSaved && (
                <span className="text-xs text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1">
                  <Check className="h-3.5 w-3.5" />
                  <span>Preparation saved</span>
                </span>
              )}
              <Button
                type="button"
                disabled={savingPrep}
                onClick={() =>
                  persistPrep(topics, practiceQuestions, checklist, prepNotes)
                }
              >
                {savingPrep ? 'Saving...' : 'Save Preparation'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Post-Interview Feedback */}
        <Card className="lg:col-span-5 min-w-0">
          <CardHeader>
            <h2 className="text-base font-semibold">Post-Interview Feedback</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Log actual questions asked, performance reflections, and round outcome
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {feedbackError && (
              <div
                role="alert"
                className="rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-3.5 py-2 text-xs text-red-700 dark:text-red-300"
              >
                {feedbackError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="fb-status">Round Status</Label>
                <Select
                  id="fb-status"
                  value={feedbackStatus}
                  onChange={(e) => {
                    setFeedbackStatus(e.target.value as InterviewStatus);
                    setFeedbackSaved(false);
                  }}
                >
                  {INTERVIEW_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="fb-result">Result</Label>
                <Select
                  id="fb-result"
                  value={feedbackResult}
                  onChange={(e) => {
                    setFeedbackResult(e.target.value as InterviewResult);
                    setFeedbackSaved(false);
                  }}
                >
                  {INTERVIEW_RESULTS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="fb-questions">Questions Asked</Label>
              <Textarea
                id="fb-questions"
                rows={5}
                value={questionsAsked}
                onChange={(e) => {
                  setQuestionsAsked(e.target.value);
                  setFeedbackSaved(false);
                }}
                placeholder="Record technical problems, coding prompts, or behavioral questions asked..."
              />
            </div>

            <div>
              <Label htmlFor="fb-notes">Feedback & Takeaways</Label>
              <Textarea
                id="fb-notes"
                rows={5}
                value={feedbackNotes}
                onChange={(e) => {
                  setFeedbackNotes(e.target.value);
                  setFeedbackSaved(false);
                }}
                placeholder="How the round went, interviewer reactions, areas to sharpen next time..."
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
              {feedbackSaved && (
                <span className="text-xs text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1">
                  <Check className="h-3.5 w-3.5" />
                  <span>Feedback saved</span>
                </span>
              )}
              <Button type="button" disabled={savingFeedback} onClick={handleSaveFeedback}>
                {savingFeedback ? 'Saving...' : 'Save Feedback'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        title="Delete interview round"
        description="This permanently removes this interview round and its preparation/feedback notes."
        maxWidthClass="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Are you sure you want to delete{' '}
            <strong className="font-semibold text-slate-900 dark:text-white">
              {interview.roundName}
            </strong>
            {application ? ` for ${application.companyName}` : ''}?
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
              {deleting ? 'Deleting...' : 'Delete Interview'}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
