import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { generateSafeId, toJsDate } from '@/src/lib/utils';
import {
  FIELD_LIMITS,
  type ChecklistItem,
  type Interview,
  type InterviewInput,
  type InterviewResult,
  type InterviewStatus,
  type JobApplication,
} from '@/src/types/careerflow';

function clamp(val: string | undefined, max: number): string {
  return (val ?? '').trim().slice(0, max);
}

function clampStringList(list: string[] | undefined, maxItems: number, maxLen: number): string[] {
  if (!Array.isArray(list)) return [];
  return list
    .map((item) => item.trim().slice(0, maxLen))
    .filter(Boolean)
    .slice(0, maxItems);
}

function clampChecklist(list: ChecklistItem[] | undefined): ChecklistItem[] {
  if (!Array.isArray(list)) return [];
  const cleaned: ChecklistItem[] = [];
  for (const item of list) {
    const label = clamp(item.label, FIELD_LIMITS.CHECKLIST_LABEL_MAX);
    if (!label) continue;
    const rawId = (item.id ?? '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, FIELD_LIMITS.ID_MAX);
    cleaned.push({
      id: rawId || generateSafeId('chk'),
      label,
      done: Boolean(item.done),
    });
    if (cleaned.length >= FIELD_LIMITS.CHECKLIST_MAX) break;
  }
  return cleaned;
}

function clampDuration(val: number | undefined): number {
  const num = Number(val);
  if (!Number.isFinite(num) || num <= 0) return 45;
  return Math.min(480, Math.max(10, Math.round(num)));
}

function sanitizeInterviewInput(input: InterviewInput) {
  return {
    roundName: clamp(input.roundName, FIELD_LIMITS.ROUND_NAME_MAX),
    interviewType: input.interviewType,
    scheduledAt: clamp(input.scheduledAt, FIELD_LIMITS.SCHEDULED_AT_MAX),
    durationMinutes: clampDuration(input.durationMinutes),
    interviewer: clamp(input.interviewer, FIELD_LIMITS.INTERVIEWER_MAX),
    meetingUrl: clamp(input.meetingUrl, FIELD_LIMITS.URL_MAX),
    status: input.status,
    topicsToRevise: clampStringList(
      input.topicsToRevise,
      FIELD_LIMITS.PREP_TOPICS_MAX,
      FIELD_LIMITS.PREP_TOPIC_LEN
    ),
    questionsToPractice: clampStringList(
      input.questionsToPractice,
      FIELD_LIMITS.PREP_QUESTIONS_MAX,
      FIELD_LIMITS.PREP_QUESTION_LEN
    ),
    preparationChecklist: clampChecklist(input.preparationChecklist),
    preparationNotes: clamp(input.preparationNotes, FIELD_LIMITS.INTERVIEW_TEXT_MAX),
    questionsAsked: clamp(input.questionsAsked, FIELD_LIMITS.INTERVIEW_TEXT_MAX),
    feedback: clamp(input.feedback, FIELD_LIMITS.INTERVIEW_TEXT_MAX),
    result: input.result,
  };
}

function sortByScheduleAsc(items: Interview[]): Interview[] {
  return [...items].sort((a, b) => {
    const tsA = toJsDate(a.scheduledAt)?.getTime() ?? 0;
    const tsB = toJsDate(b.scheduledAt)?.getTime() ?? 0;
    return tsA - tsB;
  });
}

export function subscribeToInterviews(
  userId: string,
  onData: (interviews: Interview[]) => void,
  onError: (err: Error) => void
): () => void {
  const path = 'interviews';
  const q = query(collection(db, 'interviews'), where('userId', '==', userId));

  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => d.data() as Interview);
      onData(sortByScheduleAsc(items));
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

export function subscribeToApplicationInterviews(
  userId: string,
  applicationId: string,
  onData: (interviews: Interview[]) => void,
  onError: (err: Error) => void
): () => void {
  const path = 'interviews';
  const q = query(
    collection(db, 'interviews'),
    where('userId', '==', userId),
    where('applicationId', '==', applicationId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => d.data() as Interview);
      onData(sortByScheduleAsc(items));
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

export async function createInterview(
  userId: string,
  application: JobApplication,
  input: InterviewInput
): Promise<string> {
  const interviewId = generateSafeId('int');
  const logId = generateSafeId('log');
  const path = `interviews/${interviewId}`;

  try {
    const sanitized = sanitizeInterviewInput({
      ...input,
      applicationId: application.id,
    });

    const batch = writeBatch(db);
    const interviewRef = doc(db, 'interviews', interviewId);
    const logRef = doc(db, 'activityLogs', logId);

    batch.set(interviewRef, {
      id: interviewId,
      userId,
      applicationId: application.id,
      ...sanitized,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const activityType =
      sanitized.status === 'Completed' ? 'INTERVIEW_COMPLETED' : 'INTERVIEW_SCHEDULED';
    const description =
      sanitized.status === 'Completed'
        ? `Logged completed ${sanitized.interviewType} round (${sanitized.roundName}) for ${application.jobTitle} at ${application.companyName}.`
        : `Scheduled ${sanitized.interviewType} interview (${sanitized.roundName}) for ${application.jobTitle} at ${application.companyName}.`;

    batch.set(logRef, {
      id: logId,
      userId,
      applicationId: application.id,
      activityType,
      description: clamp(description, FIELD_LIMITS.ACTIVITY_DESC_MAX),
      createdAt: serverTimestamp(),
    });

    await batch.commit();
    return interviewId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateInterview(
  userId: string,
  existing: Interview,
  application: JobApplication | undefined,
  input: InterviewInput
): Promise<void> {
  const path = `interviews/${existing.id}`;
  try {
    const sanitized = sanitizeInterviewInput({
      ...input,
      applicationId: existing.applicationId,
    });

    const batch = writeBatch(db);
    const interviewRef = doc(db, 'interviews', existing.id);

    batch.update(interviewRef, {
      ...sanitized,
      updatedAt: serverTimestamp(),
    });

    const statusChanged = existing.status !== sanitized.status;
    if (statusChanged && (sanitized.status === 'Completed' || sanitized.status === 'Rescheduled')) {
      const logId = generateSafeId('log');
      const appLabel = application
        ? `${application.jobTitle} at ${application.companyName}`
        : 'application';
      batch.set(doc(db, 'activityLogs', logId), {
        id: logId,
        userId,
        applicationId: existing.applicationId,
        activityType:
          sanitized.status === 'Completed' ? 'INTERVIEW_COMPLETED' : 'INTERVIEW_SCHEDULED',
        description: clamp(
          sanitized.status === 'Completed'
            ? `Completed ${sanitized.roundName} (${sanitized.result}) for ${appLabel}.`
            : `Rescheduled ${sanitized.roundName} for ${appLabel}.`,
          FIELD_LIMITS.ACTIVITY_DESC_MAX
        ),
        createdAt: serverTimestamp(),
      });
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateInterviewStatusResult(
  userId: string,
  existing: Interview,
  application: JobApplication | undefined,
  status: InterviewStatus,
  result: InterviewResult
): Promise<void> {
  if (existing.status === status && existing.result === result) return;
  const path = `interviews/${existing.id}`;
  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'interviews', existing.id), {
      status,
      result,
      updatedAt: serverTimestamp(),
    });

    if (existing.status !== status && (status === 'Completed' || status === 'Rescheduled')) {
      const logId = generateSafeId('log');
      const appLabel = application
        ? `${application.jobTitle} at ${application.companyName}`
        : 'application';
      batch.set(doc(db, 'activityLogs', logId), {
        id: logId,
        userId,
        applicationId: existing.applicationId,
        activityType: status === 'Completed' ? 'INTERVIEW_COMPLETED' : 'INTERVIEW_SCHEDULED',
        description: clamp(
          status === 'Completed'
            ? `Marked ${existing.roundName} as Completed (${result}) for ${appLabel}.`
            : `Rescheduled ${existing.roundName} for ${appLabel}.`,
          FIELD_LIMITS.ACTIVITY_DESC_MAX
        ),
        createdAt: serverTimestamp(),
      });
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateInterviewPrep(
  existing: Interview,
  updates: {
    topicsToRevise: string[];
    questionsToPractice: string[];
    preparationChecklist: ChecklistItem[];
    preparationNotes: string;
  }
): Promise<void> {
  const path = `interviews/${existing.id}`;
  try {
    await updateDoc(doc(db, 'interviews', existing.id), {
      topicsToRevise: clampStringList(
        updates.topicsToRevise,
        FIELD_LIMITS.PREP_TOPICS_MAX,
        FIELD_LIMITS.PREP_TOPIC_LEN
      ),
      questionsToPractice: clampStringList(
        updates.questionsToPractice,
        FIELD_LIMITS.PREP_QUESTIONS_MAX,
        FIELD_LIMITS.PREP_QUESTION_LEN
      ),
      preparationChecklist: clampChecklist(updates.preparationChecklist),
      preparationNotes: clamp(updates.preparationNotes, FIELD_LIMITS.INTERVIEW_TEXT_MAX),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateInterviewFeedback(
  userId: string,
  existing: Interview,
  application: JobApplication | undefined,
  updates: {
    status: InterviewStatus;
    questionsAsked: string;
    feedback: string;
    result: InterviewResult;
  }
): Promise<void> {
  const path = `interviews/${existing.id}`;
  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'interviews', existing.id), {
      status: updates.status,
      questionsAsked: clamp(updates.questionsAsked, FIELD_LIMITS.INTERVIEW_TEXT_MAX),
      feedback: clamp(updates.feedback, FIELD_LIMITS.INTERVIEW_TEXT_MAX),
      result: updates.result,
      updatedAt: serverTimestamp(),
    });

    if (existing.status !== 'Completed' && updates.status === 'Completed') {
      const logId = generateSafeId('log');
      const appLabel = application
        ? `${application.jobTitle} at ${application.companyName}`
        : 'application';
      batch.set(doc(db, 'activityLogs', logId), {
        id: logId,
        userId,
        applicationId: existing.applicationId,
        activityType: 'INTERVIEW_COMPLETED',
        description: clamp(
          `Completed ${existing.roundName} (${updates.result}) and saved feedback for ${appLabel}.`,
          FIELD_LIMITS.ACTIVITY_DESC_MAX
        ),
        createdAt: serverTimestamp(),
      });
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteInterview(interviewId: string): Promise<void> {
  const path = `interviews/${interviewId}`;
  try {
    await deleteDoc(doc(db, 'interviews', interviewId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
