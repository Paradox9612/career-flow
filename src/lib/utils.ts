import { clsx, type ClassValue } from 'clsx';
import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns';
import type { Timestamp } from 'firebase/firestore';
import { twMerge } from 'tailwind-merge';
import type { JobApplication } from '@/src/types/careerflow';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateSafeId(prefix = ''): string {
  const randomPart =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().replace(/-/g, '')
      : `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  const raw = prefix ? `${prefix}_${randomPart}` : randomPart;
  return raw.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128);
}

export function toJsDate(value?: Timestamp | Date | string | null): Date | null {
  if (!value) return null;
  if (value instanceof Date) return isValid(value) ? value : null;
  if (typeof value === 'string') {
    const parsed = parseISO(value);
    return isValid(parsed) ? parsed : null;
  }
  if (typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    const d = value.toDate();
    return isValid(d) ? d : null;
  }
  return null;
}

export function formatShortDate(value?: Timestamp | Date | string | null): string {
  const d = toJsDate(value);
  if (!d) return '—';
  return format(d, 'MMM d, yyyy');
}

export function formatDateTime(value?: Timestamp | Date | string | null): string {
  const d = toJsDate(value);
  if (!d) return 'Just now';
  return format(d, 'MMM d, yyyy · HH:mm');
}

export function formatRelativeTime(value?: Timestamp | Date | string | null): string {
  const d = toJsDate(value);
  if (!d) return 'Just now';
  return formatDistanceToNow(d, { addSuffix: true });
}

export function todayIsoDate(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function normalizeUrl(url?: string): string {
  if (!url) return '';
  return url
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/+$/, '');
}

export function ensureExternalHref(url?: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

export function exportApplicationsToCsv(applications: JobApplication[]): void {
  const headers = [
    'Company',
    'Job Title',
    'Status',
    'Priority',
    'Work Mode',
    'Employment Type',
    'Location',
    'Salary',
    'Applied Date',
    'Next Follow-up',
    'Source',
    'Resume Version',
    'Recruiter Name',
    'Recruiter Email',
    'Job URL',
  ];

  const escapeCell = (val: string | undefined) => {
    const str = (val ?? '').replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = applications.map((app) => [
    escapeCell(app.companyName),
    escapeCell(app.jobTitle),
    escapeCell(app.status),
    escapeCell(app.priority),
    escapeCell(app.workMode),
    escapeCell(app.employmentType),
    escapeCell(app.location),
    escapeCell(app.salary),
    escapeCell(app.appliedDate),
    escapeCell(app.nextFollowUpDate),
    escapeCell(app.source),
    escapeCell(app.resumeVersion),
    escapeCell(app.recruiterName),
    escapeCell(app.recruiterEmail),
    escapeCell(app.jobUrl),
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `careerflow-applications-${todayIsoDate()}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
