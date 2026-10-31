# SKILLS.md: quy tắc xây dựng longpeoo.io.vn

Tài liệu này là **luật** cho mọi thay đổi trên website, dù do người hay AI thực hiện.
Đọc hết trước khi thêm trang, section hay component mới. Khi một quy tắc cần đổi, sửa file này trước rồi mới sửa code.

Skill tham khảo đã cài trong `.claude/skills/`:
- `shadcn` (shadcn/ui): quy tắc dùng component, styling, CLI. **Áp dụng đầy đủ.**
- `frontend-design` (Anthropic): nguyên tắc chung về typography, câu chữ, chất lượng tối thiểu.
  Danh sách "dấu hiệu AI" trong skill này **không áp dụng** cho các yếu tố đã chốt ở mục 1
  (chính skill ghi: yêu cầu của chủ dự án luôn thắng).

---

## 1. Thiết kế đã chốt: "Mission Log"

Chủ dự án đã chọn và yêu cầu **giữ nguyên** thiết kế này. Không tự ý thiết kế lại. Muốn đổi hướng thì phải hỏi trước.

**Ý tưởng:** nhật ký sứ mệnh, kết hợp bảng điều khiển phóng tàu (kỹ sư vũ trụ) với sổ tay du lịch (travel vlogger).
Dễ thương, năng động nhưng vẫn nghiêm túc.

**Các yếu tố nhận diện phải giữ:**
- Nhãn telemetry chữ mono in hoa: `MSN-00 · Launch pad`, `MSN-99 · Send a signal`, toạ độ `21.03°N · 105.85°E`.
- Thanh menu "Mission Control": số thứ tự `01–05`, chấm "quỹ đạo" dưới mục đang mở, đồng hồ UTC và giờ Hà Nội, chấm trạng thái nhấp nháy.
- Hero: "Xin chào, tôi là", tên cực lớn kèm dấu chấm cam nảy, chip nghề nghiệp, **Orbi bay theo quỹ đạo elip quanh hành tinh lưới**, vệt cam chạy theo, sao lấp lánh.
- Bảng **Mission status** (P1–P5) với trạng thái Nominal / In progress / Queued.
- Linh vật **Orbi** (vệ tinh tròn đeo máy ảnh): vui (header, hero), ngủ trên mặt trăng (footer), bối rối và trôi lơ lửng (404).
- Footer: email lớn, Orbi ngủ trên mặt trăng, nút **tên lửa** lên đầu trang.
- Lớp hạt nhiễu (grain) nhẹ trên toàn trang.

---

## 2. Token: màu, chữ, bố cục

Tất cả token nằm trong `src/styles/global.css`. **Không** viết mã màu trực tiếp trong component.

### Màu

| Biến | Hex | Vai trò |
|---|---|---|
| `--c-paper` | `#F4EEE1` | nền chế độ sáng ("Day Travel") |
| `--c-paper-2` | `#EBE2CF` | nền phụ, footer |
| `--c-ink` | `#1B1B2F` | chữ, bóng đổ nút |
| `--c-signal` | `#FF6A3D` | **`primary`**: nút chính, dấu chấm, vệt quỹ đạo, focus |
| `--c-aurora` / `--c-aurora-deep` | `#3CCFB4` / `#12806F` | trạng thái "Nominal" (`ok`), tấm pin Orbi |
| `--c-sun` | `#FFC94D` | điểm nhấn nhỏ (lửa tên lửa, ống kính, màu bôi đen chữ) |
| `--c-space` / `--c-space-2` | `#0B1026` / `#151C3D` | nền chế độ tối ("Night Sky") |

Ba tầng biến:
1. **Bảng màu** `--c-*`: chỉ sửa ở đây khi muốn đổi màu thương hiệu.
2. **Token shadcn** (`--background`, `--primary`, `--muted-foreground`, `--border`…): trỏ vào bảng màu, component shadcn dùng tầng này.
3. **Tên rút gọn** (`--bg`, `--fg`, `--fg-muted`, `--line`, `--bg-elev`, `--bg-sunken`): trỏ về token shadcn, dùng trong `<style>` của các component tự vẽ.

Chế độ tối bật bằng class `.dark` trên `<html>` (chuẩn shadcn). Không dùng `data-theme`.

### Chữ

| Vai trò | Font | Ghi chú |
|---|---|---|
| Tiêu đề, tên, email lớn | **Archivo Variable** (`--font-display`, `font-heading`) | weight 700–800, `font-stretch` 112–125% |
| Chữ thường, nút, menu, form | **Be Vietnam Pro** (`--font-body`, `font-sans`) | 400/500/600/700, có italic 400 |
| Nhãn telemetry, đồng hồ, số thứ tự | **JetBrains Mono** (`--font-mono`, class `.mono`) | in hoa, giãn chữ 0.08em |

Thang cỡ chữ: `--fs-mono`, `--fs-sm`, `--fs-base`, `--fs-lg`, `--fs-h3`, `--fs-h2`, `--fs-h1` (đều dùng `clamp`, tự co giãn theo màn hình).

