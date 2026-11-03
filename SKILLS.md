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
- Thanh menu "Mission Control": số thứ tự `01–05`, chấm "quỹ đạo" dưới mục đang mở, đồng hồ UTC và giờ Hà Nội, chấm trạng thái nhấp nháy, nút nhạc nền cạnh nút đổi giao diện.
- Hero: "Xin chào, tôi là", tên cực lớn kèm dấu chấm cam nảy (cỡ chữ tự co theo độ dài tên, luôn một dòng), chip nghề nghiệp,
  **Orbi bay theo quỹ đạo elip quanh Trái Đất**, vệt cam chạy theo, sao lấp lánh.
  - Trái Đất: WebGL (`src/scripts/earth.ts`), ảnh NASA, nghiêng 23,4°, tự quay, ghim cam ở Hà Nội, quầng khí quyển.
  - Giao diện sáng: **Mặt Trời** góc trên phải (vẽ bằng shader: rìa tối dần, hạt sáng, vết đen, nhật hoa; SVG chỉ là bản dự phòng) chiếu sáng Trái Đất. Giao diện tối: nửa đêm có đèn thành phố, **Mặt Trăng** sáng quay quanh, bị che khi đi ra sau.
  - Hành tinh lưới SVG là bản dự phòng (trước khi ảnh tải xong, hoặc máy không có WebGL).
- Linh vật **Orbi** (vệ tinh tròn đeo máy ảnh): vui (header, hero), ngủ trên Mặt Trăng / sạc pin cạnh Mặt Trời (footer), bối rối và trôi lơ lửng (404).
- Footer: email lớn, menu 3 cột × 2 dòng, "bầu trời của Orbi" (tối: Mặt Trăng thật, ảnh NASA dùng chung với hero; sáng: Mặt Trời vẽ bằng CSS), nút **tên lửa** lên đầu trang. Ba khối căn giữa theo chiều dọc, cách đều vạch trên và vạch dưới; khoảng trống hai bên menu bằng nhau; nhãn "Kết trang" và "Điều hướng" thẳng hàng (subgrid). Dưới 1280px menu xuống dưới email.
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

- Đầu trang (`PageHeader`, `ComingSoon`, trang Liên hệ): **căn giữa**, tiêu đề tối đa 24ch (`text-wrap: balance`), mô tả tối đa 68ch. Riêng trang Về tôi căn trái (`align="start"`) vì nền vũ trụ nằm bên phải.
- Khung nội dung: class `.container` (max 1320px, lề `--gutter` = 16–48px).
- Header cố định cao `--header-h` (68px). Section đầu trang cần `padding-top` cộng thêm khoảng này.
- Khoảng cách dọc giữa các section: `--section-y`.
- Hero trang chủ: khối quỹ đạo giới hạn theo chiều cao màn hình (`100svh − header − 240px`), hero cao theo nội dung: chữ và nút luôn nằm trong màn hình đầu, phần kế tiếp ló lên ở mép dưới.
- Lưới thẻ có nhiều phần (nhãn, tiêu đề, thanh đo…) dùng **CSS subgrid** (`grid-template-rows: subgrid`) để các thẻ cùng hàng thẳng hàng dù tiêu đề dài ngắn khác nhau (xem `.subsystem` ở `SkillGrid.astro`).

---

## 3. Chuyển động (phải giữ nguyên)

