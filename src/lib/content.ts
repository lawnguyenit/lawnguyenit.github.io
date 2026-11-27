import { getCollection, getEntry } from 'astro:content';

export type Audience = 'academic' | 'job';
export type Lang = 'en' | 'vi';

export const langOf = (a: Audience): Lang => (a === 'job' ? 'vi' : 'en');

// ---------- placeholders (TODO_*) never reach the output ----------
// The English name of the university is unknown (TODO_TEN_TIENG_ANH_TRUONG): until the owner
// fills it in, the Vietnamese official name is shown instead.
const SCHOOL_VI = 'Trường Đại học Công nghệ Kỹ thuật Vĩnh Long';

/** Resolve known placeholders; any remaining TODO_ text is dropped (returns ''). */
export function clean(s: string | null | undefined): string {
  if (typeof s !== 'string') return '';
  const r = s.replace(/TODO_TEN_TIENG_ANH_TRUONG/g, SCHOOL_VI).trim();
  return /TODO/.test(r) ? '' : r;
}

/** Localised field `${key}_${lang}`; falls back to the other language when `fallback` is true. */
export function f(obj: any, key: string, lang: Lang, fallback = false): string {
  const own = clean(obj?.[`${key}_${lang}`]);
  if (own || !fallback) return own;
  return clean(obj?.[`${key}_${lang === 'vi' ? 'en' : 'vi'}`]);
}

export const phoneOf = (p: { phone: { value: string; public: boolean } }): string =>
  p.phone.public ? clean(p.phone.value) : '';

// ---------- dates ----------
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function fmtDate(s: string, lang: Lang): string {
  const m = /^(\d{4})(?:-(\d{2}))?$/.exec(s);
  if (!m) return s;
  if (!m[2]) return m[1];
  return lang === 'vi' ? `${m[2]}/${m[1]}` : `${MONTHS_EN[Number(m[2]) - 1]} ${m[1]}`;
}
export function range(
  start: string,
  end: string | null | undefined,
  lang: Lang,
  openLabel?: string,
): string {
  if (!start) return '';
  const open = openLabel ?? (lang === 'vi' ? 'nay' : 'present');
  const a = fmtDate(start, lang);
  if (!end) return `${a} – ${open}`;
  const b = fmtDate(end, lang);
  return a === b ? a : `${a} – ${b}`;
}

// ---------- queries ----------
const byOrder = (a: any, b: any) => a.data.order - b.data.order;
const shown = (aud: Audience) => (e: any) => e.data.visible.includes(aud);

export async function getProfile() {
  const p = await getEntry('profile', 'profile');
  if (!p) throw new Error('Missing src/content/profile/profile.yaml');
  return p.data;
}
export async function getEducation(aud: Audience) {
  return (await getCollection('education', shown(aud))).sort(byOrder).map((e) => e.data);
}
export async function getExperience(aud: Audience) {
  return (await getCollection('experience', shown(aud))).sort(byOrder).map((e) => e.data);
}
export async function getPublications(aud: Audience) {
  return (await getCollection('publications', shown(aud))).sort(byOrder).map((e) => e.data);
}
export async function getAwards(aud: Audience) {
  return (await getCollection('awards', shown(aud))).sort(byOrder).map((e) => e.data);
}
export async function getCertificates(aud: Audience) {
  return (await getCollection('certificates', shown(aud))).sort(byOrder).map((e) => e.data);
}
export async function getProjects(aud: Audience) {
  return (await getCollection('projects', shown(aud))).sort(byOrder).map((e) => e.data);
}
/** Research page: every non-practice project visible on any profile, by stage. */
export async function getResearchProjects() {
  return (await getCollection('projects', (e) => e.data.visible.length > 0 && e.data.kind !== 'practice'))
    .map((e) => e.data)
    .sort((a, b) => (a.stage ?? 99) - (b.stage ?? 99) || a.order - b.order);
}
export async function getResearchPublications() {
  return (await getCollection('publications', (e) => e.data.visible.length > 0))
    .sort(byOrder)
    .map((e) => e.data);
}

