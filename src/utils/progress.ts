import { useSyncExternalStore } from 'react'

/**
 * 학습 기록: 서버·데이터베이스 없이 이 브라우저의 localStorage에만 저장한다.
 * (같은 기기·같은 브라우저 프로필에서만 유지되고, 다른 기기와는 공유되지 않는다.)
 */
const KEY = 'graph-lab-progress-v1'

export interface Counter {
  right: number
  total: number
}

export type QuizKind = 'shape' | 'table'

export interface Progress {
  /** 유형별 제출 결과 (문제 단위) */
  kinds: Record<QuizKind, Counter>
  /** 세부 기능별 정답률 (칸·마커 단위) */
  skills: Record<string, Counter>
  /** 완료한 실근 개수 게임 미션 번호 */
  solved: number[]
}

const empty = (): Progress => ({
  kinds: { shape: { right: 0, total: 0 }, table: { right: 0, total: 0 } },
  skills: {},
  solved: [],
})

function load(): Progress {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const p = JSON.parse(raw) as Partial<Progress>
      const base = empty()
      return {
        kinds: { ...base.kinds, ...p.kinds },
        skills: { ...base.skills, ...p.skills },
        solved: Array.isArray(p.solved) ? p.solved : [],
      }
    }
  } catch {
    /* 저장된 기록이 깨졌거나 저장소를 쓸 수 없으면 새로 시작한다 */
  }
  return empty()
}

let state: Progress = load()
const listeners = new Set<() => void>()

function commit(next: Progress) {
  state = next
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* 저장 실패해도 화면은 계속 동작 */
  }
  listeners.forEach((l) => l())
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useProgress(): Progress {
  return useSyncExternalStore(subscribe, () => state)
}

/** 퀴즈 한 문제를 제출했을 때 기록한다. */
export function recordQuiz(kind: QuizKind, ok: boolean, skills: { id: string; ok: boolean }[]) {
  const kinds = { ...state.kinds, [kind]: { right: state.kinds[kind].right + (ok ? 1 : 0), total: state.kinds[kind].total + 1 } }
  const sk = { ...state.skills }
  for (const s of skills) {
    const cur = sk[s.id] ?? { right: 0, total: 0 }
    sk[s.id] = { right: cur.right + (s.ok ? 1 : 0), total: cur.total + 1 }
  }
  commit({ ...state, kinds, skills: sk })
}

export function markSolved(level: number) {
  if (state.solved.includes(level)) return
  commit({ ...state, solved: [...state.solved, level].sort((a, b) => a - b) })
}

export function resetProgress() {
  commit(empty())
}

export interface SkillInfo {
  id: string
  label: string
  tip: string
  /** 연습하러 갈 화면 */
  go: 'viz' | 'quiz' | 'game' | 'adv'
  goLabel: string
}

/** 세부 기능 목록과 약점 안내 문구 */
export const SKILLS: SkillInfo[] = [
  {
    id: 'find',
    label: '극값 위치 찾기',
    tip: "f′(x)의 그래프가 x축과 만나면서 부호가 바뀌는 곳이 극값이에요. 연동 모드에서 f′와 f를 함께 움직이며 확인해 보세요.",
    go: 'viz',
    goLabel: '연동 모드에서 연습',
  },
  {
    id: 'kind',
    label: '극대·극소 구분',
    tip: '+ → − 로 바뀌면 극대, − → + 로 바뀌면 극소입니다. 증감표 채우기로 부호 변화를 직접 써 보세요.',
    go: 'quiz',
    goLabel: '퀴즈에서 연습',
  },
  {
    id: 'flat',
    label: '극값이 아닌 f′=0 (중근)',
    tip: "f′(x)=0이어도 부호가 바뀌지 않으면 극값이 아닙니다. 연동 모드의 'D = 0' 프리셋으로 확인해 보세요.",
    go: 'viz',
    goLabel: '연동 모드에서 연습',
  },
  {
    id: 'sign',
    label: "f′(x)의 부호 읽기",
    tip: "그래프가 x축 위에 있으면 +, 아래에 있으면 − 예요. 파란색(+)과 빨간색(−) 영역을 보며 구간별로 읽어 보세요.",
    go: 'viz',
    goLabel: '연동 모드에서 연습',
  },
  {
    id: 'arrow',
    label: '증가·감소 판단',
    tip: "f′ > 0 이면 증가(↗), f′ < 0 이면 감소(↘)입니다. 증감표 채우기에서 부호와 화살표를 짝지어 써 보세요.",
    go: 'quiz',
    goLabel: '퀴즈에서 연습',
  },
  {
    id: 'shape',
    label: '원함수 개형 고르기',
    tip: '극값의 위치와 증가·감소 구간을 먼저 정하고, 그 순서대로 이어지는 개형을 고르세요. 개형 퀴즈로 연습해 보세요.',
    go: 'quiz',
    goLabel: '퀴즈에서 연습',
  },
  {
    id: 'value',
    label: '극값(함숫값) 계산',
    tip: '극값의 x를 f(x)에 대입해 계산합니다. 부호와 거듭제곱 계산을 천천히 확인해 보세요.',
    go: 'quiz',
    goLabel: '퀴즈에서 연습',
  },
]

/** 약점으로 판단하는 기준: 최소 풀이 횟수와 정답률 */
export const WEAK_MIN = 4
export const WEAK_RATE = 0.7
