import { useState } from "react"
import { ExternalLinkIcon, PlayIcon, XIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

export interface GridVideo {
  id: string
  title: string
  published: string
  views: number
  url: string
  categories: string[]
}

interface VideoGridProps {
  videos: GridVideo[]
  categories: string[]
}

const ALL = "__all"
const dateFmt = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })
const viewFmt = new Intl.NumberFormat("vi-VN", { notation: "compact" })
/** Video đăng trong 14 ngày gần đây được gắn nhãn "New transmission" */
const isNew = (iso: string) => Date.now() - new Date(iso).valueOf() < 14 * 864e5

export function VideoGrid({ videos, categories }: VideoGridProps) {
  const [filter, setFilter] = useState(ALL)
  const [playing, setPlaying] = useState<GridVideo | null>(null)
  const shown = filter === ALL ? videos : videos.filter((v) => v.categories.includes(filter))

  return (
    <div className="flex flex-col gap-8">
      {categories.length > 0 && (
        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList>
            <TabsTrigger value={ALL}>Tất cả</TabsTrigger>
            {categories.map((c) => (
              <TabsTrigger key={c} value={c}>
                {c}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      <ul className="video-grid">
        {shown.map((v) => (
          <li key={v.id}>
            <button type="button" className="video-card" onClick={() => setPlaying(v)}>
              <span className="video-card__thumb">
                <img src={`https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`} alt="" loading="lazy" decoding="async" />
                <span className="video-player__play" aria-hidden="true">
                  <PlayIcon />
                </span>
                {isNew(v.published) && (
                  <Badge variant="active" className="video-card__new">
                    <i aria-hidden="true" />
                    New transmission
                  </Badge>
                )}
              </span>
              <span className="video-card__title">{v.title}</span>
              <span className="mono text-muted-foreground">
                {dateFmt.format(new Date(v.published))}
                {v.views > 0 && ` · ${viewFmt.format(v.views)} lượt xem`}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <Dialog open={!!playing} onOpenChange={(o) => !o && setPlaying(null)}>
        {/* grid-cols-[minmax(0,1fr)]: không để tiêu đề dài (truncate) đẩy khung video rộng quá màn hình */}
        {/* Nút đóng mặc định nằm đè lên góc video → bỏ, đặt nút đóng ở hàng dưới */}
        <DialogContent showCloseButton={false} className="w-full grid-cols-[minmax(0,1fr)] gap-3 p-3 sm:max-w-[min(92vw,1200px)]">
          {playing && (
            <>
              <div className="video-player">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${playing.id}?autoplay=1&rel=0`}
                  title={playing.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                <div className="flex w-full min-w-0 flex-1 flex-col">
                  <DialogTitle className="truncate">{playing.title}</DialogTitle>
                  <DialogDescription className="mono">{dateFmt.format(new Date(playing.published))}</DialogDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" asChild>
                    <a href={playing.url} target="_blank" rel="noopener noreferrer">
                      Mở trên YouTube <ExternalLinkIcon data-icon="inline-end" />
                    </a>
                  </Button>
                  <DialogClose asChild>
                    <Button variant="ghost" size="icon" aria-label="Đóng video">
                      <XIcon />
                    </Button>
                  </DialogClose>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
