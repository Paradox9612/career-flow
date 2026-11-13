import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/src/components/ui/button';
import { Dialog } from '@/src/components/ui/dialog';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { Select } from '@/src/components/ui/select';
import { Textarea } from '@/src/components/ui/textarea';
import { todayIsoDate } from '@/src/lib/utils';
import { createTask, updateTask } from '@/src/services/taskService';
import {
  FIELD_LIMITS,
  PRIORITIES,
  TASK_CATEGORIES,
  TASK_STATUSES,
  type JobApplication,
  type TaskCategory,
  type TaskItem,
} from '@/src/types/careerflow';

const taskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Task title is required.')
    .max(FIELD_LIMITS.TASK_TITLE_MAX),
  applicationId: z.string().max(FIELD_LIMITS.ID_MAX).optional().default(''),
  category: z.enum(TASK_CATEGORIES),
  priority: z.enum(PRIORITIES),
  status: z.enum(TASK_STATUSES),
  dueDate: z.string().max(FIELD_LIMITS.DATE_MAX).optional().default(''),
  reminderDate: z.string().max(FIELD_LIMITS.DATE_MAX).optional().default(''),
  description: z.string().max(FIELD_LIMITS.TASK_DESC_MAX).optional().default(''),
});

type FormValues = z.infer<typeof taskSchema>;

interface TaskFormModalProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  applications: JobApplication[];
  editingTask?: TaskItem | null;
  defaultApplicationId?: string | null;
  defaultDate?: string | null;
  defaultCategory?: TaskCategory | null;
  onSaved?: (taskId: string) => void;
}

export function TaskFormModal({
  open,
  onClose,
  userId,
  applications,
  editingTask,
  defaultApplicationId,
  defaultDate,
  defaultCategory,
  onSaved,
}: TaskFormModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(taskSchema) as never,
    defaultValues: {
      title: '',
      applicationId: '',
      category: 'Recruiter follow-up',
      priority: 'Medium',
      status: 'Pending',
      dueDate: todayIsoDate(),
      reminderDate: '',
      description: '',
    },
  });

  useEffect(() => {
    if (!open) return;
    setSubmitError(null);
    if (editingTask) {
      form.reset({
        title: editingTask.title,
        applicationId: editingTask.applicationId || '',
        category: editingTask.category,
        priority: editingTask.priority,
        status: editingTask.status,
        dueDate: editingTask.dueDate || '',
        reminderDate: editingTask.reminderDate || '',
        description: editingTask.description || '',
      });
    } else {
      const initialAppId =
        defaultApplicationId && applications.some((a) => a.id === defaultApplicationId)
          ? defaultApplicationId
          : '';
      form.reset({
        title: '',
        applicationId: initialAppId,
        category: defaultCategory ?? 'Recruiter follow-up',
        priority: 'Medium',
        status: 'Pending',
        dueDate: defaultDate || todayIsoDate(),
        reminderDate: '',
        description: '',
      });
    }
  }, [open, editingTask, defaultApplicationId, defaultDate, defaultCategory, applications, form]);

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const linkedApp = values.applicationId
        ? applications.find((a) => a.id === values.applicationId)
        : undefined;

      if (editingTask) {
        await updateTask(userId, editingTask, values, linkedApp);
        onSaved?.(editingTask.id);
      } else {
        const createdId = await createTask(userId, values, linkedApp);
        onSaved?.(createdId);
      }
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Unable to save task.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={editingTask ? 'Edit Task' : 'New Task & Follow-up'}
      description={
        editingTask
          ? `Updating "${editingTask.title}"`
          : 'Create a task or recruiter follow-up reminder, optionally linked to an application.'
      }
      maxWidthClass="max-w-xl"
    >
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {submitError && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-3.5 py-2.5 text-xs text-red-700 dark:text-red-300"
          >
            {submitError}
          </div>
        )}

        <div>
          <Label htmlFor="task-title">Task Title *</Label>
          <Input
            id="task-title"
            placeholder="e.g. Send post-interview follow-up email to Jordan"
            {...form.register('title')}
          />
          {form.formState.errors.title && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
              {form.formState.errors.title.message}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Label htmlFor="task-app">Associated Application (Optional)</Label>
            <Select id="task-app" {...form.register('applicationId')}>
              <option value="">General job search task (unlinked)</option>
              {applications.map((app) => (
                <option key={app.id} value={app.id}>
                  {app.companyName} — {app.jobTitle} ({app.status})
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="task-category">Category</Label>
            <Select id="task-category" {...form.register('category')}>
              {TASK_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="task-priority">Priority</Label>
            <Select id="task-priority" {...form.register('priority')}>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="task-due">Due Date</Label>
            <Input id="task-due" type="date" className="font-mono" {...form.register('dueDate')} />
          </div>

          <div>
            <Label htmlFor="task-reminder">Reminder Date</Label>
            <Input
              id="task-reminder"
              type="date"
              className="font-mono"
              {...form.register('reminderDate')}
            />
          </div>

          <div className="sm:col-span-2">
            <Label htmlFor="task-status">Completion Status</Label>
            <Select id="task-status" {...form.register('status')}>
              {TASK_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </div>

          <div className="sm:col-span-2">
            <Label htmlFor="task-desc">Description & Notes</Label>
            <Textarea
              id="task-desc"
              rows={4}
              placeholder="Action items, links, or follow-up talking points..."
              {...form.register('description')}
            />
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <span className="text-xs text-slate-400">Fields marked with * are required.</span>
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : editingTask ? 'Save Changes' : 'Create Task'}
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
