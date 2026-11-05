import { parse } from 'yaml';
import { z } from 'astro/zod';
import raw from '@/data/skills.yaml?raw';
import enRaw from '@/data/skills.en.yaml?raw';
import { defaultLocale, type Locale } from '@/lib/i18n';

/** Kỹ năng trình bày như các "subsystem" của tàu, level 0–100 (trang Vũ trụ) */
const schema = z.object({
  skills: z
    .array(
      z.object({
        code: z.string(),
        name: z.string(),
        level: z.number().min(0).max(100),
        items: z.array(z.string()).nullish().transform((list) => list ?? []),
      }),
    )
    .nullish()
    .transform((list) => list ?? []),
});

/** Bản dịch (skills.<locale>.yaml, CMS ghi ra): chỉ chữ, mức độ dùng chung với bản tiếng Việt */
const translation = z.object({
  skills: z
    .array(
      z
        .object({ code: z.string().nullish(), name: z.string().nullish(), items: z.array(z.string()).nullish() })
        .nullish(),
    )
    .nullish(),
});

const base = schema.parse(parse(raw) ?? {}).skills;
const translations: Partial<Record<Locale, z.infer<typeof translation>>> = { en: translation.parse(parse(enRaw) ?? {}) };

/**
 * Danh sách kỹ năng (src/data/skills.yaml) theo ngôn ngữ. Bản dịch ghép theo thứ tự;
 * ô nào trống thì dùng bản tiếng Việt, không làm vỡ trang khi dịch dở.
 */
export function getSkills(locale: Locale = defaultLocale) {
  const over = translations[locale]?.skills ?? [];
  return base.map((s, i) => {
    const t = over[i];
    return {
      ...s,
      code: t?.code?.trim() || s.code,
      name: t?.name?.trim() || s.name,
      items: t?.items?.length ? t.items : s.items,
    };
  });
}

export type Skill = (typeof base)[number];
