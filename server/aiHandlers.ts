import { GoogleGenAI, Type, type Schema } from '@google/genai';
import type { IncomingMessage, ServerResponse } from 'node:http';

export const GEMINI_MODEL = 'gemini-4-hydrogen';
const MAX_TEXT_CHARS = 18000;
const MAX_SHORT_CHARS = 300;

export interface HandlerResult<T = unknown> {
  status: number;
  data: T;
}

export interface VercelLikeRequest extends IncomingMessage {
  body?: unknown;
  query?: Record<string, string | string[]>;
}

export interface VercelLikeResponse extends ServerResponse {
  status: (code: number) => VercelLikeResponse;
  json: (body: unknown) => void;
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function clampInput(value: unknown, maxLen: number): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLen);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function classifyGeminiError(error: unknown): {
  status: number;
  code: string;
  message: string;
} {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
      ? error
      : 'Unknown AI error';
  const lower = raw.toLowerCase();

  if (
    lower.includes('resource_exhausted') ||
    lower.includes('429') ||
    lower.includes('quota') ||
    lower.includes('rate limit')
  ) {
    return {
      status: 429,
      code: 'RATE_LIMITED',
      message:
        'Gemini Free Tier rate limit reached. Please wait a moment and try again. All core CareerFlow features continue working normally.',
    };
  }

  if (
    lower.includes('api_key_invalid') ||
    lower.includes('permission_denied') ||
    lower.includes('401') ||
    lower.includes('403')
  ) {
    return {
      status: 503,
      code: 'AI_AUTH_UNAVAILABLE',
      message:
        'AI Career Assistant is unavailable because the server Gemini API key could not be verified. Check your server environment secrets or continue using CareerFlow without AI.',
    };
  }

  if (lower.includes('not_found') || lower.includes('404')) {
    return {
      status: 503,
      code: 'AI_MODEL_UNAVAILABLE',
      message:
        'The configured Gemini model could not be reached right now. Please try again later.',
    };
  }

  return {
    status: 502,
    code: 'AI_UPSTREAM_ERROR',
    message: 'Unable to generate an AI response right now. Please retry in a moment.',
  };
}

async function generateStructuredJson<T>(
  systemInstruction: string,
  prompt: string,
  responseSchema: Schema
): Promise<T> {
  const ai = getGeminiClient();
  if (!ai) {
    const missingErr = new Error('GEMINI_API_KEY is not configured on the server.');
    (missingErr as Error & { code?: string }).code = 'AI_NOT_CONFIGURED';
    throw missingErr;
  }

  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema,
        },
      });

      const rawText = (response.text ?? '').trim();
      if (!rawText) {
        throw new Error('Empty response returned from Gemini.');
      }
      return JSON.parse(rawText) as T;
    } catch (err) {
      lastError = err;
      const classified = classifyGeminiError(err);
      if (classified.status === 429 || classified.status === 503) {
        throw err;
      }
      if (attempt < 2) {
        await sleep(500 * Math.pow(2, attempt));
      }
    }
  }

  throw lastError;
}

function mapAiErrorToResult(error: unknown): HandlerResult {
  if (
    error instanceof Error &&
    (error as Error & { code?: string }).code === 'AI_NOT_CONFIGURED'
  ) {
    return {
      status: 503,
      data: {
        code: 'AI_NOT_CONFIGURED',
        error:
          'AI Career Assistant is not active because GEMINI_API_KEY is not configured in server secrets. All non-AI CareerFlow features remain fully available.',
      },
    };
  }

  const mapped = classifyGeminiError(error);
  return {
    status: mapped.status,
    data: {
      code: mapped.code,
      error: mapped.message,
    },
  };
}

export function getAiStatus(): HandlerResult {
  const available = Boolean(getGeminiClient());
  return {
    status: 200,
    data: {
      available,
      model: GEMINI_MODEL,
      reason: available
        ? undefined
        : 'Server GEMINI_API_KEY is not configured. Core tracking features work without AI.',
    },
  };
}

