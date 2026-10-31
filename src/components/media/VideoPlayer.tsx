import { useState } from "react"
import { PlayIcon } from "lucide-react"

import { cn } from "@/lib/utils"

interface VideoPlayerProps {
  id: string
  title: string
  /** Khung kiểu màn hình CRT ở mission control (dùng ở trang chủ) */
  crt?: boolean
  className?: string
}

/**
 * Trình phát YouTube kiểu "lite": chỉ hiện ảnh thu nhỏ, bấm mới tải player
 * (nhẹ hơn ~500KB mỗi video, dùng youtube-nocookie để không đặt cookie theo dõi).
 */
export function VideoPlayer({ id, title, crt = false, className }: VideoPlayerProps) {
  const [playing, setPlaying] = useState(false)

  return (
    <div className={cn("video-player", crt && "video-player--crt", className)}>
      {playing ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <button type="button" onClick={() => setPlaying(true)} aria-label={`Phát video: ${title}`}>
          <img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" loading="lazy" decoding="async" />
          <span className="video-player__play" aria-hidden="true">
            <PlayIcon />
          </span>
        </button>
      )}
    </div>
  )
}
