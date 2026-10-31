import { useCallback, useEffect, useState } from "react"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

export interface GalleryPhoto {
  thumb: string
  full: string
  width: number
  height: number
  alt: string
  caption?: string
  /** Link tới chuyến đi chứa ảnh (trang Ảnh) */
  href?: string
}

interface PhotoGalleryProps {
  photos: GalleryPhoto[]
  /** polaroid: ảnh dán băng keo, xoay nhẹ (trang Ảnh, trang chủ); grid: lưới gọn (trang chuyến đi) */
  variant?: "polaroid" | "grid"
}

/** Lưới ảnh + lightbox (shadcn Dialog). Phím ← → để chuyển ảnh. */
export function PhotoGallery({ photos, variant = "grid" }: PhotoGalleryProps) {
  const [index, setIndex] = useState<number | null>(null)
  const open = index !== null
  const current = open ? photos[index] : undefined

  const step = useCallback(
    (dir: 1 | -1) => setIndex((i) => (i === null ? i : (i + dir + photos.length) % photos.length)),
    [photos.length]
  )

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") step(1)
      if (e.key === "ArrowLeft") step(-1)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, step])

  return (
    <>
      <ul className={cn("photo-gallery", `photo-gallery--${variant}`)}>
        {photos.map((p, i) => (
          <li key={p.full} style={{ "--i": i } as React.CSSProperties}>
            <button type="button" onClick={() => setIndex(i)} aria-label={`Xem ảnh lớn: ${p.alt}`}>
              <img src={p.thumb} alt={p.alt} width={p.width} height={p.height} loading="lazy" decoding="async" />
              {variant === "polaroid" && p.caption && <span className="photo-gallery__caption">{p.caption}</span>}
            </button>
          </li>
        ))}
      </ul>

      <Dialog open={open} onOpenChange={(o) => !o && setIndex(null)}>
        <DialogContent className="max-h-[92vh] w-auto gap-3 p-3 sm:max-w-[min(92vw,1400px)]">
          {current && (
            <>
              <img
                src={current.full}
                alt={current.alt}
                className="max-h-[76vh] w-auto rounded-md object-contain"
                width={current.width}
                height={current.height}
              />
              <div className="flex items-center gap-3">
                <div className="flex min-w-0 flex-1 flex-col">
                  <DialogTitle className="truncate">{current.caption ?? current.alt}</DialogTitle>
                  <DialogDescription className="mono">
                    {String(index! + 1).padStart(2, "0")} / {String(photos.length).padStart(2, "0")}
                    {current.href && (
                      <>
                        {" · "}
                        <a href={current.href} className="underline underline-offset-4">
                          Xem chuyến đi
                        </a>
                      </>
                    )}
                  </DialogDescription>
                </div>
                {photos.length > 1 && (
                  <div className="flex gap-1">
                    <Button variant="outline" size="icon" onClick={() => step(-1)} aria-label="Ảnh trước">
                      <ChevronLeftIcon />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => step(1)} aria-label="Ảnh sau">
                      <ChevronRightIcon />
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
