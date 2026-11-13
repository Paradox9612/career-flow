import { zodResolver } from '@hookform/resolvers/zod';
import { format, isValid, parseISO } from 'date-fns';
import { CalendarClock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/src/components/ui/button';
import { Dialog } from '@/src/components/ui/dialog';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { Select } from '@/src/components/ui/select';
import { Textarea } from '@/src/components/ui/textarea';
import { todayIsoDate } from '@/src/lib/utils';
import { createInterview, updateInterview } from '@/src/services/interviewService';
import {
  FIELD_LIMITS,
  INTERVIEW_RESULTS,
  INTERVIEW_STATUSES,
  INTERVIEW_TYPES,
  type Interview,
  type JobApplication,
} from '@/src/types/careerflow';

const interviewSchema = z.object({
  applicationId: z.string().min(1, 'Please select a job application.'),
  roundName: z
    .string()
    .trim()
    .min(1, 'Round name is required.')
    .max(FIELD_LIMITS.ROUND_NAME_MAX),
  interviewType: z.enum(INTERVIEW_TYPES),
  scheduledAt: z
    .string()
    .trim()
    .min(1, 'Date and time are required.')
    .max(FIELD_LIMITS.SCHEDULED_AT_MAX),
  durationMinutes: z.coerce
    .number()
    .int()
    .min(10, 'Minimum 10 minutes.')
    .max(480, 'Maximum 480 minutes.'),
  interviewer: z.string().max(FIELD_LIMITS.INTERVIEWER_MAX).optional().default(''),
  meetingUrl: z.string().max(FIELD_LIMITS.URL_MAX).optional().default(''),
  status: z.enum(INTERVIEW_STATUSES),
  result: z.enum(INTERVIEW_RESULTS),
  preparationNotes: z.string().max(FIELD_LIMITS.INTERVIEW_TEXT_MAX).optional().default(''),
});

type FormValues = z.infer<typeof interviewSchema>;

interface InterviewFormModalProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  applications: JobApplication[];
  editingInterview?: Interview | null;
  defaultApplicationId?: string | null;
  defaultDate?: string | null;
  onSaved?: (interviewId: string) => void;
  onRequestCreateApplication?: () => void;
}

function toDatetimeLocalValue(isoOrLocal?: string, fallbackDate?: string | null): string {
  if (isoOrLocal) {
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(isoOrLocal)) {
      return isoOrLocal.slice(0, 16);
    }
    const parsed = parseISO(isoOrLocal);
    if (isValid(parsed)) {
      return format(parsed, "yyyy-MM-dd'T'HH:mm");
    }
  }
  const datePart = fallbackDate && /^\d{4}-\d{2}-\d{2}$/.test(fallbackDate)
    ? fallbackDate
    : todayIsoDate();
  return `${datePart}T10:00`;
}

