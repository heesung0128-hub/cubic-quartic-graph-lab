import { useState } from 'react'
import { Activity, Gamepad2, LineChart, Target } from 'lucide-react'
import Visualizer from './modes/Visualizer'
import Quiz from './modes/Quiz'
import ParameterGame from './modes/ParameterGame'
import Advanced from './modes/Advanced'

const TABS = [
  { id: 'viz', label: '도함수-원함수 연동', short: '연동', icon: Activity, comp: Visualizer },
  { id: 'quiz', label: '개형 맞히기', short: '퀴즈', icon: Target, comp: Quiz },
  { id: 'game', label: '실근 개수 게임', short: '게임', icon: Gamepad2, comp: ParameterGame },
  { id: 'adv', label: '비율 & 접선 탐색기', short: '심화', icon: LineChart, comp: Advanced },
] as const

export default function App() {
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('viz')
  const Current = TABS.find((t) => t.id === tab)!.comp

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-extrabold text-slate-800 sm:text-xl">
              삼차·사차함수 <span className="text-indigo-600">그래프 개형 연습실</span>
            </h1>
            <p className="text-xs text-slate-500">고등학교 미적분 · 도함수로 읽는 극값, 실근, 접선</p>
          </div>
          <nav className="grid grid-cols-4 gap-1 rounded-xl bg-slate-100 p-1 sm:flex" aria-label="학습 모드">
            {TABS.map(({ id, label, short, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                aria-current={tab === id}
                className={`flex flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-xs font-bold transition sm:flex-row sm:gap-1.5 sm:px-3 sm:text-sm ${
                  tab === id ? 'bg-white text-indigo-700 shadow' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon size={16} />
                <span className="sm:hidden">{short}</span>
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-4">
        <Current />
      </main>
    </div>
  )
}
