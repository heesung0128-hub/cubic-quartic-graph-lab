/**
 * 다항함수(3차·4차) 수학 계산 모듈.
 * 계수 배열은 "최고차항 → 상수항" 순서이다. 예) ax³+bx²+cx+d → [a, b, c, d]
 */
export type Coeffs = number[]

const ZERO = 1e-12

/** 앞쪽의 0 계수를 제거한다. */
export function trim(p: Coeffs): Coeffs {
  let i = 0
  while (i < p.length - 1 && Math.abs(p[i]) < ZERO) i++
  return p.slice(i)
}

/** 다항식의 차수 (영다항식이면 -1) */
export function degree(p: Coeffs): number {
  const t = trim(p)
  return Math.abs(t[0]) < ZERO ? -1 : t.length - 1
}

/** 호너법으로 P(x) 계산 */
export function evalPoly(p: Coeffs, x: number): number {
  let r = 0
  for (const c of p) r = r * x + c
  return r
}

/** 도함수 계수 */
export function derivative(p: Coeffs): Coeffs {
  const n = p.length - 1
  if (n <= 0) return [0]
  return p.slice(0, n).map((c, i) => c * (n - i))
}

/** 부정적분 (적분상수 c0) */
export function integrate(p: Coeffs, c0 = 0): Coeffs {
  const n = p.length
  return [...p.map((c, i) => c / (n - i)), c0]
}

export function polyAdd(a: Coeffs, b: Coeffs): Coeffs {
  const n = Math.max(a.length, b.length)
  const r = new Array<number>(n).fill(0)
  a.forEach((c, i) => (r[n - a.length + i] += c))
  b.forEach((c, i) => (r[n - b.length + i] += c))
  return r
}

export function polyMul(a: Coeffs, b: Coeffs): Coeffs {
  const r = new Array<number>(a.length + b.length - 1).fill(0)
  a.forEach((x, i) => b.forEach((y, j) => (r[i + j] += x * y)))
  return r
}

export function polyScale(p: Coeffs, s: number): Coeffs {
  return p.map((c) => c * s)
}

/** 상수 k를 뺀 다항식 P(x) - k */
export function minusConst(p: Coeffs, k: number): Coeffs {
  const r = [...p]
  r[r.length - 1] -= k
  return r
}

/** 근으로부터 다항식 a·∏(x - r) 을 만든다. */
export function fromRoots(lead: number, roots: number[]): Coeffs {
  return roots.reduce<Coeffs>((acc, r) => polyMul(acc, [1, -r]), [lead])
}

/** 중복 제거 (정렬 후 가까운 값 병합) */
function dedupe(xs: number[], tol = 1e-6): number[] {
  const s = [...xs].sort((a, b) => a - b)
  const out: number[] = []
  for (const x of s) {
    if (out.length === 0 || x - out[out.length - 1] > tol) out.push(x)
  }
  return out
}

/** 서로 다른 실근 (오름차순). 중근은 1개로 센다. */
export function realRoots(poly: Coeffs): number[] {
  const p = trim(poly)
  const n = p.length - 1
  if (n <= 0) return []
  if (n === 1) return [-p[1] / p[0]]
  if (n === 2) {
    const [a, b, c] = p
    const D = b * b - 4 * a * c
    const tol = 1e-9 * (b * b + Math.abs(4 * a * c) + 1e-3)
    if (Math.abs(D) <= tol) return [-b / (2 * a)]
    if (D < 0) return []
    const s = Math.sqrt(D)
    return dedupe([(-b - s) / (2 * a), (-b + s) / (2 * a)])
  }
  // 도함수의 근(극점)으로 구간을 나눈 뒤, 부호가 바뀌는 구간에서 이분법
  const crit = realRoots(derivative(p))
  const scale = Math.max(...p.map(Math.abs))
  const tol = 1e-7 * scale
  const R = 1 + Math.max(...p.slice(1).map((c) => Math.abs(c / p[0])))
  const pts = [-R, ...crit, R]
  const roots: number[] = []
  for (const c of crit) if (Math.abs(evalPoly(p, c)) < tol) roots.push(c)
  for (let i = 0; i + 1 < pts.length; i++) {
    let lo = pts[i]
    let hi = pts[i + 1]
    let flo = evalPoly(p, lo)
    const fhi = evalPoly(p, hi)
    if (Math.abs(flo) < tol || Math.abs(fhi) < tol) continue
    if (flo * fhi > 0) continue
    for (let it = 0; it < 60; it++) {
      const mid = (lo + hi) / 2
      const fm = evalPoly(p, mid)
      if (flo * fm <= 0) hi = mid
      else {
        lo = mid
        flo = fm
      }
    }
    roots.push((lo + hi) / 2)
  }
  return dedupe(roots)
}