export function InterviewFormModal({
  open,
  onClose,
  userId,
  applications,
  editingInterview,
  defaultApplicationId,
  defaultDate,
  onSaved,
  onRequestCreateApplication,
}: InterviewFormModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(interviewSchema) as never,
    defaultValues: {
      applicationId: '',
      roundName: '',
      interviewType: 'Technical',
      scheduledAt: toDatetimeLocalValue(undefined, defaultDate),
      durationMinutes: 45,
      interviewer: '',
      meetingUrl: '',
      status: 'Scheduled',
      result: 'Pending',
      preparationNotes: '',
    },
  });

  useEffect(() => {
    if (!open) return;
    setSubmitError(null);
    if (editingInterview) {
      form.reset({
        applicationId: editingInterview.applicationId,
        roundName: editingInterview.roundName,
        interviewType: editingInterview.interviewType,
        scheduledAt: toDatetimeLocalValue(editingInterview.scheduledAt),
        durationMinutes: editingInterview.durationMinutes ?? 45,
        interviewer: editingInterview.interviewer ?? '',
        meetingUrl: editingInterview.meetingUrl ?? '',
        status: editingInterview.status,
        result: editingInterview.result,
        preparationNotes: editingInterview.preparationNotes ?? '',
      });
    } else {
      const initialAppId =
        defaultApplicationId && applications.some((a) => a.id === defaultApplicationId)
          ? defaultApplicationId
          : applications[0]?.id ?? '';
      form.reset({
        applicationId: initialAppId,
        roundName: '',
        interviewType: 'Technical',
        scheduledAt: toDatetimeLocalValue(undefined, defaultDate),
        durationMinutes: 45,
        interviewer: '',
        meetingUrl: '',
        status: 'Scheduled',
        result: 'Pending',
        preparationNotes: '',
      });
    }
  }, [open, editingInterview, defaultApplicationId, defaultDate, applications, form]);

  const onSubmit = async (values: FormValues) => {
    const linkedApp = applications.find((a) => a.id === values.applicationId);
    if (!linkedApp && !editingInterview) {
      setSubmitError('Please select a valid job application first.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      if (editingInterview) {
        await updateInterview(userId, editingInterview, linkedApp, {
          applicationId: editingInterview.applicationId,
          roundName: values.roundName,
          interviewType: values.interviewType,
          scheduledAt: values.scheduledAt,
          durationMinutes: values.durationMinutes,
          interviewer: values.interviewer,
          meetingUrl: values.meetingUrl,
          status: values.status,
          result: values.result,
          preparationNotes: values.preparationNotes,
          topicsToRevise: editingInterview.topicsToRevise ?? [],
          questionsToPractice: editingInterview.questionsToPractice ?? [],
          preparationChecklist: editingInterview.preparationChecklist ?? [],
          questionsAsked: editingInterview.questionsAsked ?? '',
          feedback: editingInterview.feedback ?? '',
        });
        onSaved?.(editingInterview.id);
      } else if (linkedApp) {
        const createdId = await createInterview(userId, linkedApp, {
          applicationId: linkedApp.id,
          roundName: values.roundName,
          interviewType: values.interviewType,
          scheduledAt: values.scheduledAt,
          durationMinutes: values.durationMinutes,
          interviewer: values.interviewer,
          meetingUrl: values.meetingUrl,
          status: values.status,
          result: values.result,
          preparationNotes: values.preparationNotes,
          topicsToRevise: [],
          questionsToPractice: [],
          preparationChecklist: [],
          questionsAsked: '',
          feedback: '',
        });
        onSaved?.(createdId);
      }
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Unable to save interview.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={editingInterview ? 'Edit Interview Round' : 'Schedule Interview Round'}
      description={
        editingInterview
          ? `Update details for ${editingInterview.roundName}`
          : 'Link an interview round to a tracked job application and set up preparation notes.'
      }
      maxWidthClass="max-w-2xl"
    >
      {applications.length === 0 && !editingInterview ? (
        <div className="py-6 text-center space-y-4">
          <div className="h-11 w-11 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center mx-auto">
            <CalendarClock className="h-5 w-5" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-sm font-semibold">Add a job application first</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Every interview round belongs to a tracked job application so its timeline, company context, and outcomes stay synchronized.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            {onRequestCreateApplication && (
              <Button
                type="button"
                onClick={() => {
                  onClose();
                  onRequestCreateApplication();
                }}
              >
                Create Application
              </Button>
            )}
          </div>
        </div>
      ) : (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          {submitError && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-3.5 py-2.5 text-xs text-red-700 dark:text-red-300"
            >
              {submitError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label htmlFor="int-application">Associated Application *</Label>
              <Select
                id="int-application"
                disabled={Boolean(editingInterview)}
                {...form.register('applicationId')}
              >
                <option value="">Select application...</option>
                {applications.map((app) => (
                  <option key={app.id} value={app.id}>
                    {app.companyName} — {app.jobTitle} ({app.status})
                  </option>
                ))}
              </Select>
              {form.formState.errors.applicationId && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  {form.formState.errors.applicationId.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="int-round">Round Name *</Label>
              <Input
                id="int-round"
                placeholder="e.g. Technical Screen, System Design"
                {...form.register('roundName')}
              />
              {form.formState.errors.roundName && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  {form.formState.errors.roundName.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="int-type">Interview Type</Label>
              <Select id="int-type" {...form.register('interviewType')}>
                {INTERVIEW_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label htmlFor="int-scheduled">Date & Time *</Label>
              <Input
                id="int-scheduled"
                type="datetime-local"
                className="font-mono"
                {...form.register('scheduledAt')}
              />
              {form.formState.errors.scheduledAt && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  {form.formState.errors.scheduledAt.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="int-duration">Duration (minutes)</Label>
              <Input
                id="int-duration"
                type="number"
                min={10}
                max={480}
                className="font-mono tabular-nums"
                {...form.register('durationMinutes')}
              />
              {form.formState.errors.durationMinutes && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  {form.formState.errors.durationMinutes.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="int-interviewer">Interviewer(s)</Label>
              <Input
                id="int-interviewer"
                placeholder="e.g. Maya Patel (Staff Engineer)"
                {...form.register('interviewer')}
              />
            </div>

            <div>
              <Label htmlFor="int-meeting">Meeting Link</Label>
              <Input
                id="int-meeting"
                placeholder="https://meet.google.com/..."
                {...form.register('meetingUrl')}
              />
            </div>

            <div>
              <Label htmlFor="int-status">Status</Label>
              <Select id="int-status" {...form.register('status')}>
                {INTERVIEW_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label htmlFor="int-result">Outcome / Result</Label>
              <Select id="int-result" {...form.register('result')}>
                {INTERVIEW_RESULTS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </Select>
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="int-notes">Initial Preparation Notes</Label>
              <Textarea
                id="int-notes"
                rows={4}
                placeholder="Agenda, focus areas, or key projects to highlight..."
                {...form.register('preparationNotes')}
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <span className="text-xs text-slate-400">Fields marked with * are required.</span>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting
                  ? 'Saving...'
                  : editingInterview
                  ? 'Save Changes'
                  : 'Schedule Interview'}
              </Button>
            </div>
          </div>
        </form>
      )}
    </Dialog>
  );
}