### Bố cục

- Khung nội dung: class `.container` (max 1320px, lề `--gutter` = 16–48px).
- Header cố định cao `--header-h` (68px). Section đầu trang cần `padding-top` cộng thêm khoảng này.
- Khoảng cách dọc giữa các section: `--section-y`.

---

## 3. Chuyển động (phải giữ nguyên)

| Nơi | Chuyển động |
|---|---|
| Hero | Orbi bay theo quỹ đạo (SVG `animateMotion`, 16 giây/vòng), vệt cam chạy theo, sao lấp lánh, hành tinh lắc nhẹ, dấu chấm sau tên nảy |
| Orbi | chớp mắt, đèn ăng-ten nhấp nháy, tấm pin vẫy, bay bồng bềnh (`float`), trôi (`lost`), chữ zZz (`sleep`) |
| Menu | chấm quỹ đạo phóng to theo spring; chấm trạng thái "ping"; header mờ nền khi cuộn |
| Menu mobile | mở dạng **vòng tròn** từ nút menu (`.menu-sheet` trong `global.css`), các mục bay vào lần lượt |
| Nút `launch` | nảy lò xo khi rê chuột, bóng đổ dài ra, mũi tên nhích chéo |
| Nút mạng xã hội | nảy lên, nghiêng, đổi màu cam |
| Liên hệ | sóng tín hiệu lan ra quanh Orbi khi rê chuột vào email |
| Footer | tên lửa phụt lửa khi rê chuột, phóng vút lên khi bấm |
| Trang chờ | vòng tròn đứt nét quay chậm, chip "Đang lắp ráp" nhấp nháy |

Quy tắc kỹ thuật:
- Đường cong chuẩn: `--ease-spring` (nảy) và `--ease-out` (mượt). Thời lượng: `--dur-fast`, `--dur`, `--dur-slow`.
- Luôn tôn trọng `prefers-reduced-motion`: đã có reset toàn cục. Animation SMIL phải dừng thủ công bằng `pauseAnimations()` (xem `Hero.astro`).
- Script chạy theo sự kiện `astro:page-load` (vì có View Transitions). Listener gắn vào `window`/`document` phải gỡ khi chuyển trang (dùng `AbortController`, xem `MissionBar.astro`).
- Giai đoạn P3 (GSAP, Lenis) **bổ sung** chuyển động mới, không thay thế những chuyển động trên.

---

## 4. Component: shadcn/ui

Cấu hình: `components.json` (style `radix-nova`, base **radix**, icon **lucide**). Component nằm ở `src/components/ui/`.

**Quy trình thêm component:**
```bash
npx shadcn@latest search -q "tên"        # tìm trước khi tự viết
npx shadcn@latest docs <component>        # đọc docs + ví dụ
npx shadcn@latest add <component> -y      # cài
```
Sau khi `add`, đọc lại file vừa thêm.

### Variant riêng của dự án

Phong cách Mission Log được đưa vào component shadcn bằng **variant** (theo đúng cách skill shadcn khuyên), không đè bằng class tuỳ tiện:

| Component | Variant | Dùng cho |
|---|---|---|
| `Button` | `launch` + size `pill` | nút chính: viên thuốc cam, bóng đổ nét mực |
| `Button` | `launch-outline` + size `pill` | nút phụ: viền theo màu chữ, đảo màu khi rê chuột |
| `Button` | `ink` | nút "Liên hệ" trên thanh menu |
| `Button` | `social` + size `icon-lg` | nút icon mạng xã hội |
| `Badge` | `telemetry`, `telemetry-solid` | chip nghề nghiệp ở hero |
| `Badge` | `signal` | chip "Đang lắp ráp" |
| `Badge` | `nominal`, `active`, `queued` | trạng thái trong Mission status |

Cần kiểu mới thì thêm variant vào `cva` trong `button.tsx` / `badge.tsx`, rồi ghi vào bảng này.

### Chọn component

| Cần | Dùng |
|---|---|
| Nút, link trông như nút | `Button`. Trong file `.astro`: `<a class={cn(buttonVariants({...}))}>`, **bắt buộc bọc `cn()`** để class mặc định không đè variant |
| Chip, nhãn trạng thái | `Badge` |
| Menu mobile, panel bên | `Sheet` (bắt buộc có `SheetTitle`, có thể `sr-only`) |
| Danh sách link có icon (mạng xã hội…) | `Item` + `ItemGroup` (`SocialList.tsx`) |
| Trạng thái trống, lỗi 404 | `Empty` |
| Thông báo, chú thích | `Alert` |
| Đường kẻ phân cách | `Separator` |
| Xem ảnh phóng to (P4) | `Dialog` |
| Lọc video theo nhóm (P4) | `Tabs` hoặc `ToggleGroup` |
| Form liên hệ (P2) | `FieldGroup` + `Field` + `Input`/`Textarea` |

### Luật bắt buộc (từ skill shadcn)

