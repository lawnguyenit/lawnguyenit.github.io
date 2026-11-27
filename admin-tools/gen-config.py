#!/usr/bin/env python3
"""Sinh admin/config.yml (Sveltia CMS 5.0.1). Chạy (từ gốc repo): python3 admin-tools/gen-config.py > public/admin/config.yml
Tên trường PHẢI trùng src/content.config.ts; kiểm tra bằng admin-tools/validate-config.mjs."""
import yaml, sys

SLUG_PAT = ['^[a-z0-9]+(-[a-z0-9]+)*$', 'Chỉ gồm chữ thường không dấu, số, dấu gạch ngang (ví dụ: python-co-ban)']
YM_PAT = ['^\\d{4}(-\\d{2})?$', 'Viết 2025 hoặc 2025-11']

def F(name, label, widget='string', hint=None, required=False, **kw):
    d = {'name': name, 'label': label, 'widget': widget}
    if hint: d['hint'] = hint
    d['required'] = required
    d.update(kw)
    return d

def S(name, label, hint=None, required=False, **kw): return F(name, label, 'string', hint, required, **kw)
def T(name, label, hint=None, required=False, **kw): return F(name, label, 'text', hint, required, **kw)
def N(name, label, hint=None, required=False, **kw): return F(name, label, 'number', hint, required, value_type=kw.pop('value_type', 'int'), **kw)
def B(name, label, hint=None, default=False, **kw): return F(name, label, 'boolean', hint, False, default=default, **kw)
def SEL(name, label, options, hint=None, required=False, **kw):
    return F(name, label, 'select', hint, required, options=[{'label': l, 'value': v} for v, l in options], **kw)
def LST(name, label, hint=None, required=False, **kw): return F(name, label, 'list', hint, required, **kw)
def OBJ(name, label, fields, hint=None, required=False, **kw): return F(name, label, 'object', hint, required, fields=fields, **kw)
def LOBJ(name, label, fields, hint=None, required=False, label_singular=None, summary=None, **kw):
    d = F(name, label, 'list', hint, required, fields=fields, **kw)
    if label_singular: d['label_singular'] = label_singular
    if summary: d['summary'] = summary
    return d
def IMG(name, label, hint=None, required=False, **kw): return F(name, label, 'image', hint, required, **kw)
def REL(name, label, collection, display, hint=None, required=False, **kw):
    return F(name, label, 'relation', hint, required, collection=collection, value_field='{{slug}}', display_fields=[display], search_fields=['id', 'title_vi', 'title_en'], **kw)

def id_field():
    return S('id', 'Mã định danh (id)', 'Chữ thường không dấu, số, dấu gạch ngang. Trùng tên file. Đặt xong thì ĐỪNG đổi.', True, pattern=SLUG_PAT)

def visible_field(): 
    return SEL('visible', 'Hiện ở hồ sơ nào', [('academic', 'Hồ sơ học thuật (tiếng Anh)'), ('job', 'Hồ sơ đi làm (tiếng Việt)')],
               'Chọn một hoặc cả hai. ĐỂ TRỐNG = ẨN HOÀN TOÀN khỏi web.', False, multiple=True)

def order_field(label='Thứ tự', hint='Số nhỏ hiện trước.'):
    return N('order', label, hint, True)

def base(): return [id_field(), visible_field(), order_field()]

def en_vi(stem, label, widget='string', hint_en=None, hint_vi=None, **kw):
    f = {'string': S, 'text': T}[widget]
    return [f(f'{stem}_en', f'{label} (tiếng Anh)', hint_en or 'Hiện ở hồ sơ học thuật. Bắt buộc nếu mục hiện ở hồ sơ học thuật.', **kw),
            f(f'{stem}_vi', f'{label} (tiếng Việt)', hint_vi or 'Hiện ở hồ sơ đi làm. Bắt buộc nếu mục hiện ở hồ sơ đi làm.', **kw)]

LINK_FIELDS = [
    S('label_en', 'Tên liên kết (tiếng Anh)'),
    S('label_vi', 'Tên liên kết (tiếng Việt)'),
    S('url', 'Địa chỉ (URL)', 'Bắt đầu bằng https://', True, type='url'),
]
def links(): return LOBJ('links', 'Liên kết', LINK_FIELDS, 'Thêm từng liên kết (GitHub, bài báo, demo...).', label_singular='liên kết', summary='{{label_vi}}{{label_en}} {{url}}')

