import { useEffect, useMemo, useRef, useState } from 'react'
import { makeTf, type Tf, type View } from '../utils/draw'

export interface PointerInfo {
  /** 수학 좌표 */
  x: number
  y: number
  /** 캔버스 픽셀 좌표 */
  px: number
  py: number
}

interface Props {
  view: View
  height: number
  draw: (ctx: CanvasRenderingContext2D, tf: Tf) => void
  onPointerMove?: (p: PointerInfo, e: React.PointerEvent) => void
  onPointerDown?: (p: PointerInfo, e: React.PointerEvent) => void
  onPointerUp?: (p: PointerInfo, e: React.PointerEvent) => void
  onPointerLeave?: () => void
  /** 터치 스크롤 허용 여부 (드래그가 필요한 그래프는 'none') */
  touchAction?: 'pan-y' | 'none'
  cursor?: string
  className?: string
  ariaLabel?: string
}

/** 반응형 폭 + 고해상도(DPR) 대응 캔버스. 매 렌더마다 draw 콜백으로 다시 그린다. */
export default function GraphCanvas({
  view,
  height,
  draw,
  onPointerMove,
  onPointerDown,
  onPointerUp,
  onPointerLeave,
  touchAction = 'pan-y',
  cursor = 'crosshair',
  className = '',
  ariaLabel,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [width, setWidth] = useState(600)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const w = Math.floor(entries[0].contentRect.width)
      if (w > 0) setWidth(w)
    })
    ro.observe(el)
    setWidth(Math.max(1, Math.floor(el.clientWidth)))
    return () => ro.disconnect()
  }, [])

  const tf = useMemo(
    () => makeTf(width, height, view),
    [width, height, view.xmin, view.xmax, view.ymin, view.ymax], // eslint-disable-line react-hooks/exhaustive-deps
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.floor(width * dpr)
    canvas.height = Math.floor(height * dpr)
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, width, height)
    draw(ctx, tf)
  })

  const info = (e: React.PointerEvent): PointerInfo => {
    const r = canvasRef.current!.getBoundingClientRect()
    const px = e.clientX - r.left
    const py = e.clientY - r.top
    return { x: tf.ix(px), y: tf.iy(py), px, py }
  }

  return (
    <div ref={wrapRef} className={`w-full ${className}`}>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={ariaLabel}
        style={{ width, height, touchAction, cursor, display: 'block' }}
        onPointerMove={onPointerMove ? (e) => onPointerMove(info(e), e) : undefined}
        onPointerDown={
          onPointerDown
            ? (e) => {
                if (touchAction === 'none') e.currentTarget.setPointerCapture(e.pointerId)
                onPointerDown(info(e), e)
              }
            : undefined
        }
        onPointerUp={onPointerUp ? (e) => onPointerUp(info(e), e) : undefined}
        onPointerLeave={onPointerLeave}
      />
    </div>
  )
}
