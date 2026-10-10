import { useMemo, useState } from 'react'
import { CheckCircle2, Eye, LineChart, RotateCcw, Send, XCircle } from 'lucide-react'
import GraphCanvas from '../components/GraphCanvas'
import { COLORS, drawGrid, fillSign, focusView, plotFn, label, vLine, type Tf } from '../utils/draw'
import { derivative, evalPoly, fmt, formatPoly, polyAdd, polyMul, polyScale, type Coeffs, type CritType } from '../utils/math'
import { signCells, type SignCell } from '../utils/signCells'
import { clamp, useWindowSize } from '../utils/hooks'

type Level = 'basic' | 'adv'

const rnd = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)]

const pw = (p: Coeffs, k: number): Coeffs => {
  let r: Coeffs = [1]
  for (let i = 0; i < k; i++) r = polyMul(r, p)
  return r
}

/**
 * 극값이 모두 정수가 되도록 설계한 함수들 (t = x − m)
 *  - cubic2   : s(t³ − 3p²t) + c           극대·극소 각 1개
 *  - quartic3 : s(t⁴ − 2q²t²) + c           극값 3개
 *  - quartic1 : s·t⁴ + c                    극값 1개
 *  - cubicflat: s·t³ + c                    f′=0이지만 극값 아님
 *  - quarticflat: s(t⁴ − 4t³) + c           극값 아닌 f′=0 + 극값 1개
 */
function makeF(level: Level): Coeffs {
  const s = rnd([1, -1])
  const m = rnd([-1, 0, 1])
  const c = rnd([-2, -1, 0, 1, 2])
  const t: Coeffs = [1, -m]
  const kind = level === 'basic' ? rnd(['cubic2', 'cubic2', 'quartic3', 'quartic1'] as const) : rnd(['cubicflat', 'quarticflat', 'quarticflat', 'quartic3', 'cubic2'] as const)
  let body: Coeffs
  switch (kind) {
    case 'cubic2': {
      const p = rnd([1, 2])
      body = polyAdd(pw(t, 3), polyScale(t, -3 * p * p))
      break
    }
    case 'quartic3': {
      const q = rnd([1, 2])
      body = polyAdd(pw(t, 4), polyScale(pw(t, 2), -2 * q * q))
      break
    }
    case 'quartic1':
      body = pw(t, 4)
      break
    case 'cubicflat':
      body = pw(t, 3)
      break
    default:
      body = polyAdd(pw(t, 4), polyScale(pw(t, 3), -4))
  }
  return polyAdd(polyScale(body, s), [c])
}

type Entry =
  | { kind: 'interval'; sign: number; arrow: number }
  | { kind: 'point'; type: '' | CritType; value: string }

const blank = (cells: SignCell[]): Entry[] =>
  cells.map((c) => (c.kind === 'interval' ? { kind: 'interval', sign: 0, arrow: 0 } : { kind: 'point', type: '', value: '' }))

const TYPE_CYCLE: ('' | CritType)[] = ['', 'max', 'min', 'flat']
const TYPE_LABEL: Record<'' | CritType, string> = { '': '선택', max: '극대', min: '극소', flat: '극값 아님' }
const cycle = (v: number) => (v === 0 ? 1 : v === 1 ? -1 : 0)

