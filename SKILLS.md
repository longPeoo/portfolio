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
- Nhãn telemetry chữ mono in hoa: mã + tên mục, ví dụ `MSN-00 · Bệ phóng`, `MSN-99 · Gửi tín hiệu`, toạ độ `21.03°N · 105.85°E`.
  Mã (`MSN-xx`, `P1`, `T+00`, `PL-01`, `ALT`, `UTC`) giữ nguyên ở mọi ngôn ngữ; phần chữ lấy từ `src/i18n/` (xem mục 5).
- Logo góc trái: Orbi + chữ **Longpeoo** (`public/brand/longpeoo-wordmark.webp`, dùng làm CSS mask nên tự đổi màu theo sáng/tối; rê chuột chuyển cam).
- Thanh menu "Mission Control": số thứ tự `01–05`, chấm "quỹ đạo" dưới mục đang mở, đồng hồ UTC và giờ Hà Nội, chấm trạng thái nhấp nháy.
- Hero: "Xin chào, tôi là", tên cực lớn kèm dấu chấm cam nảy (cỡ chữ tự co theo độ dài tên, luôn một dòng), chip nghề nghiệp,
  **Orbi bay theo quỹ đạo elip quanh Trái Đất**, vệt cam chạy theo, sao lấp lánh.
  - Trái Đất: WebGL (`src/scripts/earth.ts`), ảnh NASA, nghiêng 23,4°, tự quay, ghim cam ở Hà Nội, quầng khí quyển.
  - Giao diện sáng: **Mặt Trời** góc trên phải (SVG) chiếu sáng Trái Đất. Giao diện tối: nửa đêm có đèn thành phố, **Mặt Trăng** sáng quay quanh, bị che khi đi ra sau.
  - Hành tinh lưới SVG là bản dự phòng (trước khi ảnh tải xong, hoặc máy không có WebGL).
- Bảng tiến độ (P1–P6) với trạng thái Xong / Đang làm / Chờ (danh sách sửa trong CMS → Chữ trên giao diện → Trang chủ).
- Linh vật **Orbi** (vệ tinh tròn đeo máy ảnh): vui (header, hero), ngủ trên mặt trăng (footer), bối rối và trôi lơ lửng (404).
- Footer: email lớn, menu chia 2 cột, Orbi ngủ trên mặt trăng, nút **tên lửa** lên đầu trang.
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
| Hero | Orbi bay theo quỹ đạo (SVG `animateMotion`, 16 giây/vòng), vệt cam chạy theo, sao lấp lánh, dấu chấm sau tên nảy. Trái Đất quay 90 giây/vòng, ghim Hà Nội phát sóng; Mặt Trời xoay tia + phập phồng (sáng); Mặt Trăng 36 giây/vòng (tối); đổi giao diện thì ánh sáng chuyển mượt |
| Orbi | chớp mắt, đèn ăng-ten nhấp nháy, tấm pin vẫy, bay bồng bềnh (`float`), trôi (`lost`), chữ zZz (`sleep`) |
| Menu | chấm quỹ đạo phóng to theo spring; chấm trạng thái "ping"; header mờ nền khi cuộn |
| Menu mobile | mở dạng **vòng tròn** từ nút menu (`.menu-sheet` trong `global.css`), các mục bay vào lần lượt |
| Nút `launch` | nảy lò xo khi rê chuột, bóng đổ dài ra, mũi tên nhích chéo |
| Nút mạng xã hội | nảy lên, nghiêng, đổi màu cam |
| Liên hệ | sóng tín hiệu lan ra quanh Orbi khi rê chuột vào email |
| Footer | tên lửa phụt lửa khi rê chuột, phóng vút lên khi bấm |
| Trang chờ | vòng tròn đứt nét quay chậm, chip "Đang lắp ráp" nhấp nháy |
| **Màn đếm ngược** (P3) | T-3 → 1, Orbi cưỡi tên lửa cất cánh; chỉ lần đầu mỗi phiên, bấm/gõ phím để bỏ qua, tự ẩn sau 3 giây nếu script lỗi |
| **Bảng lật chữ** (P3) | hero: các nghề trong `site.yaml > roles` lật kiểu bảng giờ bay (ẩn dưới 900px) |
| **Đồng hồ độ cao** (P3) | thanh bên phải: cuộn trang = ALT 0 → 408 km (ẩn dưới 1180px) |
| **Cuộn mượt** (P3) | Lenis (chỉ chuột/touchpad; tắt khi đang mở menu/lightbox) |
| **Hiện dần khi cuộn** (P3) | phần tử có `data-reveal` (chỉ áp cho khối dưới màn hình đầu) |
| **Quỹ đạo phóng** (P3) | trang Về tôi: `data-trajectory` tự vẽ theo cuộn, `data-stage` bật ra; `data-gauge` thanh kỹ năng đầy dần |
| Thẻ dự án | rê chuột: lưới bản vẽ kỹ thuật, 4 góc ngắm, đèn trạng thái sáng |
| Thẻ chuyến đi | rê chuột: con dấu hộ chiếu đóng "cộp"; trang chi tiết: con dấu đóng một lần khi mở |
| Ảnh polaroid | dán băng keo, xoay nhẹ; rê chuột thì thẳng lại và nhấc lên |
| Video | khung CRT có vạch quét, nhấp nháy khi rê chuột; nút play nảy |
| Địa cầu Missions | tự xoay chậm, kéo để xoay, rê vào tên chuyến đi → xoay tới đó; đường bay nối các chuyến theo thời gian; **ghim bấm được** trên từng điểm → mở trang chuyến đi (ẩn khi quay ra sau); rê chuột lên địa cầu thì ngừng quay |
| Trứng phục sinh | gõ `launch` ở bất kỳ đâu → mưa sao băng |

