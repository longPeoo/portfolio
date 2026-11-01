import { useEffect, useRef, useState } from "react"

import { cn } from "@/lib/utils"
import { createGlobe, toVec, GLOBE_R, type Vec3 } from "@/scripts/globe"

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
  /** Chữ lấy từ src/i18n: mô tả cho trình đọc màn hình + gợi ý thao tác */
  labels: { label: string; hint: string }
}

const toRad = (deg: number) => (deg * Math.PI) / 180
const clampLat = (lat: number) => Math.max(-0.9, Math.min(0.9, lat))
/** Quãng xoay ngắn nhất giữa hai góc */
const shortest = (from: number, to: number) => {
  const d = (to - from) % (2 * Math.PI)
  return from + (d > Math.PI ? d - 2 * Math.PI : d < -Math.PI ? d + 2 * Math.PI : d)
}

/** Đường bay: các điểm trên cung lớn giữa a và b, nhô lên khỏi mặt đất ở giữa (dài thì nhô cao hơn) */
function arcPoints(a: Vec3, b: Vec3, steps = 40): [Vec3, number][] {
  const dot = Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))
  const angle = Math.acos(dot)
  if (angle < 1e-4) return []
  const lift = 0.06 + 0.22 * Math.min(1, angle / 1.6)
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps
    const s1 = Math.sin((1 - t) * angle) / Math.sin(angle)
    const s2 = Math.sin(t * angle) / Math.sin(angle)
    const v: Vec3 = [a[0] * s1 + b[0] * s2, a[1] * s1 + b[1] * s2, a[2] * s1 + b[2] * s2]
    return [v, 1 + lift * Math.sin(Math.PI * t)]
  })
}

/**
 * Quả địa cầu các chuyến đi: Trái Đất thật (ảnh vệ tinh NASA, src/scripts/globe.ts), tự xoay chậm, kéo để xoay.
 * Đường bay nối các chuyến theo thứ tự thời gian. Rê chuột vào một chuyến trong danh sách → địa cầu xoay tới đó.
 * Mỗi chuyến có một ghim nổi: bấm để mở trang chuyến đi; ghim mờ dần khi điểm quay ra sau địa cầu.
 */
