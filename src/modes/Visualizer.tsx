import { useMemo, useState } from 'react'
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import GraphCanvas from '../components/GraphCanvas'
import CoefficientPanel from '../components/CoefficientPanel'
import {
  COLORS,
  dot,
  drawGrid,
  fillSign,
  label,
  plotFn,
  plotFnBySign,
  polyView,
  vLine,
} from '../utils/draw'
import {
  criticalPoints,
  cubicDiscriminantQuarter,
  derivative,
  evalPoly,
  fmt,
  formatPoly,
  inflectionPoints,
  type Coeffs,
} from '../utils/math'
import { CUBIC_PRESETS, QUARTIC_PRESETS } from '../utils/presets'

const XMIN = -4
const XMAX = 4

export default function Visualizer() {
  const [coeffs, setCoeffs] = useState<Coeffs>(CUBIC_PRESETS[0].coeffs)
  const [cx, setCx] = useState(0.6)
  const [presetDesc, setPresetDesc] = useState(CUBIC_PRESETS[0].desc)

  const deg = coeffs.length - 1
  const fp = useMemo(() => derivative(coeffs), [coeffs])
  const crit = useMemo(() => criticalPoints(coeffs), [coeffs])
  const infl = useMemo(() => inflectionPoints(coeffs), [coeffs])
  const topView = useMemo(() => polyView(fp, XMIN, XMAX, 20, 6), [fp])
  const botView = useMemo(() => polyView(coeffs, XMIN, XMAX, 20, 6), [coeffs])

  const f = (x: number) => evalPoly(coeffs, x)
  const g = (x: number) => evalPoly(fp, x)
  const trackX = Math.min(XMAX, Math.max(XMIN, cx))
  const slope = g(trackX)

  const presets = deg === 3 ? CUBIC_PRESETS : QUARTIC_PRESETS

  const changeDegree = (d: 3 | 4) => {
    const p = (d === 3 ? CUBIC_PRESETS : QUARTIC_PRESETS)[0]
    setCoeffs(p.coeffs)
    setPresetDesc(p.desc)
  }

  const guides = (ctx: CanvasRenderingContext2D, tf: Parameters<typeof vLine>[1]) => {
    crit.forEach((c) => {
      if (c.x >= XMIN && c.x <= XMAX) {
        vLine(ctx, tf, c.x, c.type === 'flat' ? COLORS.amber : COLORS.guide)
      }
    })
  }

  const cursorLine = (ctx: CanvasRenderingContext2D, tf: Parameters<typeof vLine>[1]) =>
    vLine(ctx, tf, trackX, '#0f172a', [2, 3], 1.2)

  const drawTop = (ctx: CanvasRenderingContext2D, tf: Parameters<typeof vLine>[1]) => {
    drawGrid(ctx, tf)
    fillSign(ctx, tf, g)
    guides(ctx, tf)
    plotFn(ctx, tf, g, COLORS.curve, 2.5)
    cursorLine(ctx, tf)
    crit.forEach((c) => dot(ctx, tf, c.x, 0, 4.5, c.type === 'flat' ? COLORS.amber : COLORS.guide))
    dot(ctx, tf, trackX, g(trackX), 6, slope > 0 ? COLORS.pos : slope < 0 ? COLORS.neg : COLORS.axis)
    label(ctx, "y = f ′(x)", 10, 20, COLORS.axis, 'left', '700 13px system-ui')
  }

  const drawBottom = (ctx: CanvasRenderingContext2D, tf: Parameters<typeof vLine>[1]) => {
    drawGrid(ctx, tf)
    guides(ctx, tf)
    plotFnBySign(ctx, tf, f, g, 3.5)
    cursorLine(ctx, tf)
    crit.forEach((c) => {
      if (c.x < XMIN || c.x > XMAX) return
      if (c.type === 'flat') {
        dot(ctx, tf, c.x, c.y, 5, COLORS.amber)
        return
      }
      dot(ctx, tf, c.x, c.y, 6, c.type === 'max' ? COLORS.neg : COLORS.pos)
      label(ctx, c.type === 'max' ? '극대' : '극소', tf.X(c.x), tf.Y(c.y) + (c.type === 'max' ? -12 : 20), COLORS.axis)
    })
    infl.forEach((p) => {
      if (p.x >= XMIN && p.x <= XMAX) {
        ctx.save()
        ctx.beginPath()
        ctx.rect(tf.X(p.x) - 4, tf.Y(p.y) - 4, 8, 8)
        ctx.strokeStyle = COLORS.green
        ctx.lineWidth = 2
        ctx.stroke()
        ctx.restore()
      }
    })
    dot(ctx, tf, trackX, f(trackX), 6.5, slope > 0 ? COLORS.pos : slope < 0 ? COLORS.neg : COLORS.axis)
    label(ctx, 'y = f(x)', 10, 20, COLORS.axis, 'left', '700 13px system-ui')
  }

  const onMove = (p: { x: number }) => setCx(p.x)

  const trend =
    Math.abs(slope) < 0.02 ? (
      <span className="inline-flex items-center gap-1 text-amber-600">
        <Minus size={16} /> 접선의 기울기 0 (f′(x)=0)
      </span>
    ) : slope > 0 ? (
      <span className="inline-flex items-center gap-1 text-blue-600">
        <ArrowUpRight size={16} /> f′(x) &gt; 0 → 증가
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 text-red-600">
        <ArrowDownRight size={16} /> f′(x) &lt; 0 → 감소
      </span>
    )

  return (
    <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
      <aside className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-2 text-sm font-bold text-slate-700">개형 프리셋</h3>
          <div className="mb-2 flex gap-1 text-xs font-semibold text-slate-500">
            <span className="rounded bg-slate-100 px-2 py-0.5">
              {deg === 3 ? '삼차: 판별식 D = b²−3ac 의 부호' : '사차: f′(x)=0의 실근 구조'}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {presets.map((p) => (
              <button
                key={p.label}
                onClick={() => {
                  setCoeffs(p.coeffs)
                  setPresetDesc(p.desc)
                }}
                className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
              >
                {p.label}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-slate-500">{presetDesc}</p>
        </div>
        <CoefficientPanel coeffs={coeffs} onChange={setCoeffs} onDegreeChange={changeDegree} />
      </aside>

      <section className="space-y-3">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <GraphCanvas view={topView} height={230} draw={drawTop} onPointerMove={onMove} ariaLabel="도함수 그래프" />
          <div className="h-px bg-slate-200" />
          <GraphCanvas view={botView} height={290} draw={drawBottom} onPointerMove={onMove} ariaLabel="원함수 그래프" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
            <p className="mb-1 font-bold text-slate-700">커서 위치 x = {fmt(trackX)}</p>
            <p className="tabular-nums text-slate-600">
              f(x) = {fmt(f(trackX))}, f′(x) = {fmt(slope)}
            </p>
            <p className="mt-1 font-semibold">{trend}</p>
            <p className="mt-2 text-xs text-slate-400">그래프 위에서 마우스(터치)를 움직여 보세요.</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
            <p className="mb-1 font-bold text-slate-700">f′(x) = {formatPoly(fp)}</p>
            {deg === 3 && (
              <p className="text-slate-600">
                D/4 = b²−3ac = <b className="tabular-nums">{fmt(cubicDiscriminantQuarter(coeffs))}</b>{' '}
                {cubicDiscriminantQuarter(coeffs) > 1e-9 ? '(> 0)' : Math.abs(cubicDiscriminantQuarter(coeffs)) <= 1e-9 ? '(= 0)' : '(< 0)'}
              </p>
            )}
            <ul className="mt-1 space-y-0.5 text-slate-600">
              {crit.length === 0 && <li>f′(x)=0인 실근이 없음 → 극값 없음</li>}
              {crit.map((c) => (
                <li key={c.x}>
                  x = {fmt(c.x)} :{' '}
                  <b className={c.type === 'max' ? 'text-red-600' : c.type === 'min' ? 'text-blue-600' : 'text-amber-600'}>
                    {c.type === 'max' ? `극대 (f=${fmt(c.y)})` : c.type === 'min' ? `극소 (f=${fmt(c.y)})` : '극값 아님 (부호 변화 없음)'}
                  </b>
                </li>
              ))}
              {infl.map((p) => (
                <li key={`i${p.x}`} className="text-green-700">
                  변곡점 ({fmt(p.x)}, {fmt(p.y)})
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
          <Legend color="bg-blue-500" text="f′ > 0 (증가)" />
          <Legend color="bg-red-500" text="f′ < 0 (감소)" />
          <Legend color="bg-indigo-500" text="f′ = 0 (점선 가이드)" />
          <Legend color="bg-amber-500" text="극값 아닌 f′=0" />
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 border-2 border-green-600" /> 변곡점
          </span>
        </div>
      </section>
    </div>
  )
}

function Legend({ color, text }: { color: string; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block h-2.5 w-2.5 rounded-full ${color}`} />
      {text}
    </span>
  )
}
