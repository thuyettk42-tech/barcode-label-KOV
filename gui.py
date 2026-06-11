import os
import sys
import threading
import socket
import traceback
from datetime import datetime
from http.server import SimpleHTTPRequestHandler
from socketserver import TCPServer
import webview

def log_exception(exc_type, exc_value, exc_traceback):
    """Ghi lỗi chưa được bắt vào tệp tin desktop_error_log.txt nằm cùng thư mục chạy ứng dụng."""
    try:
        # Đường dẫn tệp log nằm trong thư mục chạy tệp tin thực thi (.exe hoặc file .py)
        exec_dir = os.path.dirname(os.path.abspath(sys.argv[0]))
        log_file = os.path.join(exec_dir, "desktop_error_log.txt")
        
        with open(log_file, "a", encoding="utf-8") as f:
            f.write("\n" + "="*80 + "\n")
            f.write(f"Thời gian lỗi: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"Hệ điều hành: {sys.platform}\n")
            f.write(f"Phiên bản Python: {sys.version}\n")
            traceback.print_exception(exc_type, exc_value, exc_traceback, file=f)
        print(f"[ERROR-LOGGER] Lỗi nghiêm trọng đã được ghi nhận vào: {log_file}")
    except Exception as e:
        print(f"Không thể ghi tệp nhật ký lỗi tự động: {e}")

# Đăng ký hook gỡ lỗi toàn bộ Python thread
sys.excepthook = log_exception

# Thử cấu hình mã hóa ngõ ra là UTF-8 để khắc phục triệt để lỗi map kí tự ngoại tuyến (như cp1252 UnicodeEncodeError trên Windows)
if sys.platform.startswith('win'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

class DesktopApi:
    def __init__(self):
        self._window = None
        self._active_lock_path = None
        self._app_loaded = False

    def _create_lock_file(self, target_path):
        """Tạo file khóa tạm thời (lock file) trong cùng thư mục với file chính để đánh dấu đang chỉnh sửa."""
        try:
            self._release_lock_file()
            if not target_path:
                return
            dir_name = os.path.dirname(target_path)
            if not os.path.exists(dir_name):
                return
            base_name = os.path.basename(target_path)
            lock_filename = f"~${base_name}"
            lock_path = os.path.join(dir_name, lock_filename)
            
            with open(lock_path, 'w', encoding='utf-8') as f:
                f.write(f"LOCKED BY KIOTLABEL DESIGNER ON {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            
            self._active_lock_path = lock_path
            print(f"[LOCK-SYSTEM] Đã tạo file khóa tạm thời (Lock file): {lock_path}")
        except Exception as e:
            print(f"[LOCK-SYSTEM] Lỗi khi tạo file khóa tạm thời: {e}")

    def _release_lock_file(self):
        """Giải phóng và xóa file khóa tạm thời."""
        try:
            if self._active_lock_path and os.path.exists(self._active_lock_path):
                os.remove(self._active_lock_path)
                print(f"[LOCK-SYSTEM] Đã xóa file khóa tạm thời: {self._active_lock_path}")
            self._active_lock_path = None
        except Exception as e:
            print(f"[LOCK-SYSTEM] Lỗi khi giải phóng file khóa tạm thời: {e}")

    def create_lock_direct(self, file_path):
        """API cho phép React yêu cầu tạo file lock trực tiếp."""
        self._create_lock_file(file_path)
        return {"status": "success"}

    def release_lock_direct(self):
        """API cho phép React yêu cầu giải phóng file lock."""
        self._release_lock_file()
        return {"status": "success"}

    def show_devtools(self):
        """API cho phép React yêu cầu hiển thị cửa sổ DevTools."""
        if not self._window:
            return {"status": "error", "message": "Cửa sổ chính chưa được cấu hình"}
            
        print("[DESKTOP-API] Đang yêu cầu mở DevTools...")
        # 1. Thử gọi phương thức chính thức của pywebview
        try:
            self._window.show_devtools()
            print("[DESKTOP-API] Đã mở DevTools thành công qua pywebview.")
            return {"status": "success"}
        except Exception as e_pv:
            print(f"[DESKTOP-API] Thử gọi pywebview thất bại: {e_pv}. Chuyển hướng sang phương thức Native WebView2...")
            
        # 2. Thử truy cập đối tượng Native CoreWebView2 (trên Windows) để mở trực tiếp
        try:
            native_window = getattr(self._window, 'native', None)
            if native_window:
                browser = getattr(native_window, 'browser', None)
                if browser:
                    web_view = getattr(browser, 'web_view', None)
                    if web_view and hasattr(web_view, 'CoreWebView2') and web_view.CoreWebView2:
                        # Gọi trực tiếp phương thức mở DevTools của Microsoft.Web.WebView2
                        web_view.CoreWebView2.OpenDevToolsWindow()
                        print("[DESKTOP-API] Đã mở DevTools thành công qua CoreWebView2.OpenDevToolsWindow().")
                        return {"status": "success"}
        except Exception as e_native:
            print(f"[DESKTOP-API] Trình gọi Native CoreWebView2 thất bại: {e_native}")
            return {"status": "error", "message": f"Không thể mở DevTools: {e_native}"}
            
        return {"status": "error", "message": "Không tìm thấy giao diện WebView2 hoạt động"}

    def mark_app_loaded(self):
        """API được React gọi khi giao diện React đã render và khởi động thành công."""
        self._app_loaded = True
        print("[DESKTOP-API] Nhận dạng: Ứng dụng React đã tải thành công hoàn tất!")
        return {"status": "success"}

    def save_file_native(self, filename, content_str):
        """Mở hộp thoại lưu tệp gốc (Native Save Dialog) của Windows/macOS/Linux và ghi file."""
        if not self._window:
            return {"status": "error", "message": "Cửa sổ chính chưa được khởi tạo"}
            
        try:
            # Sinh cấu hình bộ lọc loại tập tin hỗ trợ .kvl, .json
            if filename.endswith('.kvl'):
                file_types = ('Bộ mẫu KVL (*.kvl)', 'Tất cả tập tin (*.*)')
            elif filename.endswith('.json'):
                file_types = ('Tệp cấu hình JSON (*.json)', 'Tất cả tập tin (*.*)')
            else:
                file_types = ('Tất cả tập tin (*.*)',)
                
            # Hiển thị hội thoại lưu tệp chính thức của hệ điều hành
            file_path = self._window.create_file_dialog(
                webview.SAVE_DIALOG,
                save_filename=filename,
                file_types=file_types
            )
            
            if file_path:
                if isinstance(file_path, (tuple, list)):
                    if len(file_path) > 0:
                        file_path = file_path[0]
                    else:
                        file_path = None
            
            if file_path:
                # Ghi nội dung chuỗi vào đường dẫn người dùng chỉ định
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content_str)
                # Đăng ký khóa tạm thời cho file này
                self._create_lock_file(file_path)
                return {
                    "status": "success",
                    "file_path": file_path,
                    "filename": os.path.basename(file_path)
                }
            else:
                return {"status": "cancelled"}
        except Exception as e:
            print(f"Lỗi khi thực hiện lưu tệp tin ngoại tuyến: {e}")
            return {"status": "error", "message": str(e)}

    def save_file_direct(self, file_path, content_str):
        """Lưu đè nội dung trực tiếp vào đường dẫn có sẵn không hiển thị hộp thoại."""
        try:
            if not file_path:
                return {"status": "error", "message": "Đường dẫn không hợp lệ"}
            
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content_str)
            # Đảm bảo giữ file khóa tạm của file này
            self._create_lock_file(file_path)
            return {
                "status": "success",
                "file_path": file_path,
                "filename": os.path.basename(file_path)
            }
        except Exception as e:
            print(f"Lỗi khi lưu đè tệp tin trực tiếp: {e}")
            return {"status": "error", "message": str(e)}

    def load_excel_native(self):
        """Mở hộp thoại chọn tệp Excel của hệ điều hành và đọc trả về đường dẫn & dữ liệu base64."""
        if not self._window:
            return {"status": "error", "message": "Cửa sổ chính chưa được khởi tạo"}
            
        try:
            file_types = ('Tệp Excel (*.xlsx; *.xls)', 'Tất cả tập tin (*.*)')
            file_paths = self._window.create_file_dialog(
                webview.OPEN_DIALOG,
                allow_multiple=False,
                file_types=file_types
            )
            
            if file_paths:
                if isinstance(file_paths, (tuple, list)):
                    if len(file_paths) > 0:
                        file_path = file_paths[0]
                    else:
                        file_path = None
                else:
                    file_path = file_paths
            else:
                file_path = None
                
            if file_path:
                import base64
                with open(file_path, "rb") as f:
                    content = f.read()
                    base64_str = base64.b64encode(content).decode("utf-8")
                return {
                    "status": "success",
                    "file_path": file_path,
                    "filename": os.path.basename(file_path),
                    "base64": base64_str
                }
            else:
                return {"status": "cancelled"}
        except Exception as e:
            print(f"Lỗi khi mở tệp Excel qua Python: {e}")
            return {"status": "error", "message": str(e)}

    def read_file_base64_direct(self, file_path):
        """Đọc và trả về nội dung tệp tin cục bộ dưới dạng chuỗi base64 (sử dụng cho đồng bộ Excel ẩn)."""
        try:
            if not file_path or not os.path.exists(file_path):
                return {"status": "error", "message": "Tệp tin không tồn tại hoặc đường dẫn không hợp lệ."}
            
            import base64
            with open(file_path, "rb") as f:
                content = f.read()
                base64_str = base64.b64encode(content).decode("utf-8")
                
            return {
                "status": "success",
                "base64": base64_str,
                "filename": os.path.basename(file_path)
            }
        except Exception as e:
            print(f"Lỗi khi đọc file trực tiếp: {e}")
            return {"status": "error", "message": str(e)}

    def load_file_native(self):
        """Mở hộp thoại mở tệp gốc (Native Open Dialog) của Windows/macOS/Linux và đọc nội dung file."""
        if not self._window:
            return {"status": "error", "message": "Cửa sổ chính chưa được khởi tạo"}
            
        try:
            file_types = ('Mẫu nhãn KVL (*.kvl)', 'Tệp cấu hình JSON (*.json)', 'Tất cả tập tin (*.*)')
            
            # Hiển thị hội thoại mở tệp
            file_paths = self._window.create_file_dialog(
                webview.OPEN_DIALOG,
                allow_multiple=False,
                file_types=file_types
            )
            
            if file_paths:
                if isinstance(file_paths, (tuple, list)):
                    if len(file_paths) > 0:
                        file_path = file_paths[0]
                    else:
                        file_path = None
                else:
                    file_path = file_paths
            else:
                file_path = None
                
            if file_path:
                # Kiểm tra khóa tạm thời
                dir_name = os.path.dirname(file_path)
                base_name = os.path.basename(file_path)
                lock_filename = f"~${base_name}"
                lock_path = os.path.join(dir_name, lock_filename)
                
                is_locked = os.path.exists(lock_path)
                
                with open(file_path, 'r', encoding='utf-8') as f:
                    content_str = f.read()
                
                if is_locked:
                    return {
                        "status": "warning_locked",
                        "file_path": file_path,
                        "filename": base_name,
                        "content": content_str,
                        "message": f"CẢNH BÁO: Tệp tin '{base_name}' hiện đang được mở hoặc chỉnh sửa ở một cửa sổ/ứng dụng khác.\n\n(Phát hiện file tạm khóa: {lock_filename})\n\nBạn có chắc chắn muốn mở và tiếp tục chỉnh sửa không?"
                    }
                else:
                    # Tạo file lock tạm thời tự động
                    self._create_lock_file(file_path)
                    return {
                        "status": "success",
                        "file_path": file_path,
                        "filename": base_name,
                        "content": content_str
                    }
            else:
                return {"status": "cancelled"}
        except Exception as e:
            print(f"Lỗi khi mở tệp tin ngoại tuyến: {e}")
            return {"status": "error", "message": str(e)}

def get_resource_path(relative_path):
    """Lấy đường dẫn chính xác cho tài nguyên (Hỗ trợ cả khi chạy thường và khi đóng gói file .exe bằng PyInstaller)"""
    try:
        # Khi đóng gói bằng PyInstaller, các tệp được giải nén vào thư mục tạm _MEIPASS
        base_path = sys._MEIPASS
    except Exception:
        base_path = os.path.abspath(os.path.dirname(__file__))
    return os.path.join(base_path, relative_path)

def find_free_port():
    """Tìm một cổng mạng còn trống trên máy tính"""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('127.0.0.1', 0))
        return s.getsockname()[1]

