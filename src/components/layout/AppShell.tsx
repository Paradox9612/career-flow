import {
  BarChart3,
  Briefcase,
  CalendarClock,
  CalendarDays,
  CheckSquare,
  FileText,
  Kanban,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Plus,
  Sparkles,
  Sun,
  User as UserIcon,
  X,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Button } from '@/src/components/ui/button';
import { useAuth } from '@/src/contexts/AuthContext';
import { useTheme } from '@/src/contexts/ThemeContext';

export type ActiveRoute =
  | 'dashboard'
  | 'applications'
  | 'pipeline'
  | 'interviews'
  | 'calendar'
  | 'tasks'
  | 'documents'
  | 'ai'
  | 'analytics'
  | 'profile';

interface AppShellProps {
  activeRoute: ActiveRoute;
  onNavigate: (route: ActiveRoute) => void;
  breadcrumbTrail: string[];
  onQuickAddApplication: () => void;
  children: ReactNode;
}

const NAV_ITEMS: { id: ActiveRoute; label: string; Icon: typeof Briefcase }[] = [
  { id: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { id: 'applications', label: 'Applications', Icon: Briefcase },
  { id: 'pipeline', label: 'Pipeline', Icon: Kanban },
  { id: 'interviews', label: 'Interviews', Icon: CalendarClock },
  { id: 'calendar', label: 'Calendar', Icon: CalendarDays },
  { id: 'tasks', label: 'Tasks & Follow-ups', Icon: CheckSquare },
  { id: 'documents', label: 'Resumes & Documents', Icon: FileText },
  { id: 'ai', label: 'AI Assistant', Icon: Sparkles },
  { id: 'analytics', label: 'Analytics', Icon: BarChart3 },
  { id: 'profile', label: 'Profile & Settings', Icon: UserIcon },
];

export function AppShell({
  activeRoute,
  onNavigate,
  breadcrumbTrail,
  onQuickAddApplication,
  children,
}: AppShellProps) {
  const { user, profile, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const displayName = profile?.name || user?.displayName || user?.email?.split('@')[0] || 'Account';
  const avatarUrl = profile?.photoURL || user?.photoURL || '';

  const handleSelectNav = (route: ActiveRoute) => {
    onNavigate(route);
    setMobileMenuOpen(false);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="h-16 px-5 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 shrink-0">
        <button
          type="button"
          onClick={() => handleSelectNav('dashboard')}
          className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0 cursor-pointer"
        >
          CareerFlow
        </button>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(false)}
          aria-label="Close navigation menu"
          className="lg:hidden h-9 w-9 inline-flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Main navigation">
        {NAV_ITEMS.map(({ id, label, Icon }) => {
          const isActive = activeRoute === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => handleSelectNav(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-2 shrink-0">
        <button
          type="button"
          onClick={() => handleSelectNav('profile')}
          className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors text-left cursor-pointer"
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              referrerPolicy="no-referrer"
              className="h-8 w-8 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center text-xs font-semibold shrink-0">
              {displayName.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
              {displayName}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {user?.email}
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => logout()}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
        >
          <LogOut className="h-3.5 w-3.5 shrink-0" />
          <span>Sign out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-[248px] shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 h-screen">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden bg-slate-950/50"
          onClick={() => setMobileMenuOpen(false)}
        >
          <aside
            className="w-[260px] h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 px-4 sm:px-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden h-9 w-9 inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shrink-0"
            >
              <Menu className="h-4 w-4" />
            </button>
            <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm min-w-0">
              {breadcrumbTrail.map((crumb, idx) => (
                <span key={`${crumb}-${idx}`} className="flex items-center gap-2 min-w-0">
                  {idx > 0 && <span className="text-slate-400 shrink-0">/</span>}
                  <span
                    className={`truncate ${
                      idx === breadcrumbTrail.length - 1
                        ? 'font-semibold text-slate-900 dark:text-white'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {crumb}
                  </span>
                </span>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle color theme"
              className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <Button type="button" size="sm" onClick={onQuickAddApplication}>
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New Application</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
