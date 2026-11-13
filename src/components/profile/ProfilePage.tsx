import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertTriangle,
  CheckCircle2,
  KeyRound,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent, CardHeader } from '@/src/components/ui/card';
import { Dialog } from '@/src/components/ui/dialog';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { Select } from '@/src/components/ui/select';
import { useAuth } from '@/src/contexts/AuthContext';
import { deleteUserWorkspace, updateUserProfile } from '@/src/services/userService';
import {
  EMPLOYMENT_TYPE_PREFERENCES,
  FIELD_LIMITS,
  WORK_MODE_PREFERENCES,
} from '@/src/types/careerflow';

const profileSchema = z.object({
  name: z.string().min(1, 'Full name is required').max(FIELD_LIMITS.NAME_MAX),
  photoURL: z.string().max(FIELD_LIMITS.URL_MAX).optional().default(''),
  phone: z.string().max(FIELD_LIMITS.PHONE_MAX).optional().default(''),
  currentRole: z.string().max(FIELD_LIMITS.ROLE_MAX).optional().default(''),
  experience: z.string().max(FIELD_LIMITS.EXPERIENCE_MAX).optional().default(''),
  education: z.string().max(FIELD_LIMITS.EDUCATION_MAX).optional().default(''),
  workModePreference: z.enum(WORK_MODE_PREFERENCES),
  salaryPreference: z.string().max(80).optional().default(''),
  employmentTypePreference: z.enum(EMPLOYMENT_TYPE_PREFERENCES),
  weeklyApplicationGoal: z.coerce.number().min(1).max(100),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface TagEditorProps {
  label: string;
  items: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  maxItems: number;
  maxLength: number;
}

function TagEditor({
  label,
  items,
  onChange,
  placeholder,
  maxItems,
  maxLength,
}: TagEditorProps) {
  const [draft, setDraft] = useState('');

  const addItem = () => {
    const cleaned = draft.trim().slice(0, maxLength);
    if (!cleaned) return;
    if (items.length >= maxItems) return;
    if (items.some((i) => i.toLowerCase() === cleaned.toLowerCase())) {
      setDraft('');
      return;
    }
    onChange([...items, cleaned]);
    setDraft('');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <Label className="mb-0">{label}</Label>
        <span className="text-xs font-mono tabular-nums text-slate-400">
          {items.length}/{maxItems}
        </span>
      </div>
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addItem();
            }
          }}
          placeholder={placeholder}
          disabled={items.length >= maxItems}
          className="min-w-0 flex-1"
        />
        <Button
          type="button"
          variant="outline"
          onClick={addItem}
          disabled={!draft.trim() || items.length >= maxItems}
        >
          <Plus className="h-4 w-4" />
          <span>Add</span>
        </Button>
      </div>
      {items.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-2">
          {items.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1 text-xs text-slate-700 dark:text-slate-200"
            >
              <span>{item}</span>
              <button
                type="button"
                onClick={() => onChange(items.filter((x) => x !== item))}
                aria-label={`Remove ${item}`}
                className="text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function ProfilePage() {
  const { user, profile, profileLoading, sendPasswordReset } = useAuth();
  const [skills, setSkills] = useState<string[]>([]);
  const [preferredRoles, setPreferredRoles] = useState<string[]>([]);
  const [preferredLocations, setPreferredLocations] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema) as never,
    defaultValues: {
      name: '',
      photoURL: '',
      phone: '',
      currentRole: '',
      experience: '',
      education: '',
      workModePreference: 'Any',
      salaryPreference: '',
      employmentTypePreference: 'Full-time',
      weeklyApplicationGoal: 10,
    },
  });

  useEffect(() => {
    if (!profile) return;
    form.reset({
      name: profile.name || user?.displayName || '',
      photoURL: profile.photoURL || '',
      phone: profile.phone || '',
      currentRole: profile.currentRole || '',
      experience: profile.experience || '',
      education: profile.education || '',
      workModePreference: profile.workModePreference || 'Any',
      salaryPreference: profile.salaryPreference || '',
      employmentTypePreference: profile.employmentTypePreference || 'Full-time',
      weeklyApplicationGoal: profile.weeklyApplicationGoal ?? 10,
    });
    setSkills(profile.skills ?? []);
    setPreferredRoles(profile.preferredRoles ?? []);
    setPreferredLocations(profile.preferredLocations ?? []);
  }, [profile, user?.displayName, form]);

  const onSubmit = async (values: ProfileFormValues) => {
    if (!user) return;
    setSaving(true);
    setErrorMsg(null);
    setSavedNotice(null);
    try {
      await updateUserProfile(user.uid, {
        ...values,
        skills,
        preferredRoles,
        preferredLocations,
      });
      setSavedNotice('Profile and career preferences saved to Firestore.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    setErrorMsg(null);
    setSavedNotice(null);
    try {
      await sendPasswordReset(user.email);
      setSavedNotice(`Password reset email sent to ${user.email}.`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to send password reset email.');
    }
  };

  const handleDeleteAccount = async () => {
    if (!user || deleteConfirmText !== 'DELETE') return;
    setDeletingAccount(true);
    setErrorMsg(null);
    try {
      await deleteUserWorkspace(user.uid);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Failed to delete account. If your session is old, sign out and back in before deleting.'
      );
      setDeleteModalOpen(false);
    } finally {
      setDeletingAccount(false);
    }
  };

  if (profileLoading && !profile) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="h-8 w-52 rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse" />
        <div className="h-64 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 animate-pulse" />
      </div>
    );
  }

  const avatarUrl = form.watch('photoURL') || user?.photoURL || '';
  const hasPasswordProvider = user?.providerData.some((p) => p.providerId === 'password');

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">
            Profile & Preferences
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage your career identity, target roles, and private account settings.
          </p>
        </div>
      </div>

      {savedNotice && (
        <div
          role="status"
          className="flex items-center gap-2.5 rounded-lg border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{savedNotice}</span>
        </div>
      )}

      {errorMsg && (
        <div
          role="alert"
          className="flex items-center gap-2.5 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-300"
        >
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold">Personal Details</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Your profile information is private and only accessible by your account.
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center gap-4">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={form.watch('name') || 'Profile'}
                  referrerPolicy="no-referrer"
                  className="h-14 w-14 rounded-full object-cover border border-slate-200 dark:border-slate-800 shrink-0"
                />
              ) : (
                <div className="h-14 w-14 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center text-lg font-semibold shrink-0">
                  {(form.watch('name') || user?.email || 'U').slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1 text-xs text-slate-500 dark:text-slate-400 space-y-0.5">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                  {user?.email}
                </p>
                <p>Verified account · Signed in via {user?.providerData[0]?.providerId === 'google.com' ? 'Google' : 'Email'}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="prof-name">Full Name *</Label>
                <Input id="prof-name" {...form.register('name')} placeholder="Alex Rivera" />
                {form.formState.errors.name && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="prof-phone">Phone Number (Optional)</Label>
                <Input id="prof-phone" {...form.register('phone')} placeholder="+1 555 0192" />
              </div>

              <div>
                <Label htmlFor="prof-role">Current Job Title</Label>
                <Input
                  id="prof-role"
                  {...form.register('currentRole')}
                  placeholder="Senior Frontend Engineer"
                />
              </div>

              <div>
                <Label htmlFor="prof-exp">Total Experience</Label>
                <Input
                  id="prof-exp"
                  {...form.register('experience')}
                  placeholder="e.g. 4 years or Fresh Graduate"
                />
              </div>

              <div>
                <Label htmlFor="prof-edu">Education</Label>
                <Input
                  id="prof-edu"
                  {...form.register('education')}
                  placeholder="B.S. Computer Science"
                />
              </div>

              <div>
                <Label htmlFor="prof-photo">Profile Picture URL (Optional)</Label>
                <Input
                  id="prof-photo"
                  {...form.register('photoURL')}
                  placeholder="https://..."
                />
              </div>
            </div>

            <TagEditor
              label="Core Skills"
              items={skills}
              onChange={setSkills}
              placeholder="Add a skill (e.g. TypeScript, React, SQL) and press Enter"
              maxItems={FIELD_LIMITS.SKILLS_MAX_ITEMS}
              maxLength={FIELD_LIMITS.SKILL_ITEM_MAX}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold">Job Search Preferences</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Define your target roles, locations, compensation expectations, and weekly application target.
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="pref-workmode">Work Mode Preference</Label>
                <Select id="pref-workmode" {...form.register('workModePreference')}>
                  {WORK_MODE_PREFERENCES.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <Label htmlFor="pref-employment">Preferred Employment Type</Label>
                <Select id="pref-employment" {...form.register('employmentTypePreference')}>
                  {EMPLOYMENT_TYPE_PREFERENCES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <Label htmlFor="pref-salary">Expected Salary / Range</Label>
                <Input
                  id="pref-salary"
                  {...form.register('salaryPreference')}
                  placeholder="e.g. $120k - $150k / yr"
                />
              </div>

              <div>
                <Label htmlFor="pref-goal">Weekly Application Target</Label>
                <Input
                  id="pref-goal"
                  type="number"
                  min={1}
                  max={100}
                  className="font-mono tabular-nums"
                  {...form.register('weeklyApplicationGoal')}
                />
              </div>
            </div>

            <TagEditor
              label="Preferred Job Roles"
              items={preferredRoles}
              onChange={setPreferredRoles}
              placeholder="e.g. Full-Stack Developer, Product Engineer"
              maxItems={FIELD_LIMITS.PREF_LIST_MAX_ITEMS}
              maxLength={FIELD_LIMITS.PREF_ITEM_MAX}
            />

            <TagEditor
              label="Preferred Locations"
              items={preferredLocations}
              onChange={setPreferredLocations}
              placeholder="e.g. Remote, San Francisco, Bengaluru"
              maxItems={FIELD_LIMITS.PREF_LIST_MAX_ITEMS}
              maxLength={FIELD_LIMITS.PREF_ITEM_MAX}
            />

            <div className="pt-2 flex justify-end">
              <Button type="submit" disabled={saving}>
                <Save className="h-4 w-4" />
                <span>{saving ? 'Saving...' : 'Save Profile'}</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold">Account & Security</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage authentication recovery and permanent account deletion.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasPasswordProvider && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <p className="text-sm font-medium">Password Recovery</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Send a password reset link to {user?.email}.
                </p>
              </div>
              <Button type="button" variant="outline" onClick={handlePasswordReset}>
                <KeyRound className="h-4 w-4" />
                <span>Send Reset Email</span>
              </Button>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-red-600 dark:text-red-400">
                Delete Account & All Data
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Permanently remove your profile, all job applications, and activity logs. This cannot be undone.
              </p>
            </div>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                setDeleteConfirmText('');
                setDeleteModalOpen(true);
              }}
            >
              <Trash2 className="h-4 w-4" />
              <span>Delete Account</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete your CareerFlow account"
        description="This permanently erases your profile, job applications, and timeline logs."
        maxWidthClass="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Type <span className="font-mono font-semibold text-red-600">DELETE</span> below to confirm permanent removal of all your workspace records.
          </p>
          <Input
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            placeholder="Type DELETE to confirm"
          />
          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteConfirmText !== 'DELETE' || deletingAccount}
              onClick={handleDeleteAccount}
            >
              {deletingAccount ? 'Deleting...' : 'Permanently Delete'}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
