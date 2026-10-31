import { parse } from 'yaml';
import { z } from 'astro/zod';
import { getIconData, iconToSVG, iconToHTML } from '@iconify/utils';
import ri from '@iconify-json/ri/icons.json';
import raw from '@/data/site.yaml?raw';

// Icon thương hiệu lấy từ bộ Remix Icon (lucide không còn icon thương hiệu)
const socialIcons = {
  youtube: 'youtube-fill',
  instagram: 'instagram-line',
  tiktok: 'tiktok-fill',
  facebook: 'facebook-circle-fill',
  linkedin: 'linkedin-box-fill',
  github: 'github-fill',
} as const;

const schema = z.object({
  name: z.string(),
  handle: z.string(),
  roles: z.array(z.string()).min(1),
  tagline: z.string(),
  description: z.string(),
  location: z.object({
    city: z.string(),
    code: z.string(),
    timezone: z.string(),
    lat: z.string(),
    lon: z.string(),
  }),
  email: z.string(),
  nav: z.array(z.object({ label: z.string(), href: z.string() })),
  socials: z.array(
    z.object({
      id: z.enum(Object.keys(socialIcons) as [keyof typeof socialIcons]),
      label: z.string(),
      url: z.string().default(''),
    }),
  ),
});

/** SVG dạng chuỗi — render lúc build, không đẩy bộ icon xuống trình duyệt */
export function brandIconSvg(name: string): string {
  const data = getIconData(ri, name);
  if (!data) throw new Error(`Icon "${name}" không có trong bộ Remix Icon`);
  const { attributes, body } = iconToSVG(data, { height: '1em' });
  return iconToHTML(body, { ...attributes, fill: 'currentColor', 'aria-hidden': 'true' });
}

const data = schema.parse(parse(raw));

export const site = {
  ...data,
  // Chỉ giữ các mạng xã hội đã điền link, kèm icon SVG
  socials: data.socials
    .filter((s) => s.url.trim() !== '')
    .map((s) => ({ ...s, iconSvg: brandIconSvg(socialIcons[s.id]) })),
};

export type Social = (typeof site.socials)[number];
export type NavItem = (typeof site.nav)[number];
