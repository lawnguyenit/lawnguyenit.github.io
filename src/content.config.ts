// src/content.config.ts (Astro 7). Dữ liệu YAML nằm ở src/content/<collection>/.
// Mô tả từng trường bằng tiếng Việt: xem schema.md.
import { defineCollection, reference } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

// ---------- khối dùng chung ----------
export const VISIBLE_VALUES = ['academic', 'job'] as const;
const Visible = z.enum(VISIBLE_VALUES);
const Slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'id chỉ gồm chữ thường, số, dấu gạch ngang');
// "2025" hoặc "2025-11"
const YearOrMonth = z.string().regex(/^\d{4}(-\d{2})?$/, 'định dạng YYYY hoặc YYYY-MM');
const Str = z.string().min(1);
const OptStr = z.string().nullable().optional();

// Trường chung của mọi mục trong danh sách.
const base = {
  id: Slug,
  visible: z.array(Visible).default([]), // [] = ẩn khỏi mọi hồ sơ
  order: z.number().int(), // số nhỏ hiện trước
};

const Link = z.object({
  label_en: OptStr,
  label_vi: OptStr,
  url: z.url(),
});

// Hồ sơ academic hiển thị tiếng Anh (*_en), hồ sơ job hiển thị tiếng Việt (*_vi).
// Nếu mục hiện ở hồ sơ nào thì các trường bắt buộc phải có bản ngôn ngữ tương ứng.
function requireLang<T extends z.ZodTypeAny>(schema: T, fields: string[]) {
  return schema.superRefine((d: any, ctx) => {
    const need: [string, string][] = [['academic', 'en'], ['job', 'vi']];
    for (const [profile, lang] of need) {
      if (!d.visible?.includes(profile)) continue;
      for (const f of fields) {
        const v = d[`${f}_${lang}`];
        if (typeof v !== 'string' || v.trim() === '') {
          ctx.addIssue({
            code: 'custom',
            path: [`${f}_${lang}`],
            message: `Mục hiện ở hồ sơ "${profile}" nên bắt buộc có ${f}_${lang}`,
          });
        }
      }
    }
  });
}

// ---------- profile (1 file) ----------
const profile = defineCollection({
  loader: glob({ pattern: 'profile.yaml', base: './src/content/profile' }),
  schema: z.object({
    id: z.literal('profile'),
    name: Str,
    name_native: Str,
    email: z.email(),
    github_handle: Str,
    github_url: z.url(),
    phone: z.object({
      value: Str, // TODO_SO_DIEN_THOAI cho tới khi chủ site điền
      public: z.boolean(), // true = hiện số trên web và PDF (quyết định chủ site). Giá trị TODO* không bao giờ được render
    }),
    location_en: Str,
    location_vi: Str,
    photo: Str,
    headline_en: Str,
    headline_vi: Str,
    affiliation_en: Str,
    affiliation_vi: Str,
    summary_en: Str,
    summary_vi: Str,
    about_en: Str, // markdown
    research_interests_en: z.array(Str),
    research_statement_en: Str,
    native_language_en: Str,
    native_language_vi: Str,
    cv_pdf: z.object({ academic: OptStr, job: OptStr }), // đường dẫn PDF của từng hồ sơ; nút "Tải PDF" dùng giá trị này
    updated: YearOrMonth,
  }),
});

// ---------- skill_groups ----------
const skill_groups = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/skill-groups' }),
  schema: requireLang(
    z.object({ ...base, title_en: OptStr, title_vi: OptStr }),
    ['title'],
  ),
});

// ---------- skills ----------
const skills = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/skills' }),
  schema: requireLang(
    z
      .object({
        ...base,
        name_en: OptStr,
        name_vi: OptStr,
        group_academic: reference('skill_groups').optional(),
        group_job: reference('skill_groups').optional(),
        order_academic: z.number().int().optional(),
        order_job: z.number().int().optional(),
        // confirmed: được phép khoe. pending_test: chờ bài test (Excel, Power BI). unverified: chưa có bằng chứng.
        status: z.enum(['confirmed', 'pending_test', 'unverified']),
        note_en: OptStr,
        note_vi: OptStr,
      })
      .superRefine((d, ctx) => {
        if (d.status !== 'confirmed' && d.visible.length > 0) {
          ctx.addIssue({ code: 'custom', path: ['visible'], message: 'Kỹ năng chưa xác nhận phải để visible rỗng' });
        }
        if (d.visible.includes('academic') && !d.group_academic)
          ctx.addIssue({ code: 'custom', path: ['group_academic'], message: 'Cần group_academic' });
        if (d.visible.includes('job') && !d.group_job)
          ctx.addIssue({ code: 'custom', path: ['group_job'], message: 'Cần group_job' });
      }),
    ['name'],
  ),
});

