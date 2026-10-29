# Staffing v4.24 — Bảng MASTER gọn và chọn tên tự điền mã

Gói triển khai 67 file. Upload nội dung giải nén vào gốc repo và deploy lại Vercel. Không có SQL hoặc biến môi trường mới; giữ nguyên dữ liệu và SESSION_ENCRYPTION_KEY.

## Thay đổi

- Bảng MASTER chuẩn 10 cột có độ rộng cố định theo tỷ lệ, cột mã nhỏ hơn cột tên, điều khiển và hàng gọn hơn. Kiểm tra không cần cuộn ngang ở desktop 1920/1366/1024 px. Header trong app hiển thị tiếng Việt; header Excel và dữ liệu lưu vẫn dùng tên chuẩn ban đầu.
- Các nút tải/nạp/thêm/lưu, chọn sheet và thêm cột được gom vào toolbar ngang; nhóm sheet chỉ hiện khi file có nhiều sheet. Ô tìm kiếm, tổng dòng và phân trang nằm trên cùng một hàng riêng.
- Các cột tên công ty/ngành/dịch vụ/dự án/HO có dropdown lấy từ danh mục đã lưu và bản nháp đang sửa. Chọn tên đổi cả mã và tên tương ứng trên đúng dòng. Cột mã chỉ đọc để tránh sửa lệch cặp; có thể copy mã. Mã dạng text vẫn giữ số 0 đầu.
- Nếu chưa có mục cần dùng, chọn + Nhập mục mới… trong dropdown, nhập mã/tên trong cửa sổ rồi Áp dụng vào dòng. Hủy hoặc đóng không thay đổi dòng. Mã đã tồn tại với tên khác được báo để tránh tạo nhầm; thêm mục không tự đổi tên hàng loạt các dòng khác.
- Tìm theo tên/mã và phân trang 30 dòng để danh mục dài không tạo quá nhiều dropdown cùng lúc. Các dòng đang lọc/không ở trang hiện tại vẫn giữ trong bản nháp và được lưu đầy đủ. Sửa trong trang/lọc dùng chỉ số dòng thật, không nhầm vị trí hiển thị với vị trí dữ liệu.
- Chọn/sửa chỉ áp dụng bản nháp. Bấm Lưu danh mục MASTER để lưu dùng chung; quyền quản trị và kiểm tra phiên bản giữ nguyên.
- Cột bổ sung và màn hình nhỏ vẫn có thể cuộn ngang trong bảng để giữ ô đọc được. Tên dài có thể xem đầy đủ khi mở dropdown hoặc rê chuột. Không thu chữ quá nhỏ để ép mọi nội dung tên dài vào một ô.

Các tính năng MASTER dùng chung, rule chọn độc lập, một/nhiều dịch vụ, không gán kỳ và Accept/log/thống kê giữ nguyên. Không thay schema dữ liệu MASTER hay các giá trị đã lưu khi chỉ mở bản mới.

## Kiểm tra

316 test tự động và 15 nhóm kiểm tra Edge đạt với dữ liệu/dịch vụ giả lập. Bao gồm dropdown cập nhật mã, thêm mục mới/hủy, lưu rõ ràng, số 0 đầu, tìm/lọc đúng dòng số 80, phân trang 30 dòng nhưng lưu đủ 80 dòng, 10 cột cùng view tại 1920/1366/1024, toolbar nhiều sheet không tràn mobile, các luồng mapping/Accept và quyền admin/editor. Build kiểm tra 40 file JS. Chưa deploy hoặc sửa dữ liệu production.
