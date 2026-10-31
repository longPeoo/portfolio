# SKILLS.md: quy tắc xây dựng longpeoo.io.vn

Tài liệu này là **luật** cho mọi thay đổi trên website, dù do người hay AI thực hiện.
Đọc hết trước khi thêm trang, section hay component mới. Khi một quy tắc cần đổi, sửa file này trước rồi mới sửa code.

Skill tham khảo đã cài trong `.claude/skills/`:
- `frontend-design` (Anthropic): cách ra quyết định thiết kế không rập khuôn.
- `shadcn` (shadcn/ui): quy tắc dùng component, styling, CLI.

---

## 1. Ý tưởng thiết kế: "Mission patch"

**Chủ thể:** Long, kỹ sư công nghệ vũ trụ kiêm travel vlogger.
**Người xem:** nhà tuyển dụng hoặc đối tác kỹ thuật, nhãn hàng muốn tài trợ, khán giả YouTube.
**Nhiệm vụ chính của trang:** cho biết Long là ai trong 5 giây, rồi dẫn người xem tới dự án, hành trình hoặc video.

**Điểm nhấn duy nhất:** *huy hiệu sứ mệnh thêu tròn* (mission patch), truyền thống có thật của các chương trình không gian.
Mỗi thứ quan trọng (bản thân Long, mỗi dự án, mỗi chuyến đi) đều có thể có một patch riêng.
Patch vừa **dễ thương** (hình minh hoạ, Orbi) vừa **nghiêm túc** (đúng chất liệu của ngành).
Mọi thứ xung quanh patch phải **yên tĩnh, kỷ luật**: chữ rõ, khoảng trắng rộng, ít trang trí.

**Linh vật Orbi** chỉ xuất hiện ở: trong patch, logo header, footer (đang ngủ), trang 404 (bối rối). Không rải thêm chỗ khác.

---

## 2. Token: màu, chữ, bố cục

Tất cả token nằm trong `src/styles/global.css`. **Không** viết mã màu trực tiếp trong component.

### Màu

| Tên | Hex | Vai trò |
|---|---|---|
| Ultramarine | `#1F2E7A` | `primary` (sáng), nền panel kỹ thuật, dải chữ patch |
| Deep space | `#16225E` | nền trong patch, kính mũ Orbi |
| Marigold | `#F2A900` | viền patch, `ring` (focus), `highlight`, `primary` ở chế độ tối |
| Rice green | `#2F7D5B` | `travel`: mọi thứ thuộc về du lịch |
| Sky | `#8DB8F2` | khí quyển, tấm pin Orbi |
| Flag red | `#D93A2B` | chi tiết rất nhỏ (đèn Orbi, cờ). **Không** dùng làm màu nút |
| Cloud | `#F4F6FA` | nền trang chế độ sáng |

- Chế độ tối là **xanh đêm `#0E1433`**, không phải đen.
- Trong component chỉ dùng token ngữ nghĩa: `bg-primary`, `text-muted-foreground`, `bg-travel`, `decoration-highlight`…
- Màu `--brand-*` chỉ dùng trong hình minh hoạ SVG (patch, Orbi).
- Marigold **không** dùng làm màu chữ trên nền sáng vì không đủ tương phản. Chỉ dùng làm nền, viền, gạch chân.

### Chữ

| Vai trò | Font | Ghi chú |
|---|---|---|
| Tiêu đề | **Archivo Variable**, kéo rộng `font-stretch` 110–125% | Gợi chữ sơn trên thân tên lửa. Chỉ dùng cho tiêu đề và chữ trên patch |
| Nội dung, giao diện | **Be Vietnam Pro** 400/500/600/700 | Mọi chữ thường, nút, menu, form |

Thang chữ theo tỷ lệ perfect fourth (×1.333), gốc 17px. Dùng các utility có sẵn, không tự đặt cỡ chữ:

`type-display` (H1) → `type-h2` → `type-h3` → `type-lead` (đoạn mở đầu) → `type-body`

- Mỗi trang có **đúng một** `h1`.
- Dòng chữ dài tối đa ~70 ký tự (`max-w-[40ch]` cho lead, `max-w-[42ch]` cho đoạn ngắn).
- Từ ghép tiếng Việt ở tiêu đề lớn: dùng ` ` (khoảng trắng không ngắt dòng) để không ngắt giữa "vũ / trụ".

### Bố cục

- Khung nội dung: `mx-auto max-w-6xl px-4 sm:px-6 lg:px-8` (lề 16px trên mobile).
- **Căn trái** là mặc định. Chỉ căn giữa cho trạng thái trống (`Empty`) và trang 404.
- Hero: lưới 2 cột `md:grid-cols-[1.3fr_1fr]`, chữ bên trái và patch bên phải. Trên mobile, patch lên trên.
- Không bọc mọi thứ trong card. Card chỉ dùng khi nội dung thật sự là một đơn vị độc lập (một dự án, một video).

---

## 3. Những thứ CẤM (dấu hiệu "trông như AI làm")

