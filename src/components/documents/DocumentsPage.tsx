import {
  Briefcase,
  CopyPlus,
  Download,
  Edit3,
  Eye,
  FileText,
  FolderOpen,
  HardDrive,
  Info,
  Link2,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent } from '@/src/components/ui/card';
import { Dialog } from '@/src/components/ui/dialog';
import { EmptyState } from '@/src/components/ui/empty-state';
import { Input } from '@/src/components/ui/input';
import { Select } from '@/src/components/ui/select';
import {
  formatFileSize,
  getLocalFile,
  getLocalFileAvailability,
  triggerBlobDownload,
} from '@/src/lib/localFileStore';
import { formatRelativeTime, formatShortDate } from '@/src/lib/utils';
import {
  formatResumeReference,
  isDocumentLinkedToApplication,
} from '@/src/services/documentService';
import {
  DOCUMENT_TYPES,
  type DocumentRecord,
  type DocumentType,
  type JobApplication,
} from '@/src/types/careerflow';

interface DocumentsPageProps {
  documents: DocumentRecord[];
  applications: JobApplication[];
  loading: boolean;
  error: string | null;
  onCreateDocument: (defaultType?: DocumentType) => void;
  onEditDocument: (docRecord: DocumentRecord) => void;
  onNewVersion: (docRecord: DocumentRecord) => void;
  onDeleteDocument: (docRecord: DocumentRecord) => Promise<void>;
  onLinkResumeToApplication: (
    application: JobApplication,
    resumeVersion: string
  ) => Promise<void>;
  onSelectApplication: (applicationId: string) => void;
}

