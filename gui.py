import os
import sys
import threading
import socket
from http.server import SimpleHTTPRequestHandler
from socketserver import TCPServer
import webview

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
    
    # Khởi tạo cửa sổ Desktop chạy ứng dụng
    # pywebview tự động sử dụng nền tảng WebView2 hiện đại nhất trên Windows hoặc WebKit trên macOS/Linux.
    # Dữ liệu Lưu trữ cục bộ (localStorage, cookies) sẽ tự động lưu và ghi nhớ trên máy của người dùng.
    webview.create_window(
        title="LabelPro Designer - Công Cụ Thiết Kế Và In Nhãn Offline",
        url=local_url,
        width=1350,
        height=850,
        min_size=(1024, 700),
        text_select=True, # Cho phép bôi đen copy nội dung
        zoomable=True     # Cho phép lăn chuột phóng to thu nhỏ
    )
    
    # Chạy ứng dụng webview (Tự động tải tài nguyên cục bộ một cách tối ưu)
    webview.start(private_mode=False) # private_mode=False để giữ lại bộ nhớ localStorage/Cookie vĩnh viễn

if __name__ == "__main__":
    main()
