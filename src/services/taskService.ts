import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { generateSafeId, todayIsoDate, toJsDate } from '@/src/lib/utils';
import {
  FIELD_LIMITS,
  type JobApplication,
  type Priority,
  type TaskInput,
  type TaskItem,
  type TaskStatus,
} from '@/src/types/careerflow';

function clamp(val: string | undefined, max: number): string {
  return (val ?? '').trim().slice(0, max);
}

const PRIORITY_WEIGHT: Record<Priority, number> = {
  Urgent: 0,
  High: 1,
  Medium: 2,
  Low: 3,
};

export function isTaskOverdue(task: TaskItem, todayIso = todayIsoDate()): boolean {
  return Boolean(task.status !== 'Completed' && task.dueDate && task.dueDate < todayIso);
}

export function isTaskDueToday(task: TaskItem, todayIso = todayIsoDate()): boolean {
  return Boolean(task.status !== 'Completed' && task.dueDate && task.dueDate === todayIso);
}

export function isTaskReminderActive(task: TaskItem, todayIso = todayIsoDate()): boolean {
  return Boolean(
    task.status !== 'Completed' && task.reminderDate && task.reminderDate <= todayIso
  );
}

function sortTasks(items: TaskItem[]): TaskItem[] {
  return [...items].sort((a, b) => {
    const aDone = a.status === 'Completed' ? 1 : 0;
    const bDone = b.status === 'Completed' ? 1 : 0;
    if (aDone !== bDone) return aDone - bDone;

    if (aDone === 0) {
      const dueA = a.dueDate || '9999-12-31';
      const dueB = b.dueDate || '9999-12-31';
      if (dueA !== dueB) return dueA.localeCompare(dueB);

      const prioDiff = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
      if (prioDiff !== 0) return prioDiff;

      const createdA = toJsDate(a.createdAt)?.getTime() ?? 0;
      const createdB = toJsDate(b.createdAt)?.getTime() ?? 0;
      return createdB - createdA;
    }

    const compA = a.completedAt || '';
    const compB = b.completedAt || '';
    return compB.localeCompare(compA);
  });
}

function sanitizeTaskInput(input: TaskInput) {
  return {
    applicationId: clamp(input.applicationId, FIELD_LIMITS.ID_MAX),
    title: clamp(input.title, FIELD_LIMITS.TASK_TITLE_MAX),
    description: clamp(input.description, FIELD_LIMITS.TASK_DESC_MAX),
    category: input.category,
    dueDate: clamp(input.dueDate, FIELD_LIMITS.DATE_MAX),
    reminderDate: clamp(input.reminderDate, FIELD_LIMITS.DATE_MAX),
    priority: input.priority,
    status: input.status,
  };
}

export function subscribeToTasks(
  userId: string,
  onData: (tasks: TaskItem[]) => void,
  onError: (err: Error) => void
): () => void {
  const path = 'tasks';
  const q = query(collection(db, 'tasks'), where('userId', '==', userId));

  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => d.data() as TaskItem);
      onData(sortTasks(items));
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

export async function createTask(
  userId: string,
  input: TaskInput,
  linkedApplication?: JobApplication
): Promise<string> {
  const taskId = generateSafeId('tsk');
  const path = `tasks/${taskId}`;

  try {
    const sanitized = sanitizeTaskInput(input);
    const batch = writeBatch(db);
    const taskRef = doc(db, 'tasks', taskId);

    const completedAt =
      sanitized.status === 'Completed' ? new Date().toISOString().slice(0, FIELD_LIMITS.COMPLETED_AT_MAX) : '';

    batch.set(taskRef, {
      id: taskId,
      userId,
      ...sanitized,
      completedAt,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    if (
      linkedApplication &&
      sanitized.applicationId === linkedApplication.id &&
      sanitized.status === 'Completed' &&
      sanitized.category === 'Recruiter follow-up'
    ) {
      const logId = generateSafeId('log');
      batch.set(doc(db, 'activityLogs', logId), {
        id: logId,
        userId,
        applicationId: linkedApplication.id,
        activityType: 'FOLLOW_UP_COMPLETED',
        description: clamp(
          `Completed follow-up "${sanitized.title}" for ${linkedApplication.jobTitle} at ${linkedApplication.companyName}.`,
          FIELD_LIMITS.ACTIVITY_DESC_MAX
        ),
        createdAt: serverTimestamp(),
      });
    }

    await batch.commit();
    return taskId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateTask(
  userId: string,
  existing: TaskItem,
  input: TaskInput,
  linkedApplication?: JobApplication
): Promise<void> {
  const path = `tasks/${existing.id}`;
  try {
    const sanitized = sanitizeTaskInput(input);
    const wasCompleted = existing.status === 'Completed';
    const isNowCompleted = sanitized.status === 'Completed';

    const completedAt = isNowCompleted
      ? wasCompleted && existing.completedAt
        ? existing.completedAt
        : new Date().toISOString().slice(0, FIELD_LIMITS.COMPLETED_AT_MAX)
      : '';

    const batch = writeBatch(db);
    batch.update(doc(db, 'tasks', existing.id), {
      ...sanitized,
      completedAt,
      updatedAt: serverTimestamp(),
    });

    if (
      !wasCompleted &&
      isNowCompleted &&
      linkedApplication &&
      sanitized.applicationId === linkedApplication.id &&
      sanitized.category === 'Recruiter follow-up'
    ) {
      const logId = generateSafeId('log');
      batch.set(doc(db, 'activityLogs', logId), {
        id: logId,
        userId,
        applicationId: linkedApplication.id,
        activityType: 'FOLLOW_UP_COMPLETED',
        description: clamp(
          `Completed follow-up "${sanitized.title}" for ${linkedApplication.jobTitle} at ${linkedApplication.companyName}.`,
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

export async function updateTaskStatus(
  userId: string,
  existing: TaskItem,
  nextStatus: TaskStatus,
  linkedApplication?: JobApplication
): Promise<void> {
  if (existing.status === nextStatus) return;
  const path = `tasks/${existing.id}`;
  try {
    const isNowCompleted = nextStatus === 'Completed';
    const completedAt = isNowCompleted
      ? new Date().toISOString().slice(0, FIELD_LIMITS.COMPLETED_AT_MAX)
      : '';

    const batch = writeBatch(db);
    batch.update(doc(db, 'tasks', existing.id), {
      status: nextStatus,
      completedAt,
      updatedAt: serverTimestamp(),
    });

    if (
      existing.status !== 'Completed' &&
      isNowCompleted &&
      linkedApplication &&
      existing.applicationId === linkedApplication.id &&
      existing.category === 'Recruiter follow-up'
    ) {
      const logId = generateSafeId('log');
      batch.set(doc(db, 'activityLogs', logId), {
        id: logId,
        userId,
        applicationId: linkedApplication.id,
        activityType: 'FOLLOW_UP_COMPLETED',
        description: clamp(
          `Completed follow-up "${existing.title}" for ${linkedApplication.jobTitle} at ${linkedApplication.companyName}.`,
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

export async function deleteTask(taskId: string): Promise<void> {
  const path = `tasks/${taskId}`;
  try {
    await deleteDoc(doc(db, 'tasks', taskId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
