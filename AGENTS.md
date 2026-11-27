# AGENTS.md

Nguồn quy tắc duy nhất cho mọi agent (Codex, Claude, Gemini). CLAUDE.md và GEMINI.md chỉ trỏ về file này.

## Dự án
Site CV cá nhân https://cv.lnit.id.vn, giao diện dạng tài liệu CV (một cột, khổ A4, nền xám nhạt). Trang: `/` hồ sơ đi làm (tiếng Việt), `/academic-cv` (tiếng Anh), `/nghien-cuu` (tiếng Việt), `/p/<slug>` trang Markdown tự tạo. Web và PDF dùng chung CSS (`src/styles/cv.css`). Kế hoạch: Brain vault `Plans/cv-lnit`.

## Stack
Astro 7 (static, TypeScript strict, không JS phía client), Content Layer + Zod, @astrojs/sitemap, font tự host (@fontsource: Source Serif 4, Be Vietnam Pro), Playwright (chỉ in PDF). Hosting: GitHub Pages qua GitHub Actions (`.github/workflows/deploy.yml`), tên miền trong `public/CNAME`.

## Lệnh
- `npm run dev` / `npm run build` / `npm run check`
- `npm run pdf`: build rồi in PDF ra `dist/pdf/` (`-- --no-build` để dùng dist có sẵn). Không tải được Chromium: đặt `CHROMIUM_PATH` (script tự thử /usr/bin/google-chrome).
- `npm run sync` hoặc `scripts/sync-content.sh [thư-mục-nguồn]`: chép các collection từ `/home/claude/work/content` vào `src/content/`.

## Quy tắc
- Dữ liệu ở `src/content/` (nguồn: thư mục content, đồng bộ bằng script). Schema `src/content.config.ts`; schema sai thì build thất bại, không nới schema để "cho qua". Không đổi tên trường (CMS phụ thuộc).
- Số điện thoại hiện khi `phone.public: true` và giá trị không phải placeholder `TODO*`. Mọi chuỗi `TODO_*` không bao giờ được render (xem `clean()` trong `src/lib/content.ts`).
- Nội dung đổi qua dữ liệu, không gõ cứng trong `.astro`. `internal_note` không bao giờ render.
- Không sửa file sinh tự động: `dist/`, `.astro/`, `public/admin/config.yml`. `public/admin/` là bản chép của `/home/claude/work/admin` (index.html, config.yml sinh bằng `tools/gen-config.py`); sửa ở nguồn rồi chép lại. `/admin` không có trong sitemap và menu, `robots.txt` chặn `/admin`.
- Một schema duy nhất: `src/content.config.ts`; `/home/claude/work/content/schema.ts` phải giống hệt (`cp`), rồi chạy `node tools/validate-config.mjs` trong thư mục admin, phải 0 lỗi.
- Hồ sơ đi làm (PDF) tối đa 2 trang A4: bullet ngắn, mỗi kỹ năng một dòng, vai trò dự án ghi một lần. Phần "Ứng dụng AI" là nhóm kỹ năng `job-ai-workflow` (tên ngắn là bullet trên CV, `note_vi` là bản dài); bản đầy đủ ở trang `/p/ung-dung-ai`.
- Xong việc: chạy `npm run build`, `npm run check`, `npm run pdf`.
