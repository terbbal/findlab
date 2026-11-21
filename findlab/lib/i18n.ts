import type { Lang } from "./types";

const dict = {
  "tagline": { ko: "DGIST 연구실 소개팅", en: "From your diary to your dream lab." },
  "step.cv": { ko: "Making CV", en: "Making CV" },
  "step.lab": { ko: "Finding Lab", en: "Finding Lab" },
  "step.mail": { ko: "Suggest Mail", en: "Suggest Mail" },
  "step.cv.sub": { ko: "활동 아카이빙 · CV 작성 가이드", en: "Archive · CV writing guide" },
  "step.lab.sub": { ko: "나에게 맞는 연구실", en: "Labs that fit you" },
  "step.mail.sub": { ko: "교수님께 메일", en: "Email the lab" },
  "nav.settings": { ko: "설정", en: "Settings" },
  "nav.home": { ko: "홈", en: "Home" },

  "common.sampleData": { ko: "샘플 데이터", en: "Sample data" },
  "common.demoMode": { ko: "데모 모드", en: "Demo mode" },
  "common.demoMode.tip": {
    ko: "AI 연결이 없어 미리 준비된 응답을 보여줘요.",
    en: "AI is offline, so we're showing a precomputed response.",
  },
  "common.aiThinking": { ko: "AI가 생각하는 중…", en: "AI is thinking…" },
  "common.save": { ko: "저장", en: "Save" },
  "common.cancel": { ko: "취소", en: "Cancel" },
  "common.edit": { ko: "수정", en: "Edit" },
  "common.delete": { ko: "삭제", en: "Delete" },
  "common.saved": { ko: "저장했어요!", en: "Saved!" },
  "common.copied": { ko: "복사했어요!", en: "Copied!" },
  "common.error": { ko: "문제가 생겼어요. 다시 시도해 주세요.", en: "Something went wrong. Please try again." },
  "common.search": { ko: "검색", en: "Search" },
  "common.all": { ko: "전체", en: "All" },
  "common.daysLeft": { ko: "{n}일 남음", en: "{n} days left" },
  "common.today": { ko: "오늘", en: "Today" },
  "common.comingSoon": { ko: "곧 만나요", en: "Coming soon" },

  "home.hi": { ko: "안녕하세요, {name} 님 👋", en: "Hi {name} 👋" },
  "home.prompt": { ko: "오늘 무엇을 했나요?", en: "What did you do today?" },
  "home.promptHint": {
    ko: "짧게 적어도 괜찮아요. 차곡차곡 모아 두면, CV 쓸 때 무엇을 어떻게 쓸지 안내해 드려요.",
    en: "A quick note is enough — keep the record, and we'll guide you when you write your CV.",
  },

  "diary.placeholder": {
    ko: "예: 동아리에서 아두이노로 화분 자동 급수기를 만들었다. 수분 센서 사용.",
    en: "e.g. made a plant watering thing with arduino for club, works with moisture sensor",
  },
  "diary.empty": { ko: "아직 기록이 없어요 — 오늘 한 일을 말해 주세요 🎙", en: "No entries yet — tell me what you did today 🎙" },
  "diary.original": { ko: "원래 메모", en: "Original note" },
  "diary.bullet": { ko: "내 CV 문장", en: "My CV line" },
  "diary.voice": { ko: "음성 입력", en: "Voice input" },
  "diary.voiceUnsupported": {
    ko: "이 브라우저는 음성 입력을 지원하지 않아요 (Chrome 권장).",
    en: "Voice input isn't supported in this browser (try Chrome).",
  },
  "diary.saveAI": { ko: "기록 저장하기", en: "Save to my archive" },
} satisfies Record<string, Record<Lang, string>>;

export type I18nKey = keyof typeof dict;

export function translate(lang: Lang, key: I18nKey, vars?: Record<string, string | number>): string {
  let s: string = dict[key]?.[lang] ?? dict[key]?.en ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
  return s;
}
