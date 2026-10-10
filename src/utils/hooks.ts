import { useEffect, useState } from 'react'

export interface WindowSize {
  w: number
  h: number
}

/** 창 크기 (태블릿 가로/세로 전환에도 그래프 높이를 맞추기 위함) */
export function useWindowSize(): WindowSize {
  const [size, setSize] = useState<WindowSize>({ w: window.innerWidth, h: window.innerHeight })
  useEffect(() => {
    const on = () => setSize({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  return size
}

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
