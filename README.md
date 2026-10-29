# Staffing v4.24 — MASTER gọn và dropdown tên/mã

Gói GitHub 67 file. Upload nội dung giải nén vào gốc repo và deploy lại Vercel. Không có SQL hoặc biến môi trường mới; giữ nguyên dữ liệu và SESSION_ENCRYPTION_KEY.

Đọc HUONG_DAN_V4_24.html hoặc BUILD_NOTES_V4_24.md.

- 10 cột MASTER chuẩn vừa khung desktop, mã nhỏ hơn tên và toolbar gom ngang.
- Cột tên dùng dropdown từ dữ liệu đã có; chọn tên tự điền mã. Mã chỉ đọc để không sửa lệch cặp.
- + Nhập mục mới… để tạo mã/tên mới, áp dụng vào dòng rồi Lưu danh mục MASTER.
- Tìm kiếm và 30 dòng/trang; lưu vẫn đủ toàn bộ danh mục, sửa đúng chỉ số dòng thật.
- Giữ MASTER dùng chung, rule độc lập với mã MASTER, một/nhiều dịch vụ và các luồng v4.23.

316 test tự động và 15 nhóm kiểm tra Edge đạt với dịch vụ giả lập. Chưa deploy production. ZIP chỉ có file triển khai; source/test đầy đủ còn trong build cục bộ. Hướng dẫn v4.24 được ưu tiên so với lịch sử dưới đây.

---

# Staffing v4.23 — Chọn rule độc lập

Gói triển khai 66 file. Upload nội dung giải nén vào gốc repo và deploy lại Vercel, gồm backend. Không cần SQL hoặc biến môi trường mới; giữ nguyên dữ liệu và SESSION_ENCRYPTION_KEY.

Đọc HUONG_DAN_V4_23.html hoặc BUILD_NOTES_V4_23.md.

- Hiện toàn bộ Rule ID để chọn, không lọc theo mã dự án MASTER.
- MASTER PRO_18 (Vinamilk) có thể dùng rule VNM_HR nếu phù hợp cấu trúc file. Không cần đổi mã hoặc Nguồn ID.
- MASTER quyết định dự án lần chạy; rule quyết định cấu trúc/cách mapping. Các giá trị FIXED và điều kiện vẫn theo rule đã chọn.
- Accept/log/thống kê dùng dự án MASTER và lưu riêng dự án gốc của rule để đối chiếu. Thư viện không bị sửa.
- Giữ các tính năng MASTER dùng chung, một/nhiều dịch vụ, không gán kỳ và giới hạn phím tắt của bản trước.

312 test tự động và 12 nhóm kiểm tra Edge đạt với dịch vụ giả lập. Chưa deploy production. Source/test phát triển nằm trong build cục bộ; ZIP chỉ có file triển khai. Hướng dẫn v4.23 được ưu tiên so với lịch sử dưới đây.

---

# Staffing v4.22 — MASTER dùng chung

Source GitHub 66 file. Upload nội dung giải nén vào gốc repo hiện tại rồi deploy lại Vercel, gồm backend. Không cần SQL hoặc biến môi trường mới. Giữ nguyên cấu hình và SESSION_ENCRYPTION_KEY.

**Nhập MASTER ở đâu:** đăng nhập quản trị → Chuẩn hóa dữ liệu → MASTER dùng chung → Tải mẫu/Nạp Excel → kiểm tra → Lưu danh mục MASTER. Danh mục chưa chứa dữ liệu thật; quản trị cần nhập lần đầu.

Đọc HUONG_DAN_V4_22.html hoặc BUILD_NOTES_V4_22.md.

