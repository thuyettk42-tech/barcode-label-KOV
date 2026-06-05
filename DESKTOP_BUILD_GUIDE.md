# Hướng Dẫn Đóng Gói Ứng Dụng LabelPro Designer Thành App Desktop (.exe)

Tệp hướng dẫn này giúp bạn tự chạy biên dịch ứng dụng web React + Vite hiện tại sang một ứng dụng chạy trực tiếp trên máy tính (`.exe` cho Windows hoặc `.app` cho macOS) bằng ngôn ngữ **Python** một cách cực kỳ đơn giản.

---

## 🛠️ Bước 1: Tải Code về máy tính học tập và làm việc
1. Trên giao diện Google AI Studio, góc trên bên phải màn hình, chọn **Settings** hoặc menu cấu hình.
2. Tại đây có tùy chọn **Export to ZIP** (Xuất ứng dụng thành file nén `.zip`).
3. Chọn tải xuống và giải nén thư mục này ra một vị trí dễ nhớ (Ví dụ: `C:\LabelProDesigner` hoặc Desktop).

---

## 💻 Bước 2: Cài đặt Node.js và biên dịch ứng dụng Web (`npm run build`)
Trước tiên, chúng ta cần biên dịch toàn bộ mã nguồn React + Tailwind sang các file Web tĩnh siêu nhẹ nằm trong thư mục `dist`.

