# Insider Threat Detection System

Hệ thống phát hiện và ngăn chặn mối đe dọa nội bộ (USB, VPN, Web) sử dụng C# và AI.

## 👥 Thành viên nhóm
- **Nguyễn Đăng Tuyền: Leader / Infrastructure
- Bùi Gia Duy: Backend / Admin Dashboard
- Phạm Minh Hiếu: Client Agent / Security Logic
- Nguyễn Tuấn Anh: AI Integration / Tester

## 🚀 Cài đặt và Chạy thử (Local)

### Yêu cầu
- .NET 8 SDK
- MongoDB Community Server
- Visual Studio 2022

### Hướng dẫn
1. Clone repo: `git clone <link-repo>`
2. Cấu hình Database: Mở `src/InsiderThreat.Server/appsettings.json` và chỉnh ConnectionString.
3. Chạy Server:
   ```bash
   cd src/InsiderThreat.Server
   dotnet run
