import { useState } from 'react'
import { AlertTriangle, ArrowRight, CheckCircle2, Database, Trash2 } from 'lucide-react'
import { resetProgress, SKILLS, useProgress, WEAK_MIN, WEAK_RATE, type Counter } from '../utils/progress'

export type GoTarget = 'viz' | 'quiz' | 'game' | 'adv'

interface Props {
  onGo: (tab: GoTarget) => void
  /** 실근 개수 게임의 전체 미션 수 */
  gameTotal: number
}

const pct = (c: Counter) => (c.total === 0 ? 0 : Math.round((c.right / c.total) * 100))

/** 내 기록: 점수, 세부 기능별 정답률, 약점 안내 */
export default function MyRecord({ onGo, gameTotal }: Props) {
  const p = useProgress()
  const [confirming, setConfirming] = useState(false)

  const rows = SKILLS.map((s) => ({ ...s, c: p.skills[s.id] ?? { right: 0, total: 0 } }))
  const weak = rows.filter((r) => r.c.total >= WEAK_MIN && r.c.right / r.c.total < WEAK_RATE).sort((a, b) => a.c.right / a.c.total - b.c.right / b.c.total)
  const hasData = rows.some((r) => r.c.total > 0)
  const enough = rows.some((r) => r.c.total >= WEAK_MIN)

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <p className="flex items-start gap-2 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600">
        <Database size={15} className="mt-0.5 shrink-0" />
        <span>기록은 이 기기의 이 브라우저에만 저장돼요. 서버로 전송되지 않고, 다른 기기와는 공유되지 않습니다. 브라우저 데이터를 지우면 기록도 사라져요.</span>
      </p>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat title="개형 퀴즈" c={p.kinds.shape} />
        <Stat title="증감표 퀴즈" c={p.kinds.table} />
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
          <p className="text-xs font-semibold text-slate-500">실근 개수 게임</p>
          <p className="mt-1 text-3xl font-black tabular-nums text-slate-800">
            {p.solved.length} <span className="text-lg font-bold text-slate-400">/ {gameTotal}</span>
          </p>
          <p className="text-xs text-slate-500">완료한 미션</p>
        </div>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-base font-extrabold text-slate-800">약점 분석</h2>
        {!hasData && <p className="text-sm text-slate-500">아직 푼 퀴즈가 없어요. 퀴즈를 풀면 어떤 부분이 약한지 알려 드릴게요.</p>}
        {hasData && !enough && (
          <p className="text-sm text-slate-500">
            분석에는 항목마다 {WEAK_MIN}번 이상의 기록이 필요해요. 조금만 더 풀어 보세요!
          </p>
        )}
        {enough && weak.length === 0 && (
          <p className="flex items-center gap-2 text-sm font-semibold text-green-700">
            <CheckCircle2 size={18} /> 지금까지는 뚜렷한 약점이 없어요. 심화 난이도에도 도전해 보세요!
          </p>
        )}
        <div className="space-y-3">
          {weak.map((w) => (
            <div key={w.id} className="rounded-lg border border-amber-300 bg-amber-50 p-3">
              <p className="flex items-center gap-1.5 text-sm font-bold text-amber-800">
                <AlertTriangle size={16} /> {w.label}
                <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-xs tabular-nums">
                  {w.c.right}/{w.c.total} ({pct(w.c)}%)
                </span>
              </p>
              <p className="mt-1 text-sm leading-relaxed text-slate-700">{w.tip}</p>
              <button
                onClick={() => onGo(w.go)}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-bold text-white hover:bg-amber-700"
              >
                {w.goLabel} <ArrowRight size={15} />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-base font-extrabold text-slate-800">항목별 정답률</h2>
        <ul className="space-y-3">
          {rows.map((r) => {
            const rate = pct(r.c)
            const color = r.c.total === 0 ? 'bg-slate-300' : rate >= 85 ? 'bg-green-500' : rate >= WEAK_RATE * 100 ? 'bg-blue-500' : 'bg-amber-500'
            return (
              <li key={r.id}>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-semibold text-slate-700">{r.label}</span>
                  <span className="tabular-nums text-xs text-slate-500">
                    {r.c.total === 0 ? '아직 기록 없음' : `${r.c.right}/${r.c.total} · ${rate}%`}
                  </span>
                </div>
                <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full rounded-full ${color}`} style={{ width: `${rate}%` }} />
                </div>
              </li>
            )
          })}
        </ul>
        <p className="mt-3 text-xs text-slate-400">파랑 70% 이상 · 초록 85% 이상 · 주황은 더 연습이 필요한 항목이에요.</p>
      </section>

      <div className="flex justify-end">
        {confirming ? (
          <div className="flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm">
            <span className="font-semibold text-red-700">모든 기록을 지울까요?</span>
            <button
              onClick={() => {
                resetProgress()
                setConfirming(false)
              }}
              className="rounded-md bg-red-600 px-3 py-1 font-bold text-white hover:bg-red-700"
            >
              지우기
            </button>
            <button onClick={() => setConfirming(false)} className="rounded-md border border-slate-300 bg-white px-3 py-1 font-semibold text-slate-600">
              취소
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirming(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-50"
          >
            <Trash2 size={15} /> 기록 초기화
          </button>
        )}
      </div>
    </div>
  )
}

function Stat({ title, c }: { title: string; c: Counter }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
      <p className="text-xs font-semibold text-slate-500">{title}</p>
      <p className="mt-1 text-3xl font-black tabular-nums text-slate-800">
        {c.right} <span className="text-lg font-bold text-slate-400">/ {c.total}</span>
      </p>
      <p className="text-xs text-slate-500">{c.total === 0 ? '정답 / 제출' : `정답률 ${pct(c)}%`}</p>
    </div>
  )
}
