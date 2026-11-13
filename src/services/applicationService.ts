import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { generateSafeId, normalizeUrl, todayIsoDate, toJsDate } from '@/src/lib/utils';
import {
  FIELD_LIMITS,
  type ActivityLog,
  type ActivityType,
  type ApplicationStatus,
  type JobApplication,
  type JobApplicationInput,
  type Priority,
} from '@/src/types/careerflow';

function clamp(val: string | undefined, max: number): string {
  return (val ?? '').trim().slice(0, max);
}

function sanitizeApplicationInput(input: JobApplicationInput) {
  return {
    companyName: clamp(input.companyName, FIELD_LIMITS.COMPANY_NAME_MAX),
    companyLogo: clamp(input.companyLogo, FIELD_LIMITS.URL_MAX),
    companyWebsite: clamp(input.companyWebsite, FIELD_LIMITS.SHORT_URL_MAX),
    industry: clamp(input.industry, FIELD_LIMITS.INDUSTRY_MAX),
    companyLocation: clamp(input.companyLocation, FIELD_LIMITS.LOCATION_MAX),
    jobTitle: clamp(input.jobTitle, FIELD_LIMITS.JOB_TITLE_MAX),
    jobDescription: clamp(input.jobDescription, FIELD_LIMITS.JOB_DESCRIPTION_MAX),
    jobUrl: clamp(input.jobUrl, FIELD_LIMITS.URL_MAX),
    location: clamp(input.location, FIELD_LIMITS.LOCATION_MAX),
    workMode: input.workMode,
    employmentType: input.employmentType,
    experienceRequired: clamp(input.experienceRequired, FIELD_LIMITS.EXPERIENCE_MAX),
    salary: clamp(input.salary, FIELD_LIMITS.SALARY_MAX),
    source: clamp(input.source, FIELD_LIMITS.SOURCE_MAX),
    appliedDate: clamp(input.appliedDate, FIELD_LIMITS.DATE_MAX),
    status: input.status,
    priority: input.priority,
    resumeVersion: clamp(input.resumeVersion, FIELD_LIMITS.RESUME_VERSION_MAX),
    coverLetter: clamp(input.coverLetter, FIELD_LIMITS.COVER_LETTER_MAX),
    recruiterName: clamp(input.recruiterName, FIELD_LIMITS.NAME_MAX),
    recruiterEmail: clamp(input.recruiterEmail, FIELD_LIMITS.EMAIL_MAX),
    recruiterLinkedinUrl: clamp(input.recruiterLinkedinUrl, FIELD_LIMITS.SHORT_URL_MAX),
    notes: clamp(input.notes, FIELD_LIMITS.NOTES_MAX),
    nextFollowUpDate: clamp(input.nextFollowUpDate, FIELD_LIMITS.DATE_MAX),
  };
}

function resolveStatusActivityType(status: ApplicationStatus): ActivityType {
  if (status === 'Applied') return 'APPLICATION_SUBMITTED';
  if (status === 'Offer Received' || status === 'Offer Accepted') return 'OFFER_RECEIVED';
  if (status === 'Rejected' || status === 'Withdrawn' || status === 'Offer Rejected') {
    return 'APPLICATION_CLOSED';
  }
  return 'STATUS_CHANGED';
}

