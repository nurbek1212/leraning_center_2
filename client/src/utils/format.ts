import { t } from '../i18n';
import type { AttendanceStatus, MaterialKind, PaymentMethod, PaymentStatus, Role } from '../types';

// Yorliqlar xaritasi: roleLabels[role] kabi ishlatiladi, lekin matn har safar joriy tilda olinadi
function labelMap<K extends string>(prefix: string): Record<K, string> {
  return new Proxy({} as Record<K, string>, {
    get: (_target, key) => (typeof key === 'string' ? t(`${prefix}.${key}`) : undefined),
  });
}

export const roleLabels = labelMap<Role>('role');
export const attendanceLabels = labelMap<AttendanceStatus>('attendance');
export const paymentMethodLabels = labelMap<PaymentMethod>('payMethod');
export const paymentStatusLabels = labelMap<PaymentStatus>('payStatus');

// '2026-10-20' -> '20.10.2026'
export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const [y, m, d] = value.slice(0, 10).split('-');
  return `${d}.${m}.${y}`;
}

// Bugungi sana (mahalliy vaqt bo'yicha) 'YYYY-MM-DD' ko'rinishida
export function todayStr(): string {
  const now = new Date();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${m}-${d}`;
}

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

export function homePath(role: Role): string {
  return `/${role}`;
}

export const isEmail = (value: string) => /^\S+@\S+\.\S+$/.test(value.trim());

// ---------- Pul va oylar ----------

// 1250000 -> "1 250 000 so'm" (birlik joriy tilda)
export function formatMoney(value: number | null | undefined): string {
  const n = Math.round(Number(value) || 0);
  const digits = String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${n < 0 ? '−' : ''}${digits} ${t('money.unit')}`;
}

// Oy nomlari (1..12) joriy tilda
export const monthNames = (): string[] => Array.from({ length: 12 }, (_, i) => t(`month.${i + 1}`));

export const currentPeriod = () => todayStr().slice(0, 7);

// '2026-11' -> 'Noyabr 2026'
export function periodLabel(period: string): string {
  const [y, m] = period.split('-');
  const month = Number(m);
  return month >= 1 && month <= 12 ? `${t(`month.${month}`)} ${y}` : period;
}

// ---------- Ball va foiz ----------

export const percentOf = (value: number, max: number) => (max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0);

// Jadvaldagi sonlar: 17.0 -> "17", 16.5 -> "16.5"
export const fmtScore = (n: number | null | undefined) => (n === null || n === undefined ? '—' : String(Math.round(n * 10) / 10));

// ---------- Dars jadvali ----------
// Jadval matni "Du-Chor-Ju 14:00" ko'rinishida saqlanadi
// Bazada saqlanadigan kun belgilari (o'zgarmaydi); ko'rsatishda dayLabel() ishlatiladi
export const WEEK_DAYS = ['Du', 'Sesh', 'Chor', 'Pay', 'Ju', 'Sha', 'Yak'];

export const dayLabel = (day: string) => t(`day.${day}`);

// "Du-Chor-Ju 14:00" -> joriy tilda "Mon-Wed-Fri 14:00"; jadval bo'sh bo'lsa "belgilanmagan" matni
export function formatSchedule(schedule: string | null | undefined): string {
  if (!schedule) return t('common.noSchedule');
  const { days, time } = parseSchedule(schedule);
  if (!days.length) return schedule;
  return `${days.map(dayLabel).join('-')} ${time}`.trim();
}

export function parseSchedule(schedule: string | null): { days: string[]; time: string } {
  if (!schedule) return { days: [], time: '' };
  const idx = schedule.lastIndexOf(' ');
  if (idx === -1) return { days: [], time: '' };
  const days = schedule
    .slice(0, idx)
    .split('-')
    .filter((d) => WEEK_DAYS.includes(d));
  const time = schedule.slice(idx + 1);
  return { days, time: /^\d{2}:\d{2}$/.test(time) ? time : '' };
}

export function buildSchedule(days: string[], time: string): string {
  const ordered = WEEK_DAYS.filter((d) => days.includes(d));
  return `${ordered.join('-')} ${time}`.trim();
}

// ---------- Materiallar ----------

export const materialKindLabels = labelMap<MaterialKind>('materialKind');

// Server bilan bir xil chegara va ruxsat etilgan turlar (asosiy tekshiruv serverda)
export const MAX_FILE_MB = 10;
export const ALLOWED_FILE_EXTENSIONS = ['pdf', 'ppt', 'pptx', 'doc', 'docx', 'odp', 'odt'];

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} ${t('unit.b')}`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} ${t('unit.kb')}`;
  return `${(bytes / 1024 / 1024).toFixed(1)} ${t('unit.mb')}`;
}

export const stageLabel = (stage: string) => t(`assess.stage.${stage}`);
export const assessFormatLabel = (format: string) => t(`assess.format.${format}`);
export const assessStatusLabel = (status: string) => t(`assess.status.${status}`);