def coll(name, label, folder, fields, summary, label_singular, description=None, **kw):
    d = {'name': name, 'label': label, 'label_singular': label_singular, 'folder': folder, 'extension': 'yaml', 'format': 'yaml',
         'identifier_field': 'id', 'slug': '{{id}}', 'create': True, 'delete': True, 'summary': summary}
    if description: d['description'] = description
    d.update(kw)
    d['fields'] = fields
    return d

C = []
C_ROOT = 'src/content'

# ---------- hồ sơ chung (1 file) ----------
profile_fields = [
    S('id', 'Mã định danh', 'Luôn là "profile". Đừng sửa.', True, default='profile', readonly=True),
    S('name', 'Tên (không dấu)', 'Ví dụ: Lam-Nguyen Nguyen', True),
    S('name_native', 'Tên tiếng Việt có dấu', None, True),
    S('email', 'Email', 'Hiện trên web.', True, type='email'),
    S('github_handle', 'Tên tài khoản GitHub', 'Ví dụ: lawnguyenit', True),
    S('github_url', 'Địa chỉ trang GitHub', 'Ví dụ: https://github.com/lawnguyenit', True, type='url'),
    OBJ('phone', 'Số điện thoại', [
        S('value', 'Số điện thoại', 'Còn giá trị giữ chỗ (chữ in hoa nối bằng dấu gạch dưới) nghĩa là chưa điền: số chưa hiện ở đâu cả. Điền số thật vào đây.', True),
        B('public', 'Hiện số trên web và PDF', 'Bật = hiện số trên web và PDF (khi đã điền số thật). Tắt = ẩn số. Đây là quyết định của chủ site.', default=True),
    ], 'Số điện thoại: chỉ hiện khi bật "Hiện số" và đã điền số thật.', True),
    *en_vi('location', 'Nơi ở', hint_en='Ví dụ: Vinh Long, Vietnam', hint_vi='Ví dụ: Vĩnh Long', required=True),
    IMG('photo', 'Ảnh đại diện', 'Chọn ảnh có sẵn hoặc tải ảnh mới lên. Ảnh lưu ở public/assets/img.', True),
    *en_vi('headline', 'Chức danh mục tiêu (dòng dưới tên)', required=True,
           hint_en='Một dòng ngắn, ví dụ: Master\'s student in IT · Applied ML for IoT. Đổi theo từng job.',
           hint_vi='Một dòng ngắn, ví dụ: Phân tích dữ liệu & Ứng dụng AI. Đổi theo từng job.'),
    *en_vi('affiliation', 'Nơi học / đơn vị', required=True),
    *en_vi('summary', 'Giới thiệu ngắn', 'text', required=True,
           hint_en='Đoạn giới thiệu của hồ sơ học thuật.', hint_vi='Đoạn giới thiệu của hồ sơ đi làm.'),
    F('about_en', 'Giới thiệu dài (tiếng Anh, Markdown)', 'markdown', 'Chỉ hồ sơ học thuật. Có thể dùng Markdown (in đậm, liên kết, đoạn).', True),
    LST('research_interests_en', 'Hướng nghiên cứu (tiếng Anh)', 'Mỗi dòng một hướng. Chỉ hồ sơ học thuật.', True),
    T('research_statement_en', 'Tuyên bố nghiên cứu (tiếng Anh)', 'Chỉ hồ sơ học thuật.', True),
    *en_vi('native_language', 'Tiếng mẹ đẻ', required=True, hint_en='Ví dụ: Vietnamese (native)', hint_vi='Ví dụ: Tiếng Việt (bản ngữ)'),
    OBJ('cv_pdf', 'File CV dạng PDF', [
        S('academic', 'PDF hồ sơ học thuật', 'Đường dẫn file PDF sinh tự động: /pdf/academic-cv.pdf. Nút "Tải PDF" trên web dùng đường dẫn này.'),
        S('job', 'PDF hồ sơ đi làm', 'Đường dẫn file PDF sinh tự động: /pdf/ho-so-di-lam.pdf. Nút "Tải PDF" trên web dùng đường dẫn này.'),
    ], 'Đường dẫn PDF cho từng hồ sơ (PDF được sinh tự động khi build).', True),
    S('updated', 'Cập nhật lần cuối', 'Viết 2026 hoặc 2026-11', True, pattern=YM_PAT),
]
C.append({'name': 'profile', 'label': 'Hồ sơ chung', 'label_singular': 'hồ sơ', 'description': 'Một file duy nhất: tên, liên hệ, ảnh, giới thiệu.', 'files': [
    {'name': 'profile', 'label': 'Hồ sơ chung', 'file': f'{C_ROOT}/profile/profile.yaml', 'format': 'yaml', 'fields': profile_fields}]})