| Nơi | Chuyển động |
|---|---|
| Hero | Orbi bay theo quỹ đạo (SVG `animateMotion`, 16 giây/vòng), vệt cam chạy theo, sao lấp lánh, dấu chấm sau tên nảy. Trái Đất quay 90 giây/vòng, ghim Hà Nội phát sóng; Mặt Trời bề mặt sôi lăn tăn + nhật hoa toả tia (sáng); Mặt Trăng 36 giây/vòng (tối); đổi giao diện thì ánh sáng chuyển mượt |
| Orbi | chớp mắt, đèn ăng-ten nhấp nháy, tấm pin vẫy, bay bồng bềnh (`float`), trôi (`lost`), chữ zZz (`sleep`) |
| Menu | chấm quỹ đạo phóng to theo spring; chấm trạng thái "ping"; header mờ nền khi cuộn |
| Nút nhạc nền | nốt nhạc ↔ cột sóng cam nhảy theo nhịp khi đang phát; âm lượng tăng dần ~0,8 giây khi bật |
| Menu mobile | mở dạng **vòng tròn** từ nút menu (`.menu-sheet` trong `global.css`), các mục bay vào lần lượt |
| Nút `launch` | nảy lò xo khi rê chuột, bóng đổ dài ra, mũi tên nhích chéo |
| Nút mạng xã hội | nảy lên, nghiêng, đổi màu cam |
| Liên hệ | sóng tín hiệu lan ra quanh Orbi khi rê chuột vào email |
| Footer | tên lửa phụt lửa khi rê chuột, phóng vút lên khi bấm. **Tối:** Mặt Trăng tự quay, Orbi ngủ đung đưa trên đỉnh, sao lấp lánh, sao băng; rê chuột → Orbi thức dậy nhảy lên. **Sáng:** Mặt Trời có vết đen trôi, nhật hoa xoay, hạt năng lượng bay vào tấm pin Orbi (pin sáng nhịp); rê chuột → Orbi nhào lộn. Đổi giao diện: Mặt Trời lặn, Mặt Trăng mọc, Orbi bay sang |
| Trang chờ | Orbi trong vòng tròn đứt nét quay chậm ở trên, chữ căn giữa bên dưới, chip "Đang lắp ráp" nhấp nháy; nút phụ (vd. Tải CV) truyền qua slot |
| **Màn đếm ngược** (P3) | T-3 → 1, Orbi cưỡi tên lửa cất cánh; chỉ lần đầu mỗi phiên, bấm/gõ phím để bỏ qua, tự ẩn sau 3 giây nếu script lỗi |
| **Bảng lật chữ** (P3) | hero: các nghề trong `site.yaml > roles` lật kiểu bảng giờ bay (ẩn dưới 900px) |
| **Đồng hồ độ cao** (P3) | thanh bên phải: cuộn trang = ALT 0 → 408 km (ẩn dưới 1180px; ẩn ở trang Về tôi vì đã có số đo của nền vũ trụ) |
| **Cuộn mượt** (P3) | Lenis (chỉ chuột/touchpad; tắt khi đang mở menu/lightbox) |
| **Hiện dần khi cuộn** (P3) | phần tử có `data-reveal` (chỉ áp cho khối dưới màn hình đầu) |
| **Quỹ đạo phóng** (P3) | trang Về tôi: `data-trajectory` tự vẽ theo cuộn, `data-stage` bật ra. Trang Vũ trụ: `data-gauge` thanh kỹ năng đầy dần (`SkillGrid.astro`) |
| **Nền vũ trụ** | trang Về tôi: canvas cố định phủ kín màn hình, nằm sau nội dung (`CosmosBackdrop.astro` + `src/scripts/cosmos.ts`, tải động từ `initCosmos()` trong `motion.ts`). Cuộn hết câu chuyện + timeline (`data-cosmos-track`) = camera lùi theo thang đo thật, 6 bậc L0–L5: Trái Đất (ghim Hà Nội, ngày/đêm) → Trái Đất–Mặt Trăng → hành tinh đá → Hệ Mặt Trời (Kuiper, Oort, Voyager 1) → sao lân cận → Dải Ngân Hà ("Bạn ở đây"). Tối: vũ trụ thật; sáng: bản đồ sao in mực trên giấy. Lớp nền mờ sau cột chữ để chữ luôn đọc được; số đo L/FOV/ZOOM ở góc dưới phải. Không có tác vụ > 50ms (dựng Ngân Hà chia nhiều lượt). Giảm chuyển động: nhảy thẳng tới từng bậc, hình đứng yên |
| Thẻ dự án | rê chuột: lưới bản vẽ kỹ thuật, 4 góc ngắm, đèn trạng thái sáng; trang chi tiết có album ảnh (`gallery`) và nút "Tất cả dự án" kiểu `launch-outline` |
| Thẻ chuyến đi | rê chuột: con dấu hộ chiếu đóng "cộp"; trang chi tiết: con dấu đóng một lần khi mở; nút "Tất cả hành trình" là `launch-outline` cỡ `pill`, mũi tên nhích trái khi rê chuột |
| Sắp xếp hành trình | `JourneyGrid.astro`: Gần nhất (mặc định) / Xa nhất / A → Z / Z → A; nền cam trượt theo spring tới nút đang chọn, thẻ trượt sang chỗ mới bằng View Transitions (giảm chuyển động: đổi ngay). Hành trình `ongoing` (Việt Nam) luôn trên cùng, chuyến chưa có ngày xếp cuối. Lựa chọn lưu ở `?sort=` |
| Ảnh polaroid | dán băng keo, xoay nhẹ; rê chuột thì thẳng lại và nhấc lên. Lưới đọc trái → phải: 2 cột (< 480px) → 3 → 4 (≥ 768px) → 5 (≥ 1024px). Trang chủ tối đa 2 dòng đầy |
| Vlog (`/vlogs`, đường dẫn cũ `/videos` chuyển hướng 301) | khung CRT có vạch quét, nhấp nháy khi rê chuột; nút play nảy |
| Dải cờ | "Từ [cờ nhà] đến [các nước đã đến]" (bản tiếng Anh: "From … to …", chữ lấy từ `flagsFrom`/`flagsTo`) (trang Hành trình, khối "Mình đã đến" ở trang chủ). Cờ nhà (`site.yaml > homeCountry`) to hơn, viền cam, quầng vàng phập phồng; rê chuột: cờ nảy lên, nghiêng, viền cam |
| Địa cầu Missions | Trái Đất thật (WebGL, ảnh NASA dùng chung với hero: `src/scripts/globe.ts`), sáng: chiếu chính diện; tối: phía khuất có đèn thành phố. Tự xoay chậm (dừng khi giảm chuyển động), kéo để xoay (chuột: ngang + dọc, cảm ứng: chỉ ngang), rê vào tên chuyến đi → xoay tới đó; đường bay nối các chuyến có ngày theo thời gian; **ghim là cờ tròn** của nước đó, tên nơi chỉ hiện khi rê chuột/đang chọn (điểm gần nhau không chồng chữ); chuyến có trang riêng thì bấm ghim để mở (ẩn khi quay ra sau); rê chuột lên địa cầu thì ngừng quay. **Phóng to** tới ×8 (`MAX_ZOOM` trong `globe.ts`); phóng quá ×1.5 thì tải ảnh nét `day-8k.webp` (1,2 MB, máy tính) hoặc `day-4k.webp` (0,4 MB, điện thoại), hiện dần lên — không tải nếu người xem không phóng to: cuộn chuột trên địa cầu (phóng vào đúng chỗ con trỏ; trang vừa cuộn < 300 ms hoặc đã chạm giới hạn ×1/×6 thì cú cuộn thuộc về trang, không "kẹt"), nút +/−/cả địa cầu, chụm 2 ngón, bấm đúp; khi phóng to bề mặt cắt theo "ống kính" tròn, ngừng tự quay, chạm một ngón xoay mọi hướng. Rê vào một nơi trong danh sách → phóng tới ×3. Ghim gần nhau < 22px gom thành cụm có số "+n", rê hiện tên các nơi, bấm → phóng ×2,5 vào giữa cụm. Danh sách bên cạnh (trang Hành trình) cao tối đa bằng địa cầu, tự cuộn bên trong (`data-lenis-prevent`) |
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
| `Badge` | `nominal`, `active`, `queued` | đèn trạng thái (`nominal` dùng ở thẻ kỹ năng trang Vũ trụ) |

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
| Sắp xếp danh sách tĩnh (chuyến đi) | nút `aria-pressed` + script thuần (`JourneyGrid.astro`), không hydrate React |
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
| `MusicToggle.astro` | không phải island | script thuần; `Audio` sống trong script module nên chuyển trang nhạc vẫn phát. `preload="none"`: không tải byte nhạc nào trước khi bấm. Mặc định tắt (trình duyệt chặn tự phát có tiếng). Danh sách trống = không render nút |

  **Không dùng `client:load`** cho component chỉ cần một sự kiện click: render tĩnh rồi gắn sự kiện bằng `<script>`.