- Danh mục dùng chung; một dòng là một tổ hợp dự án/dịch vụ/công ty/ngành/HO. Dự án có thể có nhiều dịch vụ và HO.
- Bên trái: Thông tin MASTER → Chọn rule → Chọn kỳ. User chọn tên, mã tự điền. Rule lọc theo dự án.
- File một dịch vụ: chọn dịch vụ/HO chung. File nhiều dịch vụ: chọn cột mã hoặc tên dịch vụ, thêm khóa HO/ngành/công ty khi cần, tra MASTER theo từng dòng.
- Bên phải hiển thị MASTER đã chọn trước, rồi các cột rule. Không nhập lại dự án/MASTER, ẩn nâng cao và cách chọn trong luồng xử lý.
- MASTER/rule cùng được lưu và kiểm tra phiên bản. Nhập rule không xóa MASTER. Chỉ admin sửa danh mục; user được cấp page đọc/chọn và Accept theo quyền hiện có.

309 test tự động và 11 nhóm kiểm tra Edge đạt trên dịch vụ giả lập. Kiểm tra một/nhiều dịch vụ, tra mã/tên, khóa HO, bảo toàn MASTER, quyền admin/editor, Accept/log/thống kê và responsive. Chưa deploy production. ZIP chỉ có file triển khai, source/test phát triển còn ở build cục bộ. Hướng dẫn v4.22 được ưu tiên so với lịch sử dưới đây.

---

# Staffing v4.21 — Thông tin chung và kỳ tùy chọn

Gói triển khai GitHub gồm 64 file. Upload nội dung giải nén vào gốc repo và deploy lại Vercel, gồm backend. Không có SQL hoặc biến môi trường mới. Giữ nguyên cấu hình kết nối và SESSION_ENCRYPTION_KEY.

Đọc HUONG_DAN_V4_21.html hoặc BUILD_NOTES_V4_21.md.

- Thông tin chung ở bước 1 thay cho file MASTER nếu các giá trị áp dụng cùng cho mọi dòng. Form tạo theo các mapping LOOKUP đang hoạt động. Có thể chuyển lại sang tra file theo khóa.
- Form chỉ dùng cho lần chạy, không sửa thư viện rule. Accept lưu các dòng kết quả đã có giá trị chung.
- Mặc định Không gán kỳ: không bắt buộc năm/tháng, không tự ghi đè thời gian lấy từ cột nguồn. Trường chỉ lấy PARAM report_year/report_month để trống và không bắt buộc riêng trong lần này.
- Có thể chọn Một kỳ chung nếu muốn dùng năm/tháng giống nhau cho toàn file.
- Accept/log/thống kê hỗ trợ Chưa gán kỳ, không cần SQL mới. Các chức năng và giới hạn phím tắt v4.20 được giữ.

300 test tự động và 23 nhóm kiểm tra Edge đạt với dữ liệu/dịch vụ giả lập. Chưa deploy production. Mã phát triển/kiểm thử còn trong thư mục build cục bộ; ZIP chỉ chứa file triển khai. Các mục bên dưới là lịch sử bản cũ, hướng dẫn v4.21 được ưu tiên.

---

# Staffing v4.20 — Kho dữ liệu và giới hạn phím tắt

Gói GitHub 63 file triển khai. Upload nội dung giải nén vào gốc repo rồi deploy lại Vercel. Không có SQL hoặc biến môi trường mới. Giữ nguyên kết nối và SESSION_ENCRYPTION_KEY.

Đọc HUONG_DAN_V4_20.html và BUILD_NOTES_V4_20.md.

- Nhãn frontend và form Excel đổi sang Kho dữ liệu.
- Lỗi API và tên bước đo dùng thuật ngữ chung, không đưa đường dẫn thiết lập riêng của nhà cung cấp ra UI.
- Hạn chế F12, phím tắt DevTools/View Source và menu chuột phải ngoài biểu mẫu. Giữ menu sửa ô và copy/paste.
- Đây là giới hạn thao tác UI; website không thể ngăn hoàn toàn việc xem HTML/CSS/JS hoặc mở DevTools từ menu trình duyệt. Bảo vệ dữ liệu vẫn dựa vào backend và quyền truy cập.