export async function handleAnalyzeResume(
  rawBody: unknown
): Promise<HandlerResult> {
  const body = (rawBody ?? {}) as Record<string, unknown>;
  const resumeText = clampInput(body.resumeText, MAX_TEXT_CHARS);
  const targetRole = clampInput(body.targetRole, MAX_SHORT_CHARS);

  if (resumeText.length < 40) {
    return {
      status: 400,
      data: {
        code: 'INVALID_INPUT',
        error: 'Please provide at least 40 characters of resume text to analyze.',
      },
    };
  }

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      summary: { type: Type.STRING },
      skillsDetected: { type: Type.ARRAY, items: { type: Type.STRING } },
      experienceSummary: { type: Type.STRING },
      strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
      weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
      missingInformation: { type: Type.ARRAY, items: { type: Type.STRING } },
      improvementRecommendations: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
      atsFormattingSuggestions: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
    },
    required: [
      'summary',
      'skillsDetected',
      'experienceSummary',
      'strengths',
      'weaknesses',
      'missingInformation',
      'improvementRecommendations',
      'atsFormattingSuggestions',
    ],
  };

  try {
    const result = await generateStructuredJson(
      'You are an experienced technical career coach and resume reviewer. Give honest, concrete, structured feedback grounded strictly in the provided resume text. Never invent credentials or present suggestions as an official employer ATS guarantee.',
      `Analyze the following resume${
        targetRole ? ` for a target role of "${targetRole}"` : ''
      }.\n\nRESUME TEXT:\n${resumeText}`,
      schema
    );
    return { status: 200, data: result };
  } catch (error) {
    return mapAiErrorToResult(error);
  }
}

export async function handleAnalyzeJd(rawBody: unknown): Promise<HandlerResult> {
  const body = (rawBody ?? {}) as Record<string, unknown>;
  const jobTitle = clampInput(body.jobTitle, MAX_SHORT_CHARS);
  const companyName = clampInput(body.companyName, MAX_SHORT_CHARS);
  const jobDescription = clampInput(body.jobDescription, MAX_TEXT_CHARS);

  if (jobDescription.length < 40) {
    return {
      status: 400,
      data: {
        code: 'INVALID_INPUT',
        error: 'Please provide at least 40 characters of job description text.',
      },
    };
  }

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      summary: { type: Type.STRING },
      requiredSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
      preferredSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
      responsibilities: { type: Type.ARRAY, items: { type: Type.STRING } },
      experienceRequirements: { type: Type.STRING },
      educationRequirements: { type: Type.STRING },
      importantKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
    },
    required: [
      'summary',
      'requiredSkills',
      'preferredSkills',
      'responsibilities',
      'experienceRequirements',
      'educationRequirements',
      'importantKeywords',
    ],
  };

  try {
    const result = await generateStructuredJson(
      'You are an expert recruiter and job-market analyst. Extract structured requirements strictly from the provided job posting without fabricating unstated requirements.',
      `Role: ${jobTitle || 'Not specified'}\nCompany: ${
        companyName || 'Not specified'
      }\n\nJOB DESCRIPTION:\n${jobDescription}`,
      schema
    );
    return { status: 200, data: result };
  } catch (error) {
    return mapAiErrorToResult(error);
  }
}

export async function handleMatchResumeToJob(
  rawBody: unknown
): Promise<HandlerResult> {
  const body = (rawBody ?? {}) as Record<string, unknown>;
  const resumeText = clampInput(body.resumeText, MAX_TEXT_CHARS);
  const jobTitle = clampInput(body.jobTitle, MAX_SHORT_CHARS);
  const companyName = clampInput(body.companyName, MAX_SHORT_CHARS);
  const jobDescription = clampInput(body.jobDescription, MAX_TEXT_CHARS);

  if (resumeText.length < 40 || jobDescription.length < 40) {
    return {
      status: 400,
      data: {
        code: 'INVALID_INPUT',
        error:
          'Both resume text and job description text (at least 40 characters each) are required to score alignment.',
      },
    };
  }

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      matchPercentage: { type: Type.INTEGER },
      scoreExplanation: { type: Type.STRING },
      matchedSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
      missingSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
      relevantExperience: { type: Type.ARRAY, items: { type: Type.STRING } },
      recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
    },
    required: [
      'matchPercentage',
      'scoreExplanation',
      'matchedSkills',
      'missingSkills',
      'relevantExperience',
      'recommendations',
    ],
  };

  try {
    const result = await generateStructuredJson<{
      matchPercentage: number;
      scoreExplanation: string;
      matchedSkills: string[];
      missingSkills: string[];
      relevantExperience: string[];
      recommendations: string[];
    }>(
      'You compare a candidate resume against a job description. Compute an integer matchPercentage from 0 to 100 based on overlapping required skills, domain experience, and seniority alignment. Clearly explain how the estimate was derived in scoreExplanation, and remind the user it is an advisory AI comparison rather than an employer ATS guarantee.',
      `Target Role: ${jobTitle || 'Not specified'} at ${
        companyName || 'Not specified'
      }\n\nRESUME TEXT:\n${resumeText}\n\nJOB DESCRIPTION:\n${jobDescription}`,
      schema
    );

    result.matchPercentage = Math.max(
      0,
      Math.min(100, Math.round(Number(result.matchPercentage) || 0))
    );
    return { status: 200, data: result };
  } catch (error) {
    return mapAiErrorToResult(error);
  }
}