// ---------- projects ----------
const projects = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/projects' }),
  schema: requireLang(
    z.object({
      ...base,
      featured: z.boolean().default(false),
      // system: hệ thống/sản phẩm; research: một nghiên cứu; practice: dự án thực hành (luôn gắn nhãn "dự án thực hành")
      kind: z.enum(['system', 'research', 'practice']),
      stage: z.number().int().nullable().optional(), // thứ tự giai đoạn trên trang Research
      status: z.enum(['ongoing', 'completed', 'submitted', 'in_preparation', 'archived']),
      title: Str,
      tagline_en: OptStr,
      tagline_vi: OptStr,
      summary_en: OptStr,
      summary_vi: OptStr,
      contribution_en: OptStr, // vai trò: chỉ dùng "designed, directed and validated (AI-assisted)"
      contribution_vi: OptStr, // "thiết kế, điều phối công cụ AI, kiểm định"
      highlights_en: z.array(Str).default([]),
      highlights_vi: z.array(Str).default([]),
      tech: z.array(Str).default([]),
      start: YearOrMonth.nullable().optional(),
      end: YearOrMonth.nullable().optional(),
      advisor: OptStr,
      links: z.array(Link).default([]),
      figures: z
        .array(z.object({ src: Str, alt_en: Str, caption_en: OptStr, caption_vi: OptStr }))
        .default([]),
      internal_note: OptStr, // ghi chú nội bộ, KHÔNG bao giờ render
    }),
    ['summary'],
  ),
});

// ---------- education ----------
const education = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/education' }),
  schema: requireLang(
    z.object({
      ...base,
      institution_en: OptStr,
      institution_vi: OptStr,
      former_name_en: OptStr,
      former_name_vi: OptStr,
      degree_title_en: OptStr, // kỹ sư/cử nhân: TODO_VAN_BANG
      degree_title_vi: OptStr,
      program_en: OptStr,
      program_vi: OptStr,
      status: z.enum(['graduated', 'in_progress']),
      start: YearOrMonth,
      end: YearOrMonth.nullable().optional(), // null hoặc bỏ trống = chưa kết thúc
      cohort: OptStr,
      gpa: z.number().min(0).nullable().optional(),
      gpa_scale: z.number().positive().nullable().optional(),
      note_en: OptStr,
      note_vi: OptStr,
    }),
    ['institution', 'degree_title', 'program'],
  ),
});

// ---------- publications ----------
const publications = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/publications' }),
  schema: requireLang(
    z.object({
      ...base,
      type: z.enum(['conference_manuscript', 'journal_article', 'thesis', 'technical_note']),
      // submitted = đã nộp/đang phản biện. KHÔNG dùng accepted/published cho bài báo khi chưa có thư chấp nhận.
      status: z.enum(['in_preparation', 'submitted', 'accepted', 'published']),
      year: z.number().int(),
      title: Str, // tiêu đề gốc, không dịch
      authors: z.array(z.object({ name: Str, is_owner: z.boolean().default(false) })).min(1),
      venue_en: OptStr,
      venue_vi: OptStr,
      summary_en: OptStr,
      summary_vi: OptStr,
      links: z.array(Link).default([]),
    }),
    ['venue'],
  ),
});

// ---------- awards ----------
const awards = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/awards' }),
  schema: requireLang(
    z.object({
      ...base,
      title_en: OptStr,
      title_vi: OptStr,
      issuer_en: OptStr,
      issuer_vi: OptStr,
      date_label: Str, // chuỗi hiển thị (tiếng Anh), ví dụ "2025" hoặc "4 editions (2023–2026)"
      date_label_vi: OptStr, // bản tiếng Việt cho hồ sơ job, ví dụ "4 kỳ (2023–2026)"; trống thì dùng date_label
      year_start: z.number().int(),
      year_end: z.number().int().nullable().optional(),
    }),
    ['title', 'issuer'],
  ),
});

// ---------- certificates ----------
const certificates = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/certificates' }),
  schema: requireLang(
    z.object({
      ...base,
      type: z.enum(['language', 'professional', 'course']),
      status: z.enum(['obtained', 'in_progress']),
      name_en: OptStr,
      name_vi: OptStr,
      issuer_en: OptStr,
      issuer_vi: OptStr,
      level: OptStr,
      framework: OptStr,
      target_score: OptStr, // chỉ cho mục in_progress
      issued: OptStr, // ngày cấp, TODO_NGAY_CAP nếu chưa biết
    }),
    ['name'],
  ),
});

// ---------- experience (hiện chỉ có vai trò nghiên cứu, hồ sơ academic) ----------
const experience = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/experience' }),
  schema: requireLang(
    z.object({
      ...base,
      kind: z.enum(['research', 'work', 'internship', 'freelance', 'teaching']),
      role_en: OptStr,
      role_vi: OptStr,
      organization_en: OptStr,
      organization_vi: OptStr,
      start: YearOrMonth,
      end: YearOrMonth.nullable().optional(),
      ongoing: z.boolean().default(false),
      advisor: OptStr,
      bullets_en: z.array(Str).default([]),
      bullets_vi: z.array(Str).default([]),
      links: z.array(Link).default([]),
    }),
    ['role', 'organization'],
  ),
});

// ---------- pages (markdown tự tạo) ----------
const pages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/pages' }),
  schema: z.object({
    id: Slug,
    title: Str,
    slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
    lang: z.enum(['en', 'vi']).default('en'),
    description: OptStr,
    visible: z.array(Visible).default([]),
    show_in_nav: z.boolean().default(false),
    nav_order: z.number().int(),
  }),
});

export const collections = {
  profile, skill_groups, skills, projects, education, publications, awards, certificates, experience, pages,
};