def set_window_icon(window):
    """Cấu hình icon riêng của ứng dụng cho cửa sổ Windows Forms một cách an toàn."""
    try:
        # Cấu hình AppUserModelID để Windows liên kết biểu tượng Taskbar với file .exe của ứng dụng
        if sys.platform.startswith('win'):
            import ctypes
            ctypes.windll.shell32.SetCurrentProcessExplicitAppUserModelID("KiotLabel.Designer.Offline.1.0")
    except Exception:
        pass

    try:
        ico_path = get_resource_path("logo.ico")
        if os.path.exists(ico_path):
            native_window = getattr(window, 'native', None)
            if native_window:
                import System.Drawing
                # Nạp icon và đổi biểu tượng ở góc trái phía trên của ứng dụng
                native_window.Icon = System.Drawing.Icon(ico_path)
                print("[DESKTOP] Đã cập nhật biểu tượng cửa sổ (Windows Form Icon) thành công!")
    except Exception as e:
        # Bỏ qua nếu chạy trên macOS/Linux hoặc các thư viện chưa nạp xong
        print(f"[DESKTOP] Bỏ qua gán biểu tượng WinForms: {e}")

def configure_devtools(window):
    """
    Tìm kiếm và bật tính năng DevTools (F12, chuột phải Inspect) của WebView2 một cách thông minh mà không tự động mở cửa sổ DevTools lúc bắt đầu.
    """
    def run_config():
        import time
        # Thử cấu hình tối đa 100 lần (khoảng 10 giây)
        for _ in range(100):
            try:
                native_window = getattr(window, 'native', None)
                if not native_window:
                    time.sleep(0.1)
                    continue
                browser = getattr(native_window, 'browser', None)
                if not browser:
                    time.sleep(0.1)
                    continue
                web_view = getattr(browser, 'web_view', None)
                if not web_view:
                    time.sleep(0.1)
                    continue
                
                # Khi WebView2 đã khởi tạo xong hoàn toàn
                if hasattr(web_view, 'CoreWebView2') and web_view.CoreWebView2:
                    settings = web_view.CoreWebView2.Settings
                    settings.AreDevToolsEnabled = True
                    settings.AreDefaultContextMenusEnabled = True
                    print("[DESKTOP] Đã kích hoạt F12 và Chuột phải Inspect thành công!")
                    break
            except Exception as e:
                print(f"[DESKTOP] Đang dò tìm WebView2: {e}")
            time.sleep(0.1)

    # Chạy ngầm trong Thread để không gây lag/đơ cửa sổ UI chính lúc mở
    threading.Thread(target=run_config, daemon=True).start()

