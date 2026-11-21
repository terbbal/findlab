# finD Lab (fine & find Lab)

DGIST 학부생을 위한 연구실 소개팅 서비스입니다. 활동을 기록하고, DGIST의 모든 연구실을 실제 데이터로 살펴보고, 나에게 맞는 연구실 3곳을 찾고, 그 연구실에 가기 위해 들을 DGIST 과목을 학기별로 계획합니다.

A lab-matching app for DGIST undergraduates: log what you do, explore every DGIST lab with real data, find the 3 labs that fit you, and plan the DGIST courses that get you there.

| 단계 | 기능 |
|---|---|
| ① My Diary | 활동 기록(텍스트·음성) → CV, 타임라인, 명함, LMS 마감 |
| ② Labs | DGIST 연구자·연구실 263곳 검색·필터 (DGIST Scholar, 김박사넷 모집 정보) |
| ③ Find My Lab | 다이어리·CV(PDF)·관심사로 TOP 3 연구실 추천 |
| ④ Skill Roadmap | 관심 연구실 → 필요한 스킬 → DGIST 과목 → 학기별 수강 계획 |

## 실행 / Run

The app lives in [`findlab/`](findlab/).

```bash
cd findlab
npm install
cp .env.example .env.local   # ANTHROPIC_API_KEY is optional (fallbacks run without it)
npm run dev                  # http://localhost:3000
```

Details (features, data sources, deploying to Vercel, privacy): **[findlab/README.md](findlab/README.md)**.

Built for the 2026 DGIST AI Makerthon.
