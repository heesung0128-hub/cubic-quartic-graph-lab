import { useState } from 'react'
import { Activity, Gamepad2, LineChart, Target } from 'lucide-react'
import ModeGuide from './components/ModeGuide'
import Visualizer from './modes/Visualizer'
import Quiz from './modes/Quiz'
import ParameterGame from './modes/ParameterGame'
import Advanced from './modes/Advanced'

const TABS = [
  {
    id: 'viz',
    label: '도함수-원함수 연동',
    short: '연동',
    icon: Activity,
    comp: Visualizer,
    guide: {
      title: 'f′(x)의 부호를 보고 f(x)의 모양을 읽어 보세요',
      steps: [
        '위 그래프(f′)나 아래 그래프(f) 위를 손가락(마우스)으로 좌우로 움직여 보세요.',
        'f′가 파란색(+)이면 f는 증가(↗), 빨간색(−)이면 감소(↘)합니다.',
        '아래 증감표의 노란 칸이 지금 위치예요. 프리셋과 계수 슬라이더로 여러 모양을 만들어 보세요.',
      ],
    },
  },
  {
    id: 'quiz',
    label: '개형 맞히기',
    short: '퀴즈',
    icon: Target,
    comp: Quiz,
    guide: {
      title: '도함수 그래프만 보고 원함수의 개형을 맞혀 보세요',
      steps: [
        'f′가 x축과 만나면서 부호가 바뀌는 곳을 찾으세요. (+ → − 이면 극대, − → + 이면 극소)',
        '▲ 극대 / ▼ 극소 중 하나를 고르고, 그래프의 x축 근처를 탭해 표시하세요.',
        '알맞은 f(x) 개형을 고르고 [제출하고 채점]을 누르세요. 막히면 힌트를 사용할 수 있어요.',
      ],
    },
  },
  {
    id: 'game',
    label: '실근 개수 게임',
    short: '게임',
    icon: Gamepad2,
    comp: ParameterGame,
    guide: {
      title: 'f(x) = k 의 서로 다른 실근 개수를 맞춰 보세요',
      steps: [
        'k 슬라이더를 움직이면 빨간 직선 y = k 가 위아래로 움직입니다.',
        '직선과 곡선이 만나는 점의 개수가 방정식 f(x) = k 의 서로 다른 실근의 개수예요.',
        '목표 개수와 같아지면 성공! [다음 문제] 버튼이 켜집니다.',
      ],
    },
  },
  {
    id: 'adv',
    label: '비율 & 접선 탐색기',
    short: '심화',
    icon: LineChart,
    comp: Advanced,
    guide: {
      title: '비율 관계와 접선의 개수를 탐색해 보세요',
      steps: [
        '비율 가이드를 켜면 삼차함수의 1:1:1, 사차함수의 3:1 관계가 점선으로 나타납니다.',
        '그래프를 만지거나 드래그해 점 P를 옮기면, P에서 곡선에 그을 수 있는 접선의 개수가 배경색과 숫자로 나와요.',
        '예시 개형 버튼으로 특별한 모양을 불러오거나 계수를 직접 바꿔 보세요.',
      ],
    },
  },
] as const

export default function App() {
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('viz')
  const current = TABS.find((t) => t.id === tab)!
  const Current = current.comp

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-extrabold text-slate-800 sm:text-xl">
              삼차·사차함수 <span className="text-indigo-600">그래프 개형 연습실</span>
            </h1>
            <p className="hidden text-xs text-slate-500 sm:block">고등학교 미적분 · 도함수로 읽는 극값, 실근, 접선</p>
          </div>
          <nav className="grid grid-cols-4 gap-1 rounded-xl bg-slate-100 p-1 sm:flex" aria-label="학습 모드">
            {TABS.map(({ id, label, short, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                aria-current={tab === id}
                className={`flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-1 text-xs font-bold transition sm:flex-row sm:gap-1.5 sm:px-4 sm:text-sm ${
                  tab === id ? 'bg-white text-indigo-700 shadow' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon size={18} />
                <span className="sm:hidden">{short}</span>
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-3">
        <ModeGuide key={tab} id={current.id} title={current.guide.title} steps={[...current.guide.steps]} />
        <Current />
      </main>
    </div>
  )
}