export default function TableQuiz({ onOpenViz }: { onOpenViz?: (f: Coeffs) => void }) {
  const [level, setLevel] = useState<Level>('basic')
  const [f, setF] = useState<Coeffs>(() => makeF('basic'))
  const cells = useMemo(() => signCells(f), [f])
  const [entries, setEntries] = useState<Entry[]>(() => blank(signCells(f)))
  const [submitted, setSubmitted] = useState(false)
  const [showDeriv, setShowDeriv] = useState(false)
  const [score, setScore] = useState({ right: 0, total: 0 })
  const { h } = useWindowSize()

  const fp = useMemo(() => derivative(f), [f])
  const view = useMemo(() => focusView(fp, -4, 4), [fp])
  const graphH = Math.round(clamp(h * 0.3, 170, 250))

  const load = (lv: Level) => {
    const nf = makeF(lv)
    setF(nf)
    setEntries(blank(signCells(nf)))
    setSubmitted(false)
    setShowDeriv(false)
  }

  const changeLevel = (lv: Level) => {
    setLevel(lv)
    load(lv)
  }

  const update = (i: number, fn: (e: Entry) => Entry) =>
    setEntries((es) => es.map((e, k) => (k === i && !submitted ? fn(e) : e)))

  // ---- 채점 ----
  const verdict = cells.map((c, i) => {
    const e = entries[i]
    if (c.kind === 'interval' && e.kind === 'interval') {
      return { signOk: e.sign === c.sign, arrowOk: e.arrow === c.sign }
    }
    if (c.kind === 'point' && e.kind === 'point') {
      const v = parseFloat(e.value)
      return { typeOk: e.type === c.type, valueOk: Number.isFinite(v) && Math.abs(v - c.y) < 0.05 }
    }
    return {}
  })
  const allOk = verdict.every((v) => Object.values(v).every(Boolean))
  const complete = entries.every((e) => (e.kind === 'interval' ? e.sign !== 0 && e.arrow !== 0 : e.type !== '' && e.value.trim() !== ''))

  const submit = () => {
    setSubmitted(true)
    setScore((s) => ({ right: s.right + (allOk ? 1 : 0), total: s.total + 1 }))
  }

  const draw = (ctx: CanvasRenderingContext2D, tf: Tf) => {
    drawGrid(ctx, tf)
    fillSign(ctx, tf, (x) => evalPoly(fp, x))
    cells.forEach((c) => {
      if (c.kind === 'point') vLine(ctx, tf, c.x, c.type === 'flat' ? COLORS.amber : COLORS.guide)
    })
    plotFn(ctx, tf, (x) => evalPoly(fp, x), COLORS.curve, 2.5)
    label(ctx, 'y = f ′(x)', 10, 20, COLORS.axis, 'left', '700 13px system-ui')
  }

  const cell = 'border border-slate-300 text-center align-middle'
  const sideTh = `${cell} bg-slate-50 px-3 py-2 text-sm font-bold whitespace-nowrap`
  const mark = (ok: boolean | undefined) => (!submitted ? '' : ok ? 'ring-2 ring-green-500 bg-green-50' : 'ring-2 ring-red-500 bg-red-50')

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] md:gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-slate-700">
              <b>문제.</b> 다음 함수의 증감표를 완성하세요.
            </p>
            <div className="flex items-center gap-2">
              <div className="inline-flex overflow-hidden rounded-lg border border-slate-300 text-xs font-bold">
                {(['basic', 'adv'] as const).map((lv) => (
                  <button
                    key={lv}
                    onClick={() => changeLevel(lv)}
                    className={`px-3 py-1.5 ${level === lv ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                  >
                    {lv === 'basic' ? '기본' : '심화'}
                  </button>
                ))}
              </div>
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
                {score.right} / {score.total}
              </span>
            </div>
          </div>
          <p className="rounded-lg bg-slate-50 px-3 py-3 text-center font-mono text-lg font-bold text-slate-800">f(x) = {formatPoly(f)}</p>
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={() => setShowDeriv((v) => !v)}
              className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-700 hover:bg-amber-100"
            >
              <Eye size={15} /> 도함수 {showDeriv ? '숨기기' : '보기'}
            </button>
            {showDeriv && <span className="font-mono text-sm text-slate-700">f′(x) = {formatPoly(fp)}</span>}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            오른쪽 그래프는 f′(x)입니다. f′(x)=0인 x가 표의 가운데 열이고, 파란 부분은 f′&gt;0, 빨간 부분은 f′&lt;0 입니다.
          </p>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <GraphCanvas view={view} height={graphH} draw={draw} ariaLabel="도함수 그래프" />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-1 text-sm font-bold text-slate-700">증감표 채우기</h3>
        <p className="mb-3 text-xs text-slate-500">
          칸을 탭할 때마다 값이 바뀝니다. 구간 칸: f′의 부호(+/−), f의 증가(↗)/감소(↘). 가운데 칸: 극대·극소·극값 아님을 고르고 f(x)의 값을 적으세요.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] border-collapse">
            <tbody>
              <tr>
                <th className={sideTh}>x</th>
                {cells.map((c, i) => (
                  <td key={i} className={`${cell} px-2 py-2 text-base font-bold ${c.kind === 'interval' ? 'text-slate-400' : 'text-slate-800'}`}>
                    {c.kind === 'point' ? fmt(c.x) : '⋯'}
                  </td>
                ))}
              </tr>
              <tr>
                <th className={sideTh}>f′(x)</th>
                {cells.map((c, i) => {
                  const e = entries[i]
                  if (c.kind === 'point' || e.kind !== 'interval') {
                    return (
                      <td key={i} className={`${cell} text-base font-bold text-slate-700`}>
                        0
                      </td>
                    )
                  }
                  return (
                    <td key={i} className={`${cell} p-1`}>
                      <button
                        onClick={() => update(i, (x) => (x.kind === 'interval' ? { ...x, sign: cycle(x.sign) } : x))}
                        disabled={submitted}
                        aria-label="f′ 부호 선택"
                        className={`h-14 w-full min-w-14 rounded-lg border-2 border-dashed border-slate-300 text-2xl font-extrabold ${mark((verdict[i] as { signOk?: boolean }).signOk)} ${
                          e.sign > 0 ? 'text-blue-600' : 'text-red-600'
                        }`}
                      >
                        {e.sign === 0 ? <span className="text-sm font-semibold text-slate-400">탭</span> : e.sign > 0 ? '+' : '−'}
                      </button>
                      {submitted && !(verdict[i] as { signOk?: boolean }).signOk && (
                        <p className="mt-1 text-xs font-bold text-green-700">정답 {c.kind === 'interval' && c.sign > 0 ? '+' : '−'}</p>
                      )}
                    </td>
                  )
                })}
              </tr>
              <tr>
                <th className={sideTh}>f(x)</th>
                {cells.map((c, i) => {
                  const e = entries[i]
                  if (c.kind === 'interval' && e.kind === 'interval') {
                    const ok = (verdict[i] as { arrowOk?: boolean }).arrowOk
                    return (
                      <td key={i} className={`${cell} p-1`}>
                        <button
                          onClick={() => update(i, (x) => (x.kind === 'interval' ? { ...x, arrow: cycle(x.arrow) } : x))}
                          disabled={submitted}
                          aria-label="f 증가 감소 선택"
                          className={`h-14 w-full min-w-14 rounded-lg border-2 border-dashed border-slate-300 text-2xl font-extrabold ${mark(ok)} ${
                            e.arrow > 0 ? 'text-blue-600' : 'text-red-600'
                          }`}
                        >
                          {e.arrow === 0 ? <span className="text-sm font-semibold text-slate-400">탭</span> : e.arrow > 0 ? '↗' : '↘'}
                        </button>
                        {submitted && !ok && <p className="mt-1 text-xs font-bold text-green-700">정답 {c.sign > 0 ? '↗' : '↘'}</p>}
                      </td>
                    )
                  }
                  if (c.kind === 'point' && e.kind === 'point') {
                    const v = verdict[i] as { typeOk?: boolean; valueOk?: boolean }
                    return (
                      <td key={i} className={`${cell} p-1`}>
                        <button
                          onClick={() =>
                            update(i, (x) =>
                              x.kind === 'point' ? { ...x, type: TYPE_CYCLE[(TYPE_CYCLE.indexOf(x.type) + 1) % TYPE_CYCLE.length] } : x,
                            )
                          }
                          disabled={submitted}
                          className={`h-11 w-full min-w-20 rounded-lg border-2 border-dashed border-slate-300 text-sm font-bold ${mark(v.typeOk)} ${
                            e.type === 'max' ? 'text-red-600' : e.type === 'min' ? 'text-blue-600' : e.type === 'flat' ? 'text-amber-600' : 'text-slate-400'
                          }`}
                        >
                          {TYPE_LABEL[e.type]}
                        </button>
                        <input
                          type="number"
                          inputMode="decimal"
                          placeholder="f 값"
                          value={e.value}
                          disabled={submitted}
                          onChange={(ev) => update(i, (x) => (x.kind === 'point' ? { ...x, value: ev.target.value } : x))}
                          aria-label="f(x) 값"
                          className={`mt-1 h-11 w-full min-w-20 rounded-lg border border-slate-300 px-2 text-center text-base ${mark(v.valueOk)}`}
                        />
                        {submitted && (!v.typeOk || !v.valueOk) && (
                          <p className="mt-1 text-xs font-bold text-green-700">
                            정답 {TYPE_LABEL[c.type]}, {fmt(c.y)}
                          </p>
                        )}
                      </td>
                    )
                  }
                  return <td key={i} />
                })}
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={submit}
            disabled={submitted || !complete}
            className="inline-flex min-w-40 flex-1 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2.5 text-base font-bold text-white hover:bg-indigo-700 disabled:opacity-40"
          >
            <Send size={16} /> {complete ? '제출하고 채점' : '모든 칸을 채워 주세요'}
          </button>
          <button
            onClick={() => load(level)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RotateCcw size={16} /> {submitted ? '다음 문제' : '다른 문제'}
          </button>
          {!submitted && (
            <button
              onClick={() => setEntries(blank(cells))}
              className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              다시 쓰기
            </button>
          )}
        </div>

        {submitted && (
          <div className={`animate-pop-in mt-3 rounded-xl border p-3 ${allOk ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
            <p className={`flex items-center gap-1.5 font-extrabold ${allOk ? 'text-green-700' : 'text-red-700'}`}>
              {allOk ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
              {allOk ? '정답입니다! 증감표를 정확히 채웠어요.' : '틀린 칸은 빨간 테두리, 정답은 초록 글씨로 표시했어요.'}
            </p>
            <ul className="mt-2 space-y-1 text-sm leading-relaxed text-slate-700">
              {cells
                .filter((c) => c.kind === 'point')
                .map((c, i) =>
                  c.kind === 'point' ? (
                    <li key={i}>
                      • x = {fmt(c.x)}에서{' '}
                      {c.type === 'flat'
                        ? `f′(x) = 0이지만 부호가 바뀌지 않으므로 극값이 아닙니다. (f(${fmt(c.x)}) = ${fmt(c.y)})`
                        : c.type === 'max'
                          ? `f′(x)의 부호가 +에서 −로 변하므로 극댓값 ${fmt(c.y)}입니다.`
                          : `f′(x)의 부호가 −에서 +로 변하므로 극솟값 ${fmt(c.y)}입니다.`}
                    </li>
                  ) : null,
                )}
            </ul>
            {onOpenViz && (
              <button
                onClick={() => onOpenViz(f)}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"
              >
                <LineChart size={15} /> 연동 모드에서 이 함수 살펴보기
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