# ---------- skill_groups ----------
C.append(coll('skill_groups', 'Nhóm kỹ năng', f'{C_ROOT}/skill-groups',
    base() + en_vi('title', 'Tên nhóm') + [
        SEL('layout', 'Cách hiện', [('inline', 'Một dòng: Nhóm: a, b, c'), ('tiered', 'Danh sách lồng: "Sử dụng chính" và "Nền tảng"')],
            'Chọn "Danh sách lồng" thì kỹ năng có ghi chú "primary/chính" hiện ở dòng "Sử dụng chính", ghi chú "foundation/nền tảng" ở dòng "Nền tảng".', False, default='inline'),
    ],
    '{{id}} · {{title_vi}}{{title_en}}', 'nhóm kỹ năng',
    'Nhóm acad-* cho hồ sơ học thuật, job-* cho hồ sơ đi làm. Thêm nhóm mới = thêm 1 mục.'))

# ---------- skills ----------
C.append(coll('skills', 'Kỹ năng', f'{C_ROOT}/skills',
    base() + en_vi('name', 'Tên kỹ năng') + [
        REL('group_academic', 'Nhóm ở hồ sơ học thuật', 'skill_groups', '{{id}} · {{title_en}}{{title_vi}}', 'Bắt buộc nếu "Hiện ở hồ sơ nào" có học thuật. Chọn nhóm bắt đầu bằng acad-.'),
        REL('group_job', 'Nhóm ở hồ sơ đi làm', 'skill_groups', '{{id}} · {{title_vi}}{{title_en}}', 'Bắt buộc nếu "Hiện ở hồ sơ nào" có đi làm. Chọn nhóm bắt đầu bằng job-.'),
        N('order_academic', 'Thứ tự trong nhóm (học thuật)', 'Số nhỏ hiện trước.'),
        N('order_job', 'Thứ tự trong nhóm (đi làm)', 'Số nhỏ hiện trước.'),
        SEL('status', 'Trạng thái xác nhận', [('confirmed', 'Đã xác nhận (được khoe)'), ('pending_test', 'Chờ bài test'), ('unverified', 'Chưa có bằng chứng')],
            'CHỈ kỹ năng "Đã xác nhận" mới được hiện. Nếu chọn trạng thái khác thì "Hiện ở hồ sơ nào" PHẢI để trống.', True, default='confirmed'),
        *en_vi('note', 'Ghi chú ngắn', hint_en='Tùy chọn.', hint_vi='Tùy chọn. Ví dụ: chờ xác nhận sau bài test.'),
    ],
    '{{id}} · {{name_vi}}{{name_en}} [{{status}}]', 'kỹ năng',
    'Mỗi kỹ năng một mục. Thêm kỹ năng: bấm "Tạo kỹ năng" và điền tên, nhóm, trạng thái.'))

