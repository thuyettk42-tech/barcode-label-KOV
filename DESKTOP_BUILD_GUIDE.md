## Hướng Dẫn Đóng Gói Ứng Dụng KiotLabel Designer Thành App Desktop (.exe)

Tệp hướng dẫn này giúp bạn tự chạy biên dịch ứng dụng web React + Vite hiện tại sang một ứng dụng chạy trực tiếp trên máy tính (`.exe` cho Windows hoặc `.app` cho macOS) bằng ngôn ngữ **Python** một cách cực kỳ đơn giản.

---

## 🛠️ Bước 1: Tải Code về máy tính học tập và làm việc
1. Trên giao diện Google AI Studio, góc trên bên phải màn hình, chọn **Settings** hoặc menu cấu hình.
2. Tại đây có tùy chọn **Export to ZIP** (Xuất ứng dụng thành file nén `.zip`).
3. Chọn tải xuống và giải nén thư mục này ra một vị trí dễ nhớ (Ví dụ: `C:\KiotLabelDesigner` hoặc Desktop).

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

> **⚠️ LƯU Ý QUAN TRỌNG VỀ ICON TRÊN WINDOWS:**
> Quy định của hệ điều hành Windows là chỉ chấp nhận định dạng **`.ico`** làm biểu tượng hình ảnh đại diện (Icon) của tệp tin chạy `.exe`. Định dạng `.svg` không thể hoạt động làm icon hệ thống Windows được. Vì thế khi bạn chạy PyInstaller bằng tệp `.svg`, Windows sẽ tự động bỏ qua và hiển thị biểu tượng ứng dụng mặc định (hoặc gây lỗi).
> 
> **Cách tạo tệp `logo.ico` từ `logo.svg` cực đơn giản:**
> 1. Bạn hãy sao chép hoặc tải ảnh `logo.svg` từ thư mục này về máy.
> 2. Sử dụng trình duyệt truy cập một dịch vụ chuyển đổi ảnh trực tuyến miễn phí (Ví dụ: tìm kiếm `"SVG to ICO converter online"` hoặc truy cập trang web như `ezgif.com/svg-to-ico` hay `convertio.co/svg-ico/`).
> 3. Tải tệp `logo.svg` lên để chuyển đổi thành một tệp tin icon Microsoft có tên là **`logo.ico`**.
> 4. Lưu tệp mới tải xuống vào và đặt cùng thư mục dự án với tên lưu là **`logo.ico`**.

Khi đã có tệp **`logo.ico`** ở thư mục dự án, hãy chạy dòng lệnh đóng gói chuyên nghiệp sau trong CMD:

```cmd
pyinstaller --noconsole --onefile --add-data "dist;dist" --add-data "logo.svg;." --icon="logo.ico" --name "KiotLabelDesigner" gui.py
```

*Mách nhỏ cho bạn:*
- Trên hệ điều hành macOS, ta đổi chuỗi dữ liệu thành dấu hai chấm và sử dụng tệp định dạng `.icns` làm icon đại diện: `--add-data "dist:dist"` và `--add-data "logo.svg:."` với `--icon="logo.icns"`.
- `--noconsole`: Giảm thiểu tối đa hiện tượng nháy màn hình đen (cửa sổ console dòng lệnh) khi mở ứng dụng cửa sổ.
- `--onefile`: Gộp toàn bộ tài nguyên web tĩnh trong `dist/`, icon ứng dụng `logo.svg`, thư viện `pywebview`, và môi trường Python vào một tệp khởi chạy `.exe` duy nhất.
- `--icon="logo.ico"`: Gán biểu tượng logo thương hiệu chính thức KiotLabel (định dạng `.ico`) làm icon đại diện cực kỳ chuyên nghiệp và bắt mắt cho tệp tin chạy `.exe` của bạn!
- **Tối ưu hóa máy chủ phụ trợ (Cú hích cực lớn):** Tệp `gui.py` đã được tích hợp một máy chủ HTTP mini (chạy ngầm thông qua thư viện tiêu chuẩn của Python). Cơ chế này giúp giải quyết triệt để lỗi chặn tài nguyên ES Modules (`CORS Policy`) khi chạy các liên kết tệp cục bộ (`file://`) thường thấy ở các nền tảng Web-to-Desktop, đảm bảo ứng dụng luôn chạy mượt mà 100% trên mọi dòng máy tính Windows!