294 test và 20 nhóm kiểm tra Edge đạt với dữ liệu/dịch vụ giả lập. Không deploy production. Gói triển khai không chứa test/QA; bản phát triển đầy đủ còn trong thư mục build cục bộ. Các mục bên dưới là lịch sử; hướng dẫn v4.20 được ưu tiên.

---

# Staffing v4.19 — Guided Mapping

Gói GitHub gồm 61 file triển khai. Upload nội dung giải nén vào gốc repo hiện tại rồi deploy lại Vercel. Giữ nguyên biến môi trường và SESSION_ENCRYPTION_KEY. Không có SQL mới; Accept/log/thống kê vẫn cần SQL v4.18 nếu chưa chạy trước đó.

Đọc **HUONG_DAN_V4_19.html** hoặc **BUILD_NOTES_V4_19.md**.

- Trạng thái rule, vai trò và các trường enum có dropdown.
- Bước 1 kiểm tra MAIN/MASTER, cấu hình khóa nối, kỳ và tham số trước khi cho Tiếp. Bước 3 chỉ mở sau khi mapping thành công.
- Nút Khai báo MASTER giải thích cấu hình PARAM hoặc nối MAIN, đúng phía của các khóa.
- Khung cố định: MAIN–LOOKUP đặt song song trên desktop; nút Tiếp/Mapping/Accept tách khỏi nội dung cuộn; lỗi hiện thông báo nổi.
- Kết quả vẫn Accept vào Supabase; giữ lịch sử và thống kê.

287 test tự động và 18 nhóm kiểm tra Edge đạt với dịch vụ/dữ liệu giả lập. Đã kiểm tra hai nguồn vừa một view ở 1920×1080, 1366×768, 1024×768; tablet/mobile/landscape giữ đúng khung. Bảng dài và màn hình nhỏ có cuộn nội dung bên trong. Chưa deploy production.

Gói triển khai không chứa test/QA; source phát triển và kiểm thử vẫn nằm ở thư mục build cục bộ. Những mục bên dưới là lịch sử bản cũ; hướng dẫn v4.19 được ưu tiên.

---

# Staffing v4.18 — Luồng mapping và Accept

Mở **HUONG_DAN_V4_18.html** hoặc **BUILD_NOTES_V4_18.md** để cập nhật.

**Cần chạy SQL mới:** `supabase/mapping_results_v4_18.sql` trên project hiện tại; giữ nguyên SESSION_ENCRYPTION_KEY và cấu hình Vercel. Sau đó upload nội dung gói này vào gốc repository và deploy lại. Chưa chạy SQL/deploy trên môi trường thật trong quá trình tạo build.

- Quản trị có + Thêm page mới trong từng menu.
- Dự án mới: tải form Excel → điền/nạp rule → lưu Supabase, giữ các Rule ID khác.
- Dự án có sẵn: xem rule → chọn file → preview 20 dòng → xác nhận → Accept lưu các dòng hợp lệ.
- Lịch sử và thống kê dùng dữ liệu các lần Accept thành công trên Supabase.
- Giao diện dùng toàn bộ khung và co giãn mobile.

280 kiểm thử tự động và 10 nhóm kiểm tra giao diện Edge đạt với dữ liệu/dịch vụ giả lập. SQL mới đã rà soát cấu trúc, chưa thực thi trên PostgreSQL thật.

Gói GitHub gồm 60 file triển khai (không chứa test/QA). Mã nguồn phát triển và kiểm thử vẫn ở thư mục build cục bộ. Các mục bên dưới là lịch sử kỹ thuật bản cũ; hướng dẫn v4.18 được ưu tiên.

---

# staffing v4.14 – Thư viện rule trên Supabase

Tích hợp trên v4.13. Mở **HUONG_DAN_V4_14.html**. Chạy **supabase/mapping_rules_v4_14.sql** một lần trên project hiện tại, deploy, rồi nhập thư viện rule và Lưu lên Supabase.

