import { Check } from 'lucide-react'
import type { Coeffs } from '../utils/math'
import type { Preset } from '../utils/presets'

interface Props {
  presets: Preset[]
  /** 현재 함수의 계수. 프리셋과 같으면 그 프리셋이 선택된 것으로 표시된다. */
  coeffs: Coeffs
  onSelect: (p: Preset) => void
}

const same = (a: Coeffs, b: Coeffs) => a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) < 1e-6)

/** 프리셋 버튼 모음. 선택된 프리셋을 눈에 띄게 표시하고, 계수를 직접 바꾸면 선택이 해제된다. */
export default function PresetPicker({ presets, coeffs, onSelect }: Props) {
  const active = presets.find((p) => same(p.coeffs, coeffs))
  return (
    <>
      <div className="flex flex-wrap gap-2" role="group">
        {presets.map((p) => {
          const on = p === active
          return (
            <button
              key={p.label}
              aria-pressed={on}
              onClick={() => onSelect(p)}
              className={`inline-flex min-h-10 items-center gap-1.5 rounded-lg border-2 px-3 py-1.5 text-sm font-semibold transition ${
                on
                  ? 'border-indigo-600 bg-indigo-600 text-white shadow'
                  : 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
              }`}
            >
              {on && <Check size={15} strokeWidth={3} />}
              {p.label}
            </button>
          )
        })}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-slate-500">
        {active ? active.desc : '직접 조절한 계수입니다. 위 버튼을 누르면 대표적인 개형으로 돌아갑니다.'}
      </p>
    </>
  )
}