1. **Cài đặt Node.js**:
   - Truy cập trang chủ chính thức: [https://nodejs.org/](https://nodejs.org/)
   - Tải phiên bản khuyên dùng **LTS** (Ví dụ: bản 20.x hoặc 22.x).
   - Tiến hành cài đặt (bấm `Next` liên tục đến khi hoàn thành).
2. **Biên dịch ứng dụng**:
   - Mở cửa sổ **Command Prompt (CMD)** trên Windows (ấn nút `Windows + R`, gõ `cmd` rồi bấm Enter).
   - Di chuyển terminal vào thư mục dự án vừa giải nén bằng lệnh `cd`:
     ```cmd
     cd C:\Duong-Dan-Thu-Muc-Du-An-Da-Giai-Nen
     ```
     *(Để dán nhanh đường dẫn, bạn có thể gõ `cd ` rồi kéo thả thư mục vào màn hình CMD dán tự động)*.
   - Chạy lệnh cài đặt các thư viện lõi:
     ```cmd
     npm install
     ```
   - Chạy lệnh biên dịch (Đóng gói mã nguồn HTML/JS/CSS thành thư mục `dist`):
     ```cmd
     npm run build
     ```
     *Sau khi lệnh chạy xong, bạn sẽ thấy một thư mục mới có tên `dist` chứa file `index.html` và các thư mục asset khác xuất hiện.*

---

## 🐍 Bước 3: Thiết lập Python và Cài đặt môi trường chạy Desktop
Chúng ta sử dụng một thư viện cực kỳ mạnh mẽ và phổ biến của Python là `pywebview` để biến trang web tĩnh vừa tạo thành ứng dụng Desktop chính chủ.

1. **Cài đặt Python**:
   - Truy cập: [https://www.python.org/downloads/](https://www.python.org/downloads/)
   - Tải phiên bản Python mới nhất cho thiết bị của bạn.
   - **CỰC KỲ QUAN TRỌNG:** Trong quá trình cài đặt, hãy tích chọn ô **"Add Python to PATH"** ở màn hình đầu tiên rồi mới bấm `Install Now`. (Nếu bỏ lỡ bước này, Command Prompt sẽ báo lỗi không hiểu lệnh `python`/`pip`).
2. **Cài đặt thư viện bổ sung**:
   - Mở CMD lên (nếu bấm đóng trước đó, hãy mở lại và dùng `cd` chuyển vào thư mục dự án tương tự Bước 2).
   - Tiến hành cài đặt thư viện hiển thị giao diện Desktop (`pywebview`) và công cụ đóng gói đóng gói (`pyinstaller`):
     ```cmd
     pip install pywebview pyinstaller
     ```

---

## 🚀 Bước 4: Chạy thử ứng dụng Desktop Offline
Hãy kiểm tra xem ứng dụng đã hoạt động trơn tru chưa trước khi nén file cài đặt:
- Chạy lệnh sau trong CMD:
  ```cmd
  python gui.py
  ```
- Một cửa sổ giao diện phần mềm cực kỳ mượt mà sẽ mở ra. Bạn có thể thiết kế tem nhãn, in lưới văn phòng, nạp thông tin Excel ngoại tuyến hoàn toàn mà không cần internet. 
- Mọi mẫu tem dán hoặc thiết lập sẽ tự động lưu lại trên ổ đĩa cứng của máy tính thông qua cơ chế nhớ `localStorage` tự động.

---

## 📦 Bước 5: Đóng gói thành file `.exe` chạy trực tiếp bằng 1 cú nhấp chuột
Khi muốn tạo một tệp phần mềm duy nhất chạy trực tiếp không cần cài đặt rườm rà:

1. Chạy dòng lệnh đóng gói chuyên nghiệp sau trong CMD:
   ```cmd
   pyinstaller --noconsole --onefile --add-data "dist;dist" --name "LabelProDesigner" gui.py
   ```
   *Mách nhỏ cho bạn:*
   - Trên hệ điều hành macOS, ta đổi chuỗi dữ liệu thành dấu hai chấm: `--add-data "dist:dist"`.
   - `--noconsole`: Giảm thiểu tối đa hiện tượng nháy màn hình đen (cửa sổ console dòng lệnh) khi mở ứng dụng cửa sổ.
   - `--onefile`: Gộp toàn bộ tài nguyên web tĩnh trong `dist/`, thư viện `pywebview`, và môi trường Python vào một tệp khởi chạy `.exe` duy nhất.
   - **Tối ưu hóa máy chủ phụ trợ (Cú hích cực lớn):** Tệp `gui.py` đã được tích hợp một máy chủ HTTP mini (chạy ngầm thông qua thư viện tiêu chuẩn của Python). Cơ chế này giúp giải quyết triệt để lỗi chặn tài nguyên ES Modules (`CORS Policy`) khi chạy các liên kết tệp cục bộ (`file://`) thường thấy ở các nền tảng Web-to-Desktop, đảm bảo ứng dụng luôn chạy mượt mà 100% trên mọi dòng máy tính Windows!

2. **Nhận kết quả**:
   - Chờ trong giây lát, bạn sẽ thấy thư mục `dist` chứa tệp `LabelProDesigner.exe` xuất hiện ngoài thư mục chính.

---

## 💾 Bước 6: Biên dịch bộ cài đặt Setup chuyên nghiệp (Cho phép tự chọn thư mục lưu trữ)

Nếu bạn muốn tạo một bộ cài chuyên nghiệp (giống như cài Word, Excel hoặc các ứng dụng chuyên sâu), nơi người dùng có thể nhấp đúp vào **ví dụ: `LabelPro_Setup_Offline.exe`**, chọn thư mục cài đặt tùy ý (ổ đĩa `C:`, `D:`, v.v.), tạo biểu tượng shortcut trên màn hình Desktop và tích hợp công cụ tháo gỡ (Uninstaller) trong Control Panel:

We sử dụng **Inno Setup** – Phần mềm tạo bộ cài Windows miễn phí, chuyên nghiệp nhất hiện nay.

1. **Tải và cài đặt Inno Setup**:
   - Truy cập trang chủ Inno Setup: [https://jrsoftware.org/isdl.php](https://jrsoftware.org/isdl.php)
   - Tải phiên bản cài đặt mới nhất (Stable Version) và tiến hành cài đặt vào máy tính của bạn.
2. **Khởi chạy biên dịch bộ cài**:
   - Trong thư mục mã nguồn chúng tôi đã chuẩn bị sẵn cho bạn một tệp cấu hình cài đặt tên là **`installer.iss`**.
   - Nhấp đúp chuột để mở tệp **`installer.iss`** bằng phần mềm **Inno Setup** vừa cài đặt.
   - Nhấn phím tổ hợp **`Ctrl + F9`** (hoặc chọn menu **Build** -> **Compile**).
3. **Nhận bộ phần mềm cài đặt cực kỳ chuyên nghiệp**:
   - Sau vài giây, Inno Setup sẽ tự động tạo một thư mục mới có tên là **`installer_output`** ngay bên trong thư mục dự án của bạn.
   - Tại đây sẽ chứa tệp cài đặt: **`LabelPro_Setup_Offline.exe`**.
   - Hãy chạy thử tệp cài đặt này, bạn sẽ thấy một giao diện cài đặt chuyên nghiệp bằng tiếng Anh xuất hiện, cho phép bạn thoải mái bấm **"Browse..."** để lựa chọn ổ đĩa hoặc thư mục lưu trữ cài đặt tùy chọn (Ví dụ: `D:\PhanMem\InNhanKietViet`). Giao diện cũng sẽ hỗ trợ thêm shortcut ngoài Desktop và cài đặt cực nhanh chỉ trong chưa đầy 3 giây!

---

💡 **Chúc bạn thực hiện thành công giải pháp đóng gói chuyên nghiệp này!**

