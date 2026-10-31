# longpeoo.io.vn

Portfolio cá nhân: kỹ sư công nghệ vũ trụ × travel vlogger.
Astro 7 · React islands · Tailwind v4 · shadcn/ui · deploy trên Cloudflare Workers.

**Quy tắc thiết kế & code: [SKILLS.md](SKILLS.md)** (bắt buộc đọc trước khi sửa giao diện).

## Chạy trên máy

```bash
fnm use          # Node 24 (đọc từ .node-version)
npm install
cp .env.example .env   # rồi điền YOUTUBE_API_KEY (không bắt buộc)
npm run dev      # http://localhost:4321 — hiện cả bài nháp (draft)
npm run check    # kiểm tra lỗi type
npm run build    # build production (ẩn bài nháp)
```

## Sửa nội dung

**Cách dễ nhất: vào `https://longpeoo.io.vn/admin`.**

Bấm **"Sign In with GitHub"**. Nút này đi qua worker `sveltia-cms-auth` tại `https://auth.longpeoo.io.vn`.
- Code của worker nằm ở thư mục `../sveltia-cms-auth`, nguồn từ [sveltia/sveltia-cms-auth](https://github.com/sveltia/sveltia-cms-auth).
- `GITHUB_CLIENT_ID` và `GITHUB_CLIENT_SECRET` lấy từ GitHub OAuth App "Longpeoo CMS", có callback `https://auth.longpeoo.io.vn/callback`.
- Hai biến trên được đặt dạng Secret ở Cloudflare → Workers & Pages → `sveltia-cms-auth` → Settings → Variables and Secrets.

Cách dự phòng: đăng nhập bằng **"Sign In Using Access Token"**.
1. GitHub → Settings → Developer settings → **Fine-grained tokens** → Generate new token.
2. Repository access: chỉ chọn `longPeoo/portfolio`. Permissions → **Contents: Read and write**.
3. Chép token, dán vào trang `/admin`.

Trên máy tính có thể chọn **"Work with Local Repository"** (Chrome/Edge) để sửa thẳng thư mục dự án.

Hoặc sửa file trực tiếp:

| Muốn đổi | File |
|---|---|
| Tên, nghề nghiệp, câu giới thiệu, vị trí, menu, mạng xã hội, email | `src/data/site.yaml` |
| Thêm dự án kỹ thuật | `src/content/projects/<ten-khong-dau>/index.md` + ảnh |
| Thêm chuyến đi | `src/content/journeys/<ten-khong-dau>/index.md` + ảnh |
| Trang Về tôi | `src/content/pages/about.md` (đổi `draft: false` khi viết xong) |
| Kênh YouTube, video nổi bật/ghim/ẩn | `src/data/videos.yaml` |

Các bài "Ví dụ: …" là bài nháp mẫu (`draft: true`, ảnh ghi chữ "Ảnh mẫu"): chỉ hiện khi chạy trên máy, **xoá đi khi có nội dung thật**.

## YouTube: video tự cập nhật

1. Điền `channelUrl` trong `src/data/videos.yaml`, ví dụ `https://www.youtube.com/@longpeoo`.
2. Tạo API key (miễn phí):
   - [console.cloud.google.com](https://console.cloud.google.com) → tạo project → **APIs & Services → Library** → bật **YouTube Data API v3**.
   - **Credentials → Create credentials → API key**. Bấm **Edit API key → API restrictions → Restrict key → YouTube Data API v3** → Save.
3. Dán key vào 3 nơi:
   - **Cloudflare**: Workers & Pages → `portfolio` → Settings → **Build → Variables and secrets** → thêm `YOUTUBE_API_KEY`.
   - **GitHub**: repo → Settings → Secrets and variables → **Actions** → New secret `YOUTUBE_API_KEY`.
   - File `.env` trên máy.

## Tự build lại mỗi 6 giờ

Workflow `.github/workflows/refresh.yml` build và deploy lại theo lịch để video mới tự lên web. Cần thêm 2 secret trên GitHub:
- `CLOUDFLARE_ACCOUNT_ID`: Cloudflare dashboard → Workers & Pages → cột bên phải "Account ID".
- `CLOUDFLARE_API_TOKEN`: My Profile → API Tokens → Create Token → mẫu **"Edit Cloudflare Workers"**.

Chưa có secret thì workflow tự bỏ qua, không báo lỗi.

## Deploy

Mỗi lần push lên nhánh `main` (kể cả bấm Lưu trong `/admin`), Cloudflare tự build và phát thư mục `dist/` sau khoảng 1 phút.
