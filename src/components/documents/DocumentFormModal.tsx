import { zodResolver } from '@hookform/resolvers/zod';
import { FileText, HardDrive, Plus, Trash2, Upload, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/src/components/ui/button';
import { Dialog } from '@/src/components/ui/dialog';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { Select } from '@/src/components/ui/select';
import { Textarea } from '@/src/components/ui/textarea';
import {
  ALLOWED_DOCUMENT_ACCEPT,
  extractTextFromFile,
  formatFileSize,
  hasLocalFile,
  validateSelectedFile,
} from '@/src/lib/localFileStore';
import {
  bumpVersionTag,
  createDocument,
  updateDocument,
} from '@/src/services/documentService';
import {
  DOCUMENT_TYPES,
  FIELD_LIMITS,
  type DocumentRecord,
  type DocumentType,
} from '@/src/types/careerflow';

const documentSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Document title is required.')
    .max(FIELD_LIMITS.DOC_NAME_MAX),
  documentType: z.enum(DOCUMENT_TYPES),
  version: z
    .string()
    .trim()
    .min(1, 'Version label is required (e.g. v1.0).')
    .max(FIELD_LIMITS.DOC_VERSION_MAX),
  experience: z.string().max(FIELD_LIMITS.DOC_EXPERIENCE_MAX).optional().default(''),
  content: z.string().max(FIELD_LIMITS.DOC_CONTENT_MAX).optional().default(''),
  notes: z.string().max(FIELD_LIMITS.DOC_NOTES_MAX).optional().default(''),
});

type FormValues = z.infer<typeof documentSchema>;

interface DocumentFormModalProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  editingDocument?: DocumentRecord | null;
  versionTemplate?: DocumentRecord | null;
  defaultType?: DocumentType;
  onSaved?: (documentId: string) => void;
}

