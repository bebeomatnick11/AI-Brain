# Roblox AI Brain Registry

Dashboard + API để lưu trữ và theo dõi các AI Brain được tạo trong Roblox.

## Tính năng

- Đăng nhập bằng mật khẩu (không hard-code trên frontend)
- Session cookie httpOnly + expiration 8h
- Rate limit chống brute-force
- API đăng ký + heartbeat cho Roblox Brain (bảo vệ bằng secret)
- Dashboard dark futuristic, mobile-first
- Empty state: "Chưa có AI Brain nào được tạo và chạy trong Roblox."
- Polling tự động cập nhật
- Lưu trữ persistent (JSON file trên disk)

## Deploy (khuyến nghị Render.com - free)

1. Tạo tài khoản https://render.com
2. New → Web Service
3. Kết nối GitHub repo chứa repo này (hoặc upload zip)
4. Settings:
   - Build Command: `npm install`
   - Start Command: `node server.js`
   - Environment:
     - `DASHBOARD_PASSWORD` = `ILove36` (hoặc đổi)
     - `BRAIN_API_SECRET` = `AstraBrainSecret_ChangeMe_InProduction_2026` (đổi thành secret mạnh)
     - `NODE_ENV` = `production`
5. Add Persistent Disk (mount path `/opt/render/project/src/data` hoặc set `DATA_DIR`)
6. Deploy → nhận public URL dạng `https://your-app.onrender.com`

## Local test

```bash
npm install
node server.js
# Mở http://localhost:3000
# Password: ILove36
```

## API cho Roblox

**Headers bắt buộc:**
```
X-Brain-Secret: <BRAIN_API_SECRET>
Content-Type: application/json
```

**POST /api/brains/register**
```json
{
  "brainId": "unique-id",
  "userId": "123456",
  "displayName": "PlayerName",
  "originalName": "Player",
  "createdAt": 1710000000000,
  "brainVersion": "4.0",
  "skills": ["build", "code", "navigate"]
}
```

**POST /api/brains/heartbeat**
```json
{
  "brainId": "unique-id",
  "status": "online",
  "brainVersion": "4.0",
  "activeSkills": ["build", "observe"]
}
```

## Bảo mật

- Password chỉ nằm ở server env
- Không bao giờ trả password về client
- Brain API bắt buộc secret
- Rate limit login + API
- IP chỉ lưu dạng hash
