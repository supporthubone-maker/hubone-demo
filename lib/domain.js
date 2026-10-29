import { createHash } from 'node:crypto';
const ROADMAP_CONFIG = {
  spreadsheetId: '', // Leave blank when this script is opened from the target Google Sheet.
  tasksSheet: 'Roadmap_Tasks',
  auditSheet: 'Roadmap_Log',
  trustedAdminEmails: [], // Optional trusted setup admins, especially for a Shared Drive.
  minDate: '2026-08-01',
  maxDate: '2027-12-31'
};
const ROADMAP_HEADERS = ['key','id','title','workstream','domain','phase','startDate','target','owner','status','progress','priority','inputs','accept','deps','notes','next','blockers','revision','updated','updatedBy'];

/** Danh mục động và quyền truy cập. Các hàm có dấu _ ở cuối không gọi trực tiếp từ trình duyệt. */
const CONFIG_TABS={domains:'DanhMuc_NghiepVu',groups:'DanhMuc_TrienKhai',users:'TaiKhoan'};
const DOMAIN_HEADERS=['Mã','Tên hiển thị','Thứ tự','Đang sử dụng'];
const GROUP_HEADERS=['Mã','Tên hiển thị','Màu sắc','Thứ tự','Đang sử dụng'];
const OLD_USER_HEADERS=['Email','Họ tên','Quyền','Đang sử dụng','Ghi chú'];
const USER_HEADERS=OLD_USER_HEADERS.concat(['Tên đăng nhập','Auth UID','Phiên bản đăng nhập']);
const DEFAULT_DOMAINS=[
 ['all','Dùng chung',0,true],['workforce','Nhân sự',1,true],['talent','Tuyển dụng',2,true],
 ['governance','Chấm công và tuân thủ',3,true],['reward','Lương và thưởng',4,true],['capability','Năng lực và phát triển',5,true]
];
const DEFAULT_GROUPS=[
 ['business-kpi','Phạm vi và chỉ số','#53846e',1,true],['data-governance','Quản trị dữ liệu','#708651',2,true],
 ['data-foundation','Nền tảng dữ liệu','#58858a',3,true],['mvp-experience','Giao diện và phân tích','#92754e',4,true],
 ['pilot-validation','Thử nghiệm và nghiệm thu','#8875a1',5,true],['operation-adoption','Vận hành và sử dụng','#6d8199',6,true],
 ['expansion-evolution','Mở rộng và phát triển','#a37c71',7,true]
];
/** Chỉ chuyển nội dung mẫu còn nguyên; không ghi đè phần người dùng đã sửa. */
const ROADMAP_TRANSLATIONS = {
  "BS-01": {
    "original": {
      "title": "Xác định người dùng, nhu cầu & phạm vi MVP",
      "inputs": "Xác định nhóm người dùng, câu hỏi kinh doanh ưu tiên, phạm vi MVP và các nhu cầu dùng chung/riêng.",
      "accept": "Phạm vi MVP và nhóm câu hỏi ưu tiên được OP Team xác nhận."
    },
    "vi": {
      "title": "Xác định người dùng, nhu cầu và phạm vi phiên bản đầu",
      "inputs": "Xác định nhóm người dùng, câu hỏi nghiệp vụ ưu tiên, phạm vi phiên bản đầu và nhu cầu dùng chung hoặc riêng.",
      "accept": "Phạm vi phiên bản đầu và nhóm câu hỏi ưu tiên được xác nhận."
    }
  },
  "BS-02": {
    "original": {
      "title": "Chuẩn hóa danh mục, định nghĩa & cách tính KPI",
      "inputs": "Chuẩn hóa KPI name, business meaning, công thức, đơn vị, kỳ tính, denominator và ngoại lệ.",
      "accept": "Mỗi KPI trong MVP có business definition và calculation rule thống nhất."
    },
    "vi": {
      "title": "Chuẩn hóa danh mục, định nghĩa và cách tính chỉ số",
      "inputs": "Thống nhất tên chỉ số, ý nghĩa nghiệp vụ, công thức, đơn vị, kỳ tính, mẫu số và ngoại lệ.",
      "accept": "Mỗi chỉ số trong phiên bản đầu có định nghĩa và quy tắc tính thống nhất."
    }
  },
  "BS-03": {
    "original": {
      "title": "Chuẩn hóa dimensions, grain & phạm vi tính KPI",
      "inputs": "Xác định grain, entity, dimension, population, scope và cách xử lý thay đổi tổ chức theo thời gian.",
      "accept": "Các KPI có grain và phạm vi tính rõ; tổng và chi tiết dùng cùng population."
    },
    "vi": {
      "title": "Chuẩn hóa chiều phân tích, mức chi tiết và phạm vi tính",
      "inputs": "Xác định mức chi tiết, đối tượng, chiều phân tích, tập đối tượng tính và cách xử lý thay đổi tổ chức theo thời gian.",
      "accept": "Các chỉ số có mức chi tiết và phạm vi tính rõ; số tổng và số chi tiết dùng cùng tập đối tượng."
    }
  },
  "BS-04": {
    "original": {
      "title": "Chốt baseline & logic so sánh KPI",
      "inputs": "Xác định Actual vs Plan, current vs previous, nguồn plan, cut-off và rule cho kỳ chưa hoàn tất.",
      "accept": "Mỗi comparison có baseline, timeframe, denominator và cách diễn giải rõ."
    },
    "vi": {
      "title": "Chốt mốc chuẩn và quy tắc so sánh chỉ số",
      "inputs": "Xác định cách so sánh thực tế với kế hoạch, kỳ hiện tại với kỳ trước, nguồn kế hoạch, thời điểm chốt và quy tắc cho kỳ chưa kết thúc.",
      "accept": "Mỗi phép so sánh có mốc chuẩn, khoảng thời gian, mẫu số và cách diễn giải rõ."
    }
  },
  "BS-05": {
    "original": {
      "title": "Chuẩn hóa business glossary & tên gọi KPI",
      "inputs": "Chuẩn hóa tên KPI, thuật ngữ, viết tắt, mô tả ngắn và cách diễn giải dùng xuyên suốt dashboard.",
      "accept": "Người dùng và đội triển khai dùng cùng một business language."
    },
    "vi": {
      "title": "Chuẩn hóa thuật ngữ và tên gọi chỉ số",
      "inputs": "Thống nhất tên chỉ số, thuật ngữ, viết tắt, mô tả ngắn và cách diễn giải dùng xuyên suốt bảng điều khiển.",
      "accept": "Người dùng và người triển khai dùng chung một bộ thuật ngữ nghiệp vụ."
    }
  },
  "DG-01": {
    "original": {
      "title": "Xác định Source of Truth & Data Ownership",
      "inputs": "Liệt kê dataset/KPI trọng yếu; xác định nguồn chuẩn, hệ thống/file chính thức, Data Owner và đầu mối xử lý.",
      "accept": "Mỗi dữ liệu trọng yếu có Source of Truth và owner rõ."
    },
    "vi": {
      "title": "Xác định nguồn dữ liệu chuẩn và người phụ trách",
      "inputs": "Liệt kê bộ dữ liệu, chỉ số trọng yếu; xác định hệ thống hoặc tệp chính thức, người phụ trách và đầu mối xử lý.",
      "accept": "Mỗi dữ liệu trọng yếu có nguồn chuẩn và người phụ trách rõ ràng."
    }
  },
  "DG-02": {
    "original": {
      "title": "Chuẩn hóa Data Dictionary & Data Lineage",
      "inputs": "Mô tả field, business meaning, grain, source, transformation chính và lineage tới KPI/dashboard.",
      "accept": "Các field/KPI trọng yếu có định nghĩa và đường truy nguồn rõ."
    },
    "vi": {
      "title": "Chuẩn hóa từ điển dữ liệu và đường truy nguồn",
      "inputs": "Mô tả trường dữ liệu, ý nghĩa nghiệp vụ, mức chi tiết, nguồn, bước biến đổi chính và đường truy nguồn đến chỉ số, bảng điều khiển.",
      "accept": "Các trường dữ liệu và chỉ số trọng yếu có định nghĩa và đường truy nguồn rõ."
    }
  },
  "DG-03": {
    "original": {
      "title": "Thiết lập Data Quality Rules",
      "inputs": "Định nghĩa control cho completeness, validity, uniqueness, mapping integrity và logic conflict theo từng nguồn/kỳ.",
      "accept": "Biết rõ thế nào là Pass/Fail và mức ảnh hưởng của từng lỗi dữ liệu."
    },
    "vi": {
      "title": "Thiết lập quy tắc kiểm tra chất lượng dữ liệu",
      "inputs": "Định nghĩa cách kiểm tra tính đầy đủ, hợp lệ, duy nhất, đối chiếu mã và mâu thuẫn quy tắc theo từng nguồn, từng kỳ.",
      "accept": "Biết rõ điều kiện đạt hoặc không đạt và mức ảnh hưởng của từng lỗi dữ liệu."
    }
  },
  "DG-04": {
    "original": {
      "title": "Thiết lập Reconciliation & Control Rules",
      "inputs": "Xác định nguồn đối chiếu, population, grain, tolerance và ngưỡng chênh lệch chấp nhận cho KPI trọng yếu.",
      "accept": "Mỗi KPI trọng yếu có cách reconcile và ngưỡng variance rõ."
    },
    "vi": {
      "title": "Thiết lập quy tắc đối soát và kiểm soát số liệu",
      "inputs": "Xác định nguồn đối chiếu, tập đối tượng, mức chi tiết và ngưỡng chênh lệch chấp nhận cho các chỉ số trọng yếu.",
      "accept": "Mỗi chỉ số trọng yếu có cách đối soát và ngưỡng chênh lệch rõ."
    }
  },
  "DG-05": {
    "original": {
      "title": "Thiết lập Freshness & Data SLA Rules",
      "inputs": "Xác định expected refresh/cut-off, SLA, warning threshold và cách phân biệt late, stale, missing delivery.",
      "accept": "Mỗi source có lịch kỳ vọng và rule xác định đúng hạn/trễ rõ."
    },
    "vi": {
      "title": "Thiết lập quy tắc cập nhật và thời hạn giao dữ liệu",
      "inputs": "Xác định lịch cập nhật, thời điểm chốt, cam kết thời hạn, ngưỡng cảnh báo và cách phân biệt giao trễ, dữ liệu cũ hoặc thiếu dữ liệu.",
      "accept": "Mỗi nguồn có lịch cung cấp và quy tắc xác định đúng hạn, trễ hạn rõ ràng."
    }
  },
  "DG-06": {
    "original": {
      "title": "Thiết lập Exception, Root Cause & Ownership Rules",
      "inputs": "Chuẩn hóa taxonomy issue, severity, root cause, owner, trạng thái và quyết định fix/accept/waive.",
      "accept": "Exception quan trọng luôn có lý do, owner và trạng thái xử lý rõ."
    },
    "vi": {
      "title": "Thiết lập quy tắc xử lý ngoại lệ và trách nhiệm",
      "inputs": "Thống nhất loại vấn đề, mức độ ảnh hưởng, nguyên nhân, người phụ trách, trạng thái và quyết định sửa, chấp nhận hoặc miễn xử lý.",
      "accept": "Ngoại lệ quan trọng luôn có lý do, người phụ trách và trạng thái xử lý rõ."
    }
  },
  "DF-01": {
    "original": {
      "title": "Thiết lập nguồn & lịch cung cấp dữ liệu",
      "inputs": "Chốt nguồn cung cấp, đầu mối, lịch bàn giao, cut-off và cách xử lý khi nguồn đến trễ hoặc thiếu.",
      "accept": "Nguồn và cadence dữ liệu có owner và lịch bàn giao có thể vận hành lặp lại."
    },
    "vi": {
      "title": "Thiết lập nguồn và lịch cung cấp dữ liệu",
      "inputs": "Chốt nguồn cung cấp, đầu mối, lịch bàn giao, thời điểm chốt và cách xử lý khi nguồn đến trễ hoặc thiếu.",
      "accept": "Mỗi nguồn có người phụ trách và lịch bàn giao có thể vận hành lặp lại."
    }
  },
  "DF-02": {
    "original": {
      "title": "Chuẩn hóa master data, mapping & dimensions",
      "inputs": "Chuẩn hóa mapping nhân viên, cửa hàng, vùng, BU, role và các dimension dùng cho filter/drill.",
      "accept": "Mapping nhất quán; số tổng và chi tiết khớp khi filter/drill."
    },
    "vi": {
      "title": "Chuẩn hóa dữ liệu danh mục và quy tắc đối chiếu mã",
      "inputs": "Chuẩn hóa mã đối chiếu nhân viên, cửa hàng, vùng, đơn vị kinh doanh, vị trí và các chiều phân tích dùng để lọc hoặc xem chi tiết.",
      "accept": "Mã đối chiếu nhất quán; số tổng và chi tiết khớp khi lọc hoặc xem sâu."
    }
  },
  "DF-03": {
    "original": {
      "title": "Chuẩn hóa logic dữ liệu Nhân sự & Tuyển dụng",
      "inputs": "Áp business rules cho headcount, nghỉ việc, recruitment status, lịch sử và các KPI liên quan.",
      "accept": "Các KPI Nhân sự/Tuyển dụng khớp rule và test case nghiệp vụ."
    },
    "vi": {
      "title": "Chuẩn hóa quy tắc dữ liệu nhân sự và tuyển dụng",
      "inputs": "Áp dụng quy tắc nghiệp vụ cho số lượng nhân sự, nghỉ việc, trạng thái tuyển dụng, lịch sử và các chỉ số liên quan.",
      "accept": "Các chỉ số nhân sự, tuyển dụng khớp quy tắc và tình huống kiểm thử nghiệp vụ."
    }
  },
  "DF-04": {
    "original": {
      "title": "Chuẩn hóa dữ liệu & logic Chấm công",
      "inputs": "Xử lý duplicate, shift/day rule, missing punch, trạng thái mâu thuẫn và điều chỉnh công.",
      "accept": "Bản ghi hợp lệ được xác định rõ; không còn tính trùng ngoài rule."
    },
    "vi": {
      "title": "Chuẩn hóa dữ liệu và quy tắc chấm công",
      "inputs": "Xử lý trùng lặp, quy tắc ca và ngày, thiếu lượt chấm công, trạng thái mâu thuẫn và điều chỉnh công.",
      "accept": "Bản ghi hợp lệ được xác định rõ; không tính trùng ngoài quy tắc đã thống nhất."
    }
  },
  "DF-05": {
    "original": {
      "title": "Đối chiếu KPI Thưởng & Payroll với nguồn chuẩn",
      "inputs": "Đối chiếu scheme, achievement/payout, kỳ áp dụng, allocation và payroll actual theo cùng population.",
      "accept": "Chênh lệch được giải thích, xử lý hoặc chấp nhận có chủ đích."
    },
    "vi": {
      "title": "Đối chiếu chỉ số thưởng và tiền lương với nguồn chuẩn",
      "inputs": "Đối chiếu chính sách thưởng, mức đạt, mức chi trả, kỳ áp dụng, cách phân bổ và lương thực tế trên cùng tập đối tượng.",
      "accept": "Chênh lệch được giải thích, xử lý hoặc ghi nhận chấp nhận rõ ràng."
    }
  },
  "DF-06": {
    "original": {
      "title": "Tự động kiểm tra Data Quality & phát hiện sai logic",
      "inputs": "Triển khai các rule kiểm tra missing, duplicate, invalid, mapping failure và logic conflict trên dữ liệu thật.",
      "accept": "Lỗi dữ liệu được phát hiện trước khi trở thành số liệu trên dashboard."
    },
    "vi": {
      "title": "Tự động kiểm tra chất lượng và phát hiện sai quy tắc",
      "inputs": "Triển khai kiểm tra dữ liệu thiếu, trùng, không hợp lệ, lỗi đối chiếu mã và mâu thuẫn quy tắc trên dữ liệu thật.",
      "accept": "Lỗi dữ liệu được phát hiện trước khi xuất hiện trên bảng điều khiển."
    }
  },
  "DF-07": {
    "original": {
      "title": "Đối soát số liệu & phát hiện variance giữa các nguồn",
      "inputs": "Chạy reconciliation theo rule; so tổng, population và record-level để tìm phần tạo chênh lệch.",
      "accept": "KPI trọng yếu reconcile được về nguồn chuẩn; variance có record và lý do rõ."
    },
    "vi": {
      "title": "Đối soát số liệu và phát hiện chênh lệch giữa các nguồn",
      "inputs": "Chạy đối soát theo quy tắc; so số tổng, tập đối tượng và từng bản ghi để tìm phần gây chênh lệch.",
      "accept": "Chỉ số trọng yếu đối soát được với nguồn chuẩn; chênh lệch có bản ghi và lý do rõ."
    }
  },
  "DF-08": {
    "original": {
      "title": "Xác nhận completeness, freshness & trusted baseline",
      "inputs": "Review Data Quality, freshness, reconciliation và exception còn mở trước khi chấp nhận baseline sử dụng cho MVP.",
      "accept": "Dữ liệu trong scope có trạng thái tin cậy rõ; critical exception đã fix hoặc được chấp nhận."
    },
    "vi": {
      "title": "Xác nhận tính đầy đủ, độ mới và dữ liệu nền tin cậy",
      "inputs": "Rà soát chất lượng, độ mới, kết quả đối soát và ngoại lệ chưa đóng trước khi chấp nhận dữ liệu nền cho phiên bản đầu.",
      "accept": "Dữ liệu trong phạm vi có trạng thái tin cậy rõ; ngoại lệ nghiêm trọng đã sửa hoặc được chấp nhận."
    }
  },
  "UX-01": {
    "original": {
      "title": "Thiết lập shared dashboard shell & information hierarchy",
      "inputs": "Chuẩn hóa page shell, information hierarchy và interaction pattern dùng chung cho toàn bộ 5 dashboard; navigation chi tiết được xử lý trong global context flow.",
      "accept": "5 dashboard dùng cùng một cấu trúc đọc và hierarchy; user nhận ra cách scan thông tin nhất quán giữa các trang."
    },
    "vi": {
      "title": "Thiết lập khung giao diện và thứ tự trình bày chung",
      "inputs": "Chuẩn hóa bố cục trang, thứ tự thông tin và cách tương tác dùng chung cho năm bảng điều khiển; thống nhất luồng điều hướng và ngữ cảnh.",
      "accept": "Năm bảng điều khiển có cùng cấu trúc đọc; người dùng nhận ra cách theo dõi thông tin nhất quán giữa các trang."
    }
  },
  "UX-02": {
    "original": {
      "title": "Hiển thị KPI đã duyệt, scope & data trust context",
      "inputs": "Surface các KPI definition, population, timeframe, coverage, freshness và data-quality context đã được chốt từ WS1–WS3 tại đúng điểm người dùng cần để đánh giá con số.",
      "accept": "User hiểu số đang xem nghĩa là gì, thuộc phạm vi nào và mức độ tin cậy ra sao mà WS4 không định nghĩa lại business/data rule."
    },
    "vi": {
      "title": "Hiển thị chỉ số đã duyệt, phạm vi và độ tin cậy dữ liệu",
      "inputs": "Hiển thị định nghĩa chỉ số, tập đối tượng, kỳ tính, độ bao phủ, độ mới và chất lượng dữ liệu đã chốt tại đúng nơi người dùng cần đánh giá con số.",
      "accept": "Người dùng hiểu ý nghĩa, phạm vi và độ tin cậy của số liệu; giao diện không định nghĩa lại quy tắc nghiệp vụ."
    }
  },
  "UX-03": {
    "original": {
      "title": "Triển khai Actual vs Plan, trend & comparison experience",
      "inputs": "Triển khai cách hiển thị Actual vs Plan, current vs prior, trend và comparison basis dựa trên logic so sánh đã chốt ở WS1. Kế hoạch cuốn chiếu: 4 ngày làm việc · độ khó Medium. Thực hiện sau hạng mục liền trước; T7/CN không tính.",
      "accept": "Mọi comparison hiển thị đúng baseline, timeframe và denominator đã duyệt; cùng một logic được áp dụng nhất quán xuyên dashboard."
    },
    "vi": {
      "title": "Trình bày thực tế, kế hoạch, xu hướng và so sánh",
      "inputs": "Triển khai cách hiển thị thực tế với kế hoạch, kỳ hiện tại với kỳ trước, xu hướng và mốc so sánh theo quy tắc đã chốt. Ước tính: 4 ngày làm việc; độ khó: trung bình. Thực hiện sau việc liền trước; không tính thứ Bảy, Chủ nhật.",
      "accept": "Mọi phép so sánh dùng đúng mốc chuẩn, khoảng thời gian và mẫu số đã duyệt; áp dụng thống nhất giữa các bảng điều khiển."
    }
  },
  "UX-04": {
    "original": {
      "title": "Thiết kế drill-down & evidence path",
      "inputs": "Thiết kế đường đi từ KPI tổng quan → breakdown → entity/record để người dùng kiểm chứng nguyên nhân phía sau số tổng.",
      "accept": "User drill tới evidence cần thiết mà không mất filter/time context."
    },
    "vi": {
      "title": "Thiết kế đường xem chi tiết và kiểm chứng số liệu",
      "inputs": "Thiết kế đường đi từ chỉ số tổng quan đến phân tích thành phần, đối tượng và bản ghi để kiểm chứng nguyên nhân phía sau số tổng.",
      "accept": "Người dùng xem được bằng chứng cần thiết mà vẫn giữ bộ lọc và kỳ đang xem."
    }
  },
  "UX-05": {
    "original": {
      "title": "Thiết lập global filters & context persistence",
      "inputs": "Chuẩn hóa global/local filter, selected state và cách giữ scope/time context khi user chuyển dashboard, đổi lens hoặc drill.",
      "accept": "Scope đang xem luôn rõ và được giữ hợp lý giữa các view; filter behavior không bị lặp hoặc reset ngoài ý muốn."
    },
    "vi": {
      "title": "Thiết lập bộ lọc chung và giữ ngữ cảnh khi chuyển trang",
      "inputs": "Chuẩn hóa bộ lọc chung, bộ lọc riêng, trạng thái lựa chọn và cách giữ phạm vi, kỳ tính khi chuyển trang hoặc xem sâu.",
      "accept": "Phạm vi đang xem luôn rõ; bộ lọc không bị lặp hoặc đặt lại ngoài ý muốn."
    }
  },
  "UX-06": {
    "original": {
      "title": "Thiết lập MVP access baseline",
      "inputs": "Thiết lập quyền truy cập tối thiểu để MVP/UAT an toàn: đúng nhóm được vào, dữ liệu nhạy cảm không public và scope cơ bản được kiểm soát. Kế hoạch cuốn chiếu: 3 ngày làm việc · độ khó Medium. Thực hiện sau hạng mục liền trước; T7/CN không tính.",
      "accept": "MVP đủ an toàn để UAT/pilot mà chưa kéo fine-grained access governance hoặc security architecture nâng cao vào core scope."
    },
    "vi": {
      "title": "Thiết lập quyền truy cập cơ bản cho phiên bản đầu",
      "inputs": "Thiết lập quyền tối thiểu: đúng người được vào, dữ liệu nhạy cảm không công khai và phạm vi truy cập cơ bản được kiểm soát. Ước tính: 3 ngày làm việc; độ khó: trung bình. Thực hiện sau việc liền trước; không tính thứ Bảy, Chủ nhật.",
      "accept": "Phiên bản đầu đủ điều kiện thử nghiệm, nghiệm thu; phần phân quyền nâng cao được đánh giá ở giai đoạn sau."
    }
  },
  "WF-01": {
    "original": {
      "title": "Theo dõi Headcount Actual vs Plan & Workforce Structure",
      "inputs": "Theo dõi Actual HC, Plan, delta và cơ cấu theo BU, region, role hoặc population trên cùng một baseline.",
      "accept": "User xác định nhanh nơi headcount lệch plan và cơ cấu nào tạo ra chênh lệch."
    },
    "vi": {
      "title": "Theo dõi nhân sự thực tế, kế hoạch và cơ cấu",
      "inputs": "Theo dõi số nhân sự thực tế, kế hoạch, chênh lệch và cơ cấu theo đơn vị kinh doanh, khu vực, vị trí hoặc tập đối tượng trên cùng mốc chuẩn.",
      "accept": "Người dùng xác định nhanh nơi lệch kế hoạch nhân sự và cơ cấu gây chênh lệch."
    }
  },
  "WF-02": {
    "original": {
      "title": "Phân tích Workforce Movement & Mix",
      "inputs": "Theo dõi joiner, leaver, internal movement và workforce mix để hiểu thay đổi headcount đến từ đâu.",
      "accept": "Biến động HC được giải thích theo movement type, population và thời gian."
    },
    "vi": {
      "title": "Phân tích biến động và cơ cấu nhân sự",
      "inputs": "Theo dõi nhân sự mới, nghỉ việc, điều chuyển nội bộ và cơ cấu để hiểu nguồn gốc thay đổi số lượng nhân sự.",
      "accept": "Biến động nhân sự được giải thích theo loại thay đổi, tập đối tượng và thời gian."
    }
  },
  "WF-03": {
    "original": {
      "title": "Phân tích Workload Demand vs Capacity",
      "inputs": "So sánh workload/demand thực tế với available capacity trên cùng grain để nhận diện nơi workload vượt hoặc chưa tận dụng hết nguồn lực. Kế hoạch cuốn chiếu: 6 ngày làm việc · độ khó High. Thực hiện sau hạng mục liền trước; T7/CN không tính.",
      "accept": "Demand–capacity imbalance được định lượng và drill xuống đúng team/role/market; không bị lẫn với staffing plan gap."
    },
    "vi": {
      "title": "Phân tích nhu cầu công việc và năng lực đáp ứng",
      "inputs": "So sánh khối lượng, nhu cầu công việc với nguồn lực khả dụng trên cùng mức chi tiết để nhận diện nơi quá tải hoặc chưa tận dụng hết nguồn lực. Ước tính: 6 ngày làm việc; độ khó: cao. Thực hiện sau việc liền trước; không tính thứ Bảy, Chủ nhật.",
      "accept": "Mất cân đối được định lượng và xem đến đúng nhóm, vị trí, thị trường; phân biệt với thiếu hụt so với kế hoạch nhân sự."
    }
  },
  "WF-04": {
    "original": {
      "title": "Theo dõi Staffing Coverage & Position Gap",
      "inputs": "Theo dõi staffing requirement/plan, filled/open position và coverage gap theo role/team/market cùng xu hướng theo thời gian. Kế hoạch cuốn chiếu: 4 ngày làm việc · độ khó Medium. Thực hiện sau hạng mục liền trước; T7/CN không tính.",
      "accept": "User biết staffing gap so với requirement tập trung ở đâu, quy mô bao nhiêu và đang cải thiện hay xấu đi."
    },
    "vi": {
      "title": "Theo dõi mức đáp ứng nhân sự và vị trí còn thiếu",
      "inputs": "Theo dõi nhu cầu, kế hoạch, vị trí đã đủ hoặc còn trống và mức thiếu hụt theo vị trí, nhóm, thị trường cùng xu hướng theo thời gian. Ước tính: 4 ngày làm việc; độ khó: trung bình. Thực hiện sau việc liền trước; không tính thứ Bảy, Chủ nhật.",
      "accept": "Người dùng biết nơi thiếu nhân sự, quy mô và xu hướng cải thiện hoặc xấu đi."
    }
  },
  "WF-05": {
    "original": {
      "title": "Phân tích Core Gap vs Transition Gap",
      "inputs": "Tách khoảng thiếu hụt mang tính cơ cấu khỏi gap tạm thời do tuyển dụng, onboarding hoặc movement đang diễn ra. Kế hoạch cuốn chiếu: 5 ngày làm việc · độ khó High. Thực hiện sau hạng mục liền trước; T7/CN không tính.",
      "accept": "User phân biệt được gap cần giải quyết dài hạn với gap chuyển tiếp có thể tự đóng theo pipeline hiện tại."
    },
    "vi": {
      "title": "Phân tích thiếu hụt cơ cấu và thiếu hụt chuyển tiếp",
      "inputs": "Tách thiếu hụt mang tính cơ cấu khỏi khoảng thiếu tạm thời do tuyển dụng, tiếp nhận nhân sự hoặc điều chuyển đang diễn ra. Ước tính: 5 ngày làm việc; độ khó: cao. Thực hiện sau việc liền trước; không tính thứ Bảy, Chủ nhật.",
      "accept": "Phân biệt được thiếu hụt cần giải quyết dài hạn và thiếu hụt chuyển tiếp có thể được bù từ nguồn hiện có."
    }
  },
  "WF-06": {
    "original": {
      "title": "Theo dõi Span of Control & Manager Coverage",
      "inputs": "Theo dõi span of control, manager coverage và distribution của team size để nhận diện cấu trúc quản lý bất thường. Kế hoạch cuốn chiếu: 4 ngày làm việc · độ khó Medium. Thực hiện sau hạng mục liền trước; T7/CN không tính.",
      "accept": "User locate được team quá rộng/quá hẹp hoặc thiếu manager coverage để review tiếp."
    },
    "vi": {
      "title": "Theo dõi phạm vi quản lý và mức bao phủ quản lý",
      "inputs": "Theo dõi số nhân viên mỗi quản lý, mức bao phủ người quản lý và phân bố quy mô nhóm để nhận diện cơ cấu bất thường. Ước tính: 4 ngày làm việc; độ khó: trung bình. Thực hiện sau việc liền trước; không tính thứ Bảy, Chủ nhật.",
      "accept": "Xác định được nhóm quá lớn, quá nhỏ hoặc thiếu người quản lý để rà soát tiếp."
    }
  },
  "TR-01": {
    "original": {
      "title": "Theo dõi Recruitment Demand & Request Status",
      "inputs": "Theo dõi tổng demand/request theo position, reason, area và trạng thái tuyển để biết khối lượng công việc đang mở. Kế hoạch cuốn chiếu: 3 ngày làm việc · độ khó Low-Medium. Thực hiện sau hạng mục liền trước; T7/CN không tính.",
      "accept": "User xác định được request volume, mix và trạng thái tuyển theo đúng scope."
    },
    "vi": {
      "title": "Theo dõi nhu cầu và trạng thái yêu cầu tuyển dụng",
      "inputs": "Theo dõi tổng nhu cầu, yêu cầu tuyển theo vị trí, lý do, khu vực và trạng thái để biết khối lượng đang mở. Ước tính: 3 ngày làm việc; độ khó: thấp đến trung bình. Thực hiện sau việc liền trước; không tính thứ Bảy, Chủ nhật.",
      "accept": "Người dùng xác định được số lượng, cơ cấu và trạng thái yêu cầu tuyển trong đúng phạm vi."
    }
  },
  "TR-02": {
    "original": {
      "title": "Theo dõi Recruitment Pipeline & Stage Conversion",
      "inputs": "Theo dõi volume và conversion qua các stage từ ứng tuyển đến onboard để locate nơi pipeline rơi nhiều nhất. Kế hoạch cuốn chiếu: 4 ngày làm việc · độ khó Medium. Thực hiện sau hạng mục liền trước; T7/CN không tính.",
      "accept": "User thấy pipeline state, conversion và backlog theo request/role/market."
    },
    "vi": {
      "title": "Theo dõi luồng ứng viên và tỷ lệ chuyển bước",
      "inputs": "Theo dõi số lượng, tỷ lệ chuyển qua các bước từ ứng tuyển đến nhận việc để tìm nơi mất ứng viên nhiều nhất. Ước tính: 4 ngày làm việc; độ khó: trung bình. Thực hiện sau việc liền trước; không tính thứ Bảy, Chủ nhật.",
      "accept": "Người dùng thấy trạng thái luồng ứng viên, tỷ lệ chuyển bước và lượng tồn theo yêu cầu, vị trí, thị trường."
    }
  },
  "TR-03": {
    "original": {
      "title": "Phân tích Time to Fill, Recruitment SLA/OTIF & Aging Bottleneck",
      "inputs": "Đo Time to Fill, Recruitment SLA/OTIF và aging tại từng stage/request để xác định điểm chậm kéo dài trong quy trình tuyển dụng. Kế hoạch cuốn chiếu: 5 ngày làm việc · độ khó Medium-High. Thực hiện sau hạng mục liền trước; T7/CN không tính.",
      "accept": "Late request và bottleneck tuyển dụng được tách rõ theo stage, aging band và population; không nhầm với Data SLA/Freshness."
    },
    "vi": {
      "title": "Phân tích thời gian tuyển, mức đúng hạn và điểm nghẽn",
      "inputs": "Đo thời gian lấp đầy vị trí, mức đáp ứng cam kết tuyển dụng, mức đúng hạn và thời gian chờ tại từng bước hoặc yêu cầu. Ước tính: 5 ngày làm việc; độ khó: trung bình đến cao. Thực hiện sau việc liền trước; không tính thứ Bảy, Chủ nhật.",
      "accept": "Yêu cầu trễ và điểm nghẽn được tách theo bước tuyển, nhóm thời gian chờ và tập đối tượng; phân biệt với thời hạn giao dữ liệu."
    }
  },
  "TR-04": {
    "original": {
      "title": "Theo dõi New Joiner Ramp-up",
      "inputs": "Theo dõi sau onboarding để biết nhân sự mới cần bao lâu đạt mức đóng góp kỳ vọng. Kế hoạch cuốn chiếu: 4 ngày làm việc · độ khó Medium-High. Thực hiện sau hạng mục liền trước; T7/CN không tính.",
      "accept": "Ramp-up được đo theo cohort/role với baseline và mốc đạt kỳ vọng rõ."
    },
    "vi": {
      "title": "Theo dõi thời gian nhân sự mới đạt mức kỳ vọng",
      "inputs": "Theo dõi sau nhận việc để biết nhân sự mới cần bao lâu đạt mức đóng góp kỳ vọng. Ước tính: 4 ngày làm việc; độ khó: trung bình đến cao. Thực hiện sau việc liền trước; không tính thứ Bảy, Chủ nhật.",
      "accept": "Thời gian đạt kỳ vọng được đo theo nhóm cùng kỳ tuyển, vị trí, mốc chuẩn và tiêu chí rõ."
    }
  },
  "TR-05": {
    "original": {
      "title": "Đánh giá Quality of Hire",
      "inputs": "Đánh giá chất lượng sau tuyển dựa trên retention, ramp-up và performance theo định nghĩa thống nhất. Kế hoạch cuốn chiếu: 6 ngày làm việc · độ khó High. Thực hiện sau hạng mục liền trước; T7/CN không tính.",
      "accept": "Quality of Hire có definition rõ và có thể so sánh theo cohort/role/market."
    },
    "vi": {
      "title": "Đánh giá chất lượng nhân sự sau tuyển dụng",
      "inputs": "Đánh giá chất lượng sau tuyển dựa trên tỷ lệ duy trì, thời gian đạt kỳ vọng và hiệu suất theo định nghĩa thống nhất. Ước tính: 6 ngày làm việc; độ khó: cao. Thực hiện sau việc liền trước; không tính thứ Bảy, Chủ nhật.",
      "accept": "Chất lượng sau tuyển có định nghĩa rõ và so sánh được theo nhóm cùng kỳ tuyển, vị trí, thị trường."
    }
  },
  "TR-06": {
    "original": {
      "title": "So sánh Recruitment Cohort, Position & Area",
      "inputs": "So sánh cohort, position, area hoặc period trên cùng basis để xác định nơi recruitment outcome khác biệt đáng chú ý. Kế hoạch cuốn chiếu: 3 ngày làm việc · độ khó Medium. Thực hiện sau hạng mục liền trước; T7/CN không tính.",
      "accept": "Benchmark dùng cùng denominator và giúp locate nhóm cần inspect tiếp."
    },
    "vi": {
      "title": "So sánh kết quả tuyển dụng theo nhóm, vị trí và khu vực",
      "inputs": "So sánh nhóm cùng kỳ tuyển, vị trí, khu vực hoặc kỳ báo cáo trên cùng cơ sở để tìm khác biệt đáng chú ý. Ước tính: 3 ngày làm việc; độ khó: trung bình. Thực hiện sau việc liền trước; không tính thứ Bảy, Chủ nhật.",
      "accept": "Mốc so sánh dùng cùng mẫu số và giúp xác định nhóm cần tìm hiểu thêm."
    }
  },
  "PG-01": {
    "original": {
      "title": "Theo dõi Attendance & Availability",
      "inputs": "Theo dõi attendance, availability và staffing presence để nhận diện exception và coverage issue. Kế hoạch cuốn chiếu: 3 ngày làm việc · độ khó Low-Medium. Thực hiện sau hạng mục liền trước; T7/CN không tính.",
      "accept": "User nhìn được attendance/availability state và nơi phát sinh exception."
    },
    "vi": {
      "title": "Theo dõi chấm công và mức sẵn sàng làm việc",
      "inputs": "Theo dõi chấm công, mức sẵn sàng và sự hiện diện nhân sự để nhận diện ngoại lệ và khoảng thiếu người. Ước tính: 3 ngày làm việc; độ khó: thấp đến trung bình. Thực hiện sau việc liền trước; không tính thứ Bảy, Chủ nhật.",
      "accept": "Người dùng thấy trạng thái chấm công, mức sẵn sàng và nơi phát sinh ngoại lệ."
    }
  },
  "PG-02": {
    "original": {
      "title": "Phân tích Absence, Late & Leave Pattern",
      "inputs": "Phân tích absence, late, leave và recurring pattern theo team/role/time để phân biệt issue đơn lẻ với pattern hệ thống. Kế hoạch cuốn chiếu: 4 ngày làm việc · độ khó Medium. Thực hiện sau hạng mục liền trước; T7/CN không tính.",
      "accept": "User locate được nhóm có pattern bất thường và mức độ lặp lại."
    },
    "vi": {
      "title": "Phân tích vắng mặt, đi trễ và nghỉ phép",
      "inputs": "Phân tích vắng mặt, đi trễ, nghỉ phép và xu hướng lặp theo nhóm, vị trí, thời gian để phân biệt lỗi đơn lẻ với vấn đề hệ thống. Ước tính: 4 ngày làm việc; độ khó: trung bình. Thực hiện sau việc liền trước; không tính thứ Bảy, Chủ nhật.",
      "accept": "Xác định được nhóm có biểu hiện bất thường và mức độ tái diễn."
    }
  },
  "PG-03": {
    "original": {
      "title": "Phân tích Working Hours & Overtime",
      "inputs": "Theo dõi working hours, overtime và distribution theo population để nhận diện workload pressure hoặc usage bất thường. Kế hoạch cuốn chiếu: 4 ngày làm việc · độ khó Medium. Thực hiện sau hạng mục liền trước; T7/CN không tính.",
      "accept": "User so sánh được working-hours pattern giữa các nhóm trên cùng denominator."
    },
    "vi": {
      "title": "Phân tích giờ làm việc và tăng ca",
      "inputs": "Theo dõi giờ làm, tăng ca và phân bố theo tập đối tượng để nhận diện áp lực công việc hoặc sử dụng thời gian bất thường. Ước tính: 4 ngày làm việc; độ khó: trung bình. Thực hiện sau việc liền trước; không tính thứ Bảy, Chủ nhật.",
      "accept": "So sánh được xu hướng giờ làm giữa các nhóm trên cùng mẫu số."
    }
  },
  "PG-04": {
    "original": {
      "title": "Theo dõi People Policy & Compliance Exceptions",
      "inputs": "Theo dõi people-policy exception, mức độ tuân thủ và breakdown theo scope nghiệp vụ để phân biệt business exception với data-quality issue. Kế hoạch cuốn chiếu: 5 ngày làm việc · độ khó Medium-High. Thực hiện sau hạng mục liền trước; T7/CN không tính.",
      "accept": "People policy exception được phân loại, có severity/context và có thể drill tới nhóm liên quan."
    },
    "vi": {
      "title": "Theo dõi tuân thủ và ngoại lệ chính sách nhân sự",
      "inputs": "Theo dõi ngoại lệ chính sách, mức tuân thủ và phân tích theo phạm vi nghiệp vụ để phân biệt ngoại lệ vận hành với lỗi chất lượng dữ liệu. Ước tính: 5 ngày làm việc; độ khó: trung bình đến cao. Thực hiện sau việc liền trước; không tính thứ Bảy, Chủ nhật.",
      "accept": "Ngoại lệ chính sách được phân loại, có mức ảnh hưởng, bối cảnh và có thể xem đến nhóm liên quan."
    }
  },
  "PG-05": {
    "original": {
      "title": "Theo dõi People Reliability & Repeat Exceptions",
      "inputs": "Theo dõi deterioration, persistence, recovery và repeated people-governance exception theo thời gian. Kế hoạch cuốn chiếu: 5 ngày làm việc · độ khó High. Thực hiện sau hạng mục liền trước; T7/CN không tính.",
      "accept": "User biết people issue mới xuất hiện, kéo dài hay đang hồi phục mà không nhầm với data incident."
    },
    "vi": {
      "title": "Theo dõi mức ổn định và ngoại lệ tái diễn",
      "inputs": "Theo dõi xu hướng xấu đi, kéo dài, phục hồi và ngoại lệ tuân thủ tái diễn theo thời gian. Ước tính: 5 ngày làm việc; độ khó: cao. Thực hiện sau việc liền trước; không tính thứ Bảy, Chủ nhật.",
      "accept": "Biết vấn đề nhân sự mới xuất hiện, kéo dài hay đang phục hồi; phân biệt với sự cố dữ liệu."
    }
  },
  "PG-06": {
    "original": {
      "title": "Theo dõi People Governance Case Follow-up & Closure",
      "inputs": "Tổng hợp people-governance case cần follow-up và theo dõi trạng thái xử lý/đóng issue ở mức dashboard. Kế hoạch cuốn chiếu: 4 ngày làm việc · độ khó Medium-High. Thực hiện sau hạng mục liền trước; T7/CN không tính.",
      "accept": "User biết people-governance case nào còn mở, thuộc scope nào và đã được xử lý tới đâu; data incident vẫn thuộc WS6."
    },
    "vi": {
      "title": "Theo dõi xử lý và đóng vụ việc nhân sự",
      "inputs": "Tổng hợp vụ việc nhân sự cần theo dõi và trạng thái xử lý, đóng vụ việc trên bảng điều khiển. Ước tính: 4 ngày làm việc; độ khó: trung bình đến cao. Thực hiện sau việc liền trước; không tính thứ Bảy, Chủ nhật.",
      "accept": "Biết vụ việc còn mở, phạm vi và mức xử lý; sự cố dữ liệu được quản lý riêng trong nhóm vận hành."
    }
  },
  "RW-01": {
    "original": {
      "title": "Theo dõi Total People Cost & Cost Structure",
      "inputs": "Theo dõi tổng People Cost, cost structure và biến động theo population/period. Kế hoạch cuốn chiếu: 4 ngày làm việc · độ khó Medium. Thực hiện sau hạng mục liền trước; T7/CN không tính.",
      "accept": "User thấy cost baseline và nơi chi phí thay đổi đáng chú ý."
    },
    "vi": {
      "title": "Theo dõi tổng chi phí nhân sự và cơ cấu chi phí",
      "inputs": "Theo dõi tổng chi phí nhân sự, cơ cấu và biến động theo tập đối tượng, kỳ báo cáo. Ước tính: 4 ngày làm việc; độ khó: trung bình. Thực hiện sau việc liền trước; không tính thứ Bảy, Chủ nhật.",
      "accept": "Người dùng thấy mốc chi phí chuẩn và nơi thay đổi đáng chú ý."
    }
  },
  "RW-02": {
    "original": {
      "title": "Phân tích Pay & Incentive Composition",
      "inputs": "Phân tích salary, incentive và các thành phần reward theo population, level hoặc period. Kế hoạch cuốn chiếu: 4 ngày làm việc · độ khó Medium. Thực hiện sau hạng mục liền trước; T7/CN không tính.",
      "accept": "User hiểu reward mix và distribution trước khi đánh giá effectiveness/fairness."
    },
    "vi": {
      "title": "Phân tích cơ cấu lương và thưởng",
      "inputs": "Phân tích lương, thưởng và các thành phần đãi ngộ theo tập đối tượng, cấp bậc hoặc kỳ báo cáo. Ước tính: 4 ngày làm việc; độ khó: trung bình. Thực hiện sau việc liền trước; không tính thứ Bảy, Chủ nhật.",
      "accept": "Hiểu cơ cấu và phân bố đãi ngộ trước khi đánh giá hiệu quả, tính công bằng."
    }
  },
  "RW-03": {
    "original": {
      "title": "Đánh giá Incentive Effectiveness: Spend vs Outcome",
      "inputs": "Đánh giá incentive spend so với people/business outcome trên cùng scope để xem chi phí tạo ra kết quả tương xứng hay không. Kế hoạch cuốn chiếu: 5 ngày làm việc · độ khó High. Thực hiện sau hạng mục liền trước; T7/CN không tính.",
      "accept": "User compare incentive spend với outcome trên cùng denominator/context và locate nhóm có hiệu quả khác biệt."
    },
    "vi": {
      "title": "Đánh giá hiệu quả thưởng theo chi phí và kết quả",
      "inputs": "Đánh giá chi phí thưởng so với kết quả nhân sự, kinh doanh trên cùng phạm vi để xem mức chi có tương xứng với kết quả. Ước tính: 5 ngày làm việc; độ khó: cao. Thực hiện sau việc liền trước; không tính thứ Bảy, Chủ nhật.",
      "accept": "So sánh chi phí thưởng với kết quả trên cùng mẫu số, bối cảnh và xác định nhóm có hiệu quả khác biệt."
    }
  },
  "RW-04": {
    "original": {
      "title": "Phân tích Cost-to-Performance",
      "inputs": "Kết nối People Cost với performance/output trên cùng grain và population. Kế hoạch cuốn chiếu: 5 ngày làm việc · độ khó High. Thực hiện sau hạng mục liền trước; T7/CN không tính.",
      "accept": "User locate nơi cost và outcome lệch nhau để điều tra tiếp."
    },
    "vi": {
      "title": "Phân tích chi phí so với hiệu suất",
      "inputs": "Kết nối chi phí nhân sự với hiệu suất, sản lượng trên cùng mức chi tiết và tập đối tượng. Ước tính: 5 ngày làm việc; độ khó: cao. Thực hiện sau việc liền trước; không tính thứ Bảy, Chủ nhật.",
      "accept": "Xác định nơi chi phí và kết quả lệch nhau để điều tra tiếp."
    }
  },
  "RW-05": {
    "original": {
      "title": "Đánh giá Reward Differentiation vs Performance",
      "inputs": "Kiểm tra reward differentiation giữa các performance band/population có phản ánh performance framework đã thống nhất hay không. Kế hoạch cuốn chiếu: 5 ngày làm việc · độ khó High. Thực hiện sau hạng mục liền trước; T7/CN không tính.",
      "accept": "User thấy mức độ phân hóa reward theo performance band/population; không trùng với bài toán spend-to-outcome của Incentive Effectiveness."
    },
    "vi": {
      "title": "Đánh giá phân hóa đãi ngộ theo hiệu suất",
      "inputs": "Kiểm tra mức phân hóa đãi ngộ giữa các nhóm hiệu suất, tập đối tượng theo khung đánh giá đã thống nhất. Ước tính: 5 ngày làm việc; độ khó: cao. Thực hiện sau việc liền trước; không tính thứ Bảy, Chủ nhật.",
      "accept": "Thấy mức phân hóa đãi ngộ theo nhóm hiệu suất; phân biệt với bài toán hiệu quả chi thưởng."
    }
  },
  "RW-06": {
    "original": {
      "title": "Đánh giá Reward Competitiveness & Fairness",
      "inputs": "So sánh reward với benchmark/peer group phù hợp và kiểm tra fairness theo population khi dữ liệu đủ tin cậy. Kế hoạch cuốn chiếu: 6 ngày làm việc · độ khó High. Thực hiện sau hạng mục liền trước; T7/CN không tính.",
      "accept": "Competitiveness và fairness concern được locate với comparison basis rõ."
    },
    "vi": {
      "title": "Đánh giá tính cạnh tranh và công bằng của đãi ngộ",
      "inputs": "So sánh đãi ngộ với mốc chuẩn, nhóm tương đồng phù hợp và kiểm tra tính công bằng khi dữ liệu đủ tin cậy. Ước tính: 6 ngày làm việc; độ khó: cao. Thực hiện sau việc liền trước; không tính thứ Bảy, Chủ nhật.",
      "accept": "Nhận diện vấn đề cạnh tranh, công bằng với cơ sở so sánh rõ ràng."
    }
  },
  "CP-01": {
    "original": {
      "title": "Theo dõi Performance KPI & Distribution",
      "inputs": "Thiết lập performance baseline, KPI và distribution theo team/role/population. Kế hoạch cuốn chiếu: 4 ngày làm việc · độ khó Medium. Thực hiện sau hạng mục liền trước; T7/CN không tính.",
      "accept": "User nhìn được performance state, spread và nhóm cần inspect tiếp."
    },
    "vi": {
      "title": "Theo dõi chỉ số và phân bố hiệu suất",
      "inputs": "Thiết lập mốc hiệu suất chuẩn, chỉ số và phân bố theo nhóm, vị trí, tập đối tượng. Ước tính: 4 ngày làm việc; độ khó: trung bình. Thực hiện sau việc liền trước; không tính thứ Bảy, Chủ nhật.",
      "accept": "Người dùng thấy tình hình hiệu suất, độ phân tán và nhóm cần tìm hiểu thêm."
    }
  },
  "CP-02": {
    "original": {
      "title": "Phân tích Skill Gap theo Role / Team",
      "inputs": "Xác định capability/skill gap theo role, team hoặc population so với requirement đã chốt. Kế hoạch cuốn chiếu: 5 ngày làm việc · độ khó High. Thực hiện sau hạng mục liền trước; T7/CN không tính.",
      "accept": "Skill gap được định lượng và locate theo đúng role/team."
    },
    "vi": {
      "title": "Phân tích thiếu hụt kỹ năng theo vị trí và nhóm",
      "inputs": "Xác định chênh lệch năng lực, kỹ năng so với yêu cầu đã chốt theo vị trí, nhóm hoặc tập đối tượng. Ước tính: 5 ngày làm việc; độ khó: cao. Thực hiện sau việc liền trước; không tính thứ Bảy, Chủ nhật.",
      "accept": "Thiếu hụt kỹ năng được định lượng và xác định theo đúng vị trí, nhóm."
    }
  },
  "CP-03": {
    "original": {
      "title": "Theo dõi Development Activity & Coverage",
      "inputs": "Theo dõi development intervention, participation và coverage theo capability gap/đối tượng mục tiêu. Kế hoạch cuốn chiếu: 4 ngày làm việc · độ khó Medium. Thực hiện sau hạng mục liền trước; T7/CN không tính.",
      "accept": "User biết intervention nào đang chạy và population nào đã/chưa được cover."
    },
    "vi": {
      "title": "Theo dõi hoạt động phát triển và mức bao phủ",
      "inputs": "Theo dõi hoạt động phát triển, mức tham gia và độ bao phủ theo khoảng thiếu năng lực, đối tượng mục tiêu. Ước tính: 4 ngày làm việc; độ khó: trung bình. Thực hiện sau việc liền trước; không tính thứ Bảy, Chủ nhật.",
      "accept": "Biết hoạt động đang thực hiện và nhóm nào đã hoặc chưa được tham gia."
    }
  },
  "CP-04": {
    "original": {
      "title": "Đo Development Outcome & Effectiveness",
      "inputs": "Đo thay đổi sau intervention so với baseline thay vì chỉ báo participation. Kế hoạch cuốn chiếu: 6 ngày làm việc · độ khó High. Thực hiện sau hạng mục liền trước; T7/CN không tính.",
      "accept": "Outcome được so với baseline/timeframe rõ và có thể drill theo cohort."
    },
    "vi": {
      "title": "Đo kết quả và hiệu quả hoạt động phát triển",
      "inputs": "Đo thay đổi sau hoạt động phát triển so với mốc ban đầu, thay vì chỉ báo cáo số người tham gia. Ước tính: 6 ngày làm việc; độ khó: cao. Thực hiện sau việc liền trước; không tính thứ Bảy, Chủ nhật.",
      "accept": "Kết quả được so với mốc chuẩn, khoảng thời gian rõ và xem được theo nhóm cùng kỳ."
    }
  },
  "CP-05": {
    "original": {
      "title": "Phân tích Career Mobility & Talent Readiness",
      "inputs": "Phân tích internal mobility và readiness dựa trên role, skill và performance nhất quán. Kế hoạch cuốn chiếu: 6 ngày làm việc · độ khó High. Thực hiện sau hạng mục liền trước; T7/CN không tính.",
      "accept": "User thấy movement/readiness theo role hoặc population mà không cần prediction."
    },
    "vi": {
      "title": "Phân tích điều chuyển và mức sẵn sàng phát triển",
      "inputs": "Phân tích điều chuyển nội bộ, mức sẵn sàng dựa trên vị trí, kỹ năng và hiệu suất nhất quán. Ước tính: 6 ngày làm việc; độ khó: cao. Thực hiện sau việc liền trước; không tính thứ Bảy, Chủ nhật.",
      "accept": "Thấy mức điều chuyển, sẵn sàng theo vị trí hoặc tập đối tượng mà chưa cần mô hình dự báo."
    }
  },
  "CP-06": {
    "original": {
      "title": "So sánh Performance Cohort & Team Benchmark",
      "inputs": "So sánh performance cohort, team, role hoặc period trên cùng basis để locate nhóm khác biệt đáng chú ý. Kế hoạch cuốn chiếu: 4 ngày làm việc · độ khó Medium. Thực hiện sau hạng mục liền trước; T7/CN không tính.",
      "accept": "Benchmark giúp xác định nhóm cần diagnosis tiếp mà chưa dùng predictive scoring."
    },
    "vi": {
      "title": "So sánh hiệu suất theo nhóm và mốc chuẩn",
      "inputs": "So sánh nhóm cùng kỳ, nhóm làm việc, vị trí hoặc kỳ báo cáo trên cùng cơ sở để tìm khác biệt đáng chú ý. Ước tính: 4 ngày làm việc; độ khó: trung bình. Thực hiện sau việc liền trước; không tính thứ Bảy, Chủ nhật.",
      "accept": "Mốc so sánh giúp xác định nhóm cần phân tích thêm mà chưa dùng điểm dự báo."
    }
  },
  "UX-07": {
    "original": {
      "title": "Cross-dashboard QA & UAT Sign-off",
      "inputs": "Kiểm thử end-to-end 5 dashboard về số liệu, interaction, desktop responsiveness, access baseline và critical user flow trước khi bàn giao sang WS5. Kế hoạch cuốn chiếu: 7 ngày làm việc · độ khó High. Thực hiện sau hạng mục liền trước; T7/CN không tính.",
      "accept": "Critical defect được xử lý; dashboard suite đạt QA/UAT sign-off và đủ ổn định để chuyển sang Pilot & Product Validation."
    },
    "vi": {
      "title": "Kiểm thử liên trang và nghiệm thu người dùng",
      "inputs": "Kiểm thử toàn bộ năm bảng điều khiển về số liệu, tương tác, hiển thị trên máy tính, quyền truy cập cơ bản và luồng sử dụng trọng yếu. Ước tính: 7 ngày làm việc; độ khó: cao. Thực hiện sau việc liền trước; không tính thứ Bảy, Chủ nhật.",
      "accept": "Lỗi nghiêm trọng đã được xử lý; bộ bảng điều khiển được nghiệm thu và đủ ổn định để thử nghiệm sử dụng thực tế."
    }
  },
  "PV-01": {
    "original": {
      "title": "Chốt nhóm người dùng, scenario & lịch pilot",
      "inputs": "Chọn người dùng đại diện, tình huống công việc thật, lịch và owner tổng hợp phản hồi.",
      "accept": "Pilot có đúng người, đúng bối cảnh và lịch thực hiện rõ."
    },
    "vi": {
      "title": "Chốt người dùng, tình huống và lịch thử nghiệm",
      "inputs": "Chọn người dùng đại diện, tình huống công việc thật, lịch và người tổng hợp phản hồi.",
      "accept": "Đợt thử nghiệm có đúng người, đúng bối cảnh và lịch thực hiện rõ."
    }
  },
  "PV-02": {
    "original": {
      "title": "Chuẩn bị hướng dẫn & kịch bản sử dụng pilot",
      "inputs": "Chuẩn bị scenario, hướng dẫn ngắn và tiêu chí quan sát để user tự thực hiện các task chính.",
      "accept": "User có thể tham gia pilot mà không phụ thuộc vào demo trực tiếp."
    },
    "vi": {
      "title": "Chuẩn bị hướng dẫn và kịch bản sử dụng thử",
      "inputs": "Chuẩn bị tình huống, hướng dẫn ngắn và tiêu chí quan sát để người dùng tự thực hiện công việc chính.",
      "accept": "Người dùng tham gia thử nghiệm mà không phụ thuộc buổi trình diễn trực tiếp."
    }
  },
  "PV-03": {
    "original": {
      "title": "Thiết lập feedback, issue & data error reporting",
      "inputs": "Chuẩn hóa kênh feedback, trang/KPI/filter, expected result, severity và bằng chứng cần gửi.",
      "accept": "Feedback đủ thông tin để tái hiện và phân loại thành product/data issue."
    },
    "vi": {
      "title": "Thiết lập kênh phản hồi và báo lỗi dữ liệu",
      "inputs": "Thống nhất kênh phản hồi, trang, chỉ số, bộ lọc, kết quả kỳ vọng, mức ảnh hưởng và bằng chứng cần gửi.",
      "accept": "Phản hồi đủ thông tin để tái hiện, phân loại thành lỗi sản phẩm hoặc dữ liệu."
    }
  },
  "PV-04": {
    "original": {
      "title": "Theo dõi sử dụng thực tế trong pilot",
      "inputs": "Theo dõi user/scenario nào được dùng, task nào hoàn tất hoặc bị bỏ dở và điểm friction chính.",
      "accept": "Có evidence hành vi thực tế thay vì chỉ dựa trên phản hồi cảm tính."
    },
    "vi": {
      "title": "Theo dõi việc sử dụng thực tế trong thử nghiệm",
      "inputs": "Theo dõi người dùng, tình huống được sử dụng, công việc hoàn tất hoặc bỏ dở và điểm gây khó khăn chính.",
      "accept": "Có bằng chứng hành vi thực tế thay vì chỉ dựa trên phản hồi cảm tính."
    }
  },
  "PV-05": {
    "original": {
      "title": "Đánh giá usability, usefulness & adoption",
      "inputs": "Kết hợp usage evidence và phản hồi định tính để đánh giá mức hữu ích trong công việc.",
      "accept": "Biết phần nào nên giữ, sửa hoặc bỏ và vì sao."
    },
    "vi": {
      "title": "Đánh giá tính dễ dùng, hữu ích và mức sử dụng",
      "inputs": "Kết hợp bằng chứng sử dụng và phản hồi định tính để đánh giá mức hữu ích trong công việc.",
      "accept": "Biết phần nên giữ, sửa hoặc bỏ và lý do."
    }
  },
  "PV-06": {
    "original": {
      "title": "Tổng hợp issue & ưu tiên backlog V1",
      "inputs": "Gom issue theo impact, severity, frequency và mức bắt buộc; phân loại keep/fix/defer.",
      "accept": "Backlog V1 có thứ tự ưu tiên và rationale rõ."
    },
    "vi": {
      "title": "Tổng hợp vấn đề và ưu tiên danh sách cải tiến",
      "inputs": "Gom vấn đề theo tác động, mức nghiêm trọng, tần suất và tính bắt buộc; phân loại giữ, sửa hoặc hoãn.",
      "accept": "Danh sách cải tiến cho phiên bản vận hành đầu tiên có thứ tự ưu tiên và lý do rõ."
    }
  },
  "PV-07": {
    "original": {
      "title": "Triển khai critical improvements sau pilot",
      "inputs": "Triển khai các cải tiến bắt buộc cho V1 và kiểm tra lại scenario bị ảnh hưởng.",
      "accept": "Critical issues được xử lý trước khi chốt V1."
    },
    "vi": {
      "title": "Triển khai cải tiến trọng yếu sau thử nghiệm",
      "inputs": "Thực hiện cải tiến bắt buộc cho phiên bản vận hành đầu tiên và kiểm tra lại tình huống bị ảnh hưởng.",
      "accept": "Vấn đề nghiêm trọng được xử lý trước khi chốt phiên bản vận hành."
    }
  },
  "PV-08": {
    "original": {
      "title": "Nghiệm thu pilot & chốt phạm vi V1",
      "inputs": "Review kết quả pilot, bản cải tiến, issue còn lại và phạm vi vận hành V1.",
      "accept": "Có quyết định rõ phần nào vào V1, phần nào hoãn và lý do."
    },
    "vi": {
      "title": "Nghiệm thu thử nghiệm và chốt phạm vi vận hành",
      "inputs": "Rà soát kết quả thử nghiệm, bản cải tiến, vấn đề còn lại và phạm vi phiên bản vận hành đầu tiên.",
      "accept": "Có quyết định rõ phần đưa vào vận hành, phần hoãn và lý do."
    }
  },
  "OP-01": {
    "original": {
      "title": "Chốt operating model, ownership & support model V1",
      "inputs": "Chốt owner, handover, cadence, escalation, support channel và trách nhiệm BA/BI/Operation.",
      "accept": "Có operating agreement đủ rõ để V1 vận hành không phụ thuộc trao đổi ad-hoc."
    },
    "vi": {
      "title": "Chốt cách vận hành, người phụ trách và hỗ trợ",
      "inputs": "Chốt người phụ trách, nội dung bàn giao, lịch vận hành, cách chuyển xử lý và kênh hỗ trợ; một người có thể đảm nhận nhiều vai trò.",
      "accept": "Có thỏa thuận vận hành rõ để phiên bản đầu không phụ thuộc trao đổi phát sinh."
    }
  },
  "OP-02": {
    "original": {
      "title": "Vận hành scheduled data refresh & source delivery",
      "inputs": "Vận hành lịch nhận source, refresh, validation sau cập nhật và xử lý trường hợp delivery trễ/thiếu.",
      "accept": "Data refresh chạy theo cadence có thể dự đoán và có owner xử lý lỗi."
    },
    "vi": {
      "title": "Vận hành lịch nhận nguồn và cập nhật dữ liệu",
      "inputs": "Vận hành lịch nhận dữ liệu nguồn, cập nhật, kiểm tra sau cập nhật và xử lý trường hợp giao trễ hoặc thiếu.",
      "accept": "Dữ liệu cập nhật theo lịch dự đoán được và có người xử lý lỗi."
    }
  },
  "OP-03": {
    "original": {
      "title": "Thiết lập Continuous Data Health Monitoring",
      "inputs": "Theo dõi freshness, completeness, validity, logic integrity và reconciliation theo từng source/kỳ.",
      "accept": "Hệ thống phát hiện sớm data chưa cập nhật, thiếu, sai logic hoặc lệch source."
    },
    "vi": {
      "title": "Thiết lập giám sát chất lượng dữ liệu liên tục",
      "inputs": "Theo dõi độ mới, đầy đủ, hợp lệ, tính nhất quán quy tắc và kết quả đối soát theo nguồn, kỳ.",
      "accept": "Phát hiện sớm dữ liệu chưa cập nhật, thiếu, sai quy tắc hoặc lệch nguồn."
    }
  },
  "OP-04": {
    "original": {
      "title": "Thiết lập Data Incident & Exception Management",
      "inputs": "Biến signal data health thành incident có impacted KPI/dataset, root cause, severity, owner, status và resolution.",
      "accept": "Mỗi data incident có đường xử lý và trạng thái đóng rõ."
    },
    "vi": {
      "title": "Thiết lập quản lý sự cố và ngoại lệ dữ liệu",
      "inputs": "Chuyển cảnh báo chất lượng thành sự cố có chỉ số, bộ dữ liệu bị ảnh hưởng, nguyên nhân, mức nghiêm trọng, người phụ trách và cách xử lý.",
      "accept": "Mỗi sự cố dữ liệu có đường xử lý và trạng thái đóng rõ."
    }
  },
  "OP-05": {
    "original": {
      "title": "Thiết lập Release & Change Management",
      "inputs": "Quản lý scope version, impact KPI, test, approval, communication và rollback khi thay đổi.",
      "accept": "Thay đổi có truy vết và không làm gián đoạn vận hành ngoài kiểm soát."
    },
    "vi": {
      "title": "Thiết lập quản lý phát hành và thay đổi",
      "inputs": "Quản lý phạm vi phiên bản, ảnh hưởng đến chỉ số, kiểm thử, phê duyệt, thông báo và khôi phục khi thay đổi.",
      "accept": "Thay đổi có truy vết và không gây gián đoạn vận hành ngoài kiểm soát."
    }
  },
  "OP-06": {
    "original": {
      "title": "Thiết lập Product Support & Incident Handling",
      "inputs": "Thiết lập channel, priority, SLA phản hồi và phân biệt product issue với data issue.",
      "accept": "Mỗi issue tới đúng owner và có thời gian xử lý kỳ vọng."
    },
    "vi": {
      "title": "Thiết lập hỗ trợ sử dụng và xử lý sự cố",
      "inputs": "Thiết lập kênh hỗ trợ, độ ưu tiên, thời hạn phản hồi và cách phân biệt lỗi sản phẩm với lỗi dữ liệu.",
      "accept": "Mỗi vấn đề đến đúng người phụ trách và có thời gian xử lý kỳ vọng."
    }
  },
  "OP-07": {
    "original": {
      "title": "Tích hợp BI vào operating cadence & theo dõi adoption",
      "inputs": "Đưa BI vào meeting/process thật; xác định người xem, người giải thích, người hành động và theo dõi mức sử dụng.",
      "accept": "BI trở thành một phần của nhịp vận hành thay vì chỉ là báo cáo đã phát hành."
    },
    "vi": {
      "title": "Đưa bảng điều khiển vào nhịp vận hành thực tế",
      "inputs": "Đưa bảng điều khiển vào cuộc họp, quy trình thật; xác định người xem, giải thích, hành động và theo dõi mức sử dụng.",
      "accept": "Bảng điều khiển trở thành một phần của vận hành thay vì chỉ là báo cáo đã phát hành."
    }
  },
  "EX-01": {
    "original": {
      "title": "Xác định domain & use case ưu tiên để mở rộng",
      "inputs": "Tổng hợp user need, business value, data readiness, adoption evidence, effort và owner để xác định nhánh thông tin nên mở rộng trước.",
      "accept": "Có danh sách domain/use case ưu tiên với rationale rõ; các nhánh phức tạp chưa đủ evidence được chủ động defer."
    },
    "vi": {
      "title": "Xác định mảng nghiệp vụ và nhu cầu ưu tiên mở rộng",
      "inputs": "Tổng hợp nhu cầu, giá trị nghiệp vụ, độ sẵn sàng dữ liệu, bằng chứng sử dụng, công sức và người phụ trách để xếp ưu tiên mở rộng.",
      "accept": "Có danh sách mảng, nhu cầu ưu tiên với lý do rõ; nhánh phức tạp chưa đủ bằng chứng được chủ động hoãn."
    }
  },
  "EX-02": {
    "original": {
      "title": "Mở rộng dashboard sang các domain ưu tiên",
      "inputs": "Mở rộng KPI, breakdown, comparison và drill-down cho các domain đã chứng minh user need và data readiness.",
      "accept": "Mỗi domain mới bổ sung information value rõ và có thể trace về trusted data/source trước khi scale tiếp."
    },
    "vi": {
      "title": "Mở rộng bảng điều khiển sang mảng nghiệp vụ ưu tiên",
      "inputs": "Mở rộng chỉ số, phân tích thành phần, so sánh và xem chi tiết cho các mảng đã chứng minh nhu cầu và độ sẵn sàng dữ liệu.",
      "accept": "Mỗi mảng mới bổ sung giá trị thông tin rõ và truy được về nguồn tin cậy trước khi mở rộng tiếp."
    }
  },
  "EX-03": {
    "original": {
      "title": "Thử nghiệm Advanced / Cross-domain Diagnostic",
      "inputs": "Thử nghiệm cross-domain contribution analysis, multi-signal driver exploration, root-cause evidence và issue prioritization vượt ra ngoài các diagnostic lens cơ bản đã có trong WS4.",
      "accept": "Advanced diagnostic giảm effort điều tra trên nhiều domain/signal và chỉ được giữ khi tạo thêm value rõ so với core dashboard analytics; không overclaim causality."
    },
    "vi": {
      "title": "Thử nghiệm phân tích chuyên sâu giữa các mảng",
      "inputs": "Thử phân tích đóng góp giữa các mảng, khám phá nhiều tín hiệu, bằng chứng nguyên nhân và ưu tiên vấn đề vượt phạm vi phân tích cơ bản.",
      "accept": "Phân tích giảm công điều tra, tạo thêm giá trị rõ và không kết luận quan hệ nhân quả khi chưa đủ bằng chứng."
    }
  },
  "EX-04": {
    "original": {
      "title": "Thiết kế trải nghiệm theo vai trò người dùng",
      "inputs": "Điều chỉnh entry point, information priority và default view theo nhóm người dùng nhưng vẫn dùng chung KPI definition và dataset.",
      "accept": "Mỗi role nhìn thấy thông tin phù hợp với task mà chưa cần tạo security architecture phức tạp hoặc nhiều phiên bản số liệu."
    },
    "vi": {
      "title": "Thiết kế trải nghiệm theo vai trò người dùng",
      "inputs": "Điều chỉnh điểm bắt đầu, thứ tự thông tin và chế độ xem mặc định theo nhóm người dùng; dùng chung định nghĩa chỉ số và bộ dữ liệu.",
      "accept": "Mỗi vai trò thấy thông tin phù hợp với công việc mà chưa tạo nhiều phiên bản số liệu hoặc phân quyền quá phức tạp."
    }
  },
  "EX-05": {
    "original": {
      "title": "Đánh giá nhu cầu evolve thành application / workflow",
      "inputs": "Đánh giá các nhu cầu input, tracker, approval, assignment, file upload hoặc workflow mà dashboard không phục vụ hiệu quả.",
      "accept": "Có kết luận rõ use case nào vẫn phù hợp dashboard và use case nào cần application/workflow riêng."
    },
    "vi": {
      "title": "Đánh giá nhu cầu phát triển thành ứng dụng vận hành",
      "inputs": "Đánh giá nhu cầu nhập liệu, theo dõi, phê duyệt, giao việc, tải tệp và quy trình mà bảng điều khiển chưa phục vụ hiệu quả.",
      "accept": "Xác định rõ nhu cầu phù hợp bảng điều khiển và nhu cầu cần ứng dụng, quy trình riêng."
    }
  },
  "EX-06": {
    "original": {
      "title": "Thiết lập access governance & phân quyền nâng cao",
      "inputs": "Đánh giá và thiết kế role scope, row-level access, dữ liệu nhạy cảm, approval/access lifecycle và audit requirement khi nhu cầu sử dụng đã rõ.",
      "accept": "Advanced permission chỉ được triển khai cho scope có business need rõ, security rule explainable và ownership vận hành xác định."
    },
    "vi": {
      "title": "Thiết lập quản trị truy cập và phân quyền nâng cao",
      "inputs": "Thiết kế phạm vi vai trò, quyền theo dòng, dữ liệu nhạy cảm, vòng đời cấp quyền, phê duyệt và nhật ký khi nhu cầu đã rõ.",
      "accept": "Chỉ phân quyền nâng cao cho phạm vi có nhu cầu rõ, quy tắc dễ giải thích và người vận hành xác định."
    }
  },
  "EX-07": {
    "original": {
      "title": "Thiết lập proactive alerts & information delivery",
      "inputs": "Thử nghiệm alert/scheduled delivery theo exception, threshold, recipient, frequency và channel sau khi monitoring và access rule đã đủ ổn định.",
      "accept": "Thông tin đến đúng người, đúng scope, đúng thời điểm; hạn chế alert fatigue và luôn có đường quay lại evidence trên dashboard."
    },
    "vi": {
      "title": "Thiết lập cảnh báo chủ động và gửi thông tin định kỳ",
      "inputs": "Thử cảnh báo, gửi định kỳ theo ngoại lệ, ngưỡng, người nhận, tần suất và kênh sau khi giám sát, quy tắc truy cập ổn định.",
      "accept": "Thông tin đến đúng người, phạm vi, thời điểm; tránh quá nhiều cảnh báo và có đường về bằng chứng trên bảng điều khiển."
    }
  },
  "EX-08": {
    "original": {
      "title": "Đánh giá & pilot platform capability nâng cao",
      "inputs": "Chọn use case cụ thể để thử Fabric, orchestration hoặc automation với source, cost, security, operation và success criteria rõ.",
      "accept": "Có bằng chứng value/cost/operability trước khi quyết định mở rộng platform capability."
    },
    "vi": {
      "title": "Đánh giá và thử nghiệm nền tảng nâng cao",
      "inputs": "Chọn nhu cầu cụ thể để thử nền tảng dữ liệu hợp nhất, điều phối hoặc tự động hóa với nguồn, chi phí, bảo mật, vận hành và tiêu chí thành công rõ.",
      "accept": "Có bằng chứng về giá trị, chi phí và khả năng vận hành trước khi mở rộng nền tảng."
    }
  },
  "EX-09": {
    "original": {
      "title": "Thử nghiệm predictive / forecasting use cases",
      "inputs": "Chỉ thử forecast, risk prediction hoặc recommendation khi historical depth, data quality, monitoring và evaluation criteria đã đủ để kiểm chứng.",
      "accept": "Predictive use case chứng minh được accuracy, usefulness và trust so với baseline; nếu chưa đủ evidence thì defer thay vì scale."
    },
    "vi": {
      "title": "Thử nghiệm dự báo và gợi ý hỗ trợ quyết định",
      "inputs": "Chỉ thử dự báo, dự đoán rủi ro hoặc gợi ý khi lịch sử đủ dài, dữ liệu đủ tốt, có giám sát và tiêu chí kiểm chứng.",
      "accept": "Chứng minh được độ chính xác, hữu ích, tin cậy so với mốc chuẩn; chưa đủ bằng chứng thì hoãn."
    }
  },
  "EX-10": {
    "original": {
      "title": "Chốt scope & investment cho vòng tiếp theo",
      "inputs": "Tổng hợp evidence từ domain expansion, diagnostic, role-based experience, workflow, access governance, alerts, platform và predictive experiments.",
      "accept": "Chốt scale / pilot further / defer / stop cho từng nhánh cùng rationale, owner và mức đầu tư tiếp theo."
    },
    "vi": {
      "title": "Chốt phạm vi và đầu tư cho vòng tiếp theo",
      "inputs": "Tổng hợp bằng chứng từ mở rộng nghiệp vụ, phân tích, trải nghiệm theo vai trò, quy trình, phân quyền, cảnh báo, nền tảng và dự báo.",
      "accept": "Chốt mở rộng, thử thêm, hoãn hoặc dừng cho từng nhánh cùng lý do, người phụ trách và mức đầu tư tiếp theo."
    }
  }
};
/** Xem danh sách trường sẽ chuyển sang tiếng Việt. Không thay đổi dữ liệu. */
function assertHeaders_(sheet) {
  const headers=sheet.getRange(1,1,1,ROADMAP_HEADERS.length).getDisplayValues()[0];
  if(headers.join('|')!==ROADMAP_HEADERS.join('|')) throw new Error('Tên hoặc thứ tự cột của Roadmap_Tasks đã thay đổi. Khôi phục đúng tên và thứ tự cột trước khi dùng app.');
}