Rule không còn đọc Google trong các lần tải thông thường. Các phần Staffing v13 khác vẫn dùng Sheet như trước. Có editor, lịch sử phiên bản và chống ghi đè. 263 kiểm thử tự động và 10 kiểm tra workflow Edge đạt với dữ liệu giả lập. Chưa deploy hay chuyển dữ liệu thật.

---

# staffing v4.13 — Sửa header tài khoản, xác nhận key cũ và backup Sheets

- Header tài khoản không còn nổi đè lên dòng dữ liệu hoặc form khi cuộn.
- Hiện thời gian cấp key gốc; phân biệt key đã cấp với chuỗi key cũ chưa được xác nhận.
- Có **Bổ sung key cũ / Xác nhận key cũ** để lưu lại đúng key hiện tại, giữ nguyên ngày cấp và phiên đăng nhập.
- Có **Đồng bộ key → Sheets**. Tự đồng bộ khi cấp/xác nhận/thu hồi key; app tự thêm nhóm cột AccessKey… vào tab TaiKhoan sau các cột đang dùng.
- Key rõ trong Sheet được đọc bởi những người có quyền đọc Sheet. Danh sách tài khoản trong ứng dụng vẫn không nhận key rõ trước khi quản trị nhấn Hiện.

**Cập nhật từ v4.12:** thay toàn bộ source → commit → Vercel Ready → Ctrl+F5. Không có SQL mới; vẫn cần migration `account_ux_v4_12.sql` của bản trước nếu chưa chạy. Không đổi SESSION_ENCRYPTION_KEY.

**Kiểm tra v4.13:** 240 test tự động và 69 kiểm tra trình duyệt đạt trên dịch vụ giả lập; chưa backup key production.

Đọc **CAP_NHAT_V4_13.md** hoặc **HUONG_DAN.html**. Các phần bên dưới là lịch sử các bản trước; v4.13 bổ sung backup vào Google Sheets theo yêu cầu hiện tại.

# staffing v4.12 — Tài khoản, avatar và điều hướng

**Cần chạy `supabase/account_ux_v4_12.sql` trong Supabase hiện tại trước khi deploy source.** Không thêm biến môi trường và không đổi SESSION_ENCRYPTION_KEY. Key cũ và dữ liệu hiện có được giữ nguyên.

- Bảng tài khoản rộng, phân trang, không có cột nhãn key ở danh sách; key có nút ẩn/hiện.
- Key mới có bản mã hóa để Quản trị xem lại; key cũ chỉ có mã băm hiện **Không có bản lưu** và vẫn đăng nhập được.
- Upload avatar cho bản thân hoặc quản trị tải cho user; dùng hình mặc định chung khi chưa có ảnh.
- Con mắt ở ô nhập key; ẩn page Tài khoản & phân quyền với non-admin.
- Icon Home, nút chuyển page cùng menu, ngày Việt Nam và version ứng dụng.

**Kiểm tra bản v4.12:** 228 test tự động và 62 kiểm tra trình duyệt đạt trên dịch vụ giả lập. Chưa chạy migration hoặc deploy production.

Đọc **CAP_NHAT_V4_12.md** hoặc **HUONG_DAN.html** để triển khai. Các hướng dẫn bên dưới là lịch sử các bản trước; v4.12 cần thêm migration nêu trên.

# staffing v4.11 — Tối ưu mở page và đo hiệu năng

Mở page phản hồi ngay bằng trạng thái đang tải. Cấu hình menu và Roadmap lần đầu dùng một API gộp. Các lượt đọc chính được tách khỏi khóa ghi; quyền và key vẫn được kiểm tra từ nguồn hiện tại.

**Cách đo:** avatar tài khoản quản trị → **Hiệu năng**. Xem trung vị/P95 theo page và API; mở từng dòng để xem Google Sheets, Supabase, phiên, khóa ghi hoặc HuBI. Có xuất JSON, không ghi dữ liệu đo vào Sheets. Xem `DO_HIEU_NANG.md` để đọc kết quả và bật log máy chủ khi cần.

