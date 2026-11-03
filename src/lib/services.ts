/**
 * KHOÁ CÔNG KHAI của các dịch vụ Cloudflare. Các khoá này vốn hiện trong HTML nên để trong repo là an toàn.
 * Khoá BÍ MẬT (Turnstile secret, email nhận thư) đặt ở Cloudflare: Worker → Settings → Variables and Secrets.
 * Hướng dẫn lấy khoá: mục 9 trong SKILLS.md.
 */

/**
 * Cloudflare Web Analytics (thống kê lượt truy cập, không cookie, không cần hỏi đồng ý).
 * longpeoo.io.vn ĐANG DÙNG "Automatic setup": Cloudflare tự chèn script đếm vào trang → để trống ở đây.
 * Chỉ điền token (Web Analytics → Manage site → JS Snippet) nếu tắt Automatic setup, không thì mỗi lượt bị đếm hai lần.
 */
const ANALYTICS_TOKEN = '';

/**
 * Cloudflare Turnstile (chống bot cho form Liên hệ): dashboard → Turnstile → Add widget,
 * hostname longpeoo.io.vn, chế độ Managed → chép "Site Key".
 * Để trống: khi chạy trên máy dùng khoá thử nghiệm (luôn cho qua), trên web thật thì form gửi không cần Turnstile
 * (Worker vẫn chặn bằng giới hạn tần suất + ô bẫy bot).
 */
const TURNSTILE_SITE_KEY = '0x4AAAAAAFxjq1KdquiCfRjN';
const TURNSTILE_TEST_KEY = '1x00000000000000000000AA';

export const services = {
  analyticsToken: ANALYTICS_TOKEN,
  turnstileSiteKey: TURNSTILE_SITE_KEY || (import.meta.env.DEV ? TURNSTILE_TEST_KEY : ''),
};