function readRows_(sheet) {
  assertHeaders_(sheet);
  if(sheet.getLastRow()<2) return [];
  const seen={},ids={};
  return sheet.getRange(2,1,sheet.getLastRow()-1,ROADMAP_HEADERS.length).getDisplayValues().map(function(row,i){
    if(row.every(function(v){return v==='';}))return null;
    const task={_row:i+2};ROADMAP_HEADERS.forEach(function(h,j){task[h]=row[j];});
    if(!task.key||seen[task.key])throw new Error('Thiếu hoặc trùng key tại dòng '+(i+2)+'. Sửa dữ liệu trên Sheet trước.');
    if(!task.id||ids[task.id])throw new Error('Thiếu hoặc trùng mã công việc tại dòng '+(i+2)+'.');
    if(!/^[a-zA-Z0-9-]{2,100}$/.test(task.id))throw new Error('Mã công việc không hợp lệ tại dòng '+(i+2)+'.');
    try{validateTask_(task);}catch(error){throw new Error('Dòng '+(i+2)+': '+error.message);}
    if(!Number.isInteger(Number(task.revision))||Number(task.revision)<1)throw new Error('Phiên bản dữ liệu không hợp lệ tại dòng '+(i+2)+'.');
    seen[task.key]=true;ids[task.id]=true;return task;
  }).filter(Boolean);
}