**Kiểm tra:** 221 test tự động và 51 kiểm tra trình duyệt đạt trên dịch vụ giả lập; không gọi Apps Script production.

**Cập nhật:** thay toàn bộ source trong repository GitHub → commit → chờ Vercel Ready → Ctrl+F5. Không cần SQL hoặc biến môi trường mới. Chưa triển khai hoặc đo tốc độ production trong gói này.

# staffing v4.10 — Giao diện gọn và chat responsive

- Icon robot bỏ nhãn tên bên dưới; tên trong tiêu đề hội thoại vẫn giữ để nhận diện.
- Khung chat tự co giãn trên điện thoại, tablet, laptop và desktop; hỗ trợ màn hình ngang và chiều cao vùng nhìn khi bàn phím mở. Vùng tin nhắn cuộn riêng.
- Góc trên chỉ còn icon avatar. Nhấn icon để xem tên, username, vai trò và đăng xuất. Đóng bằng nhấn ngoài hoặc Escape; hỗ trợ bàn phím.
- Cập nhật toàn bộ source trong repository GitHub, commit và chờ Vercel deploy Ready. Ctrl+F5 để tải tài nguyên mới.
- Không cần SQL hay biến môi trường mới. Phân quyền và đăng nhập giữ nguyên.
- Kiểm tra: 215 test tự động, 43 kiểm tra trình duyệt đạt. QA dùng dữ liệu giả lập, không gọi Apps Script production. Bàn phím điện thoại được mô phỏng qua visualViewport; cần kiểm tra thêm trên thiết bị thực sau triển khai.

# staffing — Vercel v4.9 · HuBI integration

Full source để cập nhật app Google Sheets + Supabase đang triển khai bằng GitHub/Vercel.

## Cập nhật v4.9 — tích hợp HuBI từ Chatbot HTML.txt

Mở HUONG_DAN.html. Upload full source và giữ nguyên env/Sheet/Supabase; không cần SQL mới. Endpoint Apps Script đang dùng được cấu hình trong lib/hubi-endpoint.js, có thể override bằng HUBI_API_URL khi cần.

- Nút HuBI nổi chỉ xuất hiện sau xác thực. Giao diện dùng hình gốc được trích một lần ra public/assets/hubi-avatar.png và CSS riêng, không đưa global CSS/body của chatbot vào staffing.
- Chỉ tải FAQ khi mở HuBI, cache bộ nhớ 5 phút/user, không localStorage. Logout/đổi user hủy request phía client, xóa lịch sử/cache và bỏ qua phản hồi cũ.
- Giữ exact question/keyword matching, trạng thái active, ba quick suggestions và hiển thị link an toàn theo file cung cấp. Không thêm LLM hay yêu cầu API key AI.
- getHuBIFaq và submitHuBIQuestion là API cùng origin có kiểm tra phiên. Lượt chờ Apps Script nằm ngoài application write lock. Chỉ POST question, không tự gửi danh tính/key/dữ liệu dự án. Rate limit và giới hạn kích thước request/response được áp dụng.
- FAQ là nội dung dùng chung cho user đã xác thực; chưa có RLS từng FAQ theo dự án. Page audience chỉ điều khiển page trên Agenda, widget vẫn là tính năng dùng chung.
- Có thể thêm page HuBI qua Quản lý menu/page → Chức năng có sẵn → HuBI. Page và widget dùng chung một instance; không tự sửa cấu hình menu cũ.
- Browser smoke suite: tests/browser-hubi.mjs. Các dịch vụ FAQ và ghi câu hỏi trong test đều giả lập; không gửi câu hỏi thật.

## Tính năng nền v4.8