# ---------- projects ----------
C.append(coll('projects', 'Dự án', f'{C_ROOT}/projects',
    base() + [
        B('featured', 'Dự án nổi bật (trang chủ)'),
        SEL('kind', 'Loại dự án', [('system', 'Hệ thống / sản phẩm'), ('research', 'Một nghiên cứu'), ('practice', 'Dự án thực hành (luôn gắn nhãn)')], None, True),
        N('stage', 'Giai đoạn (trang Research)', 'Số thứ tự giai đoạn trên trang Research. Bỏ trống nếu không áp dụng.'),
        SEL('status', 'Tình trạng', [('ongoing', 'Đang làm'), ('completed', 'Hoàn thành'), ('submitted', 'Đã nộp'), ('in_preparation', 'Đang chuẩn bị'), ('archived', 'Lưu trữ')], None, True),
        S('title', 'Tên dự án', 'Tên gốc, không dịch.', True),
        *en_vi('status_note', 'Chữ trạng thái (bên phải tên dự án)', hint_en='Tùy chọn. Chỉ hiện khi dự án không có ngày bắt đầu. Ví dụ: in progress.', hint_vi='Tùy chọn. Chỉ hiện khi dự án không có ngày bắt đầu. Ví dụ: đang hoàn thiện.'),
        LOBJ('tags', 'Thẻ nhỏ', [
            S('label_en', 'Chữ thẻ (tiếng Anh)'),
            S('label_vi', 'Chữ thẻ (tiếng Việt)'),
            S('url', 'Liên kết (tùy chọn)', 'https://... hoặc #pub-<id bài báo> để nhảy tới bài báo trong trang.'),
        ], 'Ví dụ: "Phát triển cùng Claude/Codex", "Bài báo: EAI AICON 2026 (đang phản biện)". Thẻ chỉ hiện ở hồ sơ có chữ tương ứng.', label_singular='thẻ', summary='{{label_vi}}{{label_en}}'),
        *en_vi('tagline', 'Mô tả một dòng'),
        *en_vi('summary', 'Mô tả (đoạn)', 'text'),
        *en_vi('contribution', 'Vai trò của bạn', 'text',
               hint_en='Chỉ dùng: "Designed, directed and validated (AI-assisted)". Không viết "wrote code".',
               hint_vi='Chỉ dùng: "Thiết kế, điều phối công cụ AI, kiểm định". Không viết "tự code".'),
        LST('highlights_en', 'Điểm nhấn (tiếng Anh)', 'Mỗi dòng một gạch đầu dòng.'),
        LST('highlights_vi', 'Điểm nhấn (tiếng Việt)', 'Mỗi dòng một gạch đầu dòng.'),
        LST('tech', 'Công nghệ', 'Mỗi dòng một công nghệ. Không dịch.'),
        S('start', 'Bắt đầu', 'Viết 2025 hoặc 2025-11', False, pattern=YM_PAT),
        S('end', 'Kết thúc', 'Viết 2025 hoặc 2025-11. Bỏ trống = chưa kết thúc.', False, pattern=YM_PAT),
        S('advisor', 'Người hướng dẫn'),
        links(),
        LOBJ('figures', 'Hình ảnh / sơ đồ', [
            IMG('src', 'Ảnh', None, True),
            S('alt_en', 'Mô tả ảnh (tiếng Anh, cho người khiếm thị)', None, True),
            S('caption_en', 'Chú thích (tiếng Anh)'),
            S('caption_vi', 'Chú thích (tiếng Việt)'),
        ], label_singular='hình', summary='{{alt_en}}'),
        T('internal_note', 'Ghi chú nội bộ (KHÔNG hiện lên web)', 'Ghi chú riêng cho bạn: giới hạn, điều không được nói. Không bao giờ hiển thị.'),
    ],
    '{{id}} · {{title}} [{{kind}}]', 'dự án',
    'Chỉ dự án có "Hiện ở hồ sơ nào" mới lên web.'))

# ---------- education ----------
C.append(coll('education', 'Học vấn', f'{C_ROOT}/education',
    base() + [
        *en_vi('institution', 'Trường'),
        *en_vi('former_name', 'Tên cũ của trường', hint_en='Tùy chọn. Hiện kèm "formerly ...".', hint_vi='Tùy chọn. Hiện kèm "trước đây ...".'),
        *en_vi('degree_title', 'Danh hiệu / văn bằng', hint_en='Ví dụ: Engineer / Bachelor. Còn giá trị giữ chỗ (chữ in hoa nối bằng dấu gạch dưới) nghĩa là chưa biết.', hint_vi='Kỹ sư hoặc cử nhân. Còn giá trị giữ chỗ (chữ in hoa nối bằng dấu gạch dưới) nghĩa là chưa biết.'),
        *en_vi('program', 'Ngành / chuyên ngành'),
        SEL('status', 'Tình trạng', [('graduated', 'Đã tốt nghiệp'), ('in_progress', 'Đang học')], None, True),
        S('start', 'Bắt đầu', 'Viết 2021 hoặc 2021-09', True, pattern=YM_PAT),
        S('end', 'Kết thúc', 'Viết 2026 hoặc 2026-06. Bỏ trống = chưa kết thúc (hiện "đang học").', False, pattern=YM_PAT),
        S('cohort', 'Khóa', 'Ví dụ: K47'),
        N('gpa', 'Điểm trung bình (GPA)', 'Ví dụ: 3.18', value_type='float', min=0),
        N('gpa_scale', 'Thang điểm', 'Ví dụ: 4', value_type='float', min=0),
        *en_vi('note', 'Ghi chú', hint_en='Tùy chọn. Hiện bên phải dòng thứ hai khi mục không có khóa/GPA (ví dụ "Evening and weekend classes").', hint_vi='Tùy chọn. Ghi trong dữ liệu; hồ sơ đi làm không hiện (ý này đã nằm trong phần Giới thiệu).'),
    ],
    '{{id}} · {{institution_vi}}{{institution_en}}', 'mục học vấn'))