Quy tắc kỹ thuật:
- Đường cong chuẩn: `--ease-spring` (nảy) và `--ease-out` (mượt). Thời lượng: `--dur-fast`, `--dur`, `--dur-slow`.
- Luôn tôn trọng `prefers-reduced-motion`: đã có reset toàn cục. Animation SMIL phải dừng thủ công bằng `pauseAnimations()` (xem `Hero.astro`).
- Script chạy theo sự kiện `astro:page-load` (vì có View Transitions). Listener gắn vào `window`/`document` phải gỡ khi chuyển trang (dùng `AbortController`, xem `MissionBar.astro`).
- Logic chuyển động toàn trang nằm ở `src/scripts/motion.ts`. **GSAP chỉ được tải động** khi trang có `[data-reveal]`, `[data-trajectory]` hoặc `[data-gauge]`. Không import GSAP tĩnh ở nơi khác.
- Thêm hiệu ứng cuộn mới: gắn thuộc tính `data-*` vào phần tử rồi xử lý trong `motion.ts`, không viết script riêng trong từng component.
- Trái Đất hero (`earth.ts` + ảnh `src/assets/earth/`, ~190KB) **chỉ tải động sau sự kiện `load`**, không tính vào JS tải ngay. Dừng vẽ khi ra khỏi màn hình; giảm chuyển động thì vẽ một khung tĩnh.

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
| Thẻ dự án | `Card` (`ProjectCard.astro`) |
| Xem ảnh phóng to, phát video | `Dialog` (`PhotoGallery.tsx`, `VideoGrid.tsx`) |
| Lọc video theo nhóm | `Tabs` (`VideoGrid.tsx`) |
| Form liên hệ (sau này) | `FieldGroup` + `Field` + `Input`/`Textarea` |

### Luật bắt buộc (từ skill shadcn)

- Ưu tiên variant và token ngữ nghĩa. `className` chủ yếu để bố cục.
- Dùng `flex flex-col gap-*`, **không** dùng `space-y-*` hay `space-x-*`. Dùng `size-10` thay cho `w-10 h-10`.
- Ghép class bằng `cn()`.
- Icon trong nút dùng `data-icon="inline-start|inline-end"`, không thêm class kích thước.
- Không tự đặt `z-index` cho Dialog, Sheet, Popover. Header dùng `z-index: 40` để nằm dưới các lớp phủ (z-50).

### Astro và React