- Agenda staffing không có sidebar; xác thực và tải lại trang đều về Trang chủ. Header có biểu tượng đội ngũ, tên user và đăng xuất.
- 3 cột từ 1100px, 2 cột từ 701–1099px, 1 cột khi nhỏ hơn. Có ô tìm menu/page theo tên/mô tả, xử lý tại máy.
- Khung Agenda được tải qua getAgendaWorkspace, không đọc work items/catalogs/audit. Page cần dữ liệu nghiệp vụ tải khi mở. Quản lý menu/page từ v4.7 được giữ và kiểm tra quyền ở backend.
- Mẫu mặc định chỉ hiện Tổng quan kế hoạch trong Roadmap; Detail Task và Dự án mặc định tắt nhưng code/dữ liệu vẫn giữ. Page Cấu hình theo thứ tự: menu/page → tài khoản → danh mục. Cấu hình đã lưu từ v4.7 không bị ghi đè; admin có thể tắt các page không dùng trong app.
- Không có SQL mới nếu đã chạy access_keys_v4_3.sql. Giữ nguyên env, Supabase, Google Sheet và cấu hình iframe. Lần lưu menu đầu app tự tạo hai tab cấu hình trong Sheet.
- Bắt đầu bằng HUONG_DAN.html. Browser suite hiện tại: tests/browser-agenda.mjs; iframe: tests/browser-embed.mjs. Các entry browser.mjs/browser-v4.mjs/browser-key.mjs trỏ về suite Agenda mới.

## Tính năng nền từ v4.7

- Bỏ thanh navigation bên trái của app. AcacyONE là trang cha bên ngoài, không bị sửa bởi source này.
- Xác thực bằng key hoặc tài khoản admin thành công luôn mở Trang chủ (Agenda). Tải lại trình duyệt cũng về Agenda.
- Agenda hiển thị các menu chính thành thẻ, các page con là nút mở trực tiếp. Có Trang chủ và thông tin tài khoản trên thanh phía trên.
- Đổi tên hiển thị thành **staffing**. Các tên bảng, cookie, mã liên kết, biến môi trường và định danh kỹ thuật cũ được giữ để tương thích dữ liệu/phiên hiện có.
- Thêm **Cấu hình → Quản lý menu & page**, chỉ dành cho vai trò hệ thống admin. Tạo/sửa tên, mô tả, biểu tượng menu, thứ tự, trạng thái và vai trò được xem. ID tự sinh; không có xóa vĩnh viễn, dùng tắt để ẩn.
- Page mở chức năng có sẵn (OneView, Len720, Tổng quan kế hoạch, Detail Task, Dự án, Danh mục, Tài khoản & phân quyền, Quản lý menu & page), nhúng link HTTPS hoặc mở tab mới. Chức năng xử lý mới cần viết thêm code và đăng ký chức năng.
- Cấu hình dùng chung lưu ở Google Sheets: `Staffing_Navigation`, nhật ký `Staffing_Navigation_Log`. Lần lưu hợp lệ đầu tiên tự tạo hai tab trong một Sheets batch; không cần tạo thủ công hoặc chạy SQL mới.
- Trang chủ chỉ hiện các menu có page con đang bật và được cấp quyền. Menu chưa có page con chỉ hiện trong trang quản lý.
- Quyền page cần thỏa cả vai trò menu cha, vai trò page và quyền chức năng. Không chọn vai trò nghĩa là tất cả; admin xem được các mục đang bật. Phạm vi dự án và quyền thao tác cũ tiếp tục được kiểm tra ở backend. Các thay đổi được kiểm tra ở request tiếp theo; dùng Làm mới để tải lại Agenda.
- Menu Cấu hình và page Quản lý menu & page được giữ hoạt động để admin luôn có đường vào quản lý. Có thể đổi tên/mô tả/thứ tự, không tắt/chuyển đích của page hệ thống.
- OneView và Len720 vẫn là vị trí chức năng, chưa kết nối dữ liệu nhân sự.

## Cập nhật bản đang chạy

