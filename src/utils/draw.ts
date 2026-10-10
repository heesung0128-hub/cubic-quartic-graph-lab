import { evalPoly, type Coeffs } from './math'

export interface View {
  xmin: number
  xmax: number
  ymin: number
  ymax: number
}

export interface Tf {
  w: number
  h: number
  view: View
  X: (x: number) => number
  Y: (y: number) => number
  ix: (px: number) => number
  iy: (py: number) => number
}

export const COLORS = {
  pos: '#2563eb',
  neg: '#dc2626',
  posFill: 'rgba(37, 99, 235, 0.22)',
  negFill: 'rgba(220, 38, 38, 0.22)',
  curve: '#0f172a',
  grid: '#e2e8f0',
  axis: '#475569',
  guide: '#6366f1',
  amber: '#f59e0b',
  green: '#16a34a',
}

export function makeTf(w: number, h: number, view: View): Tf {
  const sx = w / (view.xmax - view.xmin)
  const sy = h / (view.ymax - view.ymin)
  return {
    w,
    h,
    view,
    X: (x) => (x - view.xmin) * sx,
    Y: (y) => h - (y - view.ymin) * sy,
    ix: (px) => view.xmin + px / sx,
    iy: (py) => view.ymin + (h - py) / sy,
  }
}

function niceStep(raw: number): number {
  const pow = Math.pow(10, Math.floor(Math.log10(raw)))
  const f = raw / pow
  const n = f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10
  return n * pow
}

/** y 범위를 함수값에서 자동 계산 (0 포함, 여백, 상한 클램프) */
export function autoView(
  fn: (x: number) => number,
  xmin: number,
  xmax: number,
  clamp = 14,
  minSpan = 4,
): View {
  let lo = 0
  let hi = 0
  for (let i = 0; i <= 160; i++) {
    const y = fn(xmin + ((xmax - xmin) * i) / 160)
    if (Number.isFinite(y)) {
      lo = Math.min(lo, y)
      hi = Math.max(hi, y)
    }
  }
  lo = Math.max(lo, -clamp)
  hi = Math.min(hi, clamp)
  const span = Math.max(hi - lo, minSpan)
  const pad = span * 0.14
  const mid = (hi + lo) / 2
  return { xmin, xmax, ymin: mid - span / 2 - pad, ymax: mid + span / 2 + pad }
}

export function polyView(p: Coeffs, xmin: number, xmax: number, clamp?: number, minSpan?: number): View {
  return autoView((x) => evalPoly(p, x), xmin, xmax, clamp, minSpan)
}

export function drawGrid(ctx: CanvasRenderingContext2D, t: Tf, labels = true) {
  const { view, w, h } = t
  const sx = niceStep((view.xmax - view.xmin) / 9)
  const sy = niceStep((view.ymax - view.ymin) / 6)
  ctx.save()
  ctx.lineWidth = 1
  ctx.font = '11px system-ui, sans-serif'
  ctx.fillStyle = '#94a3b8'
  const x0 = Math.ceil(view.xmin / sx) * sx
  for (let x = x0; x <= view.xmax + 1e-9; x += sx) {
    const px = Math.round(t.X(x)) + 0.5
    ctx.strokeStyle = COLORS.grid
    ctx.beginPath()
    ctx.moveTo(px, 0)
    ctx.lineTo(px, h)
    ctx.stroke()
    if (labels && Math.abs(x) > 1e-9) {
      ctx.textAlign = 'center'
      const ay = Math.min(Math.max(t.Y(0) + 13, 12), h - 3)
      ctx.fillText(String(Number(x.toFixed(6))), px, ay)
    }
  }
  const y0 = Math.ceil(view.ymin / sy) * sy
  for (let y = y0; y <= view.ymax + 1e-9; y += sy) {
    const py = Math.round(t.Y(y)) + 0.5
    ctx.strokeStyle = COLORS.grid
    ctx.beginPath()
    ctx.moveTo(0, py)
    ctx.lineTo(w, py)
    ctx.stroke()
    if (labels && Math.abs(y) > 1e-9) {
      ctx.textAlign = 'left'
      const ax = Math.min(Math.max(t.X(0) + 4, 2), w - 24)
      ctx.fillText(String(Number(y.toFixed(6))), ax, py - 3)
    }
  }
  // 축
  ctx.strokeStyle = COLORS.axis
  ctx.lineWidth = 1.5
  const ay = t.Y(0)
  if (ay >= 0 && ay <= h) {
    ctx.beginPath()
    ctx.moveTo(0, ay)
    ctx.lineTo(w, ay)
    ctx.stroke()
  }
  const ax = t.X(0)
  if (ax >= 0 && ax <= w) {
    ctx.beginPath()
    ctx.moveTo(ax, 0)
    ctx.lineTo(ax, h)
    ctx.stroke()
  }
  ctx.fillStyle = COLORS.axis
  ctx.font = 'italic 13px serif'
  ctx.textAlign = 'right'
  ctx.fillText('x', w - 6, Math.min(Math.max(ay - 6, 14), h - 6))
  ctx.textAlign = 'left'
  ctx.fillText('y', Math.min(Math.max(ax + 6, 2), w - 12), 14)
  ctx.restore()
}

