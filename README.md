# 삼차·사차함수 그래프 개형 연습실

React + Vite + TypeScript + Tailwind CSS v4 + lucide-react, Canvas 직접 렌더링.

```bash
npm install
npm run dev     # 개발 서버
npm run build   # 타입 검사 + 프로덕션 빌드
```

- `src/utils/math.ts` : 다항식 연산, 실근, 극값/변곡점, f(x)=k 실근 개수, 접선 개수
- `src/utils/draw.ts` : 좌표 변환·격자·곡선·가이드라인 그리기 유틸
- `src/components/` : GraphCanvas(반응형 캔버스), CoefficientPanel(계수 슬라이더+입력)
- `src/modes/` : Visualizer / Quiz / ParameterGame / Advanced