function publicTask_(task) {
  const out={};ROADMAP_HEADERS.forEach(function(h){out[h]=task[h]===undefined?'':task[h];});
  out.phase=Number(out.phase);out.revision=Number(out.revision);out.rowHash=hashRow_(task);return out;
}

function validateTask_(input) {
  const out={};
  const limits={key:100,title:300,workstream:80,domain:1500,startDate:10,target:10,owner:150,status:30,priority:15,inputs:6000,accept:6000,deps:1500,notes:6000,next:3000,blockers:3000};
  Object.keys(limits).forEach(function(k){
    if(input[k]!==undefined&&typeof input[k]!=='string')throw new Error('Trường '+k+' phải là văn bản.');
    out[k]=String(input[k]||'').trim();if(out[k].length>limits[k])throw new Error('Trường '+k+' vượt giới hạn '+limits[k]+' ký tự.');
  });
  if(!/^[a-zA-Z0-9-]{3,100}$/.test(out.key))throw new Error('Mã nội bộ không hợp lệ.');
  if(!out.title)throw new Error('Nhập tên công việc.');
  if(!/^[a-z][a-z0-9-]{0,59}$/.test(out.workstream))throw new Error('Mã nhóm công việc không hợp lệ.');
  if(!out.domain||out.domain.split(',').some(function(v){return !/^[a-z][a-z0-9-]{0,59}$/.test(v);}))throw new Error('Mã mảng nghiệp vụ không hợp lệ.');
  if(new Set(out.domain.split(',')).size!==out.domain.split(',').length)throw new Error('Mảng nghiệp vụ bị lặp.');
  out.phase=Number(input.phase);if(!Number.isInteger(out.phase)||out.phase<1||out.phase>9999)throw new Error('Giai đoạn phải từ 1 đến 9999.');
  if(!/^[a-z][a-z0-9-]{0,29}$/.test(out.status))throw new Error('Trạng thái không hợp lệ.');
  if(out.priority&&!/^[a-z][a-z0-9-]{0,14}$/.test(out.priority))throw new Error('Độ ưu tiên không hợp lệ.');
  out.progress=input.progress===undefined||input.progress===''?'':Number(input.progress);
  if(out.progress!==''&&(!Number.isFinite(out.progress)||out.progress<0||out.progress>100))throw new Error('Tiến độ phải từ 0 đến 100.');
  if(out.status==='completed'){
    if(out.progress!==''&&out.progress!==100)throw new Error('Công việc hoàn thành phải có tiến độ 100%.');
    out.progress=100;
  }
  [out.startDate,out.target].forEach(function(v){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(v))throw new Error('Nhập đủ ngày bắt đầu và ngày kết thúc.');
    const date=new Date(v+'T00:00:00Z');
    if(Number.isNaN(date.getTime())||date.toISOString().slice(0,10)!==v)throw new Error('Ngày không hợp lệ.');
    if(v<ROADMAP_CONFIG.minDate||v>ROADMAP_CONFIG.maxDate)throw new Error('Lộ trình đang trong khung 01/08/2026–31/12/2027. Chọn ngày trong khung này.');
  });
  if(out.target<out.startDate)throw new Error('Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.');
  return out;
}