export async function handleCoverLetter(rawBody: unknown): Promise<HandlerResult> {
  const body = (rawBody ?? {}) as Record<string, unknown>;
  const resumeText = clampInput(body.resumeText, MAX_TEXT_CHARS);
  const companyName = clampInput(body.companyName, MAX_SHORT_CHARS);
  const jobTitle = clampInput(body.jobTitle, MAX_SHORT_CHARS);
  const jobDescription = clampInput(body.jobDescription, MAX_TEXT_CHARS);
  const tone = clampInput(body.tone, 60) || 'Professional';
  const candidateName = clampInput(body.candidateName, 120);

  if (!companyName || !jobTitle || resumeText.length < 40 || jobDescription.length < 40) {
    return {
      status: 400,
      data: {
        code: 'INVALID_INPUT',
        error:
          'Company name, job title, resume text, and job description are all required to draft a tailored cover letter.',
      },
    };
  }

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      subjectLine: { type: Type.STRING },
      coverLetter: { type: Type.STRING },
      keyHighlights: { type: Type.ARRAY, items: { type: Type.STRING } },
    },
    required: ['subjectLine', 'coverLetter', 'keyHighlights'],
  };

  try {
    const result = await generateStructuredJson(
      `You are an expert career writer. Draft a concise, personalized, credible cover letter in a ${tone} tone using ONLY facts present in the candidate resume and job description. Do not invent employers, metrics, or degrees. Keep the body under 350 words and ready to edit.`,
      `Candidate Name: ${candidateName || 'Candidate'}\nCompany: ${companyName}\nRole: ${jobTitle}\nTone: ${tone}\n\nRESUME:\n${resumeText}\n\nJOB DESCRIPTION:\n${jobDescription}`,
      schema
    );
    return { status: 200, data: result };
  } catch (error) {
    return mapAiErrorToResult(error);
  }
}

export async function handleInterviewQuestions(
  rawBody: unknown
): Promise<HandlerResult> {
  const body = (rawBody ?? {}) as Record<string, unknown>;
  const jobTitle = clampInput(body.jobTitle, MAX_SHORT_CHARS);
  const companyName = clampInput(body.companyName, MAX_SHORT_CHARS);
  const jobDescription = clampInput(body.jobDescription, MAX_TEXT_CHARS);
  const resumeText = clampInput(body.resumeText, MAX_TEXT_CHARS);
  const focus = clampInput(body.focus, 60) || 'Balanced';

  if (!jobTitle || jobDescription.length < 40) {
    return {
      status: 400,
      data: {
        code: 'INVALID_INPUT',
        error:
          'Job title and job description (at least 40 characters) are required to generate targeted interview questions.',
      },
    };
  }

  const questionItemSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      question: { type: Type.STRING },
      suggestedAnswer: { type: Type.STRING },
      explanation: { type: Type.STRING },
    },
    required: ['question', 'suggestedAnswer', 'explanation'],
  };

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      technical: { type: Type.ARRAY, items: questionItemSchema },
      hr: { type: Type.ARRAY, items: questionItemSchema },
      roleSpecific: { type: Type.ARRAY, items: questionItemSchema },
      behavioral: { type: Type.ARRAY, items: questionItemSchema },
      systemDesign: { type: Type.ARRAY, items: questionItemSchema },
    },
    required: ['technical', 'hr', 'roleSpecific', 'behavioral', 'systemDesign'],
  };

  try {
    const result = await generateStructuredJson(
      'You are a senior hiring manager and technical interviewer. Generate practical, realistic interview questions grouped into technical, hr, roleSpecific, behavioral, and systemDesign (2-3 items per category, or 1-2 systemDesign questions when relevant to the role). Include concise suggestedAnswer guidance and a short explanation of what interviewers look for.',
      `Company: ${companyName || 'Not specified'}\nRole: ${jobTitle}\nFocus: ${focus}\n\nJOB DESCRIPTION:\n${jobDescription}${
        resumeText ? `\n\nCANDIDATE RESUME CONTEXT:\n${resumeText}` : ''
      }`,
      schema
    );
    return { status: 200, data: result };
  } catch (error) {
    return mapAiErrorToResult(error);
  }
}

function parseJsonBody(req: VercelLikeRequest): unknown {
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return req.body ?? {};
}

export async function runVercelPostHandler(
  req: VercelLikeRequest,
  res: VercelLikeResponse,
  handler: (body: unknown) => Promise<HandlerResult>
): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ code: 'METHOD_NOT_ALLOWED', error: 'Method not allowed.' });
    return;
  }
  const result = await handler(parseJsonBody(req));
  res.status(result.status).json(result.data);
}
