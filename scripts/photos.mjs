/**
 * Nén ảnh trước khi commit: làm đúng việc CMS tự làm khi tải ảnh lên (xem media_libraries trong public/admin/config.yml).
 *
 *   npm run photos              nén ảnh JPEG/PNG/WebP còn to trong src/content và public/uploads:
 *                               cạnh dài ≤ 2560px, WebP chất lượng 85, xoá EXIF (gồm GPS), sửa đường dẫn trong .md/.yaml
 *   npm run photos -- --dry     chỉ xem trước: ảnh nào sẽ được nén, nặng bao nhiêu sau khi nén
 *   npm run photos -- --check   chỉ kiểm tra (tự chạy trước mỗi lần build, không cần sharp):
 *                               lỗi nếu có ảnh RAW/HEIC (trình duyệt không hiển thị được)
 *                               hoặc file trong public/ quá 25 MiB (Cloudflare Workers không phát được)
 */
import { existsSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join, relative, sep } from 'node:path';

const MAX_SIDE = 2560;
const QUALITY = 85;
const ASSET_LIMIT = 25 * 1024 * 1024;
const RASTER = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const UNSUPPORTED = new Set(['.dng', '.heic', '.heif', '.raw', '.cr2', '.cr3', '.nef', '.arw', '.orf', '.raf', '.rw2', '.tif', '.tiff']);
const PHOTO_DIRS = ['src/content', 'public/uploads'];
const TEXT_DIRS = ['src/content', 'src/data'];

const args = new Set(process.argv.slice(2));
const mode = args.has('--check') ? 'check' : args.has('--dry') ? 'dry' : 'write';

const walk = (dir) =>
  existsSync(dir)
    ? readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]))
    : [];
const posix = (p) => p.split(sep).join('/');
const mb = (bytes) => `${(bytes / 1048576).toFixed(2)} MB`;

// ---------------------------------------------------------------- kiểm tra
if (mode === 'check') {
  const errors = [];
  for (const file of [...walk('src/content'), ...walk('public')]) {
    if (UNSUPPORTED.has(extname(file).toLowerCase())) {
      errors.push(`${posix(file)}: định dạng ${extname(file)} không hiển thị được trên web. Xuất ra JPEG rồi chạy "npm run photos".`);
    } else if (file.startsWith('public') && statSync(file).size > ASSET_LIMIT) {
      errors.push(`${posix(file)}: ${mb(statSync(file).size)}, quá giới hạn 25 MiB/file của Cloudflare Workers.`);
    }
  }
  const heavy = PHOTO_DIRS.flatMap(walk).filter((f) => RASTER.has(extname(f).toLowerCase()) && statSync(f).size > 1.5 * 1048576);
  if (heavy.length) console.warn(`[photos] ${heavy.length} ảnh chưa nén (> 1,5 MB). Chạy "npm run photos" trước khi commit.`);
  if (errors.length) {
    console.error(`[photos] Dừng build:\n  - ${errors.join('\n  - ')}`);
    process.exit(1);
  }
  process.exit(0);
}

// ---------------------------------------------------------------- nén
const { default: sharp } = await import('sharp');

/** Ảnh có thẻ GPS trong EXIF không (đọc IFD0 của khối TIFF) */
function hasGps(exif) {
  if (!exif || exif.length < 8) return false;
  const start = exif.indexOf('Exif\0\0');
  const t = start >= 0 ? exif.subarray(start + 6) : exif;
  const le = t.toString('latin1', 0, 2) === 'II';
  const u16 = (o) => (le ? t.readUInt16LE(o) : t.readUInt16BE(o));
  const u32 = (o) => (le ? t.readUInt32LE(o) : t.readUInt32BE(o));
  try {
    const ifd = u32(4);
    for (let k = 0; k < u16(ifd); k++) if (u16(ifd + 2 + k * 12) === 0x8825) return true;
  } catch {}
  return false;
}

const textFiles = TEXT_DIRS.flatMap(walk).filter((f) => /\.(md|mdx|ya?ml)$/i.test(f));
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Đổi tên ảnh trong các file nội dung: ảnh cạnh bài viết (./a.jpg) và ảnh dùng chung (/uploads/a.jpg) */
function rewriteRefs(from, to) {
  const isUpload = posix(from).startsWith('public/uploads/');
  const oldName = basename(from);
  const newName = basename(to);
  let count = 0;
  const dir = posix(dirname(from));
  for (const file of textFiles) {
    const fileDir = posix(dirname(file));
    if (!isUpload && fileDir !== dir && !fileDir.startsWith(`${dir}/`)) continue;
    const src = readFileSync(file, 'utf8');
    const pattern = isUpload
      ? new RegExp(`/uploads/${escape(oldName)}(?=[\\s"')\\]]|$)`, 'gm')
      : new RegExp(`(^|[\\s"'(/])${escape(oldName)}(?=[\\s"')\\]]|$)`, 'gm');
    const out = src.replace(pattern, (_m, pre = '') => {
      count++;
      return isUpload ? `/uploads/${newName}` : `${pre}${newName}`;
    });
    if (out !== src) writeFileSync(file, out);
  }
  return count;
}

const rows = [];
let before = 0;
let after = 0;
for (const file of PHOTO_DIRS.flatMap(walk)) {
  const ext = extname(file).toLowerCase();
  if (UNSUPPORTED.has(ext)) {
    rows.push([posix(file), mb(statSync(file).size), '—', 'BỎ QUA: xuất ra JPEG trước (RAW/HEIC)']);
    continue;
  }
  if (!RASTER.has(ext)) continue;
  const input = readFileSync(file);
  const meta = await sharp(input).metadata();
  const gps = hasGps(meta.exif);
  // WebP đã đủ nhỏ và không còn EXIF thì để nguyên
  if (ext === '.webp' && !meta.exif && Math.max(meta.width ?? 0, meta.height ?? 0) <= MAX_SIDE) continue;

  const { data, info } = await sharp(input)
    .rotate() // xoay theo EXIF trước khi bỏ EXIF
    .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: QUALITY, effort: 5 })
    .toBuffer({ resolveWithObject: true });

  let target = join(dirname(file), `${basename(file, extname(file))}.webp`);
  for (let i = 1; target !== file && existsSync(target); i++) target = join(dirname(file), `${basename(file, extname(file))}-${i}.webp`);

  before += input.length;
  after += data.length;
  let note = `${meta.width}×${meta.height} → ${info.width}×${info.height}${gps ? ', xoá GPS' : ''}`;
  if (mode === 'write') {
    writeFileSync(target, data);
    if (target !== file) {
      unlinkSync(file);
      const refs = rewriteRefs(file, target);
      note += `, sửa ${refs} chỗ dẫn tới ảnh`;
    }
  }
  rows.push([posix(relative('.', target)), mb(input.length), mb(data.length), note]);
}

if (!rows.length) {
  console.log('[photos] Không có ảnh nào cần nén.');
} else {
  console.table(rows.map(([file, from, to, note]) => ({ 'Ảnh': file, 'Trước': from, 'Sau': to, 'Ghi chú': note })));
  console.log(`[photos] ${mode === 'dry' ? 'Xem trước' : 'Đã nén'}: ${mb(before)} → ${mb(after)}`);
}
