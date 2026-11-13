import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import {
  deleteLocalFile,
  saveLocalFile,
  validateSelectedFile,
} from '@/src/lib/localFileStore';
import { generateSafeId, toJsDate } from '@/src/lib/utils';
import {
  FIELD_LIMITS,
  type DocumentInput,
  type DocumentRecord,
  type JobApplication,
} from '@/src/types/careerflow';

function clamp(val: string | undefined, max: number): string {
  return (val ?? '').trim().slice(0, max);
}

function clampSkills(list: string[] | undefined): string[] {
  if (!Array.isArray(list)) return [];
  return Array.from(
    new Set(
      list
        .map((item) => item.trim().slice(0, FIELD_LIMITS.SKILL_ITEM_MAX))
        .filter(Boolean)
    )
  ).slice(0, FIELD_LIMITS.SKILLS_MAX_ITEMS);
}

export function formatResumeReference(docRecord: Pick<DocumentRecord, 'name' | 'version'>): string {
  const name = docRecord.name.trim();
  const version = docRecord.version.trim();
  if (!version) return name.slice(0, FIELD_LIMITS.RESUME_VERSION_MAX);
  return `${name} (${version})`.slice(0, FIELD_LIMITS.RESUME_VERSION_MAX);
}

export function bumpVersionTag(version?: string): string {
  const raw = (version ?? '').trim();
  if (!raw) return 'v2';
  const match = raw.match(/^(.*?)(\d+)([^\d]*)$/);
  if (!match) return `${raw}-v2`.slice(0, FIELD_LIMITS.DOC_VERSION_MAX);
  const [, prefix, numStr, suffix] = match;
  const next = Number.parseInt(numStr, 10) + 1;
  return `${prefix}${next}${suffix}`.slice(0, FIELD_LIMITS.DOC_VERSION_MAX);
}

export function isDocumentLinkedToApplication(
  docRecord: DocumentRecord,
  app: JobApplication
): boolean {
  const ref = (app.resumeVersion ?? '').trim().toLowerCase();
  if (!ref) return false;
  const formatted = formatResumeReference(docRecord).toLowerCase();
  const nameOnly = docRecord.name.trim().toLowerCase();
  const fileOnly = (docRecord.fileName ?? '').trim().toLowerCase();
  return (
    ref === formatted ||
    ref === nameOnly ||
    (fileOnly.length > 0 && ref === fileOnly)
  );
}

export function findMatchingDocumentForApplication(
  documents: DocumentRecord[],
  app: JobApplication
): DocumentRecord | undefined {
  const ref = (app.resumeVersion ?? '').trim().toLowerCase();
  if (!ref) return undefined;
  return (
    documents.find((d) => formatResumeReference(d).toLowerCase() === ref) ??
    documents.find((d) => isDocumentLinkedToApplication(d, app))
  );
}

export function subscribeToDocuments(
  userId: string,
  onData: (documents: DocumentRecord[]) => void,
  onError: (err: Error) => void
): () => void {
  const path = 'documents';
  const q = query(collection(db, 'documents'), where('userId', '==', userId));

  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => d.data() as DocumentRecord);
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