function boolFlag_(value,label) {
 const v=String(value).trim().toLowerCase();
 if(['true','1','có','co'].indexOf(v)>=0)return true;
 if(['false','0','không','khong',''].indexOf(v)>=0)return false;
 throw new Error(label+': Đang sử dụng phải là TRUE hoặc FALSE.');
}

function tableRows_(ss,name,headers) {
 const sheet=ss.getSheetByName(name);
 if(!sheet)throw new Error('Thiếu tab '+name+'. Chủ sở hữu cần chạy setupRoadmap trong Apps Script.');
 if(sheet.getRange(1,1,1,headers.length).getDisplayValues()[0].join('|')!==headers.join('|'))throw new Error('Tên hoặc thứ tự cột của '+name+' không đúng. Khôi phục theo hướng dẫn.');
 if(sheet.getLastRow()<2)return [];
 return sheet.getRange(2,1,sheet.getLastRow()-1,headers.length).getDisplayValues().map(function(row,i){return {row:row,line:i+2};}).filter(function(x){return x.row.some(function(v){return v!=='';});});
}

function readAccounts_(ss) {
 const seenEmail=new Set(),seenUsername=new Set(),seenUid=new Set(),roleMap={'Chỉ xem':'viewer','Chỉnh sửa':'editor','Quản trị':'admin'};
 return tableRows_(ss,CONFIG_TABS.users,USER_HEADERS).map(function(x){
  const email=String(x.row[0]).trim().toLowerCase(),name=String(x.row[1]||'').trim(),roleLabel=String(x.row[2]).trim();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||seenEmail.has(email))throw new Error('TaiKhoan, dòng '+x.line+': Email không hợp lệ hoặc bị trùng.');seenEmail.add(email);
  const role=roleMap[roleLabel]||(/^role-[a-f0-9-]{36}$/.test(roleLabel)?roleLabel:null);if(!role)throw new Error('TaiKhoan, dòng '+x.line+': Quyền phải là Chỉ xem, Chỉnh sửa hoặc Quản trị.');
  const username=String(x.row[5]||'').trim().toLowerCase(),uid=String(x.row[6]||'').trim().toLowerCase(),version=Number(x.row[7]);
  if(username){username_(username);if(seenUsername.has(username))throw new Error('TaiKhoan: trùng tên đăng nhập.');seenUsername.add(username);}
  if(uid){if(!uuid_(uid)||seenUid.has(uid))throw new Error('TaiKhoan: Auth UID không hợp lệ hoặc bị trùng.');seenUid.add(uid);}
  if(!Number.isInteger(version)||version<1)throw new Error('TaiKhoan, dòng '+x.line+': Phiên bản đăng nhập cần là số nguyên từ 1.');
  return {email:email,name:name,role:role,roleLabel:roleLabel,active:boolFlag_(x.row[3],'TaiKhoan, dòng '+x.line),notes:String(x.row[4]||''),username:username,uid:uid,authVersion:version,_row:x.line};
 });
}

