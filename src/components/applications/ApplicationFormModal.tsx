import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/src/components/ui/button';
import { Dialog } from '@/src/components/ui/dialog';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { Select } from '@/src/components/ui/select';
import { Textarea } from '@/src/components/ui/textarea';
import { ensureExternalHref } from '@/src/lib/utils';
import {
  createApplication,
  findDuplicateApplications,
  updateApplication,
} from '@/src/services/applicationService';
import { formatResumeReference } from '@/src/services/documentService';
import {
  APPLICATION_STATUSES,
  EMPLOYMENT_TYPES,
  FIELD_LIMITS,
  JOB_SOURCES,
  PRIORITIES,
  WORK_MODES,
  type DocumentRecord,
  type JobApplication,
} from '@/src/types/careerflow';

const applicationSchema = z.object({
  companyName: z
    .string()
    .trim()
    .min(1, 'Company name is required.')
    .max(FIELD_LIMITS.COMPANY_NAME_MAX),
  companyWebsite: z.string().max(FIELD_LIMITS.SHORT_URL_MAX).optional().default(''),
  companyLogo: z.string().max(FIELD_LIMITS.URL_MAX).optional().default(''),
  industry: z.string().max(FIELD_LIMITS.INDUSTRY_MAX).optional().default(''),
  companyLocation: z.string().max(FIELD_LIMITS.LOCATION_MAX).optional().default(''),
  jobTitle: z
    .string()
    .trim()
    .min(1, 'Job title is required.')
    .max(FIELD_LIMITS.JOB_TITLE_MAX),
  jobUrl: z.string().max(FIELD_LIMITS.URL_MAX).optional().default(''),
  location: z.string().max(FIELD_LIMITS.LOCATION_MAX).optional().default(''),
  workMode: z.enum(WORK_MODES),
  employmentType: z.enum(EMPLOYMENT_TYPES),
  experienceRequired: z.string().max(FIELD_LIMITS.EXPERIENCE_MAX).optional().default(''),
  salary: z.string().max(FIELD_LIMITS.SALARY_MAX).optional().default(''),
  source: z.string().max(FIELD_LIMITS.SOURCE_MAX).optional().default(''),
  jobDescription: z.string().max(FIELD_LIMITS.JOB_DESCRIPTION_MAX).optional().default(''),
  status: z.enum(APPLICATION_STATUSES),
  priority: z.enum(PRIORITIES),
  appliedDate: z.string().max(FIELD_LIMITS.DATE_MAX).optional().default(''),
  nextFollowUpDate: z.string().max(FIELD_LIMITS.DATE_MAX).optional().default(''),
  resumeVersion: z.string().max(FIELD_LIMITS.RESUME_VERSION_MAX).optional().default(''),
  coverLetter: z.string().max(FIELD_LIMITS.COVER_LETTER_MAX).optional().default(''),
  recruiterName: z.string().max(FIELD_LIMITS.NAME_MAX).optional().default(''),
  recruiterEmail: z
    .string()
    .max(FIELD_LIMITS.EMAIL_MAX)
    .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), 'Enter a valid recruiter email.')
    .optional()
    .default(''),
  recruiterLinkedinUrl: z.string().max(FIELD_LIMITS.SHORT_URL_MAX).optional().default(''),
  notes: z.string().max(FIELD_LIMITS.NOTES_MAX).optional().default(''),
});

type FormValues = z.infer<typeof applicationSchema>;

interface ApplicationFormModalProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  existingApplications: JobApplication[];
  documents?: DocumentRecord[];
  editingApplication?: JobApplication | null;
  onSaved?: (applicationId: string) => void;
  onInspectDuplicate?: (application: JobApplication) => void;
}

const DEFAULT_VALUES: FormValues = {
  companyName: '',
  companyWebsite: '',
  companyLogo: '',
  industry: '',
  companyLocation: '',
  jobTitle: '',
  jobUrl: '',
  location: '',
  workMode: 'Hybrid',
  employmentType: 'Full-time',
  experienceRequired: '',
  salary: '',
  source: 'LinkedIn',
  jobDescription: '',
  status: 'Interested',
  priority: 'Medium',
  appliedDate: '',
  nextFollowUpDate: '',
  resumeVersion: '',
  coverLetter: '',
  recruiterName: '',
  recruiterEmail: '',
  recruiterLinkedinUrl: '',
  notes: '',
};