export async function getSkillGroups(aud: Audience) {
  const groups = (await getCollection('skill_groups', shown(aud))).sort(byOrder);
  const skills = (await getCollection('skills', shown(aud))).filter((s) => s.data.status === 'confirmed');
  const gk = aud === 'job' ? 'group_job' : 'group_academic';
  const ok = aud === 'job' ? 'order_job' : 'order_academic';
  return groups
    .map((g) => ({
      ...g.data,
      skills: skills
        .filter((s) => (s.data as any)[gk]?.id === g.data.id)
        .sort((a, b) => ((a.data as any)[ok] ?? a.data.order) - ((b.data as any)[ok] ?? b.data.order))
        .map((s) => s.data),
    }))
    .filter((g) => g.skills.length > 0);
}

export async function getVisiblePages() {
  const pages = (await getCollection('pages', (e) => e.data.visible.length > 0)).sort(
    (a, b) => a.data.nav_order - b.data.nav_order,
  );
  const seen = new Set<string>();
  for (const p of pages) {
    if (seen.has(p.data.slug)) throw new Error(`Duplicate page slug: ${p.data.slug}`);
    seen.add(p.data.slug);
  }
  return pages;
}

/** Vietnamese text with fallback to English; `lang` tells which one was used (for the lang attribute). */
export function viOrEn(obj: any, key: string): { text: string; lang: Lang } {
  const vi = clean(obj?.[`${key}_vi`]);
  if (vi) return { text: vi, lang: 'vi' };
  return { text: clean(obj?.[`${key}_en`]), lang: 'en' };
}
export const PROJECT_STATUS_VI: Record<string, string> = {
  ongoing: 'Đang thực hiện',
  completed: 'Hoàn thành',
  submitted: 'Đã nộp, đang phản biện',
  in_preparation: 'Đang soạn',
  archived: 'Lưu trữ',
};

// ---------- skill lines ----------
// A skill whose note equals the marker is "foundation" level and is grouped after the main skills;
// a note "primary"/"chính" is shown in parentheses. Any other note is not rendered on the CV.
const FOUNDATION: Record<Lang, string> = { vi: 'nền tảng', en: 'foundation' };
const PRIMARY: Record<Lang, string> = { vi: 'chính', en: 'primary' };
export function skillLine(skills: any[], lang: Lang): string {
  const main: string[] = [];
  const base: string[] = [];
  for (const s of skills) {
    const name = f(s, 'name', lang);
    const note = f(s, 'note', lang);
    if (note === FOUNDATION[lang]) base.push(name);
    else main.push(note === PRIMARY[lang] ? `${name} (${note})` : name);
  }
  const basic = base.length ? `${base.join(', ')} (${lang === 'vi' ? 'cơ bản' : 'basic'})` : '';
  return [main.join(', '), basic].filter(Boolean).join(' · ');
}

/** Tiered group: nested list. Skills noted "primary" form the first line, "foundation" the second; unmarked skills join the first. */
const TIER_LABEL: Record<Lang, { main: string; base: string }> = {
  vi: { main: 'Sử dụng chính', base: 'Nền tảng (đã học)' },
  en: { main: 'Primary', base: 'Foundation (coursework)' },
};
export function skillTiers(skills: any[], lang: Lang): { label: string; items: string }[] {
  const main: string[] = [];
  const base: string[] = [];
  for (const s of skills) (f(s, 'note', lang) === FOUNDATION[lang] ? base : main).push(f(s, 'name', lang));
  return [
    { label: TIER_LABEL[lang].main, items: main.join(', ') },
    { label: TIER_LABEL[lang].base, items: base.join(', ') },
  ].filter((t) => t.items);
}

/** Small tags next to a project: only those that have a label in this language. */
export function tagsOf(p: any, lang: Lang): { label: string; url: string }[] {
  return (p.tags ?? []).map((t: any) => ({ label: f(t, 'label', lang), url: clean(t.url) })).filter((t: any) => t.label);
}

// Advisor name: one canonical (English) value in data, shown in Vietnamese form on Vietnamese pages.
const ADVISOR_VI: Record<string, string> = { 'Hoai-Hanh Tran': 'Trần Hoài Hạnh' };
export const advisorName = (name: string, lang: Lang): string => (lang === 'vi' ? (ADVISOR_VI[name] ?? name) : name);