- **Ngân sách JS:** JS tải ngay ở trang chủ (desktop) ≤ 30 KB gzip (hiện khoảng 15 KB). Kiểm tra sau mỗi lần thêm thư viện.
- `asChild` của Radix **không nhận** phần tử viết trong file `.astro`. Muốn `asChild` với `<a>`, viết component bằng `.tsx`.
- Icon React (lucide) đặt trong file `.astro`: muốn style bằng `<style>` scoped thì phải dùng `:global(.ten-class)`.
- Icon thương hiệu (YouTube, Instagram…) render thành chuỗi SVG lúc build bằng `brandIconSvg()` trong `src/lib/site.ts`, để không đẩy cả bộ icon xuống trình duyệt.

---

## 5. Nội dung và câu chữ

- Ngôi thứ nhất "tôi", giọng thân thiện, câu ngắn.
- **Không viết chữ hiển thị trực tiếp trong component.** Mọi nhãn, tiêu đề mục, chữ trên nút nằm ở `src/i18n/ui.yaml` (tiếng Việt, đang dùng) và `src/i18n/ui.en.yaml` (tiếng Anh), đọc qua `t` trong `src/lib/i18n.ts`.
  Thêm chữ mới: thêm khoá vào **cả hai** file yaml + schema zod trong `i18n.ts` + trường (có `i18n: true`) trong `public/admin/config.yml` (collection `ui`). Island React nhận chữ qua prop `labels`.

