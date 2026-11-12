// Xato urinishlarni hisoblab, ko'p bo'lsa vaqtincha to'sadigan oddiy xotiradagi cheklovchi.
// Eslatma: xotirada saqlanadi, shuning uchun bitta server nusxasida to'liq ishlaydi
// (server qayta ishga tushsa hisob nolga tushadi; bir nechta nusxa bo'lsa, har biri alohida hisoblaydi).
interface Entry {
  count: number;
  resetAt: number;
}

export class AttemptLimiter {
  private entries = new Map<string, Entry>();

  constructor(
    private readonly max: number,
    private readonly windowMs: number
  ) {
    // Eskirgan yozuvlar xotirani to'ldirmasligi uchun vaqti-vaqti bilan tozalanadi
    const timer = setInterval(() => this.sweep(), Math.min(windowMs, 60_000));
    timer.unref();
  }

  private sweep() {
    const now = Date.now();
    for (const [key, e] of this.entries) if (e.resetAt <= now) this.entries.delete(key);
  }

  // Necha soniyadan keyin qayta urinish mumkin (0 bo'lsa — to'silmagan)
  retryAfterSeconds(key: string): number {
    const e = this.entries.get(key);
    if (!e || e.resetAt <= Date.now() || e.count < this.max) return 0;
    return Math.ceil((e.resetAt - Date.now()) / 1000);
  }

  fail(key: string) {
    const now = Date.now();
    const e = this.entries.get(key);
    if (!e || e.resetAt <= now) this.entries.set(key, { count: 1, resetAt: now + this.windowMs });
    else e.count += 1;
  }

  reset(key: string) {
    this.entries.delete(key);
  }
}
