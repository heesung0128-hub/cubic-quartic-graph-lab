import { useMemo } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'

interface Props {
  /** LaTeX 문자열 */
  children: string
  /** 줄을 따로 잡고 크게 표시 */
  block?: boolean
  className?: string
}

/** KaTeX로 수식을 교과서처럼 표시한다. 우리가 만든 문자열만 넣으므로 innerHTML 사용이 안전하다. */
export default function Tex({ children, block = false, className }: Props) {
  const html = useMemo(
    () => katex.renderToString(children, { throwOnError: false, displayMode: block, strict: false }),
    [children, block],
  )
  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />
}