export function DocumentFormModal({
  open,
  onClose,
  userId,
  editingDocument,
  versionTemplate,
  defaultType = 'Resume',
  onSaved,
}: DocumentFormModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [removeExistingFile, setRemoveExistingFile] = useState(false);
  const [existingFileAvailable, setExistingFileAvailable] = useState<boolean>(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(documentSchema) as never,
    defaultValues: {
      name: '',
      documentType: defaultType,
      version: 'v1.0',
      experience: '',
      content: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (!open) return;
    setSelectedFile(null);
    setRemoveExistingFile(false);
    setFileError(null);
    setSkillInput('');
    setSubmitError(null);

    if (editingDocument) {
      form.reset({
        name: editingDocument.name,
        documentType: editingDocument.documentType,
        version: editingDocument.version || 'v1.0',
        experience: editingDocument.experience || '',
        content: editingDocument.content || '',
        notes: editingDocument.notes || '',
      });
      setSkills(editingDocument.skills ?? []);
      if (editingDocument.localStorageReference) {
        hasLocalFile(editingDocument.localStorageReference)
          .then((exists) => setExistingFileAvailable(exists))
          .catch(() => setExistingFileAvailable(false));
      } else {
        setExistingFileAvailable(false);
      }
    } else if (versionTemplate) {
      form.reset({
        name: versionTemplate.name,
        documentType: versionTemplate.documentType,
        version: bumpVersionTag(versionTemplate.version),
        experience: versionTemplate.experience || '',
        content: versionTemplate.content || '',
        notes: versionTemplate.notes || '',
      });
      setSkills(versionTemplate.skills ?? []);
      setExistingFileAvailable(false);
    } else {
      form.reset({
        name: '',
        documentType: defaultType,
        version: 'v1.0',
        experience: '',
        content: '',
        notes: '',
      });
      setSkills([]);
      setExistingFileAvailable(false);
    }
  }, [open, editingDocument, versionTemplate, defaultType, form]);

  const handleFilePicked = async (file: File | undefined | null) => {
    if (!file) return;
    setFileError(null);
    const validationErr = validateSelectedFile(file);
    if (validationErr) {
      setFileError(validationErr);
      return;
    }

    setSelectedFile(file);
    setRemoveExistingFile(false);

    if (!form.getValues('name').trim()) {
      const baseName = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
      if (baseName) {
        form.setValue('name', baseName.slice(0, FIELD_LIMITS.DOC_NAME_MAX), {
          shouldValidate: true,
        });
      }
    }

    const extracted = await extractTextFromFile(file);
    if (extracted !== null) {
      const currentContent = form.getValues('content')?.trim() ?? '';
      if (!currentContent) {
        form.setValue('content', extracted);
      }
    }
  };

  const handleAddSkills = () => {
    const raw = skillInput.trim();
    if (!raw) return;
    const parts = raw
      .split(',')
      .map((s) => s.trim().slice(0, FIELD_LIMITS.SKILL_ITEM_MAX))
      .filter(Boolean);

    setSkills((prev) =>
      Array.from(new Set([...prev, ...parts])).slice(0, FIELD_LIMITS.SKILLS_MAX_ITEMS)
    );
    setSkillInput('');
  };

  const handleRemoveSkill = (skill: string) => {
    setSkills((prev) => prev.filter((item) => item !== skill));
  };

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload = {
        name: values.name,
        documentType: values.documentType,
        version: values.version,
        skills,
        experience: values.experience,
        content: values.content,
        notes: values.notes,
      };

      if (editingDocument) {
        await updateDocument(editingDocument, payload, {
          newFile: selectedFile,
          removeExistingFile,
        });
        onSaved?.(editingDocument.id);
      } else {
        const createdId = await createDocument(userId, payload, selectedFile);
        onSaved?.(createdId);
      }
      onClose();
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Unable to save document record.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const watchDocType = form.watch('documentType');
  const isNewVersionFlow = !editingDocument && Boolean(versionTemplate);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={
        editingDocument
          ? 'Edit Document'
          : isNewVersionFlow
          ? 'Create New Document Version'
          : 'Add Resume or Document'
      }
      description={
        editingDocument
          ? `Update metadata, skills, or local file attachment for ${editingDocument.name}.`
          : isNewVersionFlow
          ? `Creating a new version based on ${versionTemplate?.name} (${versionTemplate?.version}).`
          : 'Store metadata in Firestore and keep attached files privately in this browser.'
      }
      maxWidthClass="max-w-2xl"
    >
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        {submitError && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-3.5 py-2.5 text-xs text-red-700 dark:text-red-300"
          >
            {submitError}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
          <div className="sm:col-span-6">
            <Label htmlFor="doc-name">Document Title *</Label>
            <Input
              id="doc-name"
              placeholder={
                watchDocType === 'Cover Letter'
                  ? 'e.g. Stripe Frontend Cover Letter'
                  : 'e.g. Senior Frontend Engineer Resume'
              }
              {...form.register('name')}
            />
            {form.formState.errors.name && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div className="sm:col-span-3">
            <Label htmlFor="doc-type">Document Type *</Label>
            <Select id="doc-type" {...form.register('documentType')}>
              {DOCUMENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </Select>
          </div>

          <div className="sm:col-span-3">
            <Label htmlFor="doc-version">Version Tag *</Label>
            <Input
              id="doc-version"
              placeholder="e.g. v1.0"
              className="font-mono"
              {...form.register('version')}
            />
            {form.formState.errors.version && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                {form.formState.errors.version.message}
              </p>
            )}
          </div>
        </div>

        {/* Local File Attachment */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="doc-file">File Attachment (Stored Locally in Browser)</Label>
            <span className="text-[11px] text-slate-400">
              PDF, DOC, DOCX, TXT, MD, PNG, JPG · Max 10 MB
            </span>
          </div>

          <input
            ref={fileInputRef}
            id="doc-file"
            type="file"
            accept={ALLOWED_DOCUMENT_ACCEPT}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              void handleFilePicked(file);
              e.target.value = '';
            }}
          />

          {selectedFile ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50/60 dark:bg-blue-950/30 px-3.5 py-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-900 dark:text-white truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                    {formatFileSize(selectedFile.size)} · Ready to store locally
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedFile(null)}
                aria-label="Remove selected file"
                className="text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : editingDocument?.fileName && !removeExistingFile ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 px-3.5 py-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <HardDrive className="h-4 w-4 text-slate-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                    {editingDocument.fileName}
                  </p>
                  <p className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                    {formatFileSize(editingDocument.fileSize)} ·{' '}
                    {existingFileAvailable
                      ? 'Available in this browser'
                      : 'Not cached in this browser — replace file to re-attach'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Replace
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-red-600 dark:text-red-400"
                  onClick={() => setRemoveExistingFile(true)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full rounded-lg border border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 bg-slate-50/70 dark:bg-slate-900/40 px-4 py-4 text-center transition-colors cursor-pointer"
            >
              <Upload className="h-5 w-5 text-slate-400 mx-auto mb-1.5" />
              <p className="text-xs font-medium text-slate-700 dark:text-slate-200">
                Click to attach a file from your device
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Stored locally in IndexedDB with zero paid cloud storage. Text files auto-extract below.
              </p>
            </button>
          )}

          {fileError && (
            <p className="text-xs text-red-600 dark:text-red-400">{fileError}</p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="doc-experience">Target Experience / Focus</Label>
            <Input
              id="doc-experience"
              placeholder="e.g. 5+ years React, TypeScript & Design Systems"
              {...form.register('experience')}
            />
          </div>

          <div>
            <Label htmlFor="doc-skill-input">Highlighted Skills (comma or Enter)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="doc-skill-input"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSkills();
                  }
                }}
                placeholder="React, TypeScript, GraphQL"
              />
              <Button type="button" variant="outline" size="sm" onClick={handleAddSkills}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {skills.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-200"
              >
                <span>{skill}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveSkill(skill)}
                  aria-label={`Remove ${skill}`}
                  className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        <div>
          <div className="flex items-center justify-between gap-2 mb-1">
            <Label htmlFor="doc-content">
              {watchDocType === 'Cover Letter'
                ? 'Cover Letter Body / Text Content'
                : 'Extracted / Pasted Text Content (Optional)'}
            </Label>
            <span className="text-[11px] text-slate-400">
              Synced across devices & searchable
            </span>
          </div>
          <Textarea
            id="doc-content"
            rows={6}
            placeholder={
              watchDocType === 'Cover Letter'
                ? 'Write or paste your cover letter template here so you can insert it into applications...'
                : 'Auto-filled for .txt/.md files. For PDF/DOCX resumes, paste key text here so it remains searchable across devices.'
            }
            {...form.register('content')}
          />
        </div>

        <div>
          <Label htmlFor="doc-notes">Version Notes (Optional)</Label>
          <Textarea
            id="doc-notes"
            rows={2}
            placeholder="e.g. Tailored for Staff Frontend roles; emphasizes latency optimization and mentoring."
            {...form.register('notes')}
          />
        </div>

        <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <span className="text-xs text-slate-400">
            Metadata syncs via Firestore · Files stay in this browser.
          </span>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting
                ? 'Saving...'
                : editingDocument
                ? 'Save Changes'
                : isNewVersionFlow
                ? 'Save New Version'
                : 'Save Document'}
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
