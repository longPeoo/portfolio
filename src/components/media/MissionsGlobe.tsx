import { useEffect, useRef, useState } from "react"
import createGlobe from "cobe"

import { cn } from "@/lib/utils"

export interface GlobePoint {
  id: string
  title: string
  place: string
  lat: number
  lng: number
  date: string
}

interface MissionsGlobeProps {
  points: GlobePoint[]
  /** Bản gọn cho trang chủ: chỉ hiện 4 chuyến gần nhất trong danh sách */
  compact?: boolean
}

const SIGNAL: [number, number, number] = [1, 0.416, 0.239]

/** Toạ độ → góc quay của cobe (phi: kinh độ, theta: vĩ độ) */
const toAngles = (lat: number, lng: number): [number, number] => [
  Math.PI - ((lng * Math.PI) / 180 - Math.PI / 2),
  (lat * Math.PI) / 180,
]
/** Quãng xoay ngắn nhất giữa hai góc */
const shortest = (from: number, to: number) => {
  const d = (to - from) % (2 * Math.PI)
  return from + (d > Math.PI ? d - 2 * Math.PI : d < -Math.PI ? d + 2 * Math.PI : d)
}

const palette = () =>
  document.documentElement.classList.contains("dark")
    ? { dark: 1, baseColor: [0.22, 0.27, 0.48] as [number, number, number], glowColor: [0.15, 0.19, 0.38] as [number, number, number], mapBrightness: 5 }
    : { dark: 0, baseColor: [0.97, 0.94, 0.87] as [number, number, number], glowColor: [0.93, 0.88, 0.79] as [number, number, number], mapBrightness: 6 }

/**
 * Quả địa cầu các chuyến đi (cobe, ~5KB WebGL).
 * Đường bay nối các chuyến theo thứ tự thời gian. Rê chuột vào một chuyến → địa cầu xoay tới đó.
 */
export function MissionsGlobe({ points, compact = false }: MissionsGlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const target = useRef<[number, number] | null>(null)
  const [ready, setReady] = useState(false)
  const [active, setActive] = useState<string | null>(null)

  const chronological = [...points].sort((a, b) => a.date.localeCompare(b.date))
  const listed = compact ? points.slice(0, 4) : points

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const start = points[0] ? toAngles(points[0].lat, points[0].lng) : [0, 0.3]
    let phi = start[0]
    let theta = Math.max(-0.6, Math.min(0.6, start[1]))
    let size = canvas.offsetWidth

    const globe = createGlobe(canvas, {
      devicePixelRatio: dpr,
      width: size * dpr,
      height: size * dpr,
      phi,
      theta,
      diffuse: 1.2,
      mapSamples: 16000,
      markerColor: SIGNAL,
      arcColor: SIGNAL,
      arcWidth: 0.6,
      arcHeight: 0.25,
      markerElevation: 0.02,
      markers: points.map((p) => ({ location: [p.lat, p.lng] as [number, number], size: 0.07, id: p.id })),
      arcs: chronological.slice(1).map((p, i) => ({
        from: [chronological[i].lat, chronological[i].lng] as [number, number],
        to: [p.lat, p.lng] as [number, number],
      })),
      ...palette(),
    })

    // Kéo để xoay
    let dragX: number | null = null
    const onDown = (e: PointerEvent) => {
      dragX = e.clientX
      target.current = null
      canvas.setPointerCapture(e.pointerId)
    }
    const onMove = (e: PointerEvent) => {
      if (dragX === null) return
      phi += (e.clientX - dragX) / 180
      dragX = e.clientX
    }
    const onUp = () => (dragX = null)
    canvas.addEventListener("pointerdown", onDown)
    canvas.addEventListener("pointermove", onMove)
    canvas.addEventListener("pointerup", onUp)
    canvas.addEventListener("pointercancel", onUp)

    // Vòng lặp vẽ — chỉ chạy khi địa cầu đang trong màn hình
    let raf = 0
    let visible = true
    const loop = () => {
      if (target.current) {
        phi += (shortest(phi, target.current[0]) - phi) * 0.08
        theta += (target.current[1] - theta) * 0.08
      } else if (dragX === null && !reduce) {
        phi += 0.0025
      }
      globe.update({ phi, theta })
      if (visible) raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    const io = new IntersectionObserver(([entry]) => {
      const was = visible
      visible = entry.isIntersecting
      if (visible && !was) raf = requestAnimationFrame(loop)
    })
    io.observe(canvas)

    const ro = new ResizeObserver(() => {
      size = canvas.offsetWidth
      globe.update({ width: size * dpr, height: size * dpr })
    })
    ro.observe(canvas)

    // Đổi màu theo chế độ sáng/tối
    const mo = new MutationObserver(() => globe.update(palette()))
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })

    const t = window.setTimeout(() => setReady(true), 80)
    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(t)
      io.disconnect()
      ro.disconnect()
      mo.disconnect()
      globe.destroy()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const focus = (p: GlobePoint | null) => {
    setActive(p?.id ?? null)
    if (!p) return (target.current = null)
    const [ph, th] = toAngles(p.lat, p.lng)
    target.current = [ph, Math.max(-0.9, Math.min(0.9, th))]
  }

  return (
    <div className={cn("missions-globe", compact && "missions-globe--compact")}>
      <div className="missions-globe__stage">
        <canvas
          ref={canvasRef}
          className={cn("missions-globe__canvas", ready && "is-ready")}
          aria-label={`Quả địa cầu đánh dấu ${points.length} chuyến đi`}
          role="img"
        />
      </div>
      <ol className="missions-globe__list">
        {listed.map((p, i) => (
          <li key={p.id}>
            <a
              href={`/journeys/${p.id}`}
              data-active={active === p.id || undefined}
              onMouseEnter={() => focus(p)}
              onMouseLeave={() => focus(null)}
              onFocus={() => focus(p)}
              onBlur={() => focus(null)}
            >
              <span className="mono">M-{String(points.length - i).padStart(2, "0")}</span>
              <span className="missions-globe__place">{p.place}</span>
              <span className="missions-globe__title">{p.title}</span>
            </a>
          </li>
        ))}
      </ol>
    </div>
  )
}