function publicAccess_(user) {return {role:user.role,name:user.name,canEdit:user.role!=='viewer',canManage:user.role==='admin'};}

function readCatalogs_(ss) {
 const domains=[],groups=[],ds=new Set(),gs=new Set();
 function idName(x,type) {
  const id=String(x.row[0]).trim(),name=String(x.row[1]).trim();
  if(!/^[a-z][a-z0-9-]{0,59}$/.test(id))throw new Error(type+', dòng '+x.line+': Mã dùng chữ thường không dấu, số và dấu gạch ngang; bắt đầu bằng chữ.');
  if(!name||name.length>120)throw new Error(type+', dòng '+x.line+': Tên hiển thị cần từ 1 đến 120 ký tự.');
  return {id:id,name:name};
 }
 tableRows_(ss,CONFIG_TABS.domains,DOMAIN_HEADERS).forEach(function(x){
  const d=idName(x,CONFIG_TABS.domains);if(ds.has(d.id))throw new Error('Trùng mã nghiệp vụ '+d.id+'.');ds.add(d.id);
  d.order=Number(x.row[2]);if(!Number.isFinite(d.order))throw new Error('Thứ tự nghiệp vụ phải là số.');
  d.active=boolFlag_(x.row[3],CONFIG_TABS.domains+', dòng '+x.line);domains.push(d);
 });
 if(!domains.some(function(d){return d.id==='all'&&d.active;}))throw new Error('Giữ mã all (Dùng chung) ở trạng thái TRUE trong DanhMuc_NghiepVu.');
 tableRows_(ss,CONFIG_TABS.groups,GROUP_HEADERS).forEach(function(x){
  const g=idName(x,CONFIG_TABS.groups);if(gs.has(g.id))throw new Error('Trùng mã nhóm triển khai '+g.id+'.');gs.add(g.id);
  g.color=String(x.row[2]).trim()||'#53846e';if(!/^#[0-9a-fA-F]{6}$/.test(g.color))throw new Error(CONFIG_TABS.groups+', dòng '+x.line+': Màu sắc cần dạng #53846e.');
  g.order=Number(x.row[3]);if(!Number.isFinite(g.order))throw new Error('Thứ tự nhóm triển khai phải là số.');
  g.active=boolFlag_(x.row[4],CONFIG_TABS.groups+', dòng '+x.line);groups.push(g);
 });
 if(!groups.some(function(g){return g.active;}))throw new Error('Cần ít nhất một nhóm triển khai đang sử dụng.');
 const sort=function(a,b){return a.order-b.order||a.name.localeCompare(b.name);};domains.sort(sort);groups.sort(sort);
 return {domains:domains,groups:groups};
}

function validateCatalogAssignment_(task,current,catalogs) {
 function check(id,list,unchanged,label){const item=list.find(function(x){return x.id===id;});if(item&&item.active)return;if(unchanged)return;throw new Error(label+' chưa có hoặc đã ngừng sử dụng. Bấm Làm mới rồi chọn lại.');}
 check(task.workstream,catalogs.groups,current&&task.workstream===current.workstream,'Nhóm công việc');
 const oldDomains=current?current.domain.split(','):[];
 task.domain.split(',').forEach(function(id){check(id,catalogs.domains,oldDomains.indexOf(id)>=0,'Mảng nghiệp vụ '+id);});
}

function username_(v) {
 const s=String(v||'').trim().toLowerCase();
 if(!/^[a-z][a-z0-9._-]{2,31}$/.test(s))throw new Error('Tên đăng nhập cần 3–32 ký tự, bắt đầu bằng chữ; chỉ dùng chữ không dấu, số, dấu chấm, gạch ngang hoặc gạch dưới.');
 return s;
}

function password_(value) {
 if(typeof value!=='string'||Array.from(value).length<12||value.length>128)throw new Error('Mật khẩu mới cần ít nhất 12 ký tự.');
 let bytes;try{bytes=encodeURIComponent(value).replace(/%[0-9A-F]{2}/gi,'x').length;}catch(e){throw new Error('Mật khẩu chứa ký tự không hợp lệ.');}
 if(bytes>72)throw new Error('Mật khẩu mới không vượt quá 72 byte UTF-8; nên dùng 12–64 ký tự thông thường.');
 return value;
}

function uuid_(s) {return typeof s==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(s);}

function publicAccount_(u) {return {id:u.uid,username:u.username,name:u.name||u.username,role:u.role};}

function localizePublicTask_(task) {
 const out=publicTask_(task),tr=ROADMAP_TRANSLATIONS[task.id];
 if(tr)['title','inputs','accept'].forEach(function(f){if(out[f]===tr.original[f])out[f]=tr.vi[f];});
 return out;
}

function accountHash_(u) {return authHash_(JSON.stringify([u.email,u.name,u.role,u.active,u.notes,u.username,u.uid,u.authVersion]));}

function accountView_(u) {return {email:u.email,name:u.name,role:u.role,roleLabel:u.roleLabel,active:u.active,notes:u.notes,username:u.username,uid:u.uid,authVersion:u.authVersion,rowHash:accountHash_(u)};}

function authHash_(value){return createHash('sha256').update(String(value)).digest('hex');}
function hashRow_(task){return authHash_(JSON.stringify(ROADMAP_HEADERS.map(h=>String(task[h]===undefined?'':task[h]))));}
export {ROADMAP_HEADERS,USER_HEADERS,DOMAIN_HEADERS,GROUP_HEADERS,CONFIG_TABS,hashRow_,assertHeaders_,readRows_,publicTask_,validateTask_,boolFlag_,tableRows_,readAccounts_,publicAccess_,readCatalogs_,validateCatalogAssignment_,username_,password_,uuid_,publicAccount_,localizePublicTask_,accountHash_,accountView_};