2. **Nhận kết quả**:
   - Chờ trong giây lát, bạn sẽ thấy thư mục `dist` chứa tệp `KiotLabelDesigner.exe` đại diện bởi logo mới xuất hiện ngoài thư mục chính.

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

## 🛡️ Bước 7: Khắc Phục Lỗi Báo Virus (False Positive) & Hướng Dẫn Ký Số Mã Nguồn (Code Signing)

### 1. Tại sao file `.exe` đóng gói từ Python thường bị Google Drive và phần mềm diệt virus cảnh báo?

Khi bạn chạy lệnh đóng gói `pyinstaller --onefile`, cơ chế hoạt động của PyInstaller là:
* **Cơ chế nén tự giải (Heuristic Scan trigger):** Nó nén toàn bộ mã nguồn Python, thư viện DLL, và file web tĩnh `dist/` vào trong một tệp nhị phân duy nhất. Khi người dùng click chạy `.exe`, file này sẽ tự giải nén (extract) hàng tá thư mục ẩn vào thư mục tạm `C:\Users\username\AppData\Local\Temp\_MEIxxxxxx` của hệ thống rồi mới khởi chạy. Hành vi tự sinh file thực thi trong thư mục Temp này cực kỳ giống với hành vi của các phần mềm độc hại (Trojan/Virus).
* **Mẫu Bootloader dùng chung (Blacklisted signature):** Hầu hết các virus viết bằng Python cũng được hacker đóng gói bằng PyInstaller bản cài sẵn từ `pip`. Vì thế các công cụ quét mã độc (Avast trên Google Drive, Windows Defender) lưu lại dấu vân tay (Signature) của tệp chạy mồi phục vụ PyInstaller và cảnh báo hàng loạt (được gọi là lỗi **False Positive - Cảnh báo nhầm**).
* **Thiếu chứng thực ký số (Unsigned Binary):** Một file `.exe` lạ tải từ internet xuống không có gốc chứng thực kỹ thuật số thì mặc định Windows SmartScreen sẽ hiện màn hình bảo vệ màu xanh cảnh báo ngăn người dùng chạy.

---

### 2. Các giải pháp khắc phục MIỄN PHÍ & HIỆU QUẢ nhất (Bypass Google Drive và Windows Defender)

#### ✅ Kế hoạch A: Nén thư mục ZIP bảo mật mật khẩu (Nhanh và tiện nhất cho Google Drive)
Cách đơn giản nhất để vượt qua bộ lọc quét file tĩnh của Google Drive mà không cần mua chứng chỉ:
1. Lúc đóng gói bằng PyInstaller, hãy chuyển sang cấu trúc thư mục chứa thay vì 1 file đơn lẻ bằng cách bỏ `--onefile` hoặc chạy: 
   ```cmd
   pyinstaller --noconsole --add-data "dist;dist" --add-data "logo.svg;." --icon="logo.ico" --name "KiotLabelDesigner" gui.py
   ```
2. Bạn sẽ nhận được thư mục `dist/KiotLabelDesigner` chứa file `.exe` và các thư viện nằm ngoài.
3. Sử dụng công cụ **WinRAR** hoặc **7-Zip** trên máy tính của bạn, nhấp chuột phải vào thư mục đó chọn **Add to archive...**.
4. Chọn định dạng `.zip` hoặc `.7z`, nhấp vào nút **Set password...** (Đặt mật khẩu) và nhập mật khẩu (Ví dụ: `123` hoặc `kiotlabel`).
5. Upload file nén đã đặt mật khẩu này lên Google Drive để chia sẻ. Google Drive không thể quét lén giải nén tệp tin có đặt mật khẩu nên sẽ hoàn toàn không báo đỏ và cho phép tải xuống 100% không bị chặn. Cung cấp mật khẩu giải nén cho khách hàng khi họ tải về.

