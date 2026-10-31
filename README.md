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
| Tên, giới thiệu, menu, mạng xã hội, email | `src/data/site.yaml` |
| Màu sắc, font, khoảng cách | `src/styles/tokens.css` |
| Thứ tự các section trang chủ | `src/pages/index.astro` |

Mạng xã hội để trống link (`url: ""`) sẽ tự ẩn.

## Cấu trúc

```
src/
├── data/site.yaml          cấu hình chung
├── styles/                 tokens.css (design tokens) + global.css
├── layouts/BaseLayout      khung trang: SEO, font, theme, header, footer
├── components/
│   ├── layout/             MissionBar (header), Footer
│   ├── sections/           Hero, MissionStatus, ComingSoon…
│   ├── mascot/Orbi         linh vật vệ tinh
│   └── ui/                 Button, Icon
└── pages/                  mỗi file = một đường dẫn
```

## Deploy

Mỗi lần push lên nhánh `main`, Cloudflare tự build (`npm run build`) và phát thư mục `dist/`.