export function MissionsGlobe({ points, compact = false, labels }: MissionsGlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const arcRef = useRef<HTMLCanvasElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const pinRefs = useRef<(HTMLAnchorElement | null)[]>([])
  const target = useRef<[number, number] | null>(null)
  const [ready, setReady] = useState(false)
  const [active, setActive] = useState<string | null>(null)

  const listed = compact ? points.slice(0, 4) : points

  useEffect(() => {
    const canvas = canvasRef.current
    const arcCanvas = arcRef.current
    const stage = stageRef.current
    if (!canvas || !arcCanvas || !stage) return
    let disposed = false
    let cleanup = () => {}

    createGlobe(canvas).then((globe) => {
      if (!globe || disposed) return globe?.destroy()
      const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches
      const isDark = () => document.documentElement.classList.contains("dark")
      const vecs = points.map((p) => toVec(p.lat, p.lng))
      const chronological = points.map((p, i) => ({ p, v: vecs[i] })).sort((a, b) => a.p.date.localeCompare(b.p.date))
      const arcs = chronological.slice(1).map((c, i) => arcPoints(chronological[i].v, c.v))
      const ctx = arcCanvas.getContext("2d")
      const signal = getComputedStyle(stage).getPropertyValue("--primary").trim() || "#ff6a3d"

      // Bắt đầu nhìn vào chuyến gần nhất, hơi nghiêng để thấy cả bán cầu Bắc
      let lon = points[0] ? toRad(points[0].lng) : toRad(105)
      let lat = points[0] ? clampLat(toRad(points[0].lat) * 0.7) : 0.3
      let night = isDark() ? 1 : 0

      // Kéo để xoay (chuột: cả ngang và dọc; cảm ứng: chỉ ngang, để vẫn cuộn trang được)
      let drag: { x: number; y: number; mouse: boolean } | null = null
      const onDown = (e: PointerEvent) => {
        drag = { x: e.clientX, y: e.clientY, mouse: e.pointerType === "mouse" }
        target.current = null
        canvas.setPointerCapture(e.pointerId)
      }
      const onMove = (e: PointerEvent) => {
        if (!drag) return
        const perPx = 2 / (canvas.clientWidth * GLOBE_R)
        lon -= (e.clientX - drag.x) * perPx
        if (drag.mouse) lat = clampLat(lat + (e.clientY - drag.y) * perPx)
        drag.x = e.clientX
        drag.y = e.clientY
      }
      const onUp = () => (drag = null)
      canvas.addEventListener("pointerdown", onDown)
      canvas.addEventListener("pointermove", onMove)
      canvas.addEventListener("pointerup", onUp)
      canvas.addEventListener("pointercancel", onUp)

      // Rê chuột lên địa cầu → ngừng tự quay để ghim đứng yên, dễ bấm
      let hovering = false
      const onEnter = (e: PointerEvent) => (hovering = e.pointerType === "mouse")
      const onLeave = () => (hovering = false)
      stage.addEventListener("pointerenter", onEnter)
      stage.addEventListener("pointerleave", onLeave)

      const drawArcs = (time: number) => {
        if (!ctx) return
        const dpr = Math.min(2, window.devicePixelRatio || 1)
        const w = arcCanvas.clientWidth
        if (arcCanvas.width !== Math.round(w * dpr)) arcCanvas.width = arcCanvas.height = Math.round(w * dpr)
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        ctx.clearRect(0, 0, w, w)
        ctx.strokeStyle = signal
        ctx.lineWidth = 1.6
        ctx.lineCap = "round"
        ctx.setLineDash([5, 6])
        ctx.lineDashOffset = reduce ? 0 : -time * 0.02
        for (const arc of arcs) {
          ctx.beginPath()
          let pen = false
          for (const [v, h] of arc) {
            const s = globe.project(v, h)
            // Thấy được khi ở mặt trước, hoặc đã nhô ra ngoài viền quả cầu
            if (s.z > 0 || s.r > 1) {
              if (pen) ctx.lineTo(s.x * w, s.y * w)
              else ctx.moveTo(s.x * w, s.y * w)
              pen = true
            } else pen = false
          }
          ctx.stroke()
        }
      }

      const syncPins = () => {
        pinRefs.current.forEach((pin, i) => {
          if (!pin) return
          const s = globe.project(vecs[i])
          pin.style.left = `${s.x * 100}%`
          pin.style.top = `${s.y * 100}%`
          const v = Math.max(0, Math.min(1, s.z / 0.18))
          pin.style.setProperty("--v", v.toFixed(3))
          pin.style.visibility = v > 0.02 ? "" : "hidden"
        })
      }

      // Vòng lặp vẽ — chỉ chạy khi địa cầu đang trong màn hình
      let raf = 0
      let visible = true
      const loop = (time: number) => {
        if (target.current) {
          const k = reduce ? 1 : 0.08
          lon += (shortest(lon, target.current[0]) - lon) * k
          lat += (target.current[1] - lat) * k
        } else if (!drag && !hovering && !reduce) {
          lon -= 0.0022 // Trái Đất quay về phía đông: bề mặt trôi sang phải
        }
        night += ((isDark() ? 1 : 0) - night) * (reduce ? 1 : 0.08)
        globe.draw({ lon, lat, night })
        drawArcs(time)
        syncPins()
        if (visible) raf = requestAnimationFrame(loop)
      }
      raf = requestAnimationFrame(loop)
      const io = new IntersectionObserver(([entry]) => {
        const was = visible
        visible = entry.isIntersecting
        if (visible && !was) raf = requestAnimationFrame(loop)
      })
      io.observe(canvas)
      setReady(true)

      cleanup = () => {
        cancelAnimationFrame(raf)
        io.disconnect()
        canvas.removeEventListener("pointerdown", onDown)
        canvas.removeEventListener("pointermove", onMove)
        canvas.removeEventListener("pointerup", onUp)
        canvas.removeEventListener("pointercancel", onUp)
        stage.removeEventListener("pointerenter", onEnter)
        stage.removeEventListener("pointerleave", onLeave)
        globe.destroy()
      }
    })

    return () => {
      disposed = true
      cleanup()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const focus = (p: GlobePoint | null) => {
    setActive(p?.id ?? null)
    target.current = p ? [toRad(p.lng), clampLat(toRad(p.lat))] : null
  }

  return (
    <div className={cn("missions-globe", compact && "missions-globe--compact")}>
      <div className="missions-globe__stage" ref={stageRef}>
        <canvas
          ref={canvasRef}
          className={cn("missions-globe__canvas", ready && "is-ready")}
          aria-label={labels.label}
          role="img"
        />
        <canvas ref={arcRef} className={cn("missions-globe__arcs", ready && "is-ready")} aria-hidden="true" />
        {/* Trùng với danh sách bên cạnh nên ẩn khỏi bàn phím/trình đọc màn hình */}
        {points.map((p, i) => (
          <a
            key={p.id}
            ref={(el) => {
              pinRefs.current[i] = el
            }}
            href={`/journeys/${p.id}`}
            className={cn("missions-globe__pin", ready && "is-ready")}
            data-active={active === p.id || undefined}
            tabIndex={-1}
            aria-hidden="true"
            onMouseEnter={() => setActive(p.id)}
            onMouseLeave={() => setActive(null)}
          >
            {p.place}
          </a>
        ))}
        <p className="mono missions-globe__hint">{labels.hint}</p>
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
