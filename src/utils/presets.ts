import { fromRoots, integrate, type Coeffs } from './math'

export interface Preset {
  label: string
  desc: string
  coeffs: Coeffs
}

/** f'(x) = lead·∏(x - r) 로부터 f(x) (적분상수 0)를 만든다. */
function fromDeriv(lead: number, roots: number[]): Coeffs {
  return integrate(fromRoots(lead, roots)).map((c) => Math.round(c * 1000) / 1000)
}

export const CUBIC_PRESETS: Preset[] = [
  { label: 'D > 0', desc: "f'(x)=0이 서로 다른 두 실근 → 극대·극소 존재", coeffs: [1, 0, -3, 0] },
  { label: 'D = 0', desc: "f'(x)=0이 중근 → 극값 없음, 변곡점에서 접선 기울기 0", coeffs: [1, 0, 0, 0] },
  { label: 'D < 0', desc: "f'(x)=0이 실근을 갖지 않음 → 항상 증가", coeffs: [1, 0, 1, 0] },
  { label: 'a < 0, D > 0', desc: '최고차항 계수가 음수인 경우: 극소 → 극대 순서', coeffs: [-1, 0, 3, 0] },
]

export const QUARTIC_PRESETS: Preset[] = [
  { label: '극값 3개 (대칭)', desc: "f'(x)=0이 서로 다른 세 실근, W자 개형", coeffs: fromDeriv(1, [-1.5, 0, 1.5]) },
  { label: '극값 3개 (비대칭)', desc: "f'(x)=0이 서로 다른 세 실근, 비대칭 W자", coeffs: fromDeriv(1, [-2, 0.5, 2]) },
  { label: '변곡점 접선 (중근)', desc: "f'(x)=x²(x-k) : x=0에서 f'의 부호 변화가 없다", coeffs: fromDeriv(1, [0, 0, 2.5]) },
  { label: '단일 극값', desc: "f'(x)=0의 실근이 하나 → 극값 1개", coeffs: [0.25, -0.333, 0.5, -1, 0] },
  { label: 'a < 0 (M자)', desc: '최고차항 계수가 음수: 극대 2개, 극소 1개', coeffs: fromDeriv(-1, [-1.5, 0, 1.5]) },
]

/** 모드 4 전용 예시 */
export const RATIO_PRESETS: Preset[] = [
  { label: '삼차 1:1:1', desc: 'f(x)=x²(x−3) : 극대 x=0, 변곡 x=1, 극소 x=2, 교점 x=3', coeffs: [1, -3, 0, 0] },
  { label: '삼차 (일반)', desc: '임의의 삼차함수에서도 같은 비율이 성립한다', coeffs: [1, -2, -3, 1] },
  { label: '사차 3:1', desc: 'f(x)=x³(x−3) : 극값 x=9/4가 구간 [0,3]을 3:1로 나눈다', coeffs: [1, -3, 0, 0, 0] },
  { label: '사차 3:1 (확대)', desc: 'f(x)=x³(x−4)/2', coeffs: [0.5, -2, 0, 0, 0] },
]