### Song ngữ (vi mặc định, en chuẩn bị cho P6)

- **Quy ước file** (theo `i18n` của Sveltia CMS: `multiple_files`, bỏ mã ngôn ngữ mặc định khỏi tên file):
  tiếng Việt là file gốc (`index.md`, `about.md`, `site.yaml`, `ui.yaml`), tiếng Anh nằm cạnh với hậu tố `.en` (`index.en.md`, `about.en.md`, `site.en.yaml`, `ui.en.yaml`).
- **Trường cần dịch** (tiêu đề, mô tả, nội dung, alt ảnh, nghề nghiệp, tên menu…) đánh `i18n: true` trong CMS; **trường dùng chung** (ngày, toạ độ, ảnh, link, trạng thái) đánh `i18n: duplicate`.
- Bản dịch thiếu khoá nào thì **tự dùng bản tiếng Việt** (`withFallback` trong `i18n.ts`), nên dịch dở không làm vỡ build.
- Định tuyến đã cấu hình trong `astro.config.mjs` (`i18n`: vi ở gốc, en dưới `/en`). Content collection hiện chỉ nạp file tiếng Việt (bỏ `*.en.md`).
- Ngày/số định dạng bằng `intl` từ `i18n.ts` (đừng viết cứng `'vi-VN'`); `<html lang>` và `og:locale` lấy từ `LOCALES`.
- Tên riêng, mã kỹ thuật, tên thương hiệu (YouTube, Travel vlogger…) có thể giữ nguyên trong bản tiếng Việt nếu đó là cách gọi quen thuộc.
- Ẩn dụ vũ trụ được phép, miễn không làm khó hiểu: "Về trạm phóng", "Gửi một tín hiệu".
- Nút nói rõ việc sẽ xảy ra: "Xem hành trình", "Kênh YouTube".
- **Không bịa thông tin cá nhân** (trường, công ty, số liệu). Chưa có dữ liệu thật thì giữ `ComingSoon`.

