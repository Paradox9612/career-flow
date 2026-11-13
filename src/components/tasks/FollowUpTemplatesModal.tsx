import { Check, Copy, Mail } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/src/components/ui/button';
import { Dialog } from '@/src/components/ui/dialog';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { Select } from '@/src/components/ui/select';
import { Textarea } from '@/src/components/ui/textarea';
import { buildFollowUpEmailTemplates } from '@/src/lib/followUpTemplates';
import type { JobApplication } from '@/src/types/careerflow';

interface FollowUpTemplatesModalProps {
  open: boolean;
  onClose: () => void;
  applications: JobApplication[];
  initialApplicationId?: string | null;
  senderName?: string;
}

export function FollowUpTemplatesModal({
  open,
  onClose,
  applications,
  initialApplicationId,
  senderName,
}: FollowUpTemplatesModalProps) {
  const [selectedAppId, setSelectedAppId] = useState<string>(initialApplicationId ?? '');
  const [templateId, setTemplateId] = useState<string>('post-application');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCopied(false);
    setSelectedAppId(
      initialApplicationId && applications.some((a) => a.id === initialApplicationId)
        ? initialApplicationId
        : applications[0]?.id ?? ''
    );
  }, [open, initialApplicationId, applications]);

  const selectedApplication = useMemo(
    () => applications.find((a) => a.id === selectedAppId),
    [applications, selectedAppId]
  );

  const templates = useMemo(
    () =>
      buildFollowUpEmailTemplates({
        application: selectedApplication,
        senderName,
      }),
    [selectedApplication, senderName]
  );

  useEffect(() => {
    const active = templates.find((t) => t.id === templateId) ?? templates[0];
    if (active) {
      setSubject(active.subject);
      setBody(active.body);
      setCopied(false);
    }
  }, [templates, templateId]);

  const handleCopy = async () => {
    const fullText = `Subject: ${subject}\n\n${body}`;
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable
    }
  };

  const mailtoHref = selectedApplication?.recruiterEmail
    ? `mailto:${encodeURIComponent(selectedApplication.recruiterEmail)}?subject=${encodeURIComponent(
        subject
      )}&body=${encodeURIComponent(body)}`
    : null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Follow-up Email Templates"
      description="Pre-filled outreach templates populated from your application and recruiter details."
      maxWidthClass="max-w-2xl"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="tpl-app">Target Application</Label>
            <Select
              id="tpl-app"
              value={selectedAppId}
              onChange={(e) => setSelectedAppId(e.target.value)}
            >
              <option value="">Generic placeholder</option>
              {applications.map((app) => (
                <option key={app.id} value={app.id}>
                  {app.companyName} — {app.jobTitle}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="tpl-kind">Template Style</Label>
            <Select
              id="tpl-kind"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
            >
              {templates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="tpl-subject">Email Subject</Label>
          <Input
            id="tpl-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="tpl-body">Email Body</Label>
          <Textarea
            id="tpl-body"
            rows={9}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {selectedApplication?.recruiterEmail
              ? `Recruiter: ${selectedApplication.recruiterEmail}`
              : 'Add a recruiter email on the application to enable direct mail launch.'}
          </div>

          <div className="flex items-center gap-2">
            {mailtoHref && (
              <a
                href={mailtoHref}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Mail className="h-3.5 w-3.5" />
                <span>Open Mail Client</span>
              </a>
            )}
            <Button type="button" onClick={handleCopy}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              <span>{copied ? 'Copied' : 'Copy Email'}</span>
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
