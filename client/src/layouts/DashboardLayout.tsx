import { ReactNode, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  CalendarCheck,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  Library,
  ListChecks,
  LogOut,
  Menu,
  NotebookPen,
  UserCircle,
  Users,
  UsersRound,
  Wallet,
  X,
} from 'lucide-react';
import Avatar from '../components/Avatar';
import PreferenceSwitchers from '../components/PreferenceSwitchers';
import { useAuth } from '../context/AuthContext';
import { t } from '../i18n';
import type { Role } from '../types';
import { roleLabels } from '../utils/format';

interface NavItem {
  to: string;
  labelKey: string;
  icon: ReactNode;
  end?: boolean;
}
interface NavSection {
  titleKey?: string;
  items: NavItem[];
}

const ic = 18;

// Menyu tuzilmasi (matnlar render paytida t() orqali olinadi)
const menus: Record<Role, NavSection[]> = {
  admin: [
    { items: [{ to: '/admin', labelKey: 'layout.nav.dashboard', icon: <LayoutDashboard size={ic} />, end: true }] },
    {
      titleKey: 'layout.nav.learning',
      items: [
        { to: '/admin/subjects', labelKey: 'layout.nav.subjects', icon: <BookOpen size={ic} /> },
        { to: '/admin/grading', labelKey: 'layout.nav.grading', icon: <ListChecks size={ic} /> },
        { to: '/admin/groups', labelKey: 'layout.nav.groups', icon: <UsersRound size={ic} /> },
      ],
    },
    {
      titleKey: 'layout.nav.people',
      items: [
        { to: '/admin/teachers', labelKey: 'layout.nav.teachers', icon: <GraduationCap size={ic} /> },
        { to: '/admin/students', labelKey: 'layout.nav.students', icon: <Users size={ic} /> },
      ],
    },
    { titleKey: 'layout.nav.finance', items: [{ to: '/admin/payments', labelKey: 'layout.nav.payments', icon: <Wallet size={ic} /> }] },
    { titleKey: 'layout.nav.account', items: [{ to: '/profile', labelKey: 'layout.nav.profile', icon: <UserCircle size={ic} /> }] },
  ],
  teacher: [
    {
      items: [
        { to: '/teacher', labelKey: 'layout.nav.myGroups', icon: <UsersRound size={ic} />, end: true },
        { to: '/teacher/schedule', labelKey: 'layout.nav.schedule', icon: <CalendarDays size={ic} /> },
        { to: '/teacher/homework', labelKey: 'layout.nav.homework', icon: <NotebookPen size={ic} /> },
        { to: '/teacher/assessments', labelKey: 'layout.nav.assessments', icon: <ClipboardCheck size={ic} /> },
        { to: '/teacher/materials', labelKey: 'layout.nav.materials', icon: <Library size={ic} /> },
      ],
    },
    { titleKey: 'layout.nav.account', items: [{ to: '/profile', labelKey: 'layout.nav.profile', icon: <UserCircle size={ic} /> }] },
  ],
  student: [
    {
      items: [
        { to: '/student', labelKey: 'layout.nav.myGrades', icon: <ClipboardList size={ic} />, end: true },
        { to: '/student/schedule', labelKey: 'layout.nav.schedule', icon: <CalendarDays size={ic} /> },
        { to: '/student/homework', labelKey: 'layout.nav.myHomework', icon: <NotebookPen size={ic} /> },
        { to: '/student/assessments', labelKey: 'layout.nav.myAssessments', icon: <ClipboardCheck size={ic} /> },
        { to: '/student/attendance', labelKey: 'layout.nav.myAttendance', icon: <CalendarCheck size={ic} /> },
        { to: '/student/materials', labelKey: 'layout.nav.materials', icon: <Library size={ic} /> },
        { to: '/student/payments', labelKey: 'layout.nav.myPayments', icon: <Wallet size={ic} /> },
      ],
    },
    { titleKey: 'layout.nav.account', items: [{ to: '/profile', labelKey: 'layout.nav.profile', icon: <UserCircle size={ic} /> }] },
  ],
};

// Sahifa nomi (aniqroq yo'llar oldin tekshiriladi)
const titles: [string, string][] = [
  ['/admin/subjects', 'layout.title.subjects'],
  ['/admin/grading', 'layout.nav.grading'],
  ['/admin/teachers', 'layout.nav.teachers'],
  ['/admin/students', 'layout.nav.students'],
  ['/admin/groups', 'layout.nav.groups'],
  ['/admin/payments', 'layout.nav.payments'],
  ['/teacher/groups/', 'layout.title.group'],
  ['/teacher/assessments', 'layout.nav.assessments'],
  ['/teacher/homework', 'layout.nav.homework'],
  ['/teacher/schedule', 'layout.nav.schedule'],
  ['/teacher/materials', 'layout.nav.materials'],
  ['/student/assessments', 'layout.nav.myAssessments'],
  ['/student/homework', 'layout.nav.myHomework'],
  ['/student/schedule', 'layout.nav.schedule'],
  ['/student/attendance', 'layout.nav.myAttendance'],
  ['/student/materials', 'layout.nav.materials'],
  ['/student/payments', 'layout.nav.myPayments'],
  ['/profile', 'layout.nav.profile'],
];

function pageTitle(pathname: string): string {
  if (pathname === '/admin') return t('layout.nav.dashboard');
  if (pathname === '/teacher') return t('layout.nav.myGroups');
  if (pathname === '/student') return t('layout.nav.myGrades');
  const found = titles.find(([p]) => pathname.startsWith(p));
  return found ? t(found[1]) : t('layout.brand');
}

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  // Sahifa almashganda mobil menyu yopiladi
  useEffect(() => setOpen(false), [pathname]);

  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex h-full">
      {open && <div className="fixed inset-0 z-30 animate-fade-in bg-slate-900/50 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)} />}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-slate-200 bg-white transition-transform lg:static lg:w-64 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between px-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-cyan-500 text-white shadow-md shadow-brand/30">
              <GraduationCap size={20} />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900">{t('layout.brand')}</span>
          </div>
          <button className="icon-btn lg:hidden" onClick={() => setOpen(false)} aria-label={t('common.close')}>
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {menus[user.role].map((section, i) => (
            <div key={section.titleKey ?? i}>
              {section.titleKey && (
                <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t(section.titleKey)}</p>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                        isActive ? 'bg-brand-50 text-brand-700 shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`
                    }
                  >
                    {item.icon}
                    {t(item.labelKey)}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-slate-200 p-3">
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-2.5">
            <Avatar name={user.full_name} size={38} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium leading-tight text-slate-900">{user.full_name}</p>
              <p className="truncate text-xs text-slate-500">{roleLabels[user.role]}</p>
            </div>
            <button onClick={handleLogout} className="icon-btn" aria-label={t('layout.logout')} title={t('layout.logout')}>
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white/80 px-4 backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button className="icon-btn lg:hidden" onClick={() => setOpen(true)} aria-label={t('layout.menu')}>
              <Menu size={20} />
            </button>
            <h1 className="truncate text-lg font-semibold tracking-tight text-slate-900">{pageTitle(pathname)}</h1>
          </div>
          <PreferenceSwitchers />
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mx-auto max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
