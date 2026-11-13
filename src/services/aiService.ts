import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { generateSafeId, toJsDate } from '@/src/lib/utils';
import {
  FIELD_LIMITS,
  type AiHistoryItem,
  type AiOperationType,
  type AiStatusResponse,
  type CoverLetterResult,
  type InterviewQuestionsResult,
  type JdAnalysisResult,
  type ResumeAnalysisResult,
  type ResumeJobMatchResult,
} from '@/src/types/careerflow';

export class AiRequestError extends Error {
  code: string;
  status: number;

  constructor(message: string, code = 'AI_ERROR', status = 500) {
    super(message);
    this.name = 'AiRequestError';
    this.code = code;
    this.status = status;
  }
}

async function postAiEndpoint<T>(url: string, body: Record<string, unknown>): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new AiRequestError(
      'Unable to reach the CareerFlow AI server. Verify the server is running or continue using all core tracking features.',
      'NETWORK_ERROR',
      0
    );
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const errObj = payload as { error?: string; code?: string } | null;
    throw new AiRequestError(
      errObj?.error || `AI request failed with status ${response.status}.`,
      errObj?.code || 'AI_ERROR',
      response.status
    );
  }

  return payload as T;
}

export async function fetchAiStatus(): Promise<AiStatusResponse> {
  try {
    const response = await fetch('/api/ai/status');
    if (!response.ok) {
      return {
        available: false,
        model: 'gemini-4-hydrogen',
        reason: 'AI status endpoint did not respond.',
      };
    }
    return (await response.json()) as AiStatusResponse;
  } catch {
    return {
      available: false,
      model: 'gemini-4-hydrogen',
      reason: 'Unable to reach AI server.',
    };
  }
}

export async function analyzeResume(params: {
  resumeText: string;
  targetRole?: string;
}): Promise<ResumeAnalysisResult> {
  return postAiEndpoint<ResumeAnalysisResult>('/api/ai/analyze-resume', params);
}

export async function analyzeJobDescription(params: {
  jobTitle: string;
  companyName: string;
  jobDescription: string;
}): Promise<JdAnalysisResult> {
  return postAiEndpoint<JdAnalysisResult>('/api/ai/analyze-jd', params);
}

export async function matchResumeToJob(params: {
  resumeText: string;
  jobTitle: string;
  companyName: string;
  jobDescription: string;
}): Promise<ResumeJobMatchResult> {
  return postAiEndpoint<ResumeJobMatchResult>('/api/ai/match', params);
}

export async function generateCoverLetter(params: {
  resumeText: string;
  companyName: string;
  jobTitle: string;
  jobDescription: string;
  tone: string;
  candidateName?: string;
}): Promise<CoverLetterResult> {
  return postAiEndpoint<CoverLetterResult>('/api/ai/cover-letter', params);
}

export async function generateInterviewQuestions(params: {
  jobTitle: string;
  companyName: string;
  jobDescription: string;
  resumeText?: string;
  focus: string;
}): Promise<InterviewQuestionsResult> {
  return postAiEndpoint<InterviewQuestionsResult>(
    '/api/ai/interview-questions',
    params
  );
}

export function subscribeToAiHistory(
  userId: string,
  onData: (items: AiHistoryItem[]) => void,
  onError: (err: Error) => void
): () => void {
  const path = 'aiHistory';
  const q = query(collection(db, 'aiHistory'), where('userId', '==', userId));

  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => d.data() as AiHistoryItem);
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

export async function saveAiHistoryItem(
  userId: string,
  params: {
    applicationId?: string;
    operationType: AiOperationType;
    title: string;
    inputSummary: string;
    result: Record<string, unknown>;
  }
): Promise<string> {
  const historyId = generateSafeId('ai');
  const path = `aiHistory/${historyId}`;

  try {
    await setDoc(doc(db, 'aiHistory', historyId), {
      id: historyId,
      userId,
      applicationId: (params.applicationId ?? '').trim().slice(0, FIELD_LIMITS.ID_MAX),
      operationType: params.operationType,
      title: params.title.trim().slice(0, FIELD_LIMITS.AI_TITLE_MAX) || 'AI Analysis',
      inputSummary:
        params.inputSummary.trim().slice(0, FIELD_LIMITS.AI_INPUT_SUMMARY_MAX) ||
        'Saved AI Career Assistant output',
      result: params.result,
      createdAt: serverTimestamp(),
    });
    return historyId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteAiHistoryItem(historyId: string): Promise<void> {
  const path = `aiHistory/${historyId}`;
  try {
    await deleteDoc(doc(db, 'aiHistory', historyId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
