import { criticalPoints, derivative, evalPoly, fmt, type Coeffs } from '../utils/math'

interface Props {
  f: Coeffs
  /** 이 x가 속한 열을 강조한다 */
  highlightX?: number
}

type Cell =
  | { kind: 'interval'; sign: number; index: number }
  | { kind: 'point'; x: number; y: number; type: 'max' | 'min' | 'flat'; index: number }

/** 증감표: x, f′(x)의 부호, f(x)의 증가/감소와 극값 */
export default function SignTable({ f, highlightX }: Props) {
  const fp = derivative(f)
  const crit = criticalPoints(f)
  const xs = crit.map((c) => c.x)

  const cells: Cell[] = []
  for (let i = 0; i <= xs.length; i++) {
    const lo = i === 0 ? (xs[0] ?? 0) - 1 : xs[i - 1]
    const hi = i === xs.length ? (xs[xs.length - 1] ?? 0) + 1 : xs[i]
    const mid = xs.length === 0 ? 0 : (lo + hi) / 2
    cells.push({ kind: 'interval', sign: Math.sign(evalPoly(fp, mid)), index: i })
    if (i < xs.length) cells.push({ kind: 'point', ...crit[i], index: i })
  }

  let hi = -1
  if (highlightX !== undefined) {
    const pi = xs.findIndex((x) => Math.abs(x - highlightX) < 0.08)
    if (pi >= 0) hi = cells.findIndex((c) => c.kind === 'point' && c.index === pi)
    else {
      const ii = xs.filter((x) => x < highlightX).length
      hi = cells.findIndex((c) => c.kind === 'interval' && c.index === ii)
    }
  }

  const bg = (i: number) => (i === hi ? 'bg-yellow-100' : '')
  const cellBase = 'border border-slate-300 px-2 py-1.5 text-center text-sm whitespace-nowrap'

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-slate-800">
        <tbody>
          <tr>
            <th className={`${cellBase} bg-slate-50 font-bold`}>x</th>
            {cells.map((c, i) => (
              <td key={i} className={`${cellBase} ${bg(i)} ${c.kind === 'point' ? 'font-bold' : 'text-slate-400'}`}>
                {c.kind === 'point' ? fmt(c.x) : '⋯'}
              </td>
            ))}
          </tr>
          <tr>
            <th className={`${cellBase} bg-slate-50 font-bold`}>f′(x)</th>
            {cells.map((c, i) => (
              <td
                key={i}
                className={`${cellBase} ${bg(i)} font-extrabold ${
                  c.kind === 'point' ? 'text-slate-700' : c.sign > 0 ? 'text-blue-600' : 'text-red-600'
                }`}
              >
                {c.kind === 'point' ? '0' : c.sign > 0 ? '+' : '−'}
              </td>
            ))}
          </tr>
          <tr>
            <th className={`${cellBase} bg-slate-50 font-bold`}>f(x)</th>
            {cells.map((c, i) => (
              <td key={i} className={`${cellBase} ${bg(i)} text-xs`}>
                {c.kind === 'interval' ? (
                  <span className={`text-lg font-bold ${c.sign > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                    {c.sign > 0 ? '↗' : '↘'}
                  </span>
                ) : c.type === 'flat' ? (
                  <span className="text-amber-600">
                    {fmt(c.y)}
                    <br />
                    극값 아님
                  </span>
                ) : (
                  <span className={`font-bold ${c.type === 'max' ? 'text-red-600' : 'text-blue-600'}`}>
                    {c.type === 'max' ? '극대' : '극소'}
                    <br />
                    {fmt(c.y)}
                  </span>
                )}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  )
}
