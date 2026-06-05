; Script Inno Setup - Biên dịch bản cài đặt chuyên nghiệp cho LabelPro Designer
; Tải phần mềm Inno Setup miễn phí tại: https://jrsoftware.org/isdl.php
; Mở tệp .iss này trong Inno Setup và nhấn Ctrl+F9 (hoặc nút Compile) để tạo tệp cài đặt Setup dạng .exe!

[Setup]
AppName=LabelPro Designer
AppVersion=1.0.0
AppPublisher=LabelPro
DefaultDirName={commonpf}\LabelPro Designer
DefaultGroupName=LabelPro Designer
UninstallDisplayIcon={app}\LabelProDesigner.exe
OutputDir=installer_output
OutputBaseFilename=LabelPro_Setup_Offline
Compression=lzma2/max
SolidCompression=yes
; Cho phép cài đặt không cần quyền Admin nếu cài vào thư mục người dùng cá nhân (user folders) hoặc hỏi khi cài vào Program Files
PrivilegesRequired=admin

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Tạo biểu tượng ngoài màn hình Desktop (Create a desktop shortcut)"; GroupDescription: "Lựa chọn thêm:"

[Files]
; Tệp nguồn là file .exe sau khi bạn chạy PyInstaller đóng gói thành công
Source: "dist\LabelProDesigner.exe"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
; Tạo shortcut trong menu Start và ngoài màn hình Desktop
Name: "{group}\LabelPro Designer"; Filename: "{app}\LabelProDesigner.exe"
Name: "{userdesktop}\LabelPro Designer"; Filename: "{app}\LabelProDesigner.exe"; Tasks: desktopicon

[Run]
; Cho phép khởi chạy ngay phần mềm sau khi nhấn nút hoàn thành cài đặt
Filename: "{app}\LabelProDesigner.exe"; Description: "Khởi chạy LabelPro Designer ngay bây giờ"; Flags: postinstall nowait skipifsilent
