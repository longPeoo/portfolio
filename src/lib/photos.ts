import { getImage } from 'astro:assets';
import type { ImageMetadata } from 'astro';
import type { GalleryPhoto } from '@/components/media/PhotoGallery';

interface PhotoInput {
  src: ImageMetadata;
  alt: string;
  caption?: string;
  href?: string;
}

/** Tạo ảnh thu nhỏ + ảnh lớn (WebP, đã nén) lúc build để truyền cho PhotoGallery */
export async function toGalleryPhotos(items: PhotoInput[]): Promise<GalleryPhoto[]> {
  return Promise.all(
    items.map(async ({ src, alt, caption, href }) => {
      const thumb = await getImage({ src, width: 720, format: 'webp', quality: 78 });
      const full = await getImage({ src, width: 1920, format: 'webp', quality: 82 });
      return {
        thumb: thumb.src,
        full: full.src,
        width: Number(thumb.attributes.width ?? 720),
        height: Number(thumb.attributes.height ?? Math.round((720 * src.height) / src.width)),
        alt,
        caption,
        href,
      };
    }),
  );
}
