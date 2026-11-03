import { parse } from 'yaml';
import { z } from 'astro/zod';
import raw from '@/data/skills.yaml?raw';

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

/** Danh sách kỹ năng (src/data/skills.yaml) */
export const skills = schema.parse(parse(raw) ?? {}).skills;

export type Skill = (typeof skills)[number];