- Component React **không có** `client:*` sẽ render thành HTML tĩnh, không tốn JS. Đây là mặc định.
- Chỉ thêm `client:*` khi cần tương tác, và chọn chỉ thị nhẹ nhất:

  | Island | Chỉ thị | Lý do |
  |---|---|---|
  | `MobileNav` | `client:media="(max-width: 860px)"` | desktop không tải React |
  | `MissionsGlobe`, `PhotoGallery`, `VideoGrid`, `VideoPlayer` | `client:visible` | chỉ tải khi cuộn tới |
  | `ThemeToggle` | **không hydrate** | render tĩnh, click gắn bằng script thuần trong `MissionBar.astro` |

  **Không dùng `client:load`** cho component chỉ cần một sự kiện click: render tĩnh rồi gắn sự kiện bằng `<script>`.
- **Ngân sách JS:** JS tải ngay ở trang chủ (desktop) ≤ 30 KB gzip (hiện khoảng 13 KB). Kiểm tra sau mỗi lần thêm thư viện.
- `asChild` của Radix **không nhận** phần tử viết trong file `.astro`. Muốn `asChild` với `<a>`, viết component bằng `.tsx`.
- Icon React (lucide) đặt trong file `.astro`: muốn style bằng `<style>` scoped thì phải dùng `:global(.ten-class)`.
- Icon thương hiệu (YouTube, Instagram…) render thành chuỗi SVG lúc build bằng `brandIconSvg()` trong `src/lib/site.ts`, để không đẩy cả bộ icon xuống trình duyệt.

---

## 5. Nội dung và câu chữ

- Ngôi thứ nhất "tôi", giọng thân thiện, câu ngắn.
- **Không viết chữ hiển thị trực tiếp trong component.** Mọi nhãn, tiêu đề mục, chữ trên nút nằm ở `src/i18n/vi.yaml` (đang dùng) và `src/i18n/en.yaml` (chuẩn bị song ngữ), đọc qua `t` trong `src/lib/i18n.ts`.
  Thêm chữ mới: thêm khoá vào **cả hai** file yaml + schema zod trong `i18n.ts` + trường trong `public/admin/config.yml` (collection `ui`). Island React nhận chữ qua prop `labels`.
- Ẩn dụ vũ trụ được phép, miễn không làm khó hiểu: "Về trạm phóng", "Gửi một tín hiệu".
- Nút nói rõ việc sẽ xảy ra: "Xem hành trình", "Kênh YouTube".
- **Không bịa thông tin cá nhân** (trường, công ty, số liệu). Chưa có dữ liệu thật thì giữ `ComingSoon`.

**Nơi sửa nội dung** (cũng sửa được qua giao diện **`/admin`**, tức Sveltia CMS, cấu hình ở `public/admin/config.yml`):

| Nội dung | File |
|---|---|
| Tên, nghề nghiệp, câu giới thiệu, vị trí, menu, mạng xã hội, email | `src/data/site.yaml` (kiểm tra bằng zod trong `src/lib/site.ts`) |
| Chữ cố định trên giao diện (nhãn MSN-xx, tiêu đề mục, nút, bảng tiến độ) | `src/i18n/vi.yaml`, `src/i18n/en.yaml` (zod trong `src/lib/i18n.ts`) |
| Dự án kỹ thuật | `src/content/projects/<ten-khong-dau>/index.md` + ảnh cùng thư mục |
| Chuyến đi (kèm toạ độ cho địa cầu, album, video) | `src/content/journeys/<ten-khong-dau>/index.md` + ảnh cùng thư mục |
| Trang Về tôi (timeline, kỹ năng, CV) | `src/content/pages/about.md` |
| Kênh YouTube, video nổi bật, ghim, ẩn, nhóm | `src/data/videos.yaml` |
| Màu, font, khoảng cách | `src/styles/global.css` |

- Schema của nội dung nằm ở `src/content.config.ts`. Thêm trường thì cập nhật cả schema lẫn `public/admin/config.yml`.
- `draft: true` = chỉ hiện khi `npm run dev`. Các bài mẫu "Ví dụ: …" đều là draft, xoá khi có nội dung thật.
- Trang chưa có nội dung tự hiện `ComingSoon`; khối trang chủ chưa có dữ liệu thì tự ẩn.
- Ảnh luôn đi qua `astro:assets` (`<Image>` hoặc `toGalleryPhotos()` trong `src/lib/photos.ts`) để tự nén WebP và tạo nhiều kích thước.
- Video lấy bằng **YouTube Data API v3** lúc build (`src/lib/youtube.ts`, biến môi trường `YOUTUBE_API_KEY`). Không đọc trang YouTube trái phép.