export async function createDocument(
  userId: string,
  input: DocumentInput,
  file?: File | null
): Promise<string> {
  const documentId = generateSafeId('doc');
  const path = `documents/${documentId}`;

  let fileName = '';
  let fileType = '';
  let fileSize = 0;
  let localStorageReference = '';

  if (file) {
    const validationError = validateSelectedFile(file);
    if (validationError) {
      throw new Error(validationError);
    }
    localStorageReference = generateSafeId('idb');
    await saveLocalFile(localStorageReference, file);
    fileName = clamp(file.name, FIELD_LIMITS.DOC_FILENAME_MAX);
    fileType = clamp(file.type || 'application/octet-stream', FIELD_LIMITS.DOC_FILETYPE_MAX);
    fileSize = Math.min(file.size, FIELD_LIMITS.DOC_FILESIZE_MAX);
  }

  try {
    const name = clamp(input.name, FIELD_LIMITS.DOC_NAME_MAX);
    const version = clamp(input.version, FIELD_LIMITS.DOC_VERSION_MAX) || 'v1';
    if (!name) {
      throw new Error('Document title is required.');
    }

    await setDoc(doc(db, 'documents', documentId), {
      id: documentId,
      userId,
      name,
      documentType: input.documentType,
      version,
      fileName,
      fileType,
      fileSize,
      localStorageReference,
      skills: clampSkills(input.skills),
      experience: clamp(input.experience, FIELD_LIMITS.DOC_EXPERIENCE_MAX),
      content: clamp(input.content, FIELD_LIMITS.DOC_CONTENT_MAX),
      notes: clamp(input.notes, FIELD_LIMITS.DOC_NOTES_MAX),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return documentId;
  } catch (error) {
    if (localStorageReference) {
      await deleteLocalFile(localStorageReference);
    }
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateDocument(
  existing: DocumentRecord,
  input: DocumentInput,
  options?: {
    newFile?: File | null;
    removeExistingFile?: boolean;
  }
): Promise<void> {
  const path = `documents/${existing.id}`;
  const previousRef = existing.localStorageReference ?? '';

  let nextFileName = existing.fileName ?? '';
  let nextFileType = existing.fileType ?? '';
  let nextFileSize = existing.fileSize ?? 0;
  let nextLocalRef = previousRef;
  let createdNewLocalRef = '';

  if (options?.newFile) {
    const validationError = validateSelectedFile(options.newFile);
    if (validationError) {
      throw new Error(validationError);
    }
    createdNewLocalRef = generateSafeId('idb');
    await saveLocalFile(createdNewLocalRef, options.newFile);
    nextLocalRef = createdNewLocalRef;
    nextFileName = clamp(options.newFile.name, FIELD_LIMITS.DOC_FILENAME_MAX);
    nextFileType = clamp(
      options.newFile.type || 'application/octet-stream',
      FIELD_LIMITS.DOC_FILETYPE_MAX
    );
    nextFileSize = Math.min(options.newFile.size, FIELD_LIMITS.DOC_FILESIZE_MAX);
  } else if (options?.removeExistingFile) {
    nextLocalRef = '';
    nextFileName = '';
    nextFileType = '';
    nextFileSize = 0;
  }

  try {
    const name = clamp(input.name, FIELD_LIMITS.DOC_NAME_MAX);
    const version = clamp(input.version, FIELD_LIMITS.DOC_VERSION_MAX) || 'v1';
    if (!name) {
      throw new Error('Document title is required.');
    }

    await updateDoc(doc(db, 'documents', existing.id), {
      name,
      documentType: input.documentType,
      version,
      fileName: clamp(nextFileName, FIELD_LIMITS.DOC_FILENAME_MAX),
      fileType: clamp(nextFileType, FIELD_LIMITS.DOC_FILETYPE_MAX),
      fileSize: nextFileSize,
      localStorageReference: clamp(nextLocalRef, FIELD_LIMITS.ID_MAX),
      skills: clampSkills(input.skills),
      experience: clamp(input.experience, FIELD_LIMITS.DOC_EXPERIENCE_MAX),
      content: clamp(input.content, FIELD_LIMITS.DOC_CONTENT_MAX),
      notes: clamp(input.notes, FIELD_LIMITS.DOC_NOTES_MAX),
      updatedAt: serverTimestamp(),
    });

    if (previousRef && (createdNewLocalRef || options?.removeExistingFile)) {
      await deleteLocalFile(previousRef);
    }
  } catch (error) {
    if (createdNewLocalRef) {
      await deleteLocalFile(createdNewLocalRef);
    }
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteDocument(docRecord: DocumentRecord): Promise<void> {
  const path = `documents/${docRecord.id}`;
  try {
    await deleteDoc(doc(db, 'documents', docRecord.id));
    if (docRecord.localStorageReference) {
      await deleteLocalFile(docRecord.localStorageReference);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
