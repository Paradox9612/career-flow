import type { Timestamp } from 'firebase/firestore';

export const APPLICATION_STATUSES = [
  'Interested',
  'Preparing',
  'Applied',
  'Assessment',
  'HR Interview',
  'Technical Interview',
  'Managerial Interview',
  'Final Interview',
  'Offer Received',
  'Offer Accepted',
  'Offer Rejected',
  'Rejected',
  'Withdrawn',
  'No Response',
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'] as const;
export type Priority = (typeof PRIORITIES)[number];

export const WORK_MODES = ['Remote', 'Hybrid', 'Onsite'] as const;
export type WorkMode = (typeof WORK_MODES)[number];

export const WORK_MODE_PREFERENCES = ['Remote', 'Hybrid', 'Onsite', 'Any'] as const;
export type WorkModePreference = (typeof WORK_MODE_PREFERENCES)[number];

export const EMPLOYMENT_TYPES = [
  'Full-time',
  'Part-time',
  'Contract',
  'Internship',
  'Freelance',
] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export const EMPLOYMENT_TYPE_PREFERENCES = [
  'Full-time',
  'Part-time',
  'Contract',
  'Internship',
  'Any',
] as const;
export type EmploymentTypePreference = (typeof EMPLOYMENT_TYPE_PREFERENCES)[number];

export const JOB_SOURCES = [
  'LinkedIn',
  'Company Website',
  'Referral',
  'Indeed',
  'Wellfound',
  'Glassdoor',
  'Naukri',
  'Recruiter Outreach',
  'Other',
] as const;

export const ACTIVITY_TYPES = [
  'APPLICATION_CREATED',
  'APPLICATION_UPDATED',
  'APPLICATION_SUBMITTED',
  'STATUS_CHANGED',
  'INTERVIEW_SCHEDULED',
  'INTERVIEW_COMPLETED',
  'RECRUITER_CONTACTED',
  'FOLLOW_UP_COMPLETED',
  'OFFER_RECEIVED',
  'APPLICATION_CLOSED',
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const INTERVIEW_TYPES = [
  'HR',
  'Technical',
  'Coding assessment',
  'Managerial',
  'System design',
  'Final interview',
  'Other',
] as const;
export type InterviewType = (typeof INTERVIEW_TYPES)[number];

export const INTERVIEW_STATUSES = [
  'Scheduled',
  'Completed',
  'Rescheduled',
  'Cancelled',
] as const;
export type InterviewStatus = (typeof INTERVIEW_STATUSES)[number];

export const INTERVIEW_RESULTS = ['Pending', 'Passed', 'Failed', 'On Hold'] as const;
export type InterviewResult = (typeof INTERVIEW_RESULTS)[number];

export const TASK_CATEGORIES = [
  'Recruiter follow-up',
  'Interview preparation',
  'Assessment deadline',
  'Resume update',
  'Research company',
  'Other',
] as const;
export type TaskCategory = (typeof TASK_CATEGORIES)[number];

export const TASK_STATUSES = ['Pending', 'In Progress', 'Completed'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const DOCUMENT_TYPES = [
  'Resume',
  'Cover Letter',
  'Certificate',
  'Supporting Document',
] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const AI_OPERATION_TYPES = [
  'RESUME_ANALYSIS',
  'JD_ANALYSIS',
  'RESUME_JOB_MATCH',
  'COVER_LETTER',
  'INTERVIEW_QUESTIONS',
] as const;
export type AiOperationType = (typeof AI_OPERATION_TYPES)[number];

/**
 * Synchronized verbatim with firebase-blueprint.json field size limits.
 */
export const FIELD_LIMITS = {
  ID_MAX: 128,
  NAME_MAX: 120,
  EMAIL_MAX: 254,
  PHONE_MAX: 40,
  URL_MAX: 1000,
  SHORT_URL_MAX: 500,
  ROLE_MAX: 120,
  EXPERIENCE_MAX: 80,
  EDUCATION_MAX: 240,
  SKILLS_MAX_ITEMS: 30,
  SKILL_ITEM_MAX: 80,
  PREF_LIST_MAX_ITEMS: 15,
  PREF_ITEM_MAX: 100,
  SALARY_MAX: 100,
  COMPANY_NAME_MAX: 160,
  INDUSTRY_MAX: 120,
  LOCATION_MAX: 160,
  JOB_TITLE_MAX: 180,
  JOB_DESCRIPTION_MAX: 20000,
  SOURCE_MAX: 100,
  DATE_MAX: 32,
  RESUME_VERSION_MAX: 160,
  COVER_LETTER_MAX: 15000,
  NOTES_MAX: 15000,
  ACTIVITY_DESC_MAX: 500,
  ROUND_NAME_MAX: 120,
  INTERVIEWER_MAX: 160,
  SCHEDULED_AT_MAX: 40,
  PREP_TOPICS_MAX: 20,
  PREP_TOPIC_LEN: 120,
  PREP_QUESTIONS_MAX: 20,
  PREP_QUESTION_LEN: 300,
  CHECKLIST_MAX: 25,
  CHECKLIST_LABEL_MAX: 200,
  INTERVIEW_TEXT_MAX: 15000,
  TASK_TITLE_MAX: 200,
  TASK_DESC_MAX: 5000,
  COMPLETED_AT_MAX: 40,
  DOC_NAME_MAX: 160,
  DOC_VERSION_MAX: 40,
  DOC_FILENAME_MAX: 260,
  DOC_FILETYPE_MAX: 120,
  DOC_FILESIZE_MAX: 15728640,
  DOC_EXPERIENCE_MAX: 120,
  DOC_CONTENT_MAX: 30000,
  DOC_NOTES_MAX: 5000,
  AI_TITLE_MAX: 180,
  AI_INPUT_SUMMARY_MAX: 500,
} as const;

export const STATUS_META: Record<
  ApplicationStatus,
  {
    label: string;
    group: 'pre' | 'active' | 'interview' | 'offer' | 'closed';
    toneClass: string;
    dotClass: string;
  }
> = {
  Interested: {
    label: 'Interested',
    group: 'pre',
    toneClass: 'text-slate-700 dark:text-slate-300',
    dotClass: 'bg-slate-400',
  },
  Preparing: {
    label: 'Preparing',
    group: 'pre',
    toneClass: 'text-slate-700 dark:text-slate-300',
    dotClass: 'bg-slate-500',
  },
  Applied: {
    label: 'Applied',
    group: 'active',
    toneClass: 'text-blue-700 dark:text-blue-400',
    dotClass: 'bg-blue-600',
  },
  Assessment: {
    label: 'Assessment',
    group: 'active',
    toneClass: 'text-amber-700 dark:text-amber-400',
    dotClass: 'bg-amber-600',
  },
  'HR Interview': {
    label: 'HR Interview',
    group: 'interview',
    toneClass: 'text-indigo-700 dark:text-indigo-400',
    dotClass: 'bg-indigo-600',
  },
  'Technical Interview': {
    label: 'Technical Interview',
    group: 'interview',
    toneClass: 'text-indigo-700 dark:text-indigo-400',
    dotClass: 'bg-indigo-600',
  },
  'Managerial Interview': {
    label: 'Managerial Interview',
    group: 'interview',
    toneClass: 'text-indigo-700 dark:text-indigo-400',
    dotClass: 'bg-indigo-600',
  },
  'Final Interview': {
    label: 'Final Interview',
    group: 'interview',
    toneClass: 'text-violet-700 dark:text-violet-400',
    dotClass: 'bg-violet-600',
  },
  'Offer Received': {
    label: 'Offer Received',
    group: 'offer',
    toneClass: 'text-emerald-700 dark:text-emerald-400',
    dotClass: 'bg-emerald-600',
  },
  'Offer Accepted': {
    label: 'Offer Accepted',
    group: 'offer',
    toneClass: 'text-emerald-700 dark:text-emerald-400',
    dotClass: 'bg-emerald-600',
  },
  'Offer Rejected': {
    label: 'Offer Rejected',
    group: 'closed',
    toneClass: 'text-slate-600 dark:text-slate-400',
    dotClass: 'bg-slate-500',
  },
  Rejected: {
    label: 'Rejected',
    group: 'closed',
    toneClass: 'text-red-700 dark:text-red-400',
    dotClass: 'bg-red-600',
  },
  Withdrawn: {
    label: 'Withdrawn',
    group: 'closed',
    toneClass: 'text-slate-600 dark:text-slate-400',
    dotClass: 'bg-slate-400',
  },
  'No Response': {
    label: 'No Response',
    group: 'closed',
    toneClass: 'text-amber-700 dark:text-amber-400',
    dotClass: 'bg-amber-500',
  },
};

export const PRIORITY_META: Record<
  Priority,
  { label: string; textClass: string }
> = {
  Low: { label: 'Low', textClass: 'text-slate-500 dark:text-slate-400' },
  Medium: { label: 'Medium', textClass: 'text-blue-700 dark:text-blue-400' },
  High: { label: 'High', textClass: 'text-amber-700 dark:text-amber-400' },
  Urgent: { label: 'Urgent', textClass: 'text-red-700 dark:text-red-400' },
};

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  photoURL?: string;
  phone?: string;
  currentRole?: string;
  experience?: string;
  education?: string;
  skills?: string[];
  preferredRoles?: string[];
  preferredLocations?: string[];
  workModePreference?: WorkModePreference;
  salaryPreference?: string;
  employmentTypePreference?: EmploymentTypePreference;
  weeklyApplicationGoal?: number;
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

export interface JobApplication {
  id: string;
  userId: string;
  companyName: string;
  companyLogo?: string;
  companyWebsite?: string;
  industry?: string;
  companyLocation?: string;
  jobTitle: string;
  jobDescription?: string;
  jobUrl?: string;
  location?: string;
  workMode: WorkMode;
  employmentType: EmploymentType;
  experienceRequired?: string;
  salary?: string;
  source?: string;
  appliedDate?: string;
  status: ApplicationStatus;
  priority: Priority;
  resumeVersion?: string;
  coverLetter?: string;
  recruiterName?: string;
  recruiterEmail?: string;
  recruiterLinkedinUrl?: string;
  notes?: string;
  nextFollowUpDate?: string;
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

export type JobApplicationInput = Omit<
  JobApplication,
  'id' | 'userId' | 'createdAt' | 'updatedAt'
>;

export interface ActivityLog {
  id: string;
  userId: string;
  applicationId: string;
  activityType: ActivityType;
  description: string;
  fromStatus?: string;
  toStatus?: string;
  createdAt?: Timestamp | Date;
}

export const INTERVIEW_STATUS_META: Record<
  InterviewStatus,
  { label: string; toneClass: string; dotClass: string }
> = {
  Scheduled: {
    label: 'Scheduled',
    toneClass: 'text-blue-700 dark:text-blue-400',
    dotClass: 'bg-blue-600',
  },
  Rescheduled: {
    label: 'Rescheduled',
    toneClass: 'text-amber-700 dark:text-amber-400',
    dotClass: 'bg-amber-500',
  },
  Completed: {
    label: 'Completed',
    toneClass: 'text-emerald-700 dark:text-emerald-400',
    dotClass: 'bg-emerald-600',
  },
  Cancelled: {
    label: 'Cancelled',
    toneClass: 'text-slate-500 dark:text-slate-400',
    dotClass: 'bg-slate-400',
  },
};

export const INTERVIEW_RESULT_META: Record<
  InterviewResult,
  { label: string; toneClass: string }
> = {
  Pending: { label: 'Pending', toneClass: 'text-slate-600 dark:text-slate-400' },
  Passed: { label: 'Passed', toneClass: 'text-emerald-700 dark:text-emerald-400' },
  Failed: { label: 'Failed', toneClass: 'text-red-700 dark:text-red-400' },
  'On Hold': { label: 'On Hold', toneClass: 'text-amber-700 dark:text-amber-400' },
};

export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

export interface Interview {
  id: string;
  userId: string;
  applicationId: string;
  roundName: string;
  interviewType: InterviewType;
  scheduledAt: string;
  durationMinutes?: number;
  interviewer?: string;
  meetingUrl?: string;
  status: InterviewStatus;
  topicsToRevise?: string[];
  questionsToPractice?: string[];
  preparationChecklist?: ChecklistItem[];
  preparationNotes?: string;
  questionsAsked?: string;
  feedback?: string;
  result: InterviewResult;
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

export type InterviewInput = Omit<
  Interview,
  'id' | 'userId' | 'createdAt' | 'updatedAt'
>;

export const TASK_STATUS_META: Record<
  TaskStatus,
  { label: string; toneClass: string }
> = {
  Pending: { label: 'Pending', toneClass: 'text-slate-600 dark:text-slate-300' },
  'In Progress': { label: 'In Progress', toneClass: 'text-blue-700 dark:text-blue-400' },
  Completed: { label: 'Completed', toneClass: 'text-emerald-700 dark:text-emerald-400' },
};

export interface TaskItem {
  id: string;
  userId: string;
  applicationId: string;
  title: string;
  description?: string;
  category: TaskCategory;
  dueDate?: string;
  reminderDate?: string;
  priority: Priority;
  status: TaskStatus;
  completedAt?: string;
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

export type TaskInput = Omit<
  TaskItem,
  'id' | 'userId' | 'completedAt' | 'createdAt' | 'updatedAt'
>;

export interface DocumentRecord {
  id: string;
  userId: string;
  name: string;
  documentType: DocumentType;
  version: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  localStorageReference?: string;
  skills?: string[];
  experience?: string;
  content?: string;
  notes?: string;
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

export type DocumentInput = Omit<
  DocumentRecord,
  'id' | 'userId' | 'fileName' | 'fileType' | 'fileSize' | 'localStorageReference' | 'createdAt' | 'updatedAt'
>;

export interface AiStatusResponse {
  available: boolean;
  model: string;
  reason?: string;
}

export interface ResumeAnalysisResult {
  summary: string;
  skillsDetected: string[];
  experienceSummary: string;
  strengths: string[];
  weaknesses: string[];
  missingInformation: string[];
  improvementRecommendations: string[];
  atsFormattingSuggestions: string[];
}

export interface JdAnalysisResult {
  summary: string;
  requiredSkills: string[];
  preferredSkills: string[];
  responsibilities: string[];
  experienceRequirements: string;
  educationRequirements: string;
  importantKeywords: string[];
}

export interface ResumeJobMatchResult {
  matchPercentage: number;
  scoreExplanation: string;
  matchedSkills: string[];
  missingSkills: string[];
  relevantExperience: string[];
  recommendations: string[];
}

export interface CoverLetterResult {
  subjectLine: string;
  coverLetter: string;
  keyHighlights: string[];
}

export interface InterviewQuestionItem {
  question: string;
  suggestedAnswer: string;
  explanation: string;
}

export interface InterviewQuestionsResult {
  technical: InterviewQuestionItem[];
  hr: InterviewQuestionItem[];
  roleSpecific: InterviewQuestionItem[];
  behavioral: InterviewQuestionItem[];
  systemDesign: InterviewQuestionItem[];
}

export type AiResultPayload =
  | ResumeAnalysisResult
  | JdAnalysisResult
  | ResumeJobMatchResult
  | CoverLetterResult
  | InterviewQuestionsResult;

export interface AiHistoryItem {
  id: string;
  userId: string;
  applicationId: string;
  operationType: AiOperationType;
  title: string;
  inputSummary: string;
  result: Record<string, unknown>;
  createdAt?: Timestamp | Date;
}