Trước khi merge bất kỳ thay đổi giao diện nào, rà danh sách này:

- [ ] **Nhãn chữ IN HOA, giãn chữ** đặt phía trên tiêu đề (eyebrow). Không dùng.
- [ ] **Font monospace** cho nhãn nhỏ hoặc số liệu trang trí.
- [ ] **Chuỗi nối bằng dấu chấm giữa** kiểu `A · B · C`.
- [ ] **Mũi tên `→` / `↗`** gắn sau chữ của nút hoặc link.
- [ ] **Đánh số 01 / 02 / 03** khi nội dung không phải trình tự thật (timeline, các bước).
- [ ] **Tô một từ** trong tiêu đề bằng màu hoặc nghiêng khác.
- [ ] **Nền kem + serif tương phản cao + màu cam đất**, **nền đen + một màu neon**, hay **bố cục kiểu báo giấy viền mảnh**.
- [ ] **Lưới card giống hệt nhau** với cùng bóng mờ, cùng bo góc, kèm gradient trang trí.
- [ ] **Hiệu ứng fade/slide-up cho mọi section** khi cuộn, hoặc hover cho mọi card.
- [ ] **Hạt nhiễu (grain), glow, glassmorphism** chỉ để trang trí.
- [ ] Gimmick "telemetry" như đồng hồ UTC hay toạ độ GPS khi không mang thông tin.

Chữ thêu trên patch được phép viết hoa, vì đó là chất liệu thật của huy hiệu, không phải nhãn giao diện.

---

## 4. Chuyển động

1. **Một khoảnh khắc tải trang duy nhất** cho mỗi trang. Trang chủ: patch "được khâu" lên (`intro` trên `MissionPatch`).
2. Ngoài ra chỉ có chuyển động **do người dùng kích hoạt**: hover, mở menu, nghiêng patch theo chuột (`tilt`).
3. Chuyển động tự chạy được phép duy nhất: Orbi chớp mắt (6 giây/lần).
4. Luôn tôn trọng `prefers-reduced-motion` (đã có reset toàn cục trong `global.css`). Script chuyển động phải tự kiểm tra `matchMedia('(prefers-reduced-motion: reduce)')`.
5. Script chạy theo `astro:page-load` (vì có View Transitions). Listener gắn vào `window`/`document` phải được gỡ khi chuyển trang.
6. Khi thêm GSAP/Lenis ở giai đoạn sau: vẫn giữ nguyên tắc "một khoảnh khắc chính mỗi trang".

---

## 5. Component: shadcn/ui là mặc định

Cấu hình: `components.json` (style `radix-nova`, base **radix**, icon **lucide**). Component nằm ở `src/components/ui/`.

**Quy trình thêm component:**
```bash
npx shadcn@latest search -q "tên"        # tìm trước khi tự viết
npx shadcn@latest docs <component>        # đọc docs + ví dụ
npx shadcn@latest add <component> -y      # cài
```
Sau khi `add`, đọc lại file vừa thêm. Không sửa tay theo cách phá vỡ khả năng cập nhật; muốn đổi giao diện thì thêm **variant** trong `cva` (ví dụ `size: "xl"` của Button).

**Chọn component:**

| Cần | Dùng |
|---|---|
| Nút, link trông như nút | `Button`. Trong file `.astro` dùng `<a class={buttonVariants({...})}>` |
| Thông báo, chú thích | `Alert` |
| Trang hoặc mục chưa có nội dung | `Empty` |
| Danh sách link có icon (mạng xã hội…) | `Item` + `ItemGroup` |
| Menu mobile, panel bên | `Sheet` (bắt buộc có `SheetTitle`) |
| Đường kẻ phân cách | `Separator`, không dùng `<hr>` |
| Nhãn trạng thái nhỏ | `Badge` |
| Xem ảnh phóng to (sau này) | `Dialog` |
| Lọc video theo nhóm (sau này) | `Tabs` hoặc `ToggleGroup` |
| Form liên hệ (sau này) | `FieldGroup` + `Field` + `Input`/`Textarea` |

**Luật bắt buộc (trích từ skill shadcn):**
- `className` chỉ để bố cục (`mt-6`, `max-w-md`), **không** đè màu hay chữ của component.
- Dùng `flex flex-col gap-*`, **không** dùng `space-y-*` hay `space-x-*`.
- `size-10` thay cho `w-10 h-10`.
- Ghép class có điều kiện bằng `cn()`.
- Icon trong nút dùng `data-icon="inline-start|inline-end"`, không thêm class kích thước.
- Không tự đặt `z-index` cho Dialog, Sheet, Popover.
- Không viết `dark:` để đổi màu. Token tự đổi theo chế độ. Ngoại lệ: ẩn/hiện icon mặt trời/mặt trăng.