---

## 6. Cấu trúc thư mục

```
src/
├── components/
│   ├── ui/          ← shadcn (CLI quản lý; chỉ sửa bằng cách thêm variant)
│   ├── brand/       ← Orbi (linh vật, SVG thuần)
│   ├── layout/      ← MissionBar, Footer, ThemeToggle, MobileNav (island)
│   ├── media/       ← island React: MissionsGlobe, PhotoGallery, VideoGrid, VideoPlayer
│   └── sections/    ← Hero, HomeSections, PageHeader, SectionHead, ProjectCard, JourneyCard,
│                       MissionStatus, ComingSoon, SocialList
├── content/         ← projects/, journeys/, pages/ (Markdown + ảnh)
├── assets/earth/    ← ảnh NASA cho Trái Đất hero (day, night, moon .webp)
├── content.config.ts← schema nội dung
├── data/            ← site.yaml, videos.yaml
├── i18n/            ← vi.yaml, en.yaml (chữ trên giao diện)
├── layouts/BaseLayout.astro  ← SEO, JSON-LD, theme, preloader, altimeter, header/footer
├── lib/             ← site.ts, i18n.ts, content.ts, photos.ts, youtube.ts, utils.ts (cn, cleanPath)
├── pages/           ← mỗi file = một URL ([slug].astro = trang chi tiết)
├── scripts/         ← motion.ts (chuyển động toàn trang), earth.ts (Trái Đất WebGL ở hero)
└── styles/global.css
public/admin/        ← Sveltia CMS
.github/workflows/refresh.yml ← build lại mỗi 6 giờ (video mới)
```

---

## 7. Chất lượng tối thiểu (mọi thay đổi)

- **Responsive**: kiểm tra ở 320, 390, 768 và 1440px, không có thanh cuộn ngang (kể cả khi đang mở Dialog / phát video).
  - `DialogContent` chứa ảnh/video phải có `grid-cols-[minmax(0,1fr)]`, nếu không tiêu đề `truncate` sẽ đẩy khung rộng quá màn hình.
  - Animation phóng to (`scale` > 1) gần mép màn hình: dùng `animation-fill-mode: backwards` (không `both`/`forwards`) và đặt `overflow-x: clip` ở khối cha (xem con dấu ở `journeys/[slug].astro`).
- **Hai chế độ sáng/tối** đều đọc được.
- **Bàn phím**: mọi thứ bấm được đều focus được (viền đứt nét màu cam).
- **Ảnh**: dùng `<Image>`/`<Picture>` của Astro, luôn có `alt` (ảnh trang trí: `alt=""`, SVG trang trí: `aria-hidden`).
- **Tương phản**: chữ nhỏ màu cam dùng token `--signal-ink` / `text-signal-ink` (đậm hơn `--primary`) để đạt 4.5:1 trên nền giấy.
- **Hiệu năng**: xem ngân sách JS ở mục 4. Đo bằng PageSpeed Insights trên web thật sau mỗi đợt thay đổi lớn.
- **SEO**: mỗi trang truyền `title` và `description` riêng cho `BaseLayout`. Trang chi tiết truyền thêm `image` (ảnh bìa) và `schema` (JSON-LD `Article` / `CreativeWork`).
- **Đường dẫn**: URL không có `/` cuối (`trailingSlash: 'never'`, `build.format: 'file'`). So sánh đường dẫn trang hiện tại thì dùng `cleanPath()`.
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

- Push lên nhánh `main` (kể cả commit do CMS tạo) → Cloudflare Workers tự build (`npm run build`) và phát thư mục `dist/` (`wrangler.jsonc`, tên worker `portfolio`).
- Biến môi trường `YOUTUBE_API_KEY` phải có ở: Cloudflare (Worker → Settings → Build → Variables), GitHub Secrets (cho `refresh.yml`) và file `.env` trên máy.
- `refresh.yml` build và deploy lại mỗi 6 giờ (cần secret `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`). Thiếu secret thì workflow tự bỏ qua.
- Node 24 (file `.node-version`). Trên máy dùng `fnm use`.
- Tên miền `longpeoo.io.vn` (DNS ở Cloudflare). `www` chuyển hướng 301 về tên miền chính.