#### ✅ Kế hoạch B: Sử dụng Nuitka Compiler thay thế PyInstaller (Khuyên dùng lâu dài)
**Nuitka** là một trình biên dịch Python cực kỳ hiện đại. Thay vì chỉ đóng nén, Nuitka dịch toàn bộ mã Python của `gui.py` sang mã nguồn C/C++ rồi gọi trình biên dịch (như MSVC hoặc GCC) dịch ra mã máy gốc nhị phân thực thụ. File `.exe` tạo bởi Nuitka cực kỳ mượt mà, khởi động nhanh gấp 3 lần PyInstaller và **gần như không bao giờ bị báo virus nhầm**.

*Hướng dẫn cài đặt và đóng gói bằng Nuitka:*
1. Mở Command Prompt (CMD) và cài đặt Nuitka:
   ```cmd
   pip install nuitka
   ```
2. Cài trình biên dịch C++ tự động (Nuitka sẽ hỏi và tự tải GCC/MinGW về cấu hình nếu bạn đồng ý, bấm `Yes`).
3. Chạy dòng lệnh biên dịch tối ưu sau:
   ```cmd
   nuitka --standalone --onefile --windows-disable-console --include-data-dir=dist=dist --include-data-files=logo.svg=logo.svg --windows-icon-from-ico=logo.ico --output-dir=nuitka_output gui.py
   ```
4. File `.exe` thu được trong thư mục `nuitka_output` an toàn tuyệt đối và có độ tin cậy cực cao đối với các công cụ quét bảo mật.

