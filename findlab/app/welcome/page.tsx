"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Sparkles, X } from "lucide-react";
import { useLang, useToast } from "@/components/Providers";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button, Card } from "@/components/ui";
import { readDB, saveProfile, setWorkspace } from "@/lib/localdb";

const YEARS = [
  { en: "1st-year undergraduate", ko: "학부 1학년" },
  { en: "2nd-year undergraduate", ko: "학부 2학년" },
  { en: "3rd-year undergraduate", ko: "학부 3학년" },
  { en: "4th-year undergraduate", ko: "학부 4학년" },
  { en: "Graduate student", ko: "대학원생" },
];

const INTERESTS = [
  { en: "Robotics", ko: "로봇공학" },
  { en: "AI / Machine learning", ko: "인공지능 / 머신러닝" },
  { en: "Computer science", ko: "컴퓨터 과학" },
  { en: "Brain science", ko: "뇌과학" },
  { en: "Biology", ko: "생명과학" },
  { en: "Healthcare", ko: "헬스케어" },
  { en: "Chemistry", ko: "화학" },
  { en: "Physics", ko: "물리학" },
  { en: "Energy & batteries", ko: "에너지 / 배터리" },
  { en: "Semiconductors", ko: "반도체" },
  { en: "Materials", ko: "신소재" },
  { en: "Mathematics", ko: "수학" },
  { en: "Environment", ko: "환경" },
];

/** First-run profile form (shown after the first sign-in, or when "My data" has no name yet). The student writes everything. */
export default function WelcomePage() {
  const { lang } = useLang();
  const toast = useToast();
  const router = useRouter();
  const { email: authEmail } = useAuth();
  const L = (en: string, ko: string) => (lang === "ko" ? ko : en);

  const [name, setName] = useState("");
  const [nameKo, setNameKo] = useState("");
  const [year, setYear] = useState(YEARS[0].en);
  const [email, setEmail] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [custom, setCustom] = useState("");
  const [intro, setIntro] = useState("");

  // Prefill from what's already saved (and the signed-in email)
  useEffect(() => {
    const p = readDB("me").profile;
    setName(p.name ?? "");
    setNameKo(p.nameKo ?? "");
    if (p.year) setYear(p.year);
    setEmail(p.email || authEmail || "");
    setInterests(p.interests ?? []);
    setIntro(p.oneLineIntro ?? "");
  }, [authEmail]);

  const toggle = (en: string) => setInterests((xs) => (xs.includes(en) ? xs.filter((x) => x !== en) : [...xs, en]));
  const addCustom = () => {
    const v = custom.trim();
    if (v && !interests.includes(v)) setInterests((xs) => [...xs, v]);
    setCustom("");
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast(L("Please enter your name", "이름을 입력해 주세요"), "error");
    const ko = interests.map((i) => INTERESTS.find((x) => x.en === i)?.ko ?? i);
    setWorkspace("me");
    saveProfile({
      userId: "me",
      name: name.trim(),
      nameKo: nameKo.trim() || undefined,
      year,
      email: email.trim(),
      interests,
      interestsKo: ko,
      oneLineIntro: intro.trim(),
    });
    toast(L("Profile saved — welcome to finD Lab! 🎉", "프로필 저장 완료 — finD Lab에 오신 걸 환영해요! 🎉"));
    router.push("/");
  };

  return (
    <Card className="mx-auto max-w-xl p-6 md:p-8">
      <div className="mb-1 flex items-center gap-2 text-sm font-bold text-cv">
        <Sparkles className="h-4 w-4" /> {L("Welcome!", "환영해요!")}
      </div>
      <h1 className="text-2xl font-bold">{L("Tell us a little about you", "나에 대해 알려 주세요")}</h1>
      <p className="mt-1 text-sm text-slate-500">
        {L("Used for your namecard, CV guide and lab matching. You can change it any time in My Diary → Namecard.", "명함, CV 가이드, 연구실 매칭에 쓰여요. My Diary → 명함에서 언제든 바꿀 수 있어요.")}
      </p>

      <form onSubmit={save} className="mt-6 space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">{L("Name (English)", "이름 (영문)")} *</span>
            <input className="input" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Minji Kim" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">{L("Name (Korean, optional)", "이름 (한글, 선택)")}</span>
            <input className="input" value={nameKo} onChange={(e) => setNameKo(e.target.value)} placeholder="김민지" />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">{L("Year", "학년")}</span>
            <select className="input" value={year} onChange={(e) => setYear(e.target.value)}>
              {YEARS.map((y) => (
                <option key={y.en} value={y.en}>
                  {lang === "ko" ? y.ko : y.en}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">Email</span>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@dgist.ac.kr" />
          </label>
        </div>

        <div>
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">{L("What are you interested in? (pick a few)", "관심 분야 (여러 개 선택)")}</span>
          <div className="flex flex-wrap gap-1.5">
            {INTERESTS.map((i) => (
              <button
                type="button"
                key={i.en}
                onClick={() => toggle(i.en)}
                className={clsx("rounded-full px-3 py-1.5 text-sm font-semibold transition", interests.includes(i.en) ? "bg-lab text-white" : "bg-slate-100 text-slate-600 hover:bg-lab-tint")}
              >
                {lang === "ko" ? i.ko : i.en}
              </button>
            ))}
            {interests
              .filter((i) => !INTERESTS.some((x) => x.en === i))
              .map((i) => (
                <span key={i} className="inline-flex items-center gap-1 rounded-full bg-lab px-3 py-1.5 text-sm font-semibold text-white">
                  {i}
                  <button type="button" onClick={() => toggle(i)} aria-label="Remove">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
          </div>
          <div className="mt-2 flex gap-2">
            <input
              className="input"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustom();
                }
              }}
              placeholder={L("Something else? e.g. soft robots, protein design", "다른 관심사? 예: 소프트 로봇, 단백질 설계")}
            />
            <Button type="button" variant="secondary" color="lab" onClick={addCustom}>
              {L("Add", "추가")}
            </Button>
          </div>
        </div>

        <label className="block">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">{L("One line about you (optional — your own words)", "한 줄 소개 (선택 — 직접 작성)")}</span>
          <input className="input" value={intro} onChange={(e) => setIntro(e.target.value)} maxLength={140} placeholder={L("e.g. I like building robots that help people.", "예: 사람을 돕는 로봇을 만드는 걸 좋아해요.")} />
        </label>

        <Button color="cv" className="w-full py-3 text-base">
          {L("Save and start", "저장하고 시작하기")}
        </Button>
      </form>
    </Card>
  );
}