export function subscribeToApplications(
  userId: string,
  onData: (applications: JobApplication[]) => void,
  onError: (err: Error) => void
): () => void {
  const path = 'applications';
  const q = query(collection(db, 'applications'), where('userId', '==', userId));

  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => d.data() as JobApplication);
      items.sort((a, b) => {
        const dateA = toJsDate(a.updatedAt)?.getTime() ?? 0;
        const dateB = toJsDate(b.updatedAt)?.getTime() ?? 0;
        return dateB - dateA;
      });
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export function subscribeToActivityLogs(
  userId: string,
  applicationId: string,
  onData: (logs: ActivityLog[]) => void,
  onError: (err: Error) => void
): () => void {
  const path = `activityLogs`;
  const q = query(
    collection(db, 'activityLogs'),
    where('userId', '==', userId),
    where('applicationId', '==', applicationId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => d.data() as ActivityLog);
      items.sort((a, b) => {
        const dateA = toJsDate(a.createdAt)?.getTime() ?? 0;
        const dateB = toJsDate(b.createdAt)?.getTime() ?? 0;
        return dateB - dateA;
      });
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export function subscribeToRecentActivityLogs(
  userId: string,
  limitCount: number,
  onData: (logs: ActivityLog[]) => void,
  onError: (err: Error) => void
): () => void {
  const path = 'activityLogs';
  const q = query(collection(db, 'activityLogs'), where('userId', '==', userId));

  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => d.data() as ActivityLog);
      items.sort((a, b) => {
        const dateA = toJsDate(a.createdAt)?.getTime() ?? 0;
        const dateB = toJsDate(b.createdAt)?.getTime() ?? 0;
        return dateB - dateA;
      });
      onData(items.slice(0, limitCount));
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export async function createApplication(
  userId: string,
  input: JobApplicationInput
): Promise<string> {
  const appId = generateSafeId('app');
  const logId = generateSafeId('log');
  const path = `applications/${appId}`;

  try {
    const sanitized = sanitizeApplicationInput(input);
    const appliedDate =
      sanitized.appliedDate ||
      (sanitized.status === 'Applied' ? todayIsoDate() : '');

    const batch = writeBatch(db);
    const appRef = doc(db, 'applications', appId);
    const logRef = doc(db, 'activityLogs', logId);

    batch.set(appRef, {
      id: appId,
      userId,
      ...sanitized,
      appliedDate,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const initialType: ActivityType =
      sanitized.status === 'Applied' ? 'APPLICATION_SUBMITTED' : 'APPLICATION_CREATED';
    const description =
      sanitized.status === 'Applied'
        ? `Submitted application for ${sanitized.jobTitle} at ${sanitized.companyName}.`
        : `Created application tracker for ${sanitized.jobTitle} at ${sanitized.companyName} (${sanitized.status}).`;

    batch.set(logRef, {
      id: logId,
      userId,
      applicationId: appId,
      activityType: initialType,
      description: clamp(description, FIELD_LIMITS.ACTIVITY_DESC_MAX),
      toStatus: sanitized.status,
      createdAt: serverTimestamp(),
    });

    await batch.commit();
    return appId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateApplication(
  userId: string,
  existingApp: JobApplication,
  input: JobApplicationInput
): Promise<void> {
  const path = `applications/${existingApp.id}`;
  try {
    const sanitized = sanitizeApplicationInput(input);
    const appliedDate =
      sanitized.appliedDate ||
      (sanitized.status === 'Applied' && !existingApp.appliedDate ? todayIsoDate() : '');

    const batch = writeBatch(db);
    const appRef = doc(db, 'applications', existingApp.id);

    batch.update(appRef, {
      ...sanitized,
      appliedDate,
      updatedAt: serverTimestamp(),
    });

    const logId = generateSafeId('log');
    const logRef = doc(db, 'activityLogs', logId);
    const statusChanged = existingApp.status !== sanitized.status;

    batch.set(logRef, {
      id: logId,
      userId,
      applicationId: existingApp.id,
      activityType: statusChanged
        ? resolveStatusActivityType(sanitized.status)
        : 'APPLICATION_UPDATED',
      description: clamp(
        statusChanged
          ? `Moved status from ${existingApp.status} to ${sanitized.status} and updated application details.`
          : `Updated details for ${sanitized.jobTitle} at ${sanitized.companyName}.`,
        FIELD_LIMITS.ACTIVITY_DESC_MAX
      ),
      fromStatus: existingApp.status,
      toStatus: sanitized.status,
      createdAt: serverTimestamp(),
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateApplicationStatus(
  userId: string,
  existingApp: JobApplication,
  newStatus: ApplicationStatus
): Promise<void> {
  if (existingApp.status === newStatus) return;
  const path = `applications/${existingApp.id}`;
  try {
    const batch = writeBatch(db);
    const appRef = doc(db, 'applications', existingApp.id);

    const nextAppliedDate =
      newStatus === 'Applied' && !existingApp.appliedDate
        ? todayIsoDate()
        : existingApp.appliedDate ?? '';

    batch.update(appRef, {
      status: newStatus,
      appliedDate: nextAppliedDate,
      updatedAt: serverTimestamp(),
    });

    const logId = generateSafeId('log');
    const logRef = doc(db, 'activityLogs', logId);
    batch.set(logRef, {
      id: logId,
      userId,
      applicationId: existingApp.id,
      activityType: resolveStatusActivityType(newStatus),
      description: clamp(
        `Status changed from ${existingApp.status} to ${newStatus}.`,
        FIELD_LIMITS.ACTIVITY_DESC_MAX
      ),
      fromStatus: existingApp.status,
      toStatus: newStatus,
      createdAt: serverTimestamp(),
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateApplicationPriority(
  existingApp: JobApplication,
  priority: Priority
): Promise<void> {
  if (existingApp.priority === priority) return;
  const path = `applications/${existingApp.id}`;
  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'applications', existingApp.id), {
      priority,
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateApplicationResumeVersion(
  existingApp: JobApplication,
  resumeVersion: string
): Promise<void> {
  const nextVal = clamp(resumeVersion, FIELD_LIMITS.RESUME_VERSION_MAX);
  if ((existingApp.resumeVersion ?? '') === nextVal) return;
  const path = `applications/${existingApp.id}`;
  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'applications', existingApp.id), {
      resumeVersion: nextVal,
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateApplicationCoverLetter(
  existingApp: JobApplication,
  coverLetter: string
): Promise<void> {
  const nextVal = clamp(coverLetter, FIELD_LIMITS.COVER_LETTER_MAX);
  if ((existingApp.coverLetter ?? '') === nextVal) return;
  const path = `applications/${existingApp.id}`;
  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'applications', existingApp.id), {
      coverLetter: nextVal,
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteApplication(
  userId: string,
  applicationId: string
): Promise<void> {
  const path = `applications/${applicationId}`;
  try {
    const [logsSnap, interviewsSnap, tasksSnap, aiSnap] = await Promise.all([
      getDocs(
        query(
          collection(db, 'activityLogs'),
          where('userId', '==', userId),
          where('applicationId', '==', applicationId)
        )
      ),
      getDocs(
        query(
          collection(db, 'interviews'),
          where('userId', '==', userId),
          where('applicationId', '==', applicationId)
        )
      ),
      getDocs(
        query(
          collection(db, 'tasks'),
          where('userId', '==', userId),
          where('applicationId', '==', applicationId)
        )
      ),
      getDocs(
        query(
          collection(db, 'aiHistory'),
          where('userId', '==', userId),
          where('applicationId', '==', applicationId)
        )
      ),
    ]);

    const refsToDelete = [
      ...logsSnap.docs.map((d) => d.ref),
      ...interviewsSnap.docs.map((d) => d.ref),
      ...tasksSnap.docs.map((d) => d.ref),
      ...aiSnap.docs.map((d) => d.ref),
      doc(db, 'applications', applicationId),
    ];

    for (let i = 0; i < refsToDelete.length; i += 400) {
      const batch = writeBatch(db);
      refsToDelete.slice(i, i + 400).forEach((ref) => batch.delete(ref));
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export interface DuplicateMatch {
  application: JobApplication;
  reasons: string[];
}

export function findDuplicateApplications(
  existingApps: JobApplication[],
  candidate: {
    companyName: string;
    jobTitle: string;
    jobUrl?: string;
  },
  excludeId?: string
): DuplicateMatch[] {
  const normCompany = candidate.companyName.trim().toLowerCase();
  const normTitle = candidate.jobTitle.trim().toLowerCase();
  const normUrl = normalizeUrl(candidate.jobUrl);

  if (!normCompany && !normTitle && !normUrl) return [];

  const matches: DuplicateMatch[] = [];

  for (const app of existingApps) {
    if (excludeId && app.id === excludeId) continue;
    const reasons: string[] = [];

    const appCompany = app.companyName.trim().toLowerCase();
    const appTitle = app.jobTitle.trim().toLowerCase();
    const appUrl = normalizeUrl(app.jobUrl);

    if (normUrl && appUrl && normUrl === appUrl) {
      reasons.push('Same Job URL');
    }
    if (
      normCompany &&
      normTitle &&
      appCompany === normCompany &&
      (appTitle === normTitle || appTitle.includes(normTitle) || normTitle.includes(appTitle))
    ) {
      reasons.push('Same Company & Role');
    } else if (normCompany && appCompany === normCompany && normTitle.length > 3 && appTitle === normTitle) {
      reasons.push('Same Company');
    }

    if (reasons.length > 0) {
      matches.push({ application: app, reasons });
    }
  }

  return matches;
}
