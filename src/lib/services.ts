/**
 * KHOÃ CÃ”NG KHAI cá»§a cÃ¡c dá»‹ch vá»¥ Cloudflare. CÃ¡c khoÃ¡ nÃ y vá»‘n hiá»‡n trong HTML nÃªn Ä‘á»ƒ trong repo lÃ  an toÃ n.
 * KhoÃ¡ BÃ Máº¬T (Turnstile secret, email nháº­n thÆ°) Ä‘áº·t á»Ÿ Cloudflare: Worker â†’ Settings â†’ Variables and Secrets.
 * HÆ°á»›ng dáº«n láº¥y khoÃ¡: má»¥c 9 trong SKILLS.md.
 */

/**
 * Cloudflare Web Analytics (thá»‘ng kÃª lÆ°á»£t truy cáº­p, khÃ´ng cookie, khÃ´ng cáº§n há»i Ä‘á»“ng Ã½):
 * dashboard â†’ Web Analytics â†’ Add a site â†’ longpeoo.io.vn â†’ chá»n cÃ¡ch gáº¯n báº±ng JS snippet â†’ chÃ©p giÃ¡ trá»‹ "token".
 * Äá»ƒ trá»‘ng = khÃ´ng gáº¯n.
 */
const ANALYTICS_TOKEN = '';

/**
 * Cloudflare Turnstile (chá»‘ng bot cho form LiÃªn há»‡): dashboard â†’ Turnstile â†’ Add widget,
 * hostname longpeoo.io.vn, cháº¿ Ä‘á»™ Managed â†’ chÃ©p "Site Key".
 * Äá»ƒ trá»‘ng: khi cháº¡y trÃªn mÃ¡y dÃ¹ng khoÃ¡ thá»­ nghiá»‡m (luÃ´n cho qua), trÃªn web tháº­t thÃ¬ form gá»­i khÃ´ng cáº§n Turnstile
 * (Worker váº«n cháº·n báº±ng giá»›i háº¡n táº§n suáº¥t + Ã´ báº«y bot).
 */
const TURNSTILE_SITE_KEY = '';
const TURNSTILE_TEST_KEY = '1x00000000000000000000AA';

export const services = {
  analyticsToken: ANALYTICS_TOKEN,
  turnstileSiteKey: TURNSTILE_SITE_KEY || (import.meta.env.DEV ? TURNSTILE_TEST_KEY : ''),
};
