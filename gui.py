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

    def save_file_native(self, filename, content_str):
        """Mở hộp thoại lưu tệp gốc (Native Save Dialog) của Windows/macOS/Linux và ghi file."""
        if not self._window:
            return "error: Cửa sổ chính chưa được khởi tạo"
            
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
                return "success"
            else:
                return "cancelled"
        except Exception as e:
            print(f"Lỗi khi thực hiện lưu tệp tin ngoại tuyến: {e}")
            return f"error: {str(e)}"

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
        js_api=api,       # Truyền API bridge sang môi trường JS/React
        icon=get_resource_path("logo.svg") # Gán biểu tượng KiotLabel làm icon cửa sổ ứng dụng
    )
    
    # Gán tham chiếu window vào cho API để gọi cửa sổ dialog
    api._window = win

    # Đăng ký tự động cấu hình và bật DevTools trong nền khi cửa sổ xuất hiện
    win.events.shown += lambda: configure_devtools(win)

    # Chạy ứng dụng webview (Đặt debug=False để tránh tự động bùng màn hình DevTools lúc khởi động)
    webview.start(debug=False, private_mode=False) # private_mode=False để giữ lại bộ nhớ localStorage/Cookie vĩnh viễn

if __name__ == "__main__":
    main()