**Nơi sửa nội dung** (cũng sửa được qua giao diện **`/admin`**, tức Sveltia CMS, cấu hình ở `public/admin/config.yml`):

| Nội dung | File |
|---|---|
| Tên, nghề nghiệp, câu giới thiệu, vị trí, menu, mạng xã hội, email, file CV (nút tải ở trang Vũ trụ) | `src/data/site.yaml` (kiểm tra bằng zod trong `src/lib/site.ts`) |
| Chữ cố định trên giao diện (nhãn MSN-xx, tiêu đề mục, nút, bảng tiến độ) | `src/i18n/ui.yaml`, `src/i18n/ui.en.yaml` (zod trong `src/lib/i18n.ts`) |
| Bản tiếng Anh của tên nghề, câu giới thiệu, menu | `src/data/site.en.yaml` (chỉ các trường cần dịch) |
| Dự án kỹ thuật, sự kiện, hội thảo | `src/content/projects/<ten-khong-dau>/index.md` + ảnh cùng thư mục, tên ảnh `<tiền-tố>_NN.webp` (bìa `_00`). `date` bắt buộc, `endDate` tuỳ chọn (dự án `Nominal` không có `endDate` hiện "… – nay"), `gallery` như chuyến đi. Chỉ ghi thông tin đã công khai (báo chí, băng rôn sự kiện); dự án cho đơn vị quốc phòng/nhà nước chưa công bố thì không ghi tên đơn vị |
| Chuyến đi (kèm toạ độ cho địa cầu, album, video) | `src/content/journeys/<ten-khong-dau>/index.md` + ảnh cùng thư mục. Tối thiểu: `place`, `countryCode` (ISO 2 chữ → cờ tròn `circle-flags` + tên nước tự động qua `Intl.DisplayNames`, `src/lib/flags.ts`), `lat`, `lng` → chỉ là ghim + cờ trên địa cầu. Có `cover` → thêm thẻ, trang riêng, ảnh ở trang Ảnh (`getStories()` trong `content.ts`). Tên ảnh `<địa-danh>_NN.webp`, ảnh bìa `_00`. `ongoing: true` = hành trình chưa kết thúc (Việt Nam): hiện "… – nay" và `T+n ngày` (`formatElapsed`), số ngày tăng theo mỗi lần build lại (6 giờ/lần) |
| Trang Về tôi (câu chuyện, timeline) | `src/content/pages/about.md` |
| Nhạc nền (2–3 bài, phát lần lượt) | `src/data/music.yaml` (zod trong `src/lib/music.ts`), file nhạc ở `public/music/`. CMS: Cài đặt → Nhạc nền |
| Kênh YouTube, video nổi bật, ghim, ẩn, nhóm, bật/tắt Shorts | `src/data/videos.yaml` (Shorts nhận biết qua playlist tự động `UUSH…` của kênh) |
| Màu, font, khoảng cách | `src/styles/global.css` |