1. Giải nén `Staffing_Vercel_v4_7_Agenda.zip`.
2. Đưa **toàn bộ nội dung bên trong** thư mục `Staffing_Vercel_v4_7_Agenda` lên repo GitHub đang nối với Vercel, ghi đè các file cùng tên rồi commit. Root Directory phải chứa trực tiếp `package.json`, `vercel.json`, `api/`, `lib/`, `public/`.
3. Giữ các biến môi trường hiện tại, đặc biệt `GOOGLE_SPREADSHEET_ID`, `SESSION_ENCRYPTION_KEY`, `APP_ORIGIN` và các khóa dịch vụ. Tên hiển thị thay đổi không yêu cầu đổi domain hay tạo app mới.
4. Nếu đã chạy `supabase/access_keys_v4_3.sql` thì **không chạy SQL mới**, không chuyển lại Roadmap. Nếu chưa chạy v4.3, làm theo `HUONG_DAN.html`.
5. Đợi Vercel Production **Ready** → mở domain chính → Ctrl+F5 → xác thực.
6. Tại Agenda, vào **Cấu hình → Quản lý menu & page** để thêm/sửa. Service Account cần quyền Editor và được tạo tab trong Spreadsheet hiện tại.

Build: `npm run build`; Output Directory: `public`; Framework: Other; Node.js: 22.x. Không đưa `.env.local` hoặc khóa dịch vụ vào GitHub.

## Thêm menu và page

- **Thêm menu:** điền tên, mô tả, biểu tượng, thứ tự, vai trò → Lưu menu.
- **Thêm page:** điền tên → chọn menu cha → chọn Chức năng có sẵn hoặc Đường link HTTPS → chọn chức năng/link và cách mở → vai trò, thứ tự, trạng thái → Lưu page.
- **Chức năng có sẵn:** dùng lại màn hình và backend đang có. Đổi tên page chỉ đổi nhãn/tiêu đề hiển thị, không tạo dashboard mới.
- **Link nhúng:** website đích phải cho phép nhúng vào domain staffing và các trang cha AcacyONE liên quan. Nếu bị chặn, chuyển sang tab mới. Nút mở tab mới luôn có sẵn ở trang liên kết. Quyền bên staffing không thay thế đăng nhập/phân quyền của website đích. Không đặt key/mật khẩu trong URL cấu hình.
- **Chức năng xử lý mới:** cần bổ sung màn hình/API, quyền và đăng ký chức năng; sau đó chọn chức năng mới trong cấu hình.
- **CONFLICT:** có cấu hình mới hơn. Bấm Hủy nếu muốn bỏ bản nháp → Làm mới → mở lại mục cần sửa; app không tự ghi đè thay đổi của người khác.

## Tương thích

Giữ chức năng cấp key v4.6: phản hồi xử lý, xác nhận trong app, khóa bấm lặp, lỗi tại form. Key tự đặt mới 7–128 ký tự, có chữ hoa, số và ký tự đặc biệt trong `. _ @ ! # % + = : -`, không khoảng trắng. Key đã cấp được giữ. Chỉ system admin được đăng nhập bằng username/password; các tài khoản khác dùng key.

Giữ quyền dự án, vai trò, nhập/xuất Excel/CSV, danh mục, dữ liệu Roadmap, khóa ghi và kiểm tra phiên bản. Không đổi tên các tab `HubOne_*` hiện có. Không tạo dữ liệu demo trong dữ liệu thật.

## Kiểm tra

Chạy `npm test` và `npm run build`. Kết quả hiện tại ở `qa/verification.json`. Dữ liệu kiểm thử là giả; chưa deploy vào app thật, chưa đo độ trễ production, chưa xác nhận với Google Sheets/Supabase thật hoặc iframe AcacyONE thật. Các báo cáo v4.6 trong `qa/legacy-v4_6/` chỉ là lịch sử bản trước.

Mở `HUONG_DAN.html` để xem hướng dẫn có định dạng. `HUONG_DAN_ROADMAP.html` mô tả cấu trúc và chuyển đổi dữ liệu cũ; `NHUNG_ACACYONE.html` mô tả nhúng vào ONE.