export function DocumentsPage({
  documents,
  applications,
  loading,
  error,
  onCreateDocument,
  onEditDocument,
  onNewVersion,
  onDeleteDocument,
  onLinkResumeToApplication,
  onSelectApplication,
}: DocumentsPageProps) {
  const [typeFilter, setTypeFilter] = useState<'All' | DocumentType>('All');
  const [skillFilter, setSkillFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [localAvailability, setLocalAvailability] = useState<Record<string, boolean>>({});
  const [actionError, setActionError] = useState<string | null>(null);

  const [previewDoc, setPreviewDoc] = useState<DocumentRecord | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [previewMime, setPreviewMime] = useState<string>('');
  const [previewLoading, setPreviewLoading] = useState(false);

  const [linkingDoc, setLinkingDoc] = useState<DocumentRecord | null>(null);
  const [linkTargetAppId, setLinkTargetAppId] = useState<string>('');
  const [linkingSubmitting, setLinkingSubmitting] = useState(false);

  const [deletingDoc, setDeletingDoc] = useState<DocumentRecord | null>(null);
  const [deletingSubmitting, setDeletingSubmitting] = useState(false);

  useEffect(() => {
    const keys = documents
      .map((d) => d.localStorageReference ?? '')
      .filter(Boolean);
    if (keys.length === 0) {
      setLocalAvailability({});
      return;
    }
    let cancelled = false;
    getLocalFileAvailability(keys).then((map) => {
      if (!cancelled) setLocalAvailability(map);
    });
    return () => {
      cancelled = true;
    };
  }, [documents]);

  useEffect(() => {
    if (!previewDoc) {
      if (previewBlobUrl) {
        URL.revokeObjectURL(previewBlobUrl);
        setPreviewBlobUrl(null);
      }
      setPreviewMime('');
      return;
    }

    let activeUrl: string | null = null;
    let cancelled = false;

    if (previewDoc.localStorageReference) {
      setPreviewLoading(true);
      getLocalFile(previewDoc.localStorageReference)
        .then((stored) => {
          if (cancelled) return;
          if (stored) {
            activeUrl = URL.createObjectURL(stored.blob);
            setPreviewBlobUrl(activeUrl);
            setPreviewMime(stored.fileType || previewDoc.fileType || '');
          } else {
            setPreviewBlobUrl(null);
            setPreviewMime('');
          }
        })
        .finally(() => {
          if (!cancelled) setPreviewLoading(false);
        });
    } else {
      setPreviewBlobUrl(null);
      setPreviewMime('');
      setPreviewLoading(false);
    }

    return () => {
      cancelled = true;
      if (activeUrl) URL.revokeObjectURL(activeUrl);
    };
  }, [previewDoc]);

  const allSkills = useMemo(() => {
    const set = new Set<string>();
    documents.forEach((doc) => {
      (doc.skills ?? []).forEach((s) => set.add(s));
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [documents]);

  const linkedAppsByDocId = useMemo(() => {
    const map: Record<string, JobApplication[]> = {};
    documents.forEach((doc) => {
      map[doc.id] = applications.filter((app) =>
        isDocumentLinkedToApplication(doc, app)
      );
    });
    return map;
  }, [documents, applications]);

  const summary = useMemo(() => {
    const total = documents.length;
    const resumes = documents.filter((d) => d.documentType === 'Resume').length;
    const coverLetters = documents.filter((d) => d.documentType === 'Cover Letter').length;
    const linkedAppIds = new Set<string>();
    Object.values(linkedAppsByDocId).forEach((list) => {
      list.forEach((app) => linkedAppIds.add(app.id));
    });
    return {
      total,
      resumes,
      coverLetters,
      linkedAppsCount: linkedAppIds.size,
    };
  }, [documents, linkedAppsByDocId]);

  const filteredDocuments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return documents.filter((doc) => {
      if (typeFilter !== 'All' && doc.documentType !== typeFilter) return false;
      if (skillFilter !== 'ALL' && !(doc.skills ?? []).includes(skillFilter)) {
        return false;
      }
      if (!q) return true;
      return (
        doc.name.toLowerCase().includes(q) ||
        doc.version.toLowerCase().includes(q) ||
        (doc.fileName ?? '').toLowerCase().includes(q) ||
        (doc.experience ?? '').toLowerCase().includes(q) ||
        (doc.content ?? '').toLowerCase().includes(q) ||
        (doc.skills ?? []).some((s) => s.toLowerCase().includes(q))
      );
    });
  }, [documents, typeFilter, skillFilter, searchQuery]);

  const handleDownload = async (docRecord: DocumentRecord) => {
    setActionError(null);
    if (!docRecord.localStorageReference) return;
    const stored = await getLocalFile(docRecord.localStorageReference);
    if (!stored) {
      setActionError(
        'This file was uploaded on a different browser or device and is not in this browser’s local storage. Click Edit to re-attach the file.'
      );
      setLocalAvailability((prev) => ({
        ...prev,
        [docRecord.localStorageReference!]: false,
      }));
      return;
    }
    triggerBlobDownload(stored.blob, docRecord.fileName || stored.fileName);
  };

  const handleOpenLinkModal = (docRecord: DocumentRecord) => {
    setLinkingDoc(docRecord);
    const unlinked = applications.find(
      (app) => !isDocumentLinkedToApplication(docRecord, app)
    );
    setLinkTargetAppId(unlinked?.id ?? applications[0]?.id ?? '');
  };

  const handleConfirmLink = async () => {
    if (!linkingDoc || !linkTargetAppId) return;
    const targetApp = applications.find((a) => a.id === linkTargetAppId);
    if (!targetApp) return;
    setLinkingSubmitting(true);
    setActionError(null);
    try {
      await onLinkResumeToApplication(targetApp, formatResumeReference(linkingDoc));
      setLinkingDoc(null);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Unable to link resume to application.'
      );
    } finally {
      setLinkingSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingDoc) return;
    setDeletingSubmitting(true);
    setActionError(null);
    try {
      await onDeleteDocument(deletingDoc);
      if (previewDoc?.id === deletingDoc.id) setPreviewDoc(null);
      setDeletingDoc(null);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Unable to delete document.'
      );
    } finally {
      setDeletingSubmitting(false);
    }
  };

  const isPreviewPdf =
    previewMime.includes('pdf') ||
    (previewDoc?.fileName ?? '').toLowerCase().endsWith('.pdf');
  const isPreviewImage =
    previewMime.startsWith('image/') ||
    /\.(png|jpe?g)$/i.test(previewDoc?.fileName ?? '');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">
            Resumes &amp; Documents
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage resume versions, cover letters, certificates, and track which resume was sent to each role.
          </p>
        </div>

        <Button
          type="button"
          onClick={() =>
            onCreateDocument(typeFilter === 'All' ? 'Resume' : typeFilter)
          }
        >
          <Plus className="h-4 w-4" />
          <span>Add Document</span>
        </Button>
      </div>

      {/* Zero-cost browser storage disclosure */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 flex items-start gap-3">
        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          Document titles, version tags, skills, and extracted text sync securely via Firestore. Attached files are stored privately in{' '}
          <span className="font-medium text-slate-900 dark:text-white">
            this browser&apos;s IndexedDB
          </span>{' '}
          with zero paid cloud storage—so binary file downloads are available on the browser and device where the file was uploaded.
        </p>
      </div>

      {(error || actionError) && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-300"
        >
          {error || actionError}
        </div>
      )}

      {/* Summary metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Total Documents
            </p>
            <p className="font-display text-2xl font-bold font-mono tabular-nums mt-1">
              {summary.total}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Resumes
            </p>
            <p className="font-display text-2xl font-bold font-mono tabular-nums mt-1 text-blue-700 dark:text-blue-400">
              {summary.resumes}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Cover Letters
            </p>
            <p className="font-display text-2xl font-bold font-mono tabular-nums mt-1 text-indigo-700 dark:text-indigo-400">
              {summary.coverLetters}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Linked Applications
            </p>
            <p className="font-display text-2xl font-bold font-mono tabular-nums mt-1 text-emerald-700 dark:text-emerald-400">
              {summary.linkedAppsCount}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-x-auto max-w-full w-fit">
          {(['All', ...DOCUMENT_TYPES] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setTypeFilter(tab)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                typeFilter === tab
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-[220px] flex-1 sm:flex-initial">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search title, skills, or text..."
              className="pl-8 h-9 text-xs"
            />
          </div>

          {allSkills.length > 0 && (
            <Select
              aria-label="Filter by skill"
              value={skillFilter}
              onChange={(e) => setSkillFilter(e.target.value)}
              className="h-9 text-xs w-auto min-w-[145px]"
            >
              <option value="ALL">All Skills</option>
              {allSkills.map((skill) => (
                <option key={skill} value={skill}>
                  {skill}
                </option>
              ))}
            </Select>
          )}
        </div>
      </div>

      {/* Document List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="h-44 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 animate-pulse"
            />
          ))}
        </div>
      ) : documents.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <EmptyState
              icon={FolderOpen}
              title="No resumes or documents stored yet"
              description="Upload resume versions, tailored cover letters, or certificates to organize your job search assets and link them directly to applications."
              action={
                <Button type="button" onClick={() => onCreateDocument('Resume')}>
                  <Plus className="h-4 w-4" />
                  <span>Add Your First Document</span>
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : filteredDocuments.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center space-y-2">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
              No documents match your active filters
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Try clearing your search query or switching document type tabs.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredDocuments.map((doc) => {
            const linkedApps = linkedAppsByDocId[doc.id] ?? [];
            const hasRef = Boolean(doc.localStorageReference);
            const isLocalReady = hasRef
              ? Boolean(localAvailability[doc.localStorageReference!])
              : false;

            return (
              <Card key={doc.id}>
                <CardContent className="p-5 flex flex-col justify-between gap-4 h-full">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                          <span className="font-medium text-blue-700 dark:text-blue-400">
                            {doc.documentType}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums text-slate-700 dark:text-slate-300">
                            {doc.version}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>Updated {formatRelativeTime(doc.updatedAt)}</span>
                        </div>
                        <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white mt-1 truncate">
                          {doc.name}
                        </h2>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onNewVersion(doc)}
                          title="Create next version"
                          aria-label={`Create new version of ${doc.name}`}
                        >
                          <CopyPlus className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onEditDocument(doc)}
                          title="Edit document"
                          aria-label={`Edit ${doc.name}`}
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 dark:text-red-400"
                          onClick={() => setDeletingDoc(doc)}
                          title="Delete document"
                          aria-label={`Delete ${doc.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {doc.experience && (
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        {doc.experience}
                      </p>
                    )}

                    {(doc.skills?.length ?? 0) > 0 && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        <span className="font-medium text-slate-600 dark:text-slate-300">
                          Skills:
                        </span>{' '}
                        {doc.skills!.join(' · ')}
                      </p>
                    )}

                    {/* Local attachment line */}
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 pt-1">
                      <HardDrive className="h-3.5 w-3.5 shrink-0" />
                      {hasRef ? (
                        isLocalReady ? (
                          <span className="truncate">
                            <span className="text-slate-700 dark:text-slate-200 font-medium">
                              {doc.fileName}
                            </span>{' '}
                            <span className="font-mono tabular-nums">
                              ({formatFileSize(doc.fileSize)})
                            </span>{' '}
                            · Available locally
                          </span>
                        ) : (
                          <span className="text-amber-700 dark:text-amber-400 truncate">
                            {doc.fileName || 'File'} · Stored on another browser/device
                          </span>
                        )
                      ) : (
                        <span>
                          {doc.content
                            ? 'Text record synced in Firestore'
                            : 'Metadata record (no file attached)'}
                        </span>
                      )}
                    </div>

                    {/* Linked Applications */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-medium">
                          <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                          <span className="font-mono tabular-nums">
                            Used in {linkedApps.length}{' '}
                            {linkedApps.length === 1 ? 'application' : 'applications'}
                          </span>
                        </span>
                        {applications.length > 0 && (
                          <button
                            type="button"
                            onClick={() => handleOpenLinkModal(doc)}
                            className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                          >
                            <Link2 className="h-3 w-3" />
                            <span>Link to application</span>
                          </button>
                        )}
                      </div>

                      {linkedApps.length > 0 && (
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                          {linkedApps.slice(0, 3).map((app) => (
                            <button
                              key={app.id}
                              type="button"
                              onClick={() => onSelectApplication(app.id)}
                              className="text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 underline decoration-slate-300 dark:decoration-slate-700 underline-offset-2 cursor-pointer truncate max-w-[200px]"
                            >
                              {app.companyName} — {app.jobTitle}
                            </button>
                          ))}
                          {linkedApps.length > 3 && (
                            <span className="text-slate-400 font-mono tabular-nums">
                              +{linkedApps.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-[11px] font-mono tabular-nums text-slate-400">
                      Added {formatShortDate(doc.createdAt)}
                    </span>

                    <div className="flex items-center gap-2">
                      {(doc.content || isLocalReady || doc.notes) && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setPreviewDoc(doc)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Preview</span>
                        </Button>
                      )}
                      {hasRef && (
                        <Button
                          type="button"
                          variant={isLocalReady ? 'default' : 'outline'}
                          size="sm"
                          disabled={!isLocalReady}
                          onClick={() => void handleDownload(doc)}
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>Download</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Preview Modal */}
      <Dialog
        open={Boolean(previewDoc)}
        onClose={() => setPreviewDoc(null)}
        title={previewDoc ? `${previewDoc.name} (${previewDoc.version})` : 'Preview'}
        description={
          previewDoc
            ? `${previewDoc.documentType}${
                previewDoc.fileName ? ` · ${previewDoc.fileName}` : ''
              }`
            : undefined
        }
        maxWidthClass="max-w-3xl"
      >
        {previewDoc && (
          <div className="space-y-4">
            {previewLoading ? (
              <div className="h-64 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
            ) : previewBlobUrl && isPreviewPdf ? (
              <iframe
                title={previewDoc.name}
                src={previewBlobUrl}
                className="w-full h-[420px] rounded-lg border border-slate-200 dark:border-slate-800 bg-white"
              />
            ) : previewBlobUrl && isPreviewImage ? (
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 flex justify-center">
                <img
                  src={previewBlobUrl}
                  alt={previewDoc.name}
                  className="max-h-[420px] object-contain rounded"
                />
              </div>
            ) : previewDoc.localStorageReference && !previewBlobUrl ? (
              <div className="rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-xs text-amber-800 dark:text-amber-300">
                The attached binary file ({previewDoc.fileName}) is not present in this browser&apos;s IndexedDB. Edit this document to re-upload the file on this device.
              </div>
            ) : previewBlobUrl ? (
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 text-xs">
                  <FileText className="h-4 w-4 text-slate-500" />
                  <span>
                    Binary file <strong>{previewDoc.fileName}</strong> is stored locally and ready for download.
                  </span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void handleDownload(previewDoc)}
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download</span>
                </Button>
              </div>
            ) : null}

            {previewDoc.content && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Saved / Extracted Text Content
                </p>
                <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3.5 text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {previewDoc.content}
                </div>
              </div>
            )}

            {previewDoc.notes && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Version Notes
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                  {previewDoc.notes}
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              {previewBlobUrl && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handleDownload(previewDoc)}
                >
                  <Download className="h-4 w-4" />
                  <span>Download File</span>
                </Button>
              )}
              <Button type="button" onClick={() => setPreviewDoc(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* Link to Application Modal */}
      <Dialog
        open={Boolean(linkingDoc)}
        onClose={() => setLinkingDoc(null)}
        title="Link Document to Application"
        description={
          linkingDoc
            ? `Assign "${formatResumeReference(linkingDoc)}" as the resume version on a tracked application.`
            : undefined
        }
        maxWidthClass="max-w-md"
      >
        <div className="space-y-4">
          {applications.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Create a job application first to link documents to it.
            </p>
          ) : (
            <div>
              <label
                htmlFor="link-app-select"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Select Application
              </label>
              <Select
                id="link-app-select"
                value={linkTargetAppId}
                onChange={(e) => setLinkTargetAppId(e.target.value)}
              >
                {applications.map((app) => (
                  <option key={app.id} value={app.id}>
                    {app.companyName} — {app.jobTitle} ({app.status})
                  </option>
                ))}
              </Select>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setLinkingDoc(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={linkingSubmitting || !linkTargetAppId}
              onClick={() => void handleConfirmLink()}
            >
              {linkingSubmitting ? 'Linking...' : 'Link Resume'}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog
        open={Boolean(deletingDoc)}
        onClose={() => setDeletingDoc(null)}
        title="Delete document"
        description="This removes the document metadata from Firestore and deletes any locally attached file from this browser."
        maxWidthClass="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Are you sure you want to delete{' '}
            <strong className="font-semibold text-slate-900 dark:text-white">
              {deletingDoc?.name} ({deletingDoc?.version})
            </strong>
            ?
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeletingDoc(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deletingSubmitting}
              onClick={() => void handleConfirmDelete()}
            >
              {deletingSubmitting ? 'Deleting...' : 'Delete Document'}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