# ---------- publications ----------
C.append(coll('publications', 'Công bố / bài báo', f'{C_ROOT}/publications',
    base() + [
        SEL('type', 'Loại', [('conference_manuscript', 'Bản thảo hội nghị'), ('journal_article', 'Bài báo tạp chí'), ('thesis', 'Luận văn / đồ án'), ('technical_note', 'Ghi chú kỹ thuật')], None, True),
        SEL('status', 'Tình trạng', [('in_preparation', 'Đang chuẩn bị'), ('submitted', 'Đã nộp / đang phản biện'), ('accepted', 'Đã được chấp nhận'), ('published', 'Đã xuất bản / hoàn thành')],
            'CHỈ chọn "Đã được chấp nhận" hoặc "Đã xuất bản" khi có thư chấp nhận. Bài EAI AICON 2026 và bài SN Computer Science phải là "Đã nộp".', True),
        N('year', 'Năm', None, True),
        S('title', 'Tiêu đề', 'Tiêu đề gốc, không dịch.', True),
        LOBJ('authors', 'Tác giả', [
            S('name', 'Tên tác giả', None, True),
            B('is_owner', 'Là tôi', 'Bật để in đậm tên bạn.'),
        ], 'Cần ít nhất một tác giả. Thứ tự như trên bài báo.', True, label_singular='tác giả', summary='{{name}}', min=1),
        *en_vi('venue', 'Nơi công bố (hội nghị / tạp chí)'),
        *en_vi('summary', 'Tóm tắt', 'text', hint_en='Tùy chọn.', hint_vi='Tùy chọn.'),
        links(),
        T('internal_note', 'Ghi chú nội bộ (KHÔNG hiện lên web)', 'Ví dụ: số bản thảo, điều chờ xác nhận. Không bao giờ hiển thị.'),
    ],
    '{{id}} · {{title}} ({{year}})', 'công bố'))

# ---------- awards ----------
C.append(coll('awards', 'Giải thưởng', f'{C_ROOT}/awards',
    base() + [
        *en_vi('title', 'Tên giải'),
        *en_vi('issuer', 'Đơn vị trao'),
        S('date_label', 'Thời gian hiển thị (tiếng Anh)', 'Chữ hiện ở hồ sơ học thuật, ví dụ "2025" hoặc "4 editions (2023–2026)".', True),
        S('date_label_vi', 'Thời gian hiển thị (tiếng Việt)', 'Chữ hiện ở hồ sơ đi làm, ví dụ "2025" hoặc "4 kỳ (2023–2026)". Để trống thì dùng bản tiếng Anh.'),
        N('year_start', 'Năm bắt đầu', 'Dùng để sắp xếp.', True),
        N('year_end', 'Năm kết thúc', 'Bỏ trống nếu chỉ một năm.'),
    ],
    '{{id}} · {{title_vi}}{{title_en}}', 'giải thưởng'))

# ---------- certificates ----------
C.append(coll('certificates', 'Chứng chỉ', f'{C_ROOT}/certificates',
    base() + [
        SEL('type', 'Loại', [('language', 'Ngoại ngữ'), ('professional', 'Chuyên môn'), ('course', 'Khóa học')], None, True),
        SEL('status', 'Tình trạng', [('obtained', 'Đã có'), ('in_progress', 'Đang học')], None, True),
        *en_vi('name', 'Tên chứng chỉ'),
        *en_vi('issuer', 'Đơn vị cấp', hint_en='Tùy chọn.', hint_vi='Tùy chọn.'),
        S('level', 'Trình độ', 'Ví dụ: B1'),
        S('framework', 'Khung tham chiếu', 'Ví dụ: CEFR, IELTS'),
        S('target_score', 'Điểm mục tiêu', 'CHỈ cho mục đang học. Ví dụ: 5.5+'),
        S('issued', 'Ngày cấp', 'Còn giá trị giữ chỗ (chữ in hoa nối bằng dấu gạch dưới) nghĩa là chưa biết.'),
    ],
    '{{id}} · {{name_vi}}{{name_en}}', 'chứng chỉ'))