def run_server(directory, port):
    """Khởi chạy nền máy chủ HTTP để tránh lỗi CORS cho ES Modules trong môi trường cục bộ"""
    class SafeHTTPRequestHandler(SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            # Directory parameter hỗ trợ từ Python 3.7+ dùng để phục vụ thư mục cụ thể
            super().__init__(*args, directory=directory, **kwargs)

        def log_message(self, format, *args):
            # Tắt ghi log ra console để tránh làm phiền và tăng tối đa tốc độ phản hồi
            pass

    # Thiết lập server sử dụng địa chỉ localhost (127.0.0.1) an toàn, tránh mở kết nối ngoài mạng ngoài ý muốn
    with TCPServer(('127.0.0.1', port), SafeHTTPRequestHandler) as httpd:
        httpd.serve_forever()

def start_app_load_watchdog(api):
    """
    Theo dõi chủ động thời gian tải của giao diện React. 
    Nếu sau 15 giây kể từ lúc bắt đầu mà React chưa phản hồi lại qua API,
    hệ thống sẽ tự động xuất tệp tin log.txt báo cáo phân tích chi tiết lỗi.
    """
    def check():
        import time
        # Chờ 15 giây để React tải các tài nguyên CSS, JS và dựng giao diện.
        time.sleep(15.0)
        if not api._app_loaded:
            print("[CRITICAL-WATCHDOG] CẢNH BÁO: Ứng dụng không phản hồi thành công sau 15 giây! Đang sinh file log.txt...")
            try:
                # Tìm thư mục chạy phần mềm chính chủ
                exec_dir = os.path.dirname(os.path.abspath(sys.argv[0]))
                log_file = os.path.join(exec_dir, "log.txt")
                
                # Quét và đánh giá trạng thái thư mục dist của app
                dist_dir = get_resource_path("dist")
                dist_exists = os.path.exists(dist_dir)
                index_exists = False
                files_list = []
                
                if dist_exists:
                    index_exists = os.path.exists(os.path.join(dist_dir, "index.html"))
                    try:
                        files_list = os.listdir(dist_dir)
                    except Exception:
                        pass
                
                # Ghi nhận thời điểm hiện tại và cấu hình chẩn đoán
                with open(log_file, "w", encoding="utf-8") as f:
                    f.write("="*80 + "\n")
                    f.write("BÁO CÁO CHẨN ĐOÁN LỖI KHỞI ĐỘNG CHỦ ĐỘNG (KiotLabel Designer Offline)\n")
                    f.write("="*80 + "\n")
                    f.write(f"Thời gian phân tích: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
                    f.write(f"Hệ điều hành thích ứng: {sys.platform}\n")
                    f.write(f"Phiên bản Python: {sys.version}\n")
                    f.write(f"Trạng thái nạp React: CHƯA PHẢN HỒI (Trong khoảng thời gian giới hạn 15 giây)\n")
                    f.write("-"*80 + "\n")
                    f.write("THÔNG SỐ CHẨN ĐOÁN TÀI NGUYÊN:\n")
                    f.write(f"- Đường dẫn tài nguyên (get_resource_path): {dist_dir}\n")
                    f.write(f"- Thư mục dist tồn tại thực tế: {dist_exists}\n")
                    f.write(f"- Tệp index.html tồn tại: {index_exists}\n")
                    f.write(f"- Danh sách tệp tin trong thư mục dist/: {files_list}\n")
                    f.write("-"*80 + "\n")
                    f.write("CÁC NGUYÊN NHÂN LỖI THƯỜNG GẶP & GIẢI PHÁP ĐỀ XUẤT:\n")
                    f.write("\n")
                    f.write("1. XUNG ĐỘT HOẶC CHẶN KHỞI CHẠY LỚP MẠNG NỘI BỘ (Local Network / Firewall block):\n")
                    f.write("   - Mô tả: Hệ thống khởi tạo một máy chủ web nội bộ siêu nhẹ để nạp file. Một số phần mềm diệt virus (Kaspersky, Avast, Windows Defender) hoặc chính sách Firewall của máy chủ công ty có thể chặn máy chủ nội bộ 127.0.0.1.\n")
                    f.write("   - Để khắc phục: Thử cấp quyền chạy cho ứng dụng, hoặc tạm thời tắt tường lửa mạng kiểm tra.\n")
                    f.write("\n")
                    f.write("2. LỖI THỰC THI TRONG BẢN BUNDLE JAVASCRIPT (Web Runtime JS Error):\n")
                    f.write("   - Mô tả: Một lỗi nhỏ trong plugin, CSS hỏng hoặc lỗi logic trong React khiến toàn bộ trang web bị lỗi trắng màn hình (White Screen) khi tải ban đầu.\n")
                    f.write("   - Để khắc phục: Sử dụng tính năng chuột phải chọn 'Inspect' (Kiểm tra) hoặc nhấn phím F12/Ctrl+Shift+I để mở DevTools, qua đó chọn tab 'Console' của trình giám sát để xem lỗi báo đỏ (JS Exception).\n")
                    f.write("\n")
                    f.write("3. THƯ VIỆN MICROSOFT EDGE WEBVIEW2 RUNTIME CHƯA ĐƯỢC CHUẨN BỊ (Windows Only):\n")
                    f.write("   - Mô tả: WebView2 là nền tảng cốt lõi của Microsoft giúp dựng webview trên Windows 10/11. Nếu máy tính của bạn dùng hệ điều hành cũ (nhên Windows 7) hoặc WebView2 bị vô hiệu hóa/hỏng, giao diện sẽ không hiển thị.\n")
                    f.write("   - Để khắc phục: Tìm kiếm trên Google và cài đặt 'Edge WebView2 Runtime' mới nhất từ trang chủ Microsoft.\n")
                    f.write("\n")
                    f.write("4. QUÁ TẢI PHẦN CỨNG HOẶC TRỄ KHỞI ĐỘNG TRÊN MÁY PHÂN KHÚC THẤP (Performance limit):\n")
                    f.write("   - Mô tả: Máy tính có CPU/RAM cũ cần nhiều hơn 15 giây để khởi động toàn bộ tiến trình nạp webview.\n")
                    f.write("   - Lưu ý: Nếu sau thời gian này giao diện vẫn tự động tải xong, bạn có thể xóa tệp tin log.txt này đi và sử dụng bình thường.\n")
                    f.write("="*80 + "\n")
                print(f"[CRITICAL-WATCHDOG] Đã xuất báo cáo lỗi khởi động chủ động thành công vào file: {log_file}")
            except Exception as e_write:
                print(f"[CRITICAL-WATCHDOG] Không thể ghi tệp tin log.txt: {e_write}")
        else:
            print("[CRITICAL-WATCHDOG] Tuyệt vời! Ứng dụng đã khởi động thành công trong thời gian cho phép.")

    threading.Thread(target=check, daemon=True).start()

def main():
    # Thư mục chứa giao diện web tĩnh sau khi chạy lệnh 'npm run build'
    dist_dir = get_resource_path("dist")
    index_html = os.path.join(dist_dir, "index.html")

    # Kiểm tra xem người dùng đã thực hiện biên dịch giao diện chưa
    if not os.path.exists(index_html):
        print("=" * 80)
        print("XIN CHÚ Ý: Thư mục 'dist' chứa giao diện web không tìm thấy!")
        print("Vui lòng thực hiện biên dịch ứng dụng web của bạn trước bằng các lệnh:")
        print("  1. npm install")
        print("  2. npm run build")
        print("=" * 80)
        input("Nhấn Enter để thoát...")
        sys.exit(1)

    # Khởi chạy một server cực nhẹ ở background
    port = find_free_port()
    server_thread = threading.Thread(target=run_server, args=(dist_dir, port))
    server_thread.daemon = True
    server_thread.start()

    # URL trỏ đến máy chủ cục bộ vừa khởi chạy
    local_url = f"http://127.0.0.1:{port}"

    print(f"Đang khởi động ứng dụng ngoại tuyến LabelPro Designer Desktop tại {local_url}...")
    
    # Khởi tạo đối tượng API giao tiếp
    api = DesktopApi()

    # Khởi tạo cửa sổ Desktop chạy ứng dụng
    # pywebview tự động sử dụng nền tảng WebView2 hiện đại nhất trên Windows hoặc WebKit trên macOS/Linux.
    # Dữ liệu Lưu trữ cục bộ (localStorage, cookies) sẽ tự động lưu và ghi nhớ trên máy của người dùng.
    win = webview.create_window(
        title="KiotLabel Designer - Công Cụ Thiết Kế Và In Nhãn Offline",
        url=local_url,
        width=1350,
        height=850,
        min_size=(1024, 700),
        text_select=True, # Cho phép bôi đen copy nội dung
        zoomable=True,    # Cho phép lăn chuột phóng to thu nhỏ
        js_api=api        # Truyền API bridge sang môi trường JS/React
    )
    
    # Gán tham chiếu window vào cho API để gọi cửa sổ dialog
    api._window = win

    # Kích hoạt bộ kiểm soát nạp lỗi chủ động (15 giây watchdog)
    start_app_load_watchdog(api)

    # Đăng ký tự động cấu hình, bật DevTools và đổi icon khi cửa sổ xuất hiện
    def on_window_shown():
        set_window_icon(win)
        configure_devtools(win)
        
    win.events.shown += on_window_shown

    def on_window_closed():
        api._release_lock_file()

    win.events.closed += on_window_closed

    # Chạy ứng dụng webview (Đặt debug=False nhưng được tối ưu hóa bật sẵn DevTools độc lập qua CoreWebView2 Settings ở trên để tránh trễ 4 giây do quét cổng mạng và proxy console)
    webview.start(debug=False, private_mode=False) # private_mode=False để giữ lại bộ nhớ localStorage/Cookie vĩnh viễn

if __name__ == "__main__":
    main()
