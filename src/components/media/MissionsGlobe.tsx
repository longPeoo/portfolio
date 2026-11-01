import { useEffect, useRef, useState } from "react"
import { GlobeIcon, MinusIcon, PlusIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { createGlobe, toVec, GLOBE_R, MAX_ZOOM, type Vec3 } from "@/scripts/globe"

export interface GlobePoint {
  id: string
  title: string
  place: string
  country: string
  /** Mã quốc gia ISO 2 chữ → khoá trong flags */
  code: string
  lat: number
  lng: number
  /** Chưa có ngày thì không nối đường bay */
  date?: string
  /** Chỉ có khi chuyến đi đã có trang riêng (có ảnh bìa) */
  href?: string
}

interface MissionsGlobeProps {
  points: GlobePoint[]
  /** SVG cờ theo mã quốc gia (render lúc build, src/lib/flags.ts) */
  flags: Record<string, string>
  /** Bản gọn cho trang chủ: chỉ hiện 4 chuyến gần nhất trong danh sách */
  compact?: boolean
  /** Chữ lấy từ src/i18n: mô tả cho trình đọc màn hình, gợi ý thao tác, nút phóng to/thu nhỏ */
  labels: { label: string; hint: string; zoomIn: string; zoomOut: string; zoomReset: string }
}

const toRad = (deg: number) => (deg * Math.PI) / 180
const clampLat = (lat: number) => Math.max(-1.2, Math.min(1.2, lat))
const clampZoom = (z: number) => Math.max(1, Math.min(MAX_ZOOM, z))
/** Rê vào một nơi trong danh sách → phóng tới ít nhất mức này (đủ tách các nước ở châu Âu) */
const FOCUS_ZOOM = 3
/** Hai ghim gần hơn khoảng này (px) thì gom thành một cụm "+n" */
const CLUSTER_PX = 22
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
 * Đường bay nối các chuyến theo thứ tự thời gian. Rê chuột vào một nơi trong danh sách → địa cầu xoay và phóng tới đó.
 * Mỗi nơi có một ghim cờ (rê chuột hiện tên): chuyến có trang riêng thì bấm để mở; ghim mờ dần khi điểm quay ra sau địa cầu.
 * Phóng to: cuộn chuột trên địa cầu (vào đúng chỗ con trỏ), nút +/−, chụm 2 ngón, bấm đúp.
 * Ghim quá gần nhau gom thành cụm "+n"; bấm cụm → phóng tới đó.
 */
export function MissionsGlobe({ points, flags, compact = false, labels }: MissionsGlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const arcRef = useRef<HTMLCanvasElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const readoutRef = useRef<HTMLSpanElement>(null)
  const pinRefs = useRef<(HTMLElement | null)[]>([])
  /** Điểm cần xoay tới. hold: giữ khi đang rê vào danh sách; không hold: bay tới rồi thả (bấm cụm, bấm đúp) */
  const target = useRef<{ lon: number; lat: number; hold: boolean } | null>(null)
  /** Mức phóng người xem chọn; vòng lặp vẽ tiến dần tới mức này */
  const userZoom = useRef(1)
  /** Các ghim trong cụm mà mỗi ghim đang đại diện (bấm cụm thì phóng tới giữa cụm) */
  const clusters = useRef<number[][]>([])
  const [ready, setReady] = useState(false)
  const [active, setActive] = useState<string | null>(null)
  const [zoomLevel, setZoomLevel] = useState(1)

  const listed = compact ? points.slice(0, 4) : points

  const setZoom = (z: number) => {
    userZoom.current = clampZoom(z)
    setZoomLevel(userZoom.current)
  }

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
      const chronological = points
        .map((p, i) => ({ p, v: vecs[i] }))
        .filter((c) => c.p.date)
        .sort((a, b) => a.p.date!.localeCompare(b.p.date!))
      const arcs = chronological.slice(1).map((c, i) => arcPoints(chronological[i].v, c.v))
      const ctx = arcCanvas.getContext("2d")
      const signal = getComputedStyle(stage).getPropertyValue("--primary").trim() || "#ff6a3d"

      // Bắt đầu nhìn vào chuyến gần nhất, hơi nghiêng để thấy cả bán cầu Bắc
      let lon = points[0] ? toRad(points[0].lng) : toRad(105)
      let lat = points[0] ? clampLat(toRad(points[0].lat) * 0.7) : 0.3
      let zoom = 1
      let night = isDark() ? 1 : 0

      // Kéo để xoay. Chuột: cả ngang và dọc. Cảm ứng: chỉ ngang (để vẫn cuộn trang được), trừ khi đang phóng to.
      // Hai ngón: chụm để phóng to/thu nhỏ.
      const pointers = new Map<number, { x: number; y: number }>()
      let drag: { x: number; y: number; free: boolean } | null = null
      let pinch: { dist: number; zoom: number } | null = null
      const pinchDist = () => {
        const [a, b] = [...pointers.values()]
        return Math.hypot(a.x - b.x, a.y - b.y)
      }
      const onDown = (e: PointerEvent) => {
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
        canvas.setPointerCapture(e.pointerId)
        target.current = null
        if (pointers.size === 2) {
          drag = null
          pinch = { dist: pinchDist(), zoom: userZoom.current }
        } else drag = { x: e.clientX, y: e.clientY, free: e.pointerType === "mouse" || zoom > 1.05 }
      }
      const onMove = (e: PointerEvent) => {
        if (!pointers.has(e.pointerId)) return
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
        if (pinch && pointers.size === 2) {
          userZoom.current = clampZoom((pinch.zoom * pinchDist()) / pinch.dist)
          return
        }
        if (!drag) return
        const perPx = 2 / (canvas.clientWidth * GLOBE_R * zoom)
        lon -= (e.clientX - drag.x) * perPx
        if (drag.free) lat = clampLat(lat + (e.clientY - drag.y) * perPx)
        drag.x = e.clientX
        drag.y = e.clientY
      }
      const onUp = (e: PointerEvent) => {
        pointers.delete(e.pointerId)
        if (pinch && pointers.size < 2) {
          pinch = null
          setZoom(userZoom.current)
        }
        if (pointers.size === 0) drag = null
      }
      // Cuộn chuột trên địa cầu → phóng to/thu nhỏ vào đúng chỗ con trỏ. Để trang không bị "kẹt":
      // - trang vừa cuộn (< 300 ms, con trỏ chỉ lướt qua địa cầu) → cú cuộn vẫn thuộc về trang
      // - đã thu nhỏ hết mà cuộn xuống / phóng hết cỡ mà cuộn lên → trang cuộn tiếp
      // Ctrl/⌘ + cuộn (gồm thao tác chụm trên touchpad) luôn là phóng to.
      let lastPageScroll = 0
      const onPageScroll = () => (lastPageScroll = performance.now())
      const onWheel = (e: WheelEvent) => {
        const pinchGesture = e.ctrlKey || e.metaKey
        const dy = e.deltaY * (e.deltaMode === 1 ? 16 : 1)
        if (!pinchGesture) {
          if (performance.now() - lastPageScroll < 300) return
          if ((dy > 0 && userZoom.current <= 1) || (dy < 0 && userZoom.current >= MAX_ZOOM)) return
        }
        e.preventDefault()
        e.stopPropagation() // không để cuộn mượt toàn trang (Lenis) cuộn theo
        const from = userZoom.current
        setZoom(from * Math.exp(-dy * (pinchGesture ? 0.01 : 0.0025)))
        // Xoay một phần về phía con trỏ để điểm dưới con trỏ đứng yên khi phóng to (như bản đồ)
        const r = canvas.getBoundingClientRect()
        const hit = globe.pick((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height)
        const f = 1 - from / userZoom.current
        if (hit && f > 0) {
          target.current = null
          lon += (shortest(lon, hit[0]) - lon) * f
          lat = clampLat(lat + (hit[1] - lat) * f)
        }
      }
      window.addEventListener("scroll", onPageScroll, { passive: true })
      // Bấm đúp → phóng gấp đôi, đưa điểm vừa bấm vào giữa
      const onDblClick = (e: MouseEvent) => {
        const r = canvas.getBoundingClientRect()
        const hit = globe.pick((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height)
        if (hit) target.current = { lon: hit[0], lat: clampLat(hit[1]), hold: false }
        setZoom(userZoom.current * 2)
      }
      canvas.addEventListener("pointerdown", onDown)
      canvas.addEventListener("pointermove", onMove)
      canvas.addEventListener("pointerup", onUp)
      canvas.addEventListener("pointercancel", onUp)
      canvas.addEventListener("dblclick", onDblClick)
      stage.addEventListener("wheel", onWheel, { passive: false })

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
        // Cắt theo "ống kính" tròn như quả cầu khi phóng to
        ctx.save()
        ctx.beginPath()
        ctx.arc(w / 2, w / 2, w / 2, 0, 2 * Math.PI)
        ctx.clip()
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
        ctx.restore()
      }

      // Ghim: ẩn khi ở mặt sau hoặc ra ngoài ống kính. Ghim quá gần nhau gom thành cụm;
      // ghim đang chọn luôn đứng đầu cụm, rồi tới chuyến có trang riêng.
      const syncPins = () => {
        const size = canvas.clientWidth
        const screen = vecs.map((v) => globe.project(v))
        const shown = screen.map((s) => (Math.hypot(s.x - 0.5, s.y - 0.5) < 0.49 ? Math.max(0, Math.min(1, s.z / 0.18)) : 0))
        const activeIdx = pinRefs.current.findIndex((el) => el?.hasAttribute("data-active"))
        const order = points
          .map((_, i) => i)
          .filter((i) => shown[i] > 0.02)
          .sort(
            (a, b) =>
              Number(b === activeIdx) - Number(a === activeIdx) || Number(!!points[b].href) - Number(!!points[a].href) || a - b,
          )
        const groups = new Map<number, number[]>()
        for (const i of order) {
          const head = [...groups.keys()].find(
            (h) => Math.hypot((screen[h].x - screen[i].x) * size, (screen[h].y - screen[i].y) * size) < CLUSTER_PX,
          )
          if (head === undefined) groups.set(i, [i])
          else groups.get(head)!.push(i)
        }
        clusters.current = points.map((_, i) => groups.get(i) ?? [i])
        pinRefs.current.forEach((pin, i) => {
          if (!pin) return
          const s = screen[i]
          pin.style.left = `${s.x * 100}%`
          pin.style.top = `${s.y * 100}%`
          const group = groups.get(i)
          const v = group ? shown[i] : 0
          pin.style.setProperty("--v", v.toFixed(3))
          pin.style.visibility = v > 0.02 ? "" : "hidden"
          const extra = group ? group.length - 1 : 0
          if (extra) pin.setAttribute("data-count", String(extra))
          else pin.removeAttribute("data-count")
          // Tên các nơi khác trong cụm, nối sau tên ghim đầu cụm
          const more = pin.querySelector(".missions-globe__more")
          const names = group ? group.slice(1, 3).map((j) => points[j].place) : []
          const text = extra ? ` · ${names.join(" · ")}${extra > 2 ? ` +${extra - 2}` : ""}` : ""
          if (more && more.textContent !== text) more.textContent = text
        })
      }

      // Vòng lặp vẽ — chỉ chạy khi địa cầu đang trong màn hình
      let raf = 0
      let visible = true
      let readout = ""
      const loop = (time: number) => {
        const t = target.current
        const k = reduce ? 1 : 0.08
        if (t) {
          const nextLon = lon + (shortest(lon, t.lon) - lon) * k
          lat += (t.lat - lat) * k
          // Bay tới rồi thả: tới nơi thì người xem lại tự do kéo/xoay
          if (!t.hold && Math.abs(nextLon - lon) < 1e-4 && Math.abs(t.lat - lat) < 1e-4) target.current = null
          lon = nextLon
        } else if (!drag && !hovering && !reduce && zoom < 1.05) {
          lon -= 0.0022 // Trái Đất quay về phía đông: bề mặt trôi sang phải (dừng khi đang phóng to)
        }
        const wantZoom = t?.hold ? Math.max(userZoom.current, FOCUS_ZOOM) : userZoom.current
        zoom += (wantZoom - zoom) * (reduce ? 1 : 0.12)
        night += ((isDark() ? 1 : 0) - night) * (reduce ? 1 : 0.08)
        // Bắt đầu phóng to → tải ảnh nét (chỉ một lần)
        if (zoom > 1.5) globe.loadDetail()
        globe.draw({ lon, lat, night, zoom })
        drawArcs(time)
        syncPins()
        // Đang phóng to: chạm một ngón cũng xoay được theo mọi hướng (không cuộn trang khi chạm vào địa cầu)
        canvas.style.touchAction = zoom > 1.05 ? "none" : ""
        const text = `×${zoom.toFixed(1)}`
        if (readoutRef.current && text !== readout) readoutRef.current.textContent = readout = text
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
        canvas.removeEventListener("dblclick", onDblClick)
        stage.removeEventListener("wheel", onWheel)
        window.removeEventListener("scroll", onPageScroll)
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
    target.current = p ? { lon: toRad(p.lng), lat: clampLat(toRad(p.lat)), hold: true } : null
  }

  /** Bấm vào cụm ghim: phóng tới giữa cụm. Đã phóng hết cỡ (vd. Rome và Vatican sát nhau) thì mở trang như ghim thường. */
  const openCluster = (e: React.MouseEvent, i: number) => {
    const group = clusters.current[i] ?? [i]
    if (group.length < 2 || userZoom.current >= MAX_ZOOM) return
    e.preventDefault()
    const v = group.reduce<Vec3>(
      (acc, j) => {
        const u = toVec(points[j].lat, points[j].lng)
        return [acc[0] + u[0], acc[1] + u[1], acc[2] + u[2]]
      },
      [0, 0, 0],
    )
    target.current = { lon: Math.atan2(v[0], v[2]), lat: clampLat(Math.atan2(v[1], Math.hypot(v[0], v[2]))), hold: false }
    setZoom(userZoom.current * 2.5)
  }

  return (
    <div className={cn("missions-globe", compact && "missions-globe--compact")}>
      <div className="missions-globe__stage" ref={stageRef} data-zoomed={zoomLevel > 1.05 || undefined}>
        <canvas
          ref={canvasRef}
          className={cn("missions-globe__canvas", ready && "is-ready")}
          aria-label={labels.label}
          role="img"
        />
        <canvas ref={arcRef} className={cn("missions-globe__arcs", ready && "is-ready")} aria-hidden="true" />
        {/* Trùng với danh sách bên cạnh nên ẩn khỏi bàn phím/trình đọc màn hình */}
        {points.map((p, i) => {
          const Pin = p.href ? "a" : "span"
          return (
            <Pin
              key={p.id}
              ref={(el: HTMLElement | null) => {
                pinRefs.current[i] = el
              }}
              href={p.href}
              className={cn("missions-globe__pin", ready && "is-ready")}
              data-active={active === p.id || undefined}
              tabIndex={-1}
              aria-hidden="true"
              onMouseEnter={() => setActive(p.id)}
              onMouseLeave={() => setActive(null)}
              onClick={(e: React.MouseEvent) => openCluster(e, i)}
            >
              <span className="missions-globe__flag" dangerouslySetInnerHTML={{ __html: flags[p.code] ?? "" }} />
              <span className="missions-globe__label">
                {p.place}
                <span className="missions-globe__more" />
              </span>
            </Pin>
          )
        })}
        {ready && (
          <div className="missions-globe__zoom">
            <Button
              variant="outline"
              size="icon-sm"
              className="rounded-full"
              onClick={() => setZoom(userZoom.current * 1.6)}
              disabled={zoomLevel >= MAX_ZOOM}
              aria-label={labels.zoomIn}
              title={labels.zoomIn}
            >
              <PlusIcon />
            </Button>
            <span className="mono missions-globe__readout" ref={readoutRef} aria-hidden="true">
              ×1.0
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              className="rounded-full"
              onClick={() => setZoom(userZoom.current / 1.6)}
              disabled={zoomLevel <= 1}
              aria-label={labels.zoomOut}
              title={labels.zoomOut}
            >
              <MinusIcon />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              className="rounded-full"
              onClick={() => setZoom(1)}
              disabled={zoomLevel <= 1}
              aria-label={labels.zoomReset}
              title={labels.zoomReset}
            >
              <GlobeIcon />
            </Button>
          </div>
        )}
        <p className="mono missions-globe__hint">{labels.hint}</p>
      </div>
      {/* data-lenis-prevent: danh sách dài tự cuộn bên trong, không bị cuộn mượt toàn trang (Lenis) chiếm */}
      <ol className="missions-globe__list" data-lenis-prevent>
        {listed.map((p, i) => {
          // Chuyến có trang riêng: link; chưa có: nút chỉ xoay địa cầu tới đó
          const Item = p.href ? "a" : "button"
          return (
            <li key={p.id}>
              <Item
                href={p.href}
                type={p.href ? undefined : "button"}
                data-active={active === p.id || undefined}
                onMouseEnter={() => focus(p)}
                onMouseLeave={() => focus(null)}
                onFocus={() => focus(p)}
                onBlur={() => focus(null)}
              >
                <span className="mono">M-{String(points.length - i).padStart(2, "0")}</span>
                <span className="missions-globe__place">
                  <span className="missions-globe__flag" dangerouslySetInnerHTML={{ __html: flags[p.code] ?? "" }} />
                  {p.place}
                </span>
                {/* Dòng phụ: tiêu đề chuyến đi; chưa đặt tiêu đề thì ghi tên nước (bỏ qua nếu trùng tên nơi, vd. Singapore) */}
                <span className="missions-globe__title">{p.title !== p.place ? p.title : p.country !== p.place ? p.country : ""}</span>
              </Item>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
