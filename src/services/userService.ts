import { deleteUser, type User } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { clearAllLocalFiles } from '@/src/lib/localFileStore';
import { FIELD_LIMITS, type UserProfile } from '@/src/types/careerflow';

function clampString(value: string | undefined, max: number): string {
  return (value ?? '').trim().slice(0, max);
}

function clampStringList(list: string[] | undefined, maxItems: number, maxLen: number): string[] {
  if (!Array.isArray(list)) return [];
  return list
    .map((item) => item.trim().slice(0, maxLen))
    .filter(Boolean)
    .slice(0, maxItems);
}

export async function ensureUserProfile(user: User): Promise<void> {
  const path = `users/${user.uid}`;
  try {
    const userRef = doc(db, 'users', user.uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      const displayName = clampString(user.displayName || user.email?.split('@')[0] || 'Job Seeker', FIELD_LIMITS.NAME_MAX);
      const email = clampString(user.email || '', FIELD_LIMITS.EMAIL_MAX);
      await setDoc(userRef, {
        uid: user.uid,
        name: displayName || 'Job Seeker',
        email,
        photoURL: clampString(user.photoURL || '', FIELD_LIMITS.URL_MAX),
        phone: '',
        currentRole: '',
        experience: '',
        education: '',
        skills: [],
        preferredRoles: [],
        preferredLocations: [],
        workModePreference: 'Any',
        salaryPreference: '',
        employmentTypePreference: 'Full-time',
        weeklyApplicationGoal: 10,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeToUserProfile(
  uid: string,
  onData: (profile: UserProfile | null) => void,
  onError: (err: Error) => void
): () => void {
  const path = `users/${uid}`;
  const userRef = doc(db, 'users', uid);
  return onSnapshot(
    userRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        onData(null);
        return;
      }
      onData(snapshot.data() as UserProfile);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export type UserProfileUpdate = Partial<
  Omit<UserProfile, 'uid' | 'email' | 'createdAt' | 'updatedAt'>
>;

export async function updateUserProfile(uid: string, updates: UserProfileUpdate): Promise<void> {
  const path = `users/${uid}`;
  try {
    const userRef = doc(db, 'users', uid);
    const payload: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };

    if (updates.name !== undefined) {
      const cleaned = clampString(updates.name, FIELD_LIMITS.NAME_MAX);
      if (!cleaned) throw new Error('Full name cannot be empty.');
      payload.name = cleaned;
    }
    if (updates.photoURL !== undefined) {
      payload.photoURL = clampString(updates.photoURL, FIELD_LIMITS.URL_MAX);
    }
    if (updates.phone !== undefined) {
      payload.phone = clampString(updates.phone, FIELD_LIMITS.PHONE_MAX);
    }
    if (updates.currentRole !== undefined) {
      payload.currentRole = clampString(updates.currentRole, FIELD_LIMITS.ROLE_MAX);
    }
    if (updates.experience !== undefined) {
      payload.experience = clampString(updates.experience, FIELD_LIMITS.EXPERIENCE_MAX);
    }
    if (updates.education !== undefined) {
      payload.education = clampString(updates.education, FIELD_LIMITS.EDUCATION_MAX);
    }
    if (updates.skills !== undefined) {
      payload.skills = clampStringList(
        updates.skills,
        FIELD_LIMITS.SKILLS_MAX_ITEMS,
        FIELD_LIMITS.SKILL_ITEM_MAX
      );
    }
    if (updates.preferredRoles !== undefined) {
      payload.preferredRoles = clampStringList(
        updates.preferredRoles,
        FIELD_LIMITS.PREF_LIST_MAX_ITEMS,
        FIELD_LIMITS.PREF_ITEM_MAX
      );
    }
    if (updates.preferredLocations !== undefined) {
      payload.preferredLocations = clampStringList(
        updates.preferredLocations,
        FIELD_LIMITS.PREF_LIST_MAX_ITEMS,
        FIELD_LIMITS.PREF_ITEM_MAX
      );
    }
    if (updates.workModePreference !== undefined) {
      payload.workModePreference = updates.workModePreference;
    }
    if (updates.salaryPreference !== undefined) {
      payload.salaryPreference = clampString(updates.salaryPreference, 80);
    }
    if (updates.employmentTypePreference !== undefined) {
      payload.employmentTypePreference = updates.employmentTypePreference;
    }
    if (updates.weeklyApplicationGoal !== undefined) {
      const goal = Math.min(100, Math.max(1, Math.round(Number(updates.weeklyApplicationGoal) || 10)));
      payload.weeklyApplicationGoal = goal;
    }

    await updateDoc(userRef, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteUserWorkspace(uid: string): Promise<void> {
  try {
    const [logsSnap, interviewsSnap, tasksSnap, docsSnap, aiSnap, appsSnap] = await Promise.all([
      getDocs(query(collection(db, 'activityLogs'), where('userId', '==', uid))),
      getDocs(query(collection(db, 'interviews'), where('userId', '==', uid))),
      getDocs(query(collection(db, 'tasks'), where('userId', '==', uid))),
      getDocs(query(collection(db, 'documents'), where('userId', '==', uid))),
      getDocs(query(collection(db, 'aiHistory'), where('userId', '==', uid))),
      getDocs(query(collection(db, 'applications'), where('userId', '==', uid))),
    ]);

    const allRefs = [
      ...logsSnap.docs.map((d) => d.ref),
      ...interviewsSnap.docs.map((d) => d.ref),
      ...tasksSnap.docs.map((d) => d.ref),
      ...docsSnap.docs.map((d) => d.ref),
      ...aiSnap.docs.map((d) => d.ref),
      ...appsSnap.docs.map((d) => d.ref),
      doc(db, 'users', uid),
    ];

    for (let i = 0; i < allRefs.length; i += 400) {
      const batch = writeBatch(db);
      allRefs.slice(i, i + 400).forEach((ref) => batch.delete(ref));
      await batch.commit();
    }

    await clearAllLocalFiles();

    if (auth.currentUser && auth.currentUser.uid === uid) {
      await deleteUser(auth.currentUser);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${uid}`);
  }
}
