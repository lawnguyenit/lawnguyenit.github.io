---
id: ung-dung-ai
title: Ứng dụng AI
slug: ung-dung-ai
lang: vi
description: "Cách dùng công cụ AI trong công việc, bản đầy đủ: điều phối nhiều agent, bộ nhớ chung, lập kế hoạch và review có kiểm soát, sổ khẳng định."
visible:
- job
show_in_nav: true
nav_order: 4
---
# Ứng dụng AI trong công việc

Trang này là bản đầy đủ của mục "Ứng dụng AI trong công việc" trong hồ sơ đi làm, gồm ba ý chính:

- Công cụ: Claude Code, Codex, dùng cho khảo sát, lập kế hoạch và triển khai.
- Tổ chức ngữ cảnh để agent đọc đúng tài liệu cần thiết, giảm dữ liệu và token; điều phối nhiều agent làm song song, kiểm thử bằng agent độc lập.
- Đóng gói việc lặp lại thành skill; dựng giao diện kế hoạch (canvas) để người khác xem và duyệt trước khi triển khai.

Các số đo ghi ở đây là số trong nhật ký đo của chính mình; không có số hiệu quả nào khác.

## 1. Điều phối nhiều agent AI chạy song song, kiểm thử bởi agent độc lập

Giao việc cho Claude (Haiku, Sonnet, Opus) và Codex, chọn model và mức effort theo độ khó: việc cơ học giao model nhỏ, việc cần suy luận giao Sonnet, Opus chỉ dùng khi phải phân xử thiết kế khó. Kiểm thử do một agent khác phiên đảm nhiệm, chỉ nhận tiêu chí "Xong khi", không xem lời giải.

Kết quả đã ghi nhận (nhật ký đo, kế hoạch 43 node): 3 lỗi lớn được kiểm thử độc lập bắt ở giai đoạn code, không phải ở bước duyệt kế hoạch.

## 2. Trí nhớ ngoài và một bộ quy tắc chung cho nhiều agent AI

Tri thức, dự án và quyết định lưu trong vault Obsidian quản lý bằng Git. Một file AGENTS.md duy nhất là nguồn quy tắc cho Claude, Codex và Gemini (CLAUDE.md và GEMINI.md chỉ trỏ về), nên sửa một nơi thì cả ba áp dụng.

Kiểm soát: agent phải ghi rõ đã đọc note nào ở đầu câu trả lời; điều chưa biết ghi là "chưa biết" thay vì suy đoán, suy luận phải nêu nguồn; không ghi khóa, token vào vault, gặp file .env thì dừng chờ đồng ý.

## 3. Lập kế hoạch có duyệt trước khi cho agent viết mã

Bộ skill tùy biến: plan-canvas chuyển kế hoạch nhiều giai đoạn (viết bằng Markdown) thành canvas Obsidian để duyệt và phản biện từng node; các node khai báo quan hệ với nhau, nên khi một node đổi, node liên quan bị gắn cờ "cần xem lại" thay vì bị bỏ sót. plan-module-map chốt phạm vi và bản đồ module, dừng chờ duyệt trước khi viết mã.

Cả hai còn ở mức thử nghiệm: nhật ký đo ghi số node, số vấn đề bắt ở bước duyệt và số vấn đề lọt tới lúc code; chưa đủ dữ liệu để kết luận hiệu quả.

## 4. Review thay đổi theo bậc rủi ro, tách file lớn có test bảo vệ

Quy trình review-change: bậc 1 tự chạy test, build, lint và ghi kết quả thật (không chạy được thì ghi "chưa kiểm được", không ghi "ổn"); thay đổi vừa giao reviewer là agent khác phiên; rủi ro cao dùng thêm hai reviewer khác hãng (Codex, Gemini) khi nội dung được phép gửi ra ngoài; vùng nhạy cảm (xác thực, thanh toán, bí mật) do người phụ trách repo quyết. split-large-file chạy test đóng băng hành vi trước khi tách và dừng, hoàn tác khi test đỏ. Tham khảo từ quy trình review của Anthropic; đang thử, chưa có số đo.

## 5. Sổ khẳng định: chỉ viết điều có bằng chứng

Mỗi câu dùng trong CV và hồ sơ freelance có nguồn và giới hạn, kèm danh sách điều không được nói (ví dụ: bài báo mới nộp không viết là đã được chấp nhận; repo mới đọc README không viết là đã triển khai cho khách). Nội dung do AI soạn phải khớp sổ này trước khi dùng; chính CV này viết theo sổ đó.

## 6. Buộc agent phản biện và nêu điều chưa biết

Quy tắc yêu cầu agent nêu giả định ẩn và điều người dùng có thể chưa biết (tối đa 3 điểm mỗi lần), phân loại: người dùng biết / người dùng tưởng agent biết / chưa ai biết, ưu tiên chặng triển khai, vận hành, bảo trì. Ví dụ: audit tĩnh một ứng dụng web do 3 agent đọc code, các điểm bảo mật được kiểm tay trước khi đưa vào kế hoạch; báo cáo ghi rõ chưa chạy build, test, UI.
