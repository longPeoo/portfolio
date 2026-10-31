# longpeoo.io.vn

Portfolio cá nhân: kỹ sư công nghệ vũ trụ × travel vlogger.
Xây bằng [Astro](https://astro.build), deploy trên Cloudflare.

## Chạy trên máy

```bash
fnm use          # dùng Node 24 (đọc từ file .node-version)
npm install
npm run dev      # mở http://localhost:4321
```

## Sửa nội dung ở đâu?

| Muốn đổi | Sửa file |
|---|---|
| Tên, nghề nghiệp, câu giới thiệu, vị trí, menu, mạng xã hội, email | `src/data/site.yaml` |
| Màu sắc, font, khoảng cách | `src/styles/global.css` |
| Thứ tự các section trang chủ | `src/pages/index.astro` |

Mạng xã hội để trống link (`url: ""`) sẽ tự ẩn.

## Quy tắc thiết kế & code

Xem **[SKILLS.md](SKILLS.md)**: bắt buộc đọc trước khi thêm trang hoặc component.
Stack: Astro 7 · React islands · Tailwind v4 · shadcn/ui (radix-nova).

```bash
npm run check    # kiểm tra type
npm run build    # build production
npx shadcn@latest add <component>   # thêm component shadcn
```

## Deploy

Mỗi lần push lên nhánh `main`, Cloudflare tự build (`npm run build`) và phát thư mục `dist/`.