#### ✅ Kế hoạch C: Tự xây dựng lại Bootloader của PyInstaller (Dành cho nhà phát triển sâu)
Nếu vẫn muốn sử dụng PyInstaller và muốn file có danh tính riêng không bị trùng chữ ký mẫu mặc định:
1. Tải dự án PyInstaller nguồn về máy chạy compile lại bootloader riêng của bạn.
2. Việc biên dịch lại bootloader cục bộ trên máy tính của bạn sẽ thay đổi hoàn toàn mã hash băm SHA-256 của file mồi, xóa sạch dấu vân tay mẫu đen mà các phần mềm diệt virus đang lưu trữ.
3. Chi tiết cách xây dựng lại bootloader được hướng dẫn tại trang chủ: [PyInstaller Bootloader Compilation Guide](https://pyinstaller.org/en/stable/bootloader-building.html).

---

### 3. Hướng dẫn Ký số mã nguồn (Code Signing Certificate)

Ký chữ ký số là phương pháp chính thống nhất nhằm định danh doanh nghiệp phát hành và đăng ký với hệ điều hành Windows rằng: *"Tôi là phần mềm sạch của một pháp nhân đã được xác minh danh tính"*. Khi đã được ký số, Windows Defender và Google Drive sẽ không bao giờ chặn phần mềm của bạn.

#### 🏢 Cách 1: Sử dụng Chứng chỉ ký số CA Chính thống (Hợp chuẩn Thương mại)
Để có chữ ký số được Windows và thế giới tin cậy hoàn toàn, bạn cần mua chứng chỉ **Code Signing Certificate (chữ ký số cho tệp tin thực thi)** từ các Tổ chức chứng thực được Microsoft tin cậy (như **Sectigo**, **DigiCert**, **SSL.com**, **GlobalSign**).

1. **Mua Chứng chỉ**:
   - Bạn có thể mua trực tiếp hoặc mua qua đại lý tiết kiệm (gợi ý: **K Software** - `ksoftware.net`, là đại lý cấp 1 giá rẻ nhất của Sectigo cho nhà phát triển cá nhân/doanh nghiệp nhỏ chỉ khoảng $150–$250/năm).
   - Chọn loại chứng chỉ ký số: **OV (Organization Validated - Xác minh tổ chức)** dành cho doanh nghiệp hoặc **EV (Extended Validation - Xác minh mở rộng)** (đắt hơn nhưng giúp vượt qua cảnh báo Windows SmartScreen ngay lập tức từ lần chạy đầu tiên).
2. **Ký file `.exe` bằng công cụ `signtool.exe` của Microsoft (Windows SDK)**:
   - Cài đặt Windows SDK để lấy tệp tin công cụ ký số.
   - Khi có file chứng chỉ (ở định dạng khóa `.pfx` hoặc thông qua USB Token bảo mật cứng), mở PowerShell dưới quyền Administrator và thực hiện lệnh:
     ```powershell
     signtool sign /f "C:\DuongDan\ChungChiCuaBan.pfx" /p "MatKhauChungChi" /tr http://timestamp.digicert.com /td sha256 /fd sha256 "C:\Path\To\KiotLabelDesigner.exe"
     ```
     *Lưu ý: `/tr` và `/td` dùng để đóng dấu thời gian (Timestamping), đảm bảo ứng dụng của bạn vẫn có hiệu lực chữ ký số vĩnh viễn ngay cả khi chứng chỉ gốc hết hạn sử dụng sau 1 năm*.

#### 🧪 Cách 2: Tạo Chứng chỉ Tự Ký (Self-Signed Certificate) để thử nghiệm / Phát hành nội bộ
Nếu bạn chỉ phát hành phần mềm trong mạng lưới nhân viên nội bộ của công ty, hoặc kiểm thử và không có ngân sách mua chứng chỉ thương mại, bạn có thể tự đóng vai trò là nhà phát hành chứng chỉ:

1. **Khởi tạo chứng chỉ số tự ký trên Windows (qua PowerShell - Admin)**:
   ```powershell
   $cert = New-SelfSignedCertificate -Type CodeSigningCert -Subject "CN=KiotLabel Designer Local Developer" -FriendlyName "KiotLabel Temporary Cert" -CertStoreLocation "Cert:\CurrentUser\My"
   ```
2. **Xuất chứng chỉ ra tệp `.pfx` có mật khẩu để lưu giữ**:
   ```powershell
   $certPassword = ConvertTo-SecureString "MậtKhauXacThuc123" -AsPlainText -Force
   Export-PfxCertificate -Cert $cert -FilePath "$env:USERPROFILE\Desktop\KiotLabelTestingCert.pfx" -Password $certPassword
   ```
3. **Ký số tệp `.exe` của bạn**:
   Sử dụng công cụ `signtool.exe` để ký với file `.pfx` vừa xuất:
   ```cmd
   signtool sign /f "%USERPROFILE%\Desktop\KiotLabelTestingCert.pfx" /p "MậtKhauXacThuc123" /tr http://timestamp.digicert.com /td sha256 /fd sha256 "C:\Path\To\KiotLabelDesigner.exe"
   ```
4. **Để máy tính khách hàng tin tưởng chứng chỉ tự ký này:**
   - Khi người dùng tải về, chứng chỉ tự ký mặc định vẫn sẽ báo đỏ vì Microsoft chưa lưu pháp nhân của bạn trong danh mục tin cậy mặc định toàn cầu.
   - Để kích hoạt độ tin cậy tuyệt đối: Hướng dẫn khách hàng cài đặt tệp chứng chỉ `.pfx` (hoặc `.cer` xuất từ file) vào mục **"Trusted Root Certification Authorities" (Cơ quan chứng thực gốc đáng tin cậy)** trên máy tính của họ. Sau khi cài, ứng dụng chạy sẽ mượt mà, xanh mướt và không còn bất kỳ thông báo lỗi SmartScreen hay phòng chống virus nào xuất hiện nữa.

---

💡 **Chúc bạn thực hiện thành công giải pháp đóng gói chuyên nghiệp này!**

