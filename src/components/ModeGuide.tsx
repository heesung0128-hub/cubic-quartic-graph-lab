import { useState } from 'react'
import { HelpCircle, X } from 'lucide-react'

interface Props {
  id: string
  title: string
  steps: string[]
}

const key = (id: string) => `guide-seen-${id}`

/** 모드별 사용법 안내. 처음 한 번은 자동으로 펼쳐지고, 이후에는 "사용법" 버튼으로 다시 볼 수 있다. */
export default function ModeGuide({ id, title, steps }: Props) {
  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem(key(id)) !== '1'
    } catch {
      return true
    }
  })

  const close = () => {
    setOpen(false)
    try {
      localStorage.setItem(key(id), '1')
    } catch {
      /* 저장소를 쓸 수 없어도 동작에는 문제 없다 */
    }
  }

  if (!open) {
    return (
      <div className="mb-2 flex justify-end">
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
        >
          <HelpCircle size={15} /> 사용법
        </button>
      </div>
    )
  }

  return (
    <div className="mb-3 rounded-xl border border-indigo-200 bg-indigo-50 p-4">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-sm font-extrabold text-indigo-800 sm:text-base">{title}</h2>
        <button onClick={close} aria-label="안내 닫기" className="rounded-full p-1 text-indigo-500 hover:bg-indigo-100">
          <X size={18} />
        </button>
      </div>
      <ol className="mt-2 space-y-1 text-sm text-slate-700">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
              {i + 1}
            </span>
            <span>{s}</span>
          </li>
        ))}
      </ol>
      <button
        onClick={close}
        className="mt-3 rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-bold text-white hover:bg-indigo-700"
      >
        알겠어요
      </button>
    </div>
  )
}
