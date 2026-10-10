import { useMemo, useState } from 'react'
import { Crosshair, Ruler } from 'lucide-react'
import GraphCanvas from '../components/GraphCanvas'
import CoefficientPanel from '../components/CoefficientPanel'
import {
  COLORS,
  dot,
  drawGrid,
  hLine,
  label,
  lineThrough,
  plotFn,
  polyView,
  vLine,
  type Tf,
  type View,
} from '../utils/draw'
import {
  criticalPoints,
  derivative,
  evalPoly,
  extrema,
  fmt,
  formatPoly,
  inflectionPoints,
  tangentCount,
  tangentPoints,
  type Coeffs,
} from '../utils/math'
import { RATIO_PRESETS } from '../utils/presets'

const XMIN = -4
const XMAX = 4

const COUNT_COLORS = ['#e2e8f0', '#bae6fd', '#bbf7d0', '#fde68a', '#fecaca']
const COUNT_LINE = ['#94a3b8', '#0284c7', '#16a34a', '#d97706', '#dc2626']

const NX = 110
const NY = 70

/** 점 (x, y) 영역별 접선 개수를 색으로 칠한 저해상도 비트맵 */
function buildRegionMap(f: Coeffs, view: View): HTMLCanvasElement {
  const cv = document.createElement('canvas')
  cv.width = NX
  cv.height = NY
  const ctx = cv.getContext('2d')!
  const img = ctx.createImageData(NX, NY)
  for (let j = 0; j < NY; j++) {
    for (let i = 0; i < NX; i++) {
      const x = view.xmin + ((i + 0.5) / NX) * (view.xmax - view.xmin)
      const y = view.ymax - ((j + 0.5) / NY) * (view.ymax - view.ymin)
      const n = Math.min(4, tangentCount(f, x, y))
      const hex = COUNT_COLORS[n]
      const o = (j * NX + i) * 4
      img.data[o] = parseInt(hex.slice(1, 3), 16)
      img.data[o + 1] = parseInt(hex.slice(3, 5), 16)
      img.data[o + 2] = parseInt(hex.slice(5, 7), 16)
      img.data[o + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  return cv
}

export default function Advanced() {
  const [coeffs, setCoeffs] = useState<Coeffs>(RATIO_PRESETS[0].coeffs)
  const [desc, setDesc] = useState(RATIO_PRESETS[0].desc)
  const [showRatio, setShowRatio] = useState(true)
  const [showTangent, setShowTangent] = useState(true)
  const [P, setP] = useState({ x: 1.5, y: 1.5 })
  const [dragging, setDragging] = useState(false)

  const deg = coeffs.length - 1
  const view = useMemo(() => polyView(coeffs, XMIN, XMAX, 12, 6), [coeffs])
  const region = useMemo(
    () => (showTangent ? buildRegionMap(coeffs, view) : null),
    [showTangent, coeffs, view],
  )

  const f = (x: number) => evalPoly(coeffs, x)
  const fp = derivative(coeffs)
  const touch = tangentPoints(coeffs, P.x, P.y)
  const cnt = touch.length

  // --- 비율 가이드 계산 ---
  const ratio = useMemo(() => {
    if (deg === 3) {
      const ex = extrema(coeffs)
      if (ex.length !== 2) return null
      const [x1, x2] = ex.map((e) => e.x)
      const d = x2 - x1
      return {
        kind: 'cubic' as const,
        x0: x1 - d / 2,
        x1,
        m: (x1 + x2) / 2,
        x2,
        x3: x2 + d / 2,
        y1: f(x1),
        y2: f(x2),
      }
    }
    const flat = criticalPoints(coeffs).find((c) => c.type === 'flat')
    const ex = extrema(coeffs)
    if (!flat || ex.length !== 1) return null
    const alpha = flat.x
    const beta = -coeffs[1] / coeffs[0] - 3 * alpha
    const q = inflectionPoints(coeffs).find((p) => Math.abs(p.x - alpha) > 1e-6)
    return { kind: 'quartic' as const, alpha, xe: ex[0].x, beta, q: q?.x, y: flat.y }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coeffs, deg])

  const clampP = (x: number, y: number) => ({
    x: Math.max(view.xmin, Math.min(view.xmax, x)),
    y: Math.max(view.ymin, Math.min(view.ymax, y)),
  })

  const draw = (ctx: CanvasRenderingContext2D, tf: Tf) => {
    if (region) {
      ctx.save()
      ctx.imageSmoothingEnabled = false
      ctx.globalAlpha = 0.75
      ctx.drawImage(region, 0, 0, tf.w, tf.h)
      ctx.restore()
    }
    drawGrid(ctx, tf)

    if (showRatio && ratio) {
      if (ratio.kind === 'cubic') {
        hLine(ctx, tf, ratio.y1, COLORS.amber, [6, 4], 1.5, ratio.x0, ratio.x3)
        hLine(ctx, tf, ratio.y2, COLORS.amber, [6, 4], 1.5, ratio.x0, ratio.x3)
        const xs = [ratio.x0, ratio.x1, ratio.m, ratio.x2, ratio.x3]
        xs.forEach((x, i) => vLine(ctx, tf, x, i === 2 ? COLORS.green : COLORS.guide))
        const names = ['', '극대·극소', '변곡점', '극소·극대', '']
        names.forEach((n, i) => n && label(ctx, n, tf.X(xs[i]), tf.h - 8, COLORS.guide))
        for (let i = 0; i < 4; i++) {
          label(ctx, '1', tf.X((xs[i] + xs[i + 1]) / 2), 18, COLORS.guide, 'center', '800 14px system-ui')
        }
        ;[ratio.x0, ratio.x3].forEach((x, i) => dot(ctx, tf, x, i === 0 ? ratio.y2 : ratio.y1, 4.5, COLORS.amber))
      } else {
        hLine(ctx, tf, ratio.y, COLORS.amber, [6, 4], 1.5)
        const xs = [ratio.alpha, ratio.xe, ratio.beta].sort((a, b) => a - b)
        xs.forEach((x) => vLine(ctx, tf, x, COLORS.guide))
        if (ratio.q !== undefined) vLine(ctx, tf, ratio.q, COLORS.green, [2, 4], 1.2)
        const left = Math.min(ratio.alpha, ratio.beta)
        const right = Math.max(ratio.alpha, ratio.beta)
        const m1 = ratio.xe - left
        const m2 = right - ratio.xe
        const unit = Math.min(Math.abs(m1), Math.abs(m2))
        label(ctx, String(Math.round(Math.abs(m1) / unit)), tf.X((left + ratio.xe) / 2), 18, COLORS.guide, 'center', '800 14px system-ui')
        label(ctx, String(Math.round(Math.abs(m2) / unit)), tf.X((ratio.xe + right) / 2), 18, COLORS.guide, 'center', '800 14px system-ui')
        label(ctx, '삼중근·변곡', tf.X(ratio.alpha), tf.h - 8, COLORS.guide)
        label(ctx, '극값', tf.X(ratio.xe), tf.h - 8, COLORS.guide)
        label(ctx, '교점', tf.X(ratio.beta), tf.h - 8, COLORS.guide)
      }
    }

    plotFn(ctx, tf, f, COLORS.curve, 3)

    if (showTangent) {
      touch.forEach((t, i) => {
        const col = COUNT_LINE[Math.min(4, cnt)]
        lineThrough(ctx, tf, evalPoly(fp, t), t, f(t), col, 2, i % 2 ? [8, 4] : [])
        dot(ctx, tf, t, f(t), 5, col)
      })
      ctx.save()
      ctx.beginPath()
      ctx.arc(tf.X(P.x), tf.Y(P.y), dragging ? 15 : 12, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(79,70,229,0.2)'
      ctx.fill()
      ctx.restore()
      dot(ctx, tf, P.x, P.y, 7, '#4f46e5')
      label(ctx, `P(${fmt(P.x, 1)}, ${fmt(P.y, 1)})`, tf.X(P.x) + 10, tf.Y(P.y) - 12, '#4f46e5', 'left', '700 13px system-ui')
    }
    label(ctx, 'y = f(x)', 10, tf.h - 8, COLORS.axis, 'left', '700 13px system-ui')
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
      <aside className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-2 text-sm font-bold text-slate-700">예시 개형</h3>
          <div className="flex flex-wrap gap-2">
            {RATIO_PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => {
                  setCoeffs(p.coeffs)
                  setDesc(p.desc)
                }}
                className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
              >
                {p.label}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-slate-500">{desc}</p>
        </div>

        <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <Toggle on={showRatio} onChange={setShowRatio} icon={<Ruler size={15} />} text="비율 관계 Grid 가이드" />
          <Toggle on={showTangent} onChange={setShowTangent} icon={<Crosshair size={15} />} text="접선 탐색기 (점 P)" />
        </div>

        <CoefficientPanel
          coeffs={coeffs}
          onChange={setCoeffs}
          onDegreeChange={(d) => {
            const p = d === 3 ? RATIO_PRESETS[0] : RATIO_PRESETS[2]
            setCoeffs(p.coeffs)
            setDesc(p.desc)
          }}
        />
      </aside>

      <section className="space-y-3">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <GraphCanvas
            view={view}
            height={430}
            draw={draw}
            touchAction={showTangent ? 'none' : 'pan-y'}
            cursor={showTangent ? (dragging ? 'grabbing' : 'grab') : 'default'}
            ariaLabel="접선 탐색 그래프"
            onPointerDown={(p) => {
              if (!showTangent) return
              setDragging(true)
              setP(clampP(p.x, p.y))
            }}
            onPointerMove={(p) => dragging && setP(clampP(p.x, p.y))}
            onPointerUp={() => setDragging(false)}
          />
        </div>

        {showTangent && (
          <div className="grid gap-3 sm:grid-cols-[auto_1fr]">
            <div
              className="flex min-w-44 flex-col items-center justify-center rounded-xl border-2 p-4 text-center shadow-sm"
              style={{ borderColor: COUNT_LINE[Math.min(4, cnt)], background: COUNT_COLORS[Math.min(4, cnt)] }}
            >
              <p className="text-xs font-semibold text-slate-600">점 P에서 그을 수 있는 접선</p>
              <p className="text-5xl font-black tabular-nums text-slate-800">{cnt}개</p>
              <p className="text-xs text-slate-600">
                접점 x = {cnt ? touch.map((t) => fmt(t)).join(', ') : '없음'}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
              <p className="mb-2 font-bold text-slate-700">영역별 접선의 개수</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-600">
                {COUNT_COLORS.slice(0, deg === 3 ? 4 : 5).map((c, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5">
                    <span className="inline-block h-3 w-5 rounded-sm border border-slate-300" style={{ background: c }} />
                    {i}개
                  </span>
                ))}
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-500">
                점 P(p, q)를 지나는 접선의 접점 t는 방정식 f(t) + f′(t)(p − t) − q = 0 의 서로 다른 실근입니다.
                그래프 위를 드래그해 P를 옮겨 보세요.
              </p>
            </div>
          </div>
        )}

        {showRatio && (
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
            <p className="mb-1 font-bold text-slate-700">
              {deg === 3 ? '삼차함수의 1 : 1 : 1 비율 관계' : '사차함수의 3 : 1 비율 관계'}
            </p>
            {deg === 3 ? (
              ratio && ratio.kind === 'cubic' ? (
                <p className="leading-relaxed text-slate-600">
                  극점의 x좌표를 x₁, x₂라 하면 변곡점은 두 극점의 중점입니다. 극점에서 그은 수평선이 곡선과 다시 만나는 점까지의
                  x좌표를 포함해 <b>x₀ ({fmt(ratio.x0)}), x₁ ({fmt(ratio.x1)}), 변곡점 ({fmt(ratio.m)}), x₂ ({fmt(ratio.x2)}), x₃ ({fmt(ratio.x3)})</b>가
                  모두 같은 간격(1 : 1 : 1 : 1)으로 놓입니다. 예) f(x)=a(x−α)²(x−β)이면 α, 변곡점, 극점, β가 구간을 1:1:1로 나눕니다.
                </p>
              ) : (
                <p className="text-slate-500">극값이 두 개인 삼차함수(D &gt; 0)에서만 비율 가이드가 나타납니다.</p>
              )
            ) : ratio && ratio.kind === 'quartic' ? (
              <p className="leading-relaxed text-slate-600">
                f′(x)가 중근을 가지면 x = α({fmt(ratio.alpha)})에서 접선이 수평인 변곡점이 생기고, 곡선이 이 수평선과 다시 만나는 점을 β({fmt(ratio.beta)})라 할 때
                극값의 위치 x = {fmt(ratio.xe)}는 구간 [α, β]를 <b>3 : 1</b>로 나눕니다. (f(x)=a(x−α)³(x−β) ⇒ f′(x)=a(x−α)²(4x−3β−α))
              </p>
            ) : (
              <p className="text-slate-500">
                f′(x)가 중근과 단근을 갖는 사차함수(예: <span className="font-mono">{formatPoly([1, -3, 0, 0, 0])}</span>)에서 3:1 가이드가 나타납니다.
                위의 &lsquo;사차 3:1&rsquo; 예시를 눌러 보세요.
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  )
}

function Toggle({
  on,
  onChange,
  icon,
  text,
}: {
  on: boolean
  onChange: (v: boolean) => void
  icon: React.ReactNode
  text: string
}) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="flex w-full items-center justify-between rounded-lg px-1 py-1 text-left text-sm font-semibold text-slate-700"
    >
      <span className="inline-flex items-center gap-2">
        {icon} {text}
      </span>
      <span className={`relative h-6 w-11 rounded-full transition-colors ${on ? 'bg-indigo-600' : 'bg-slate-300'}`}>
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`}
        />
      </span>
    </button>
  )
}