# ---------- experience ----------
C.append(coll('experience', 'Kinh nghiệm', f'{C_ROOT}/experience',
    base() + [
        SEL('kind', 'Loại', [('research', 'Nghiên cứu'), ('work', 'Đi làm'), ('internship', 'Thực tập'), ('freelance', 'Freelance'), ('teaching', 'Giảng dạy')], None, True),
        *en_vi('role', 'Vai trò'),
        *en_vi('organization', 'Đơn vị / tổ chức'),
        S('start', 'Bắt đầu', 'Viết 2025 hoặc 2025-11', True, pattern=YM_PAT),
        S('end', 'Kết thúc', 'Viết 2025 hoặc 2025-11. Bỏ trống nếu đang diễn ra.', False, pattern=YM_PAT),
        B('ongoing', 'Đang diễn ra', 'Bật = hiện "ongoing" / "nay" thay cho ngày kết thúc.'),
        S('advisor', 'Người hướng dẫn'),
        LST('bullets_en', 'Gạch đầu dòng (tiếng Anh)', 'Mỗi dòng một ý.'),
        LST('bullets_vi', 'Gạch đầu dòng (tiếng Việt)', 'Mỗi dòng một ý.'),
        links(),
    ],
    '{{id}} · {{role_vi}}{{role_en}}', 'kinh nghiệm'))

# ---------- pages ----------
C.append({'name': 'pages', 'label': 'Trang tự tạo', 'label_singular': 'trang', 'description': 'Trang viết bằng Markdown. Thêm trang mới: bấm "Tạo trang".',
    'folder': f'{C_ROOT}/pages', 'extension': 'md', 'format': 'frontmatter', 'identifier_field': 'id', 'slug': '{{id}}',
    'create': True, 'delete': True, 'summary': '{{id}} · {{title}} (/p/{{slug}})', 'fields': [
        id_field(),
        S('title', 'Tiêu đề trang', None, True),
        S('slug', 'Đường dẫn (slug)', 'Địa chỉ trang, ví dụ "gioi-thieu" -> /p/gioi-thieu. Chữ thường không dấu, số, dấu gạch ngang.', True, pattern=SLUG_PAT),
        SEL('lang', 'Ngôn ngữ của trang', [('en', 'Tiếng Anh'), ('vi', 'Tiếng Việt')], None, False, default='en'),
        S('description', 'Mô tả ngắn (cho Google)', 'Một câu mô tả trang.'),
        visible_field(),
        B('show_in_nav', 'Hiện trong menu'),
        N('nav_order', 'Thứ tự trong menu', 'Số nhỏ hiện trước.', True),
        F('body', 'Nội dung trang', 'markdown', 'Viết bằng Markdown hoặc dùng nút định dạng phía trên.', True),
    ]})

CONFIG = {
    '$schema': 'https://unpkg.com/@sveltia/cms@5.0.1/schema/sveltia-cms.json',
    'backend': {'name': 'github', 'repo': 'lawnguyenit/lawnguyenit.github.io', 'branch': 'main', 'auth_methods': ['token'],
                'commit_messages': {'create': 'CMS: thêm {{collection}} "{{slug}}"', 'update': 'CMS: sửa {{collection}} "{{slug}}"',
                                    'delete': 'CMS: xóa {{collection}} "{{slug}}"', 'uploadMedia': 'CMS: tải lên {{path}}',
                                    'deleteMedia': 'CMS: xóa {{path}}'}},
    'site_url': 'https://cv.lnit.id.vn',
    'display_url': 'https://cv.lnit.id.vn',
    'app_title': 'Quản trị CV',
    'media_folder': 'public/assets/img',
    'public_folder': '/assets/img',
    'output': {'omit_empty_optional_fields': True},
    'collections': C,
}

class D(yaml.SafeDumper):
    def ignore_aliases(self, data): return True

header = """# Sveltia CMS 5.0.1 · repo lawnguyenit/lawnguyenit.github.io · nhánh main
# FILE NÀY ĐƯỢC SINH TỰ ĐỘNG bởi admin-tools/gen-config.py. Sửa bằng script rồi sinh lại.
# Tên trường (name) trùng với src/content.config.ts; kiểm tra bằng: node admin-tools/validate-config.mjs
"""
sys.stdout.write(header + yaml.dump(CONFIG, Dumper=D, allow_unicode=True, sort_keys=False, width=1000))
