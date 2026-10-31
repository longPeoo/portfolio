import { parse } from 'yaml';
import { z } from 'astro/zod';
import raw from '@/data/site.yaml?raw';

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

const data = schema.parse(parse(raw));

export const site = {
  ...data,
  // Chỉ giữ các mạng xã hội đã điền link, kèm tên icon tương ứng
  socials: data.socials
    .filter((s) => s.url.trim() !== '')
    .map((s) => ({ ...s, icon: socialIcons[s.id] })),
};