export function plotFn(
  ctx: CanvasRenderingContext2D,
  t: Tf,
  fn: (x: number) => number,
  color: string,
  lw = 2.5,
) {
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = lw
  ctx.lineJoin = 'round'
  ctx.beginPath()
  let started = false
  for (let px = 0; px <= t.w; px += 2) {
    const y = fn(t.ix(px))
    const py = t.Y(y)
    if (!Number.isFinite(py) || Math.abs(py) > 1e5) {
      started = false
      continue
    }
    if (!started) {
      ctx.moveTo(px, py)
      started = true
    } else ctx.lineTo(px, py)
  }
  ctx.stroke()
  ctx.restore()
}

/** 부호에 따라 곡선 색을 바꿔 그린다 (sign > 0 : 푸른색, < 0 : 붉은색) */
export function plotFnBySign(
  ctx: CanvasRenderingContext2D,
  t: Tf,
  fn: (x: number) => number,
  signFn: (x: number) => number,
  lw = 3,
) {
  ctx.save()
  ctx.lineWidth = lw
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  let prev: [number, number] | null = null
  for (let px = 0; px <= t.w; px += 2) {
    const x = t.ix(px)
    const py = t.Y(fn(x))
    if (prev && Number.isFinite(py) && Math.abs(py) < 1e5) {
      const s = signFn(t.ix(px - 1))
      ctx.strokeStyle = s > 0 ? COLORS.pos : s < 0 ? COLORS.neg : COLORS.axis
      ctx.beginPath()
      ctx.moveTo(prev[0], prev[1])
      ctx.lineTo(px, py)
      ctx.stroke()
    }
    prev = Number.isFinite(py) ? [px, py] : null
  }
  ctx.restore()
}

/** y=0 과 곡선 사이를 부호별 색으로 채운다 */
export function fillSign(ctx: CanvasRenderingContext2D, t: Tf, fn: (x: number) => number) {
  ctx.save()
  const y0 = t.Y(0)
  for (let px = 0; px < t.w; px += 2) {
    const v = fn(t.ix(px + 1))
    const y = Math.max(-50, Math.min(t.h + 50, t.Y(v)))
    ctx.fillStyle = v > 0 ? COLORS.posFill : COLORS.negFill
    ctx.fillRect(px, Math.min(y0, y), 2, Math.abs(y - y0))
  }
  ctx.restore()
}

export function vLine(ctx: CanvasRenderingContext2D, t: Tf, x: number, color = COLORS.guide, dash = [5, 4], lw = 1.5) {
  const px = t.X(x)
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = lw
  ctx.setLineDash(dash)
  ctx.beginPath()
  ctx.moveTo(px, 0)
  ctx.lineTo(px, t.h)
  ctx.stroke()
  ctx.restore()
}

export function hLine(
  ctx: CanvasRenderingContext2D,
  t: Tf,
  y: number,
  color = COLORS.guide,
  dash = [5, 4],
  lw = 1.5,
  x1?: number,
  x2?: number,
) {
  const py = t.Y(y)
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = lw
  ctx.setLineDash(dash)
  ctx.beginPath()
  ctx.moveTo(x1 === undefined ? 0 : t.X(x1), py)
  ctx.lineTo(x2 === undefined ? t.w : t.X(x2), py)
  ctx.stroke()
  ctx.restore()
}

export function dot(
  ctx: CanvasRenderingContext2D,
  t: Tf,
  x: number,
  y: number,
  r = 5,
  fill = COLORS.curve,
  stroke = '#fff',
) {
  ctx.save()
  ctx.beginPath()
  ctx.arc(t.X(x), t.Y(y), r, 0, Math.PI * 2)
  ctx.fillStyle = fill
  ctx.fill()
  ctx.lineWidth = 2
  ctx.strokeStyle = stroke
  ctx.stroke()
  ctx.restore()
}

export function label(
  ctx: CanvasRenderingContext2D,
  text: string,
  px: number,
  py: number,
  color = COLORS.axis,
  align: CanvasTextAlign = 'center',
  font = '600 12px system-ui, sans-serif',
) {
  ctx.save()
  ctx.font = font
  ctx.fillStyle = color
  ctx.textAlign = align
  ctx.fillText(text, px, py)
  ctx.restore()
}

/** 점 (x1,y1)-(x2,y2)를 지나는 직선을 화면 전체 폭에 그린다 */
export function lineThrough(
  ctx: CanvasRenderingContext2D,
  t: Tf,
  slope: number,
  x0: number,
  y0: number,
  color: string,
  lw = 2,
  dash: number[] = [],
) {
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = lw
  ctx.setLineDash(dash)
  ctx.beginPath()
  ctx.moveTo(t.X(t.view.xmin), t.Y(y0 + slope * (t.view.xmin - x0)))
  ctx.lineTo(t.X(t.view.xmax), t.Y(y0 + slope * (t.view.xmax - x0)))
  ctx.stroke()
  ctx.restore()
}