/** x = r 가 P(x) = 0 의 몇 중근인지 (P, P', P'' … 이 연속으로 0인 개수) */
export function multiplicity(poly: Coeffs, r: number, tol = 1e-6): number {
  let q = trim(poly)
  let m = 0
  while (m <= poly.length && Math.abs(evalPoly(q, r)) < tol) {
    m++
    if (q.length <= 1) break
    q = derivative(q)
  }
  return m
}

/** P^(j)(r) */
function nthDerivAt(p: Coeffs, j: number, r: number): number {
  let q = p
  for (let i = 0; i < j; i++) q = derivative(q)
  return evalPoly(q, r)
}

export type CritType = 'max' | 'min' | 'flat'

export interface CriticalPoint {
  x: number
  y: number
  /** max: 극대, min: 극소, flat: f'(x)=0 이지만 부호 변화 없음(극값 아님) */
  type: CritType
}

/** f'(x) = 0 인 점과 극대/극소 판별 */
export function criticalPoints(f: Coeffs): CriticalPoint[] {
  const fp = derivative(f)
  return realRoots(fp).map((x) => {
    const j = multiplicity(fp, x)
    let type: CritType = 'flat'
    if (j % 2 === 1) type = nthDerivAt(fp, j, x) > 0 ? 'min' : 'max'
    return { x, y: evalPoly(f, x), type }
  })
}

/** 극값(극대·극소)만 */
export function extrema(f: Coeffs): CriticalPoint[] {
  return criticalPoints(f).filter((c) => c.type !== 'flat')
}

export interface InflectionPoint {
  x: number
  y: number
}

/** 변곡점: f''(x)의 부호가 바뀌는 점 */
export function inflectionPoints(f: Coeffs): InflectionPoint[] {
  const f2 = derivative(derivative(f))
  return realRoots(f2)
    .filter((x) => multiplicity(f2, x) % 2 === 1)
    .map((x) => ({ x, y: evalPoly(f, x) }))
}

/** 방정식 f(x) = k 의 서로 다른 실근 */
export function solveEqualsK(f: Coeffs, k: number): number[] {
  return realRoots(minusConst(f, k))
}

/** 방정식 f(x) = k 의 서로 다른 실근의 개수 */
export function countRealRoots(f: Coeffs, k: number): number {
  return solveEqualsK(f, k).length
}

/**
 * 점 P(p, q)에서 y = f(x)에 그을 수 있는 접선의 접점 x좌표들.
 * 접점 t에서의 접선 y = f(t) + f'(t)(x - t) 가 P를 지나려면
 *   g(t) = f(t) + f'(t)(p - t) - q = 0
 */
export function tangentPoints(f: Coeffs, p: number, q: number): number[] {
  const g = polyAdd(f, polyMul(derivative(f), [-1, p]))
  return realRoots(minusConst(g, q))
}

export function tangentCount(f: Coeffs, p: number, q: number): number {
  return tangentPoints(f, p, q).length
}

/** 이차 도함수의 판별식 관련: 삼차함수 f'(x)=3ax²+2bx+c 의 D/4 = b² - 3ac */
export function cubicDiscriminantQuarter(f: Coeffs): number {
  const [a, b, c] = f
  return b * b - 3 * a * c
}

/** 계수를 사람이 읽기 좋은 다항식 문자열로 */
const SUP = ['', '', '²', '³', '⁴']

function num(v: number): string {
  const r = Math.round(v * 100) / 100
  return Object.is(r, -0) ? '0' : String(r)
}

export function formatPoly(p: Coeffs, name = 'x'): string {
  const n = p.length - 1
  const parts: string[] = []
  p.forEach((c, i) => {
    if (Math.abs(c) < 0.005) return
    const e = n - i
    const abs = Math.abs(c)
    const coef = e > 0 && Math.abs(abs - 1) < 0.005 ? '' : num(abs)
    const term = e === 0 ? num(abs) : e === 1 ? `${coef}${name}` : `${coef}${name}${SUP[e] ?? `^${e}`}`
    const sign = c < 0 ? '−' : '+'
    if (parts.length === 0) parts.push(c < 0 ? `−${term}` : term)
    else parts.push(` ${sign} ${term}`)
  })
  return parts.length ? parts.join('') : '0'
}

export function fmt(v: number, digits = 2): string {
  const r = Number(v.toFixed(digits))
  return Object.is(r, -0) ? '0' : String(r)
}