- Ưu tiên variant và token ngữ nghĩa. `className` chủ yếu để bố cục.
- Dùng `flex flex-col gap-*`, **không** dùng `space-y-*` hay `space-x-*`. Dùng `size-10` thay cho `w-10 h-10`.
- Ghép class bằng `cn()`.
- Icon trong nút dùng `data-icon="inline-start|inline-end"`, không thêm class kích thước.
- Không tự đặt `z-index` cho Dialog, Sheet, Popover. Header dùng `z-index: 40` để nằm dưới các lớp phủ (z-50).

### Astro và React

- Component React **không có** `client:*` sẽ render thành HTML tĩnh, không tốn JS. Đây là mặc định.
- Chỉ thêm `client:*` khi cần tương tác: `ThemeToggle` (`client:load`), `MobileNav` (`client:media`).
- `asChild` của Radix **không nhận** phần tử viết trong file `.astro`. Muốn `asChild` với `<a>`, viết component bằng `.tsx`.
- Icon React (lucide) đặt trong file `.astro`: muốn style bằng `<style>` scoped thì phải dùng `:global(.ten-class)`.
- Icon thương hiệu (YouTube, Instagram…) render thành chuỗi SVG lúc build bằng `brandIconSvg()` trong `src/lib/site.ts`, để không đẩy cả bộ icon xuống trình duyệt.

---

## 5. Nội dung và câu chữ

- Ngôi thứ nhất "tôi", giọng thân thiện, câu ngắn.
- Ẩn dụ vũ trụ được phép, miễn không làm khó hiểu: "Về trạm phóng", "Gửi một tín hiệu".
- Nút nói rõ việc sẽ xảy ra: "Xem hành trình", "Kênh YouTube".
- **Không bịa thông tin cá nhân** (trường, công ty, số liệu). Chưa có dữ liệu thật thì giữ `ComingSoon`.

**Nơi sửa nội dung:**

| Nội dung | File |
|---|---|
| Tên, nghề nghiệp, câu giới thiệu, vị trí, menu, mạng xã hội, email | `src/data/site.yaml` (kiểm tra bằng zod trong `src/lib/site.ts`) |
| Dự án, chuyến đi, video ghim (từ P2) | `src/content/**` (content collections) |
| Màu, font, khoảng cách | `src/styles/global.css` |

Thêm trường mới vào `site.yaml` thì cập nhật schema trong `src/lib/site.ts` cùng lúc.

---

## 6. Cấu trúc thư mục

```
src/
├── components/
│   ├── ui/          ← shadcn (CLI quản lý; chỉ sửa bằng cách thêm variant)
│   ├── brand/       ← Orbi (linh vật, SVG thuần)
│   ├── layout/      ← MissionBar, Footer, ThemeToggle (island), MobileNav (island)
│   └── sections/    ← Hero, MissionStatus, ComingSoon, SocialList…
├── data/site.yaml
├── layouts/BaseLayout.astro  ← SEO, theme, header/footer
├── lib/             ← site.ts (đọc + kiểm tra yaml), utils.ts (cn)
├── pages/           ← mỗi file = một URL
└── styles/global.css
```

---

## 7. Chất lượng tối thiểu (mọi thay đổi)

- **Responsive**: kiểm tra ở 390px và 1440px, không có thanh cuộn ngang.
- **Hai chế độ sáng/tối** đều đọc được.
- **Bàn phím**: mọi thứ bấm được đều focus được (viền đứt nét màu cam).
- **Ảnh**: dùng `<Image>`/`<Picture>` của Astro, luôn có `alt` (ảnh trang trí: `alt=""`, SVG trang trí: `aria-hidden`).
- **Hiệu năng**: trang chủ dưới 150KB JS.
- **SEO**: mỗi trang truyền `title` và `description` riêng cho `BaseLayout`.
- **Tiếng Việt**: kiểm tra dấu hiển thị đúng ở cả 3 font.

**Trước khi commit:**
```bash
npm run check    # 0 lỗi type
npm run build    # build sạch
```
Rồi chụp màn hình (sáng/tối, desktop/mobile), so với thiết kế ở mục 1 và các chuyển động ở mục 3.

---

## 8. Thêm một trang mới

1. Tạo `src/pages/<ten>.astro` dùng `BaseLayout` với `title` và `description`.
2. Mở đầu trang bằng nhãn telemetry `MSN-xx · Tên` (đánh số tiếp theo menu) và tiêu đề `h1`.
3. Ghép từ `sections/`. Khối mới thì tạo trong `sections/`, dựng từ component shadcn và variant ở mục 4.
4. Thêm vào `nav` trong `site.yaml` nếu cần hiện trên menu.
5. Chạy checklist mục 7.

---

## 9. Deploy

- Push lên nhánh `main` → Cloudflare Workers tự build (`npm run build`) và phát thư mục `dist/` (`wrangler.jsonc`, tên worker `portfolio`).
- Node 24 (file `.node-version`). Trên máy dùng `fnm use`.
- Tên miền `longpeoo.io.vn` (DNS ở Cloudflare). `www` chuyển hướng 301 về tên miền chính.