export function ApplicationFormModal({
  open,
  onClose,
  userId,
  existingApplications,
  documents = [],
  editingApplication,
  onSaved,
  onInspectDuplicate,
}: ApplicationFormModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'core' | 'details' | 'recruiter'>('core');

  const form = useForm<FormValues>({
    resolver: zodResolver(applicationSchema) as never,
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    if (!open) return;
    setSubmitError(null);
    setActiveSection('core');
    if (editingApplication) {
      form.reset({
        companyName: editingApplication.companyName || '',
        companyWebsite: editingApplication.companyWebsite || '',
        companyLogo: editingApplication.companyLogo || '',
        industry: editingApplication.industry || '',
        companyLocation: editingApplication.companyLocation || '',
        jobTitle: editingApplication.jobTitle || '',
        jobUrl: editingApplication.jobUrl || '',
        location: editingApplication.location || '',
        workMode: editingApplication.workMode || 'Hybrid',
        employmentType: editingApplication.employmentType || 'Full-time',
        experienceRequired: editingApplication.experienceRequired || '',
        salary: editingApplication.salary || '',
        source: editingApplication.source || '',
        jobDescription: editingApplication.jobDescription || '',
        status: editingApplication.status || 'Interested',
        priority: editingApplication.priority || 'Medium',
        appliedDate: editingApplication.appliedDate || '',
        nextFollowUpDate: editingApplication.nextFollowUpDate || '',
        resumeVersion: editingApplication.resumeVersion || '',
        coverLetter: editingApplication.coverLetter || '',
        recruiterName: editingApplication.recruiterName || '',
        recruiterEmail: editingApplication.recruiterEmail || '',
        recruiterLinkedinUrl: editingApplication.recruiterLinkedinUrl || '',
        notes: editingApplication.notes || '',
      });
    } else {
      form.reset(DEFAULT_VALUES);
    }
  }, [open, editingApplication, form]);

  const watchCompany = form.watch('companyName');
  const watchTitle = form.watch('jobTitle');
  const watchUrl = form.watch('jobUrl');

  const duplicateMatches = useMemo(() => {
    if (editingApplication) return [];
    return findDuplicateApplications(existingApplications, {
      companyName: watchCompany || '',
      jobTitle: watchTitle || '',
      jobUrl: watchUrl || '',
    });
  }, [editingApplication, existingApplications, watchCompany, watchTitle, watchUrl]);

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      if (editingApplication) {
        await updateApplication(userId, editingApplication, values);
        onSaved?.(editingApplication.id);
      } else {
        const newId = await createApplication(userId, values);
        onSaved?.(newId);
      }
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Unable to save application.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={editingApplication ? 'Edit Job Application' : 'Add Job Application'}
      description={
        editingApplication
          ? `Updating ${editingApplication.jobTitle} at ${editingApplication.companyName}`
          : 'Track a new role with company details, status, recruiter info, and follow-up dates.'
      }
      maxWidthClass="max-w-3xl"
    >
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        {submitError && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-3.5 py-2.5 text-xs text-red-700 dark:text-red-300"
          >
            {submitError}
          </div>
        )}

        {duplicateMatches.length > 0 && (
          <div
            role="status"
            className="rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-xs text-amber-900 dark:text-amber-200 space-y-2"
          >
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">
                  Possible duplicate application detected ({duplicateMatches.length})
                </p>
                <p className="text-amber-800 dark:text-amber-300 mt-0.5">
                  You can review existing records below or continue saving if this is a distinct role.
                </p>
              </div>
            </div>
            <ul className="space-y-1.5 pl-6">
              {duplicateMatches.slice(0, 3).map(({ application, reasons }) => (
                <li key={application.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2">
                  <span>
                    <strong className="font-medium">{application.companyName}</strong> —{' '}
                    {application.jobTitle} ({application.status}) · {reasons.join(', ')}
                  </span>
                  {onInspectDuplicate && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onInspectDuplicate(application);
                      }}
                      className="inline-flex items-center gap-1 text-amber-800 dark:text-amber-300 underline hover:no-underline cursor-pointer shrink-0 self-start sm:self-auto"
                    >
                      <span>View</span>
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg w-full sm:w-fit overflow-x-auto max-w-full">
          {(
            [
              { id: 'core', label: 'Role & Status' },
              { id: 'details', label: 'Company & Job Description' },
              { id: 'recruiter', label: 'Recruiter, Resume & Notes' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSection(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeSection === tab.id
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeSection === 'core' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="app-company">Company Name *</Label>
              <Input
                id="app-company"
                placeholder="e.g. Stripe"
                {...form.register('companyName')}
              />
              {form.formState.errors.companyName && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  {form.formState.errors.companyName.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="app-title">Job Title *</Label>
              <Input
                id="app-title"
                placeholder="e.g. Senior Frontend Engineer"
                {...form.register('jobTitle')}
              />
              {form.formState.errors.jobTitle && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  {form.formState.errors.jobTitle.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="app-status">Current Status</Label>
              <Select id="app-status" {...form.register('status')}>
                {APPLICATION_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label htmlFor="app-priority">Priority</Label>
              <Select id="app-priority" {...form.register('priority')}>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label htmlFor="app-workmode">Work Mode</Label>
              <Select id="app-workmode" {...form.register('workMode')}>
                {WORK_MODES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label htmlFor="app-emptype">Employment Type</Label>
              <Select id="app-emptype" {...form.register('employmentType')}>
                {EMPLOYMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label htmlFor="app-location">Job Location</Label>
              <Input
                id="app-location"
                placeholder="e.g. San Francisco, CA or Remote"
                {...form.register('location')}
              />
            </div>

            <div>
              <Label htmlFor="app-salary">Salary Range</Label>
              <Input
                id="app-salary"
                placeholder="e.g. $140k – $170k"
                {...form.register('salary')}
              />
            </div>

            <div>
              <Label htmlFor="app-applied">Application Date</Label>
              <Input id="app-applied" type="date" {...form.register('appliedDate')} />
            </div>

            <div>
              <Label htmlFor="app-followup">Next Follow-Up Date</Label>
              <Input id="app-followup" type="date" {...form.register('nextFollowUpDate')} />
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="app-url">Job Posting URL</Label>
              <Input
                id="app-url"
                placeholder="https://company.com/careers/role"
                {...form.register('jobUrl')}
              />
              {ensureExternalHref(watchUrl) && (
                <p className="text-xs text-slate-400 mt-1">
                  Duplicate detection checks this URL automatically.
                </p>
              )}
            </div>
          </div>
        )}

        {activeSection === 'details' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="app-website">Company Website</Label>
              <Input
                id="app-website"
                placeholder="https://company.com"
                {...form.register('companyWebsite')}
              />
            </div>

            <div>
              <Label htmlFor="app-industry">Industry</Label>
              <Input
                id="app-industry"
                placeholder="e.g. FinTech, Developer Tools"
                {...form.register('industry')}
              />
            </div>

            <div>
              <Label htmlFor="app-company-loc">Company Headquarters</Label>
              <Input
                id="app-company-loc"
                placeholder="e.g. New York, NY"
                {...form.register('companyLocation')}
              />
            </div>

            <div>
              <Label htmlFor="app-source">Job Source</Label>
              <Select id="app-source" {...form.register('source')}>
                <option value="">Select source</option>
                {JOB_SOURCES.map((src) => (
                  <option key={src} value={src}>
                    {src}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label htmlFor="app-exp">Experience Required</Label>
              <Input
                id="app-exp"
                placeholder="e.g. 3-5 years"
                {...form.register('experienceRequired')}
              />
            </div>

            <div>
              <Label htmlFor="app-logo">Company Logo URL (Optional)</Label>
              <Input
                id="app-logo"
                placeholder="https://..."
                {...form.register('companyLogo')}
              />
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="app-jd">Job Description</Label>
              <Textarea
                id="app-jd"
                rows={7}
                placeholder="Paste the job responsibilities and requirements for quick reference..."
                {...form.register('jobDescription')}
              />
            </div>
          </div>
        )}

        {activeSection === 'recruiter' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1">
                <Label htmlFor="app-resume" className="mb-0">Resume Version Used</Label>
                {documents.filter((d) => d.documentType === 'Resume').length > 0 && (
                  <select
                    aria-label="Choose from saved resumes"
                    defaultValue=""
                    onChange={(e) => {
                      const chosen = documents.find((d) => d.id === e.target.value);
                      if (chosen) {
                        form.setValue('resumeVersion', formatResumeReference(chosen), {
                          shouldDirty: true,
                        });
                      }
                      e.target.value = '';
                    }}
                    className="text-[11px] text-blue-600 dark:text-blue-400 bg-transparent border-0 cursor-pointer focus:outline-none max-w-[165px] truncate"
                  >
                    <option value="">Pick saved resume...</option>
                    {documents
                      .filter((d) => d.documentType === 'Resume')
                      .map((doc) => (
                        <option key={doc.id} value={doc.id}>
                          {formatResumeReference(doc)}
                        </option>
                      ))}
                  </select>
                )}
              </div>
              <Input
                id="app-resume"
                placeholder="e.g. Frontend_Resume_v3.pdf"
                {...form.register('resumeVersion')}
              />
            </div>

            <div>
              <Label htmlFor="app-rec-name">Recruiter Name</Label>
              <Input
                id="app-rec-name"
                placeholder="e.g. Jordan Lee"
                {...form.register('recruiterName')}
              />
            </div>

            <div>
              <Label htmlFor="app-rec-email">Recruiter Email</Label>
              <Input
                id="app-rec-email"
                type="email"
                placeholder="jordan@company.com"
                {...form.register('recruiterEmail')}
              />
              {form.formState.errors.recruiterEmail && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  {form.formState.errors.recruiterEmail.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="app-rec-li">Recruiter LinkedIn URL</Label>
              <Input
                id="app-rec-li"
                placeholder="https://linkedin.com/in/..."
                {...form.register('recruiterLinkedinUrl')}
              />
            </div>

            <div className="sm:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1">
                <Label htmlFor="app-cover" className="mb-0">Cover Letter</Label>
                {documents.filter(
                  (d) => d.documentType === 'Cover Letter' && (d.content ?? '').trim().length > 0
                ).length > 0 && (
                  <select
                    aria-label="Insert saved cover letter"
                    defaultValue=""
                    onChange={(e) => {
                      const chosen = documents.find((d) => d.id === e.target.value);
                      if (chosen?.content) {
                        form.setValue(
                          'coverLetter',
                          chosen.content.slice(0, FIELD_LIMITS.COVER_LETTER_MAX),
                          { shouldDirty: true }
                        );
                      }
                      e.target.value = '';
                    }}
                    className="text-[11px] text-blue-600 dark:text-blue-400 bg-transparent border-0 cursor-pointer focus:outline-none max-w-[210px] truncate"
                  >
                    <option value="">Insert saved cover letter...</option>
                    {documents
                      .filter(
                        (d) =>
                          d.documentType === 'Cover Letter' &&
                          (d.content ?? '').trim().length > 0
                      )
                      .map((doc) => (
                        <option key={doc.id} value={doc.id}>
                          {doc.name} ({doc.version})
                        </option>
                      ))}
                  </select>
                )}
              </div>
              <Textarea
                id="app-cover"
                rows={5}
                placeholder="Tailored cover letter or key pitch points..."
                {...form.register('coverLetter')}
              />
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="app-notes">Personal Notes</Label>
              <Textarea
                id="app-notes"
                rows={4}
                placeholder="Referral details, salary notes, or preparation thoughts..."
                {...form.register('notes')}
              />
            </div>
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <span className="text-xs text-slate-400">
            Fields marked with * are required.
          </span>
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting
                ? 'Saving...'
                : editingApplication
                ? 'Save Changes'
                : 'Save Application'}
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