- Schema của nội dung nằm ở `src/content.config.ts`. Thêm trường thì cập nhật cả schema lẫn `public/admin/config.yml`.
- `draft: true` = chỉ hiện khi `npm run dev`.
- Trang chưa có nội dung tự hiện `ComingSoon`; khối trang chủ chưa có dữ liệu thì tự ẩn.
- Ảnh luôn đi qua `astro:assets` (`<Image>` hoặc `toGalleryPhotos()` trong `src/lib/photos.ts`) để tự nén WebP và tạo nhiều kích thước.
- **Ảnh gốc lưu trong repo**, cạnh bài viết (`src/content/<bài>/`), **không** để trong `public/` (ảnh ở `public/` không được Astro nén, phát nguyên file gốc).
  CMS tự đổi ảnh tải lên sang WebP, cạnh dài ≤ 2560px, chất lượng 85, đồng thời xoá EXIF/GPS (`media_libraries` trong `config.yml`), chặn file > 20 MB.
  Chép ảnh thẳng vào thư mục thì chạy `npm run photos` trước khi commit (cùng thông số, tự sửa đường dẫn trong `.md`/`.yaml`; `-- --dry` để xem trước). Lệnh đổi được cả **DNG** (iPhone ProRAW: dùng ảnh đã xử lý full-size nhúng sẵn trong file, không cần bộ đọc RAW; DNG chỉ có ảnh xem trước nhỏ < 1600px thì bỏ qua, báo xuất JPEG) và TIFF. HEIC, RAW riêng của hãng (CR2, NEF, ARW…) phải xuất JPEG trước.
  `prebuild` chạy `photos.mjs --check`: dừng build nếu còn ảnh DNG/TIFF/RAW/HEIC hoặc file trong `public/` > 25 MiB (giới hạn của Cloudflare Workers).
  Không nhúng ảnh từ Google Drive/Photos (không phải CDN, link hay hỏng, Astro không tối ưu được). Video để trên YouTube.
  Khi repo vượt khoảng 1 GB thì chuyển album lớn sang kho ảnh ngoài (Cloudflare R2 hoặc Cloudinary), hỏi chủ dự án trước.
- Video lấy bằng **YouTube Data API v3** lúc build (`src/lib/youtube.ts`, biến môi trường `YOUTUBE_API_KEY`). Không đọc trang YouTube trái phép.

---

## 6. Cấu trúc thư mục

```
src/
├── components/
│   ├── ui/          ← shadcn (CLI quản lý; chỉ sửa bằng cách thêm variant)
│   ├── brand/       ← Orbi (linh vật, SVG thuần)
│   ├── layout/      ← MissionBar, Footer, ThemeToggle, MusicToggle, MobileNav (island)
│   ├── media/       ← island React: MissionsGlobe, PhotoGallery, VideoGrid, VideoPlayer
│   └── sections/    ← Hero, HomeSections, PageHeader, SectionHead, ProjectCard, JourneyCard, CosmosBackdrop,
│                       FlagStrip, JourneyGrid, SkillGrid, ComingSoon, SocialList
├── content/         ← projects/, journeys/, pages/ (Markdown + ảnh)
├── assets/earth/    ← ảnh NASA cho Trái Đất (day, night, moon .webp; day-8k/day-4k chỉ tải khi phóng to địa cầu Hành trình)
├── content.config.ts← schema nội dung
├── data/            ← site.yaml (+ site.en.yaml), videos.yaml, music.yaml, skills.yaml
├── i18n/            ← ui.yaml (vi), ui.en.yaml (en): chữ trên giao diện
├── layouts/BaseLayout.astro  ← SEO, JSON-LD, theme, preloader, altimeter, header/footer
├── lib/             ← site.ts, skills.ts, i18n.ts, content.ts, photos.ts, youtube.ts, utils.ts (cn, cleanPath)
├── pages/           ← mỗi file = một URL ([slug].astro = trang chi tiết)
├── scripts/         ← motion.ts (chuyển động toàn trang), earth.ts (Trái Đất WebGL ở hero), globe.ts (địa cầu chuyến đi), cosmos.ts (nền vũ trụ ở Về tôi)
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
- Biến môi trường `YOUTUBE_API_KEY` phải có ở: Cloudflare (Worker → Settings → **Build** → Variables and secrets; *không phải* mục Variables lúc chạy), GitHub Secrets (cho `refresh.yml`) và file `.env` trên máy.
  Thiếu key thì web thử RSS, nhưng YouTube hay chặn RSS từ máy chủ build → trang Vlog trống, log build có dòng `[youtube] Thiếu biến môi trường YOUTUBE_API_KEY`.
- `refresh.yml` build và deploy lại mỗi 6 giờ (cần secret `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`). Thiếu secret thì workflow tự bỏ qua.
- Node 24 (file `.node-version`). Trên máy dùng `fnm use`.
- Tên miền `longpeoo.io.vn` (DNS ở Cloudflare). `www` chuyển hướng 301 về tên miền chính.