**Astro và React:**
- Component React **không có** `client:*` sẽ render thành HTML tĩnh, không tốn JS. Đây là mặc định.
- Chỉ thêm `client:*` khi thật sự cần tương tác: `ThemeToggle` (`client:load`), `MobileNav` (`client:media`).
- `asChild` của Radix **không nhận** phần tử từ file `.astro`. Muốn `asChild` với `<a>`, viết component bằng `.tsx` (xem `SocialList.tsx`).
- Không truyền dữ liệu lớn vào island. Icon thương hiệu được render thành chuỗi SVG lúc build (`brandIconSvg` trong `src/lib/site.ts`).
- Style scoped trong file `.astro` phải bọc trong `@layer components { … }` để class Tailwind truyền từ ngoài vào vẫn thắng.

**Icon:** giao diện dùng `lucide-react`; logo mạng xã hội dùng Remix Icon qua `brandIconSvg()`.

---

## 6. Nội dung và câu chữ

- Ngôi thứ nhất "tôi", giọng tự nhiên, câu ngắn. Không dùng từ quảng cáo ("đỉnh cao", "tuyệt vời").
- **Viết hoa kiểu câu** (sentence case) cho mọi tiêu đề, nút, menu.
- Nút nói đúng việc sẽ xảy ra: "Xem các chuyến đi", "Gửi email". Không dùng "Khám phá ngay", "Tìm hiểu thêm".
- Trạng thái trống hay lỗi: nói rõ chuyện gì xảy ra và bước tiếp theo, không xin lỗi, không đùa quá đà.
- **Không bịa thông tin cá nhân** (tên trường, công ty, số liệu). Chưa có dữ liệu thật thì để `PagePlaceholder`.

**Nơi sửa nội dung:**

| Nội dung | File |
|---|---|
| Tên, chức danh, câu giới thiệu, chữ trên patch, menu, mạng xã hội, email | `src/data/site.yaml` (có kiểm tra bằng zod trong `src/lib/site.ts`) |
| Dự án, chuyến đi, video ghim (từ giai đoạn P2) | `src/content/**` (content collections) |
| Màu, font, thang chữ | `src/styles/global.css` |

Khi thêm trường mới vào `site.yaml`, cập nhật schema trong `src/lib/site.ts` cùng lúc.

---

## 7. Cấu trúc thư mục

```
src/
├── components/
│   ├── ui/          ← shadcn (do CLI quản lý; chỉ sửa bằng cách thêm variant)
│   ├── brand/       ← MissionPatch, Orbi: tài sản thương hiệu, SVG thuần
│   ├── layout/      ← SiteHeader, SiteFooter, ThemeToggle (island), MobileNav (island)
│   └── sections/    ← các khối ghép trang: Hero, TwoSides, SiteNotice, PagePlaceholder…
├── data/site.yaml   ← cấu hình nội dung chung
├── layouts/BaseLayout.astro  ← SEO, theme, header/footer
├── lib/             ← site.ts (đọc + kiểm tra yaml), utils.ts (cn)
├── pages/           ← mỗi file = một URL
└── styles/global.css
```

Đặt tên: component PascalCase (`MissionPatch.astro`, `SocialList.tsx`); file shadcn giữ chữ thường như CLI tạo ra.

---

## 8. Chất lượng tối thiểu (mọi thay đổi)

- **Responsive**: kiểm tra ở 390px và 1440px, không có thanh cuộn ngang.
- **Hai chế độ sáng/tối** đều phải đọc được.
- **Bàn phím**: mọi thứ bấm được đều focus được, có vòng focus (màu marigold).
- **Ảnh**: dùng `<Image>`/`<Picture>` của Astro, luôn có `alt` mô tả (ảnh trang trí: `alt=""`).
- **Hiệu năng**: trang chủ dưới 150KB JS. Không thêm thư viện client khi có thể làm bằng CSS hoặc HTML tĩnh.
- **SEO**: mỗi trang truyền `title` và `description` riêng cho `BaseLayout`.
- **Tiếng Việt**: kiểm tra dấu hiển thị đúng ở mọi font, đặc biệt chữ hoa có dấu trên patch.

**Trước khi commit:**
```bash
npm run check    # 0 lỗi type
npm run build    # build sạch
```
Rồi chụp màn hình (sáng/tối, desktop/mobile) để tự soát lại theo mục 3.

---

## 9. Thêm một trang mới

1. Tạo `src/pages/<ten>.astro` dùng `BaseLayout` với `title` và `description`.
2. Ghép từ `sections/`. Nếu cần khối mới, tạo trong `sections/` từ component shadcn.
3. Nếu trang có patch riêng: dùng `MissionPatch` với `motif` phù hợp, hoặc thêm motif mới trong `MissionPatch.astro`.
4. Thêm vào `nav` trong `site.yaml` nếu cần hiện trên menu.
5. Chạy checklist mục 8.

---

## 10. Deploy

- Push lên nhánh `main` → Cloudflare Workers tự build (`npm run build`) và phát thư mục `dist/` (cấu hình trong `wrangler.jsonc`, tên worker: `portfolio`).
- Node 24 (file `.node-version`). Trên máy dùng `fnm use`.
- Tên miền `longpeoo.io.vn` (DNS ở Cloudflare). `www` tự chuyển hướng 301 về tên miền chính.
