import { criticalPoints, derivative, evalPoly, type Coeffs, type CritType } from './math'

export type SignCell =
  | { kind: 'interval'; sign: number; index: number }
  | { kind: 'point'; x: number; y: number; type: CritType; index: number }

/**
 * 증감표의 열 구성: (구간) (f′=0인 점) (구간) (f′=0인 점) … (구간)
 * 구간 열은 f′의 부호, 점 열은 x, f(x)와 극대·극소·극값 아님을 가진다.
 */
export function signCells(f: Coeffs): SignCell[] {
  const fp = derivative(f)
  const crit = criticalPoints(f)
  const xs = crit.map((c) => c.x)
  const cells: SignCell[] = []
  for (let i = 0; i <= xs.length; i++) {
    const lo = i === 0 ? (xs[0] ?? 0) - 1 : xs[i - 1]
    const hi = i === xs.length ? (xs[xs.length - 1] ?? 0) + 1 : xs[i]
    const mid = xs.length === 0 ? 0 : (lo + hi) / 2
    cells.push({ kind: 'interval', sign: Math.sign(evalPoly(fp, mid)), index: i })
    if (i < xs.length) cells.push({ kind: 'point', ...crit[i], index: i })
  }
  return cells
}
