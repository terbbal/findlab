"use client";

import { useEffect, useState } from "react";
import { Bell, BellRing, Globe, RotateCcw, User } from "lucide-react";
import { useLang, useToast } from "@/components/Providers";
import { Button, Card } from "@/components/ui";
import { ALARM_KEY, getAlarmTime, TRIGGER_EVENT } from "@/components/DailyAlarm";

export default function SettingsPage() {
  const { lang, setLang } = useLang();
  const toast = useToast();
  const L = (en: string, ko: string) => (lang === "ko" ? ko : en);
  const [time, setTime] = useState("21:00");
  const [perm, setPerm] = useState<string>("default");
  const [showHidden, setShowHidden] = useState(false);

  useEffect(() => {
    setTime(getAlarmTime());
    if ("Notification" in window) setPerm(Notification.permission);
    else setPerm("unsupported");
  }, []);

  const saveTime = (v: string) => {
    setTime(v);
    try {
      localStorage.setItem(ALARM_KEY, v);
      localStorage.removeItem("findlab.alarmShown");
    } catch {}
    toast(L("Reminder time saved", "알림 시간을 저장했어요"));
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="text-2xl font-bold md:text-3xl">{L("Settings", "설정")}</h1>

      <Card className="space-y-3">
        <h2 className="flex items-center gap-2 font-bold">
          <Bell className="h-5 w-5 text-cv" /> {L("Daily “What did you do today?” reminder", "매일 “오늘 무엇을 했나요?” 알림")}
        </h2>
        <p className="text-sm text-slate-500">
          {L("While finD Lab is open, we'll nudge you once a day at this time.", "finD Lab이 열려 있는 동안 매일 이 시간에 한 번 알려 드려요.")}
        </p>
        <input type="time" className="input w-40" value={time} onChange={(e) => saveTime(e.target.value)} />
        <div className="flex flex-wrap items-center gap-2">
          {perm === "default" && (
            <Button
              variant="secondary"
              color="cv"
              onClick={async () => {
                const p = await Notification.requestPermission();
                setPerm(p);
              }}
            >
              <BellRing className="h-4 w-4" /> {L("Also send browser notifications", "브라우저 알림도 받기")}
            </Button>
          )}
          {perm === "granted" && <span className="text-sm font-semibold text-lab">✓ {L("Browser notifications on", "브라우저 알림 켜짐")}</span>}
          {perm === "denied" && <span className="text-sm text-slate-500">{L("Browser notifications are blocked in your browser settings.", "브라우저 설정에서 알림이 차단되어 있어요.")}</span>}
        </div>
      </Card>

      <Card className="space-y-3">
        <h2 className="flex items-center gap-2 font-bold">
          <Globe className="h-5 w-5 text-lab" /> {L("Language", "언어")}
        </h2>
        <p className="text-sm text-slate-500">{L("UI text and AI outputs follow this language.", "화면과 AI 결과물이 이 언어를 따라요.")}</p>
        <div className="flex w-56 rounded-xl bg-slate-100 p-1">
          {(["ko", "en"] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`flex-1 rounded-lg py-1.5 text-sm font-semibold ${lang === l ? "bg-white text-navy shadow-sm" : "text-slate-500"}`}
            >
              {l === "ko" ? "한국어" : "English"}
            </button>
          ))}
        </div>
      </Card>

      <Card className="space-y-2">
        <h2 className="flex items-center gap-2 font-bold">
          <User className="h-5 w-5 text-mail" /> {L("Demo user", "데모 사용자")}
        </h2>
        <select className="input w-64" value="minji" disabled>
          <option value="minji">Minji Kim (minji)</option>
        </select>
        <p className="text-xs text-slate-400">{L("Single demo user for the prototype — DGIST SSO login is future work.", "프로토타입용 단일 데모 사용자예요 — DGIST SSO 로그인은 추후 작업이에요.")}</p>
      </Card>

      <div className="text-center">
        <button onClick={() => setShowHidden((v) => !v)} className="text-xs text-slate-300 hover:text-slate-500">
          ···
        </button>
        {showHidden && (
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            <Button variant="secondary" color="mail" onClick={() => window.dispatchEvent(new Event(TRIGGER_EVENT))}>
              <BellRing className="h-4 w-4" /> {L("Trigger alarm now", "지금 알림 띄우기")}
            </Button>
            <Button
              variant="secondary"
              color="navy"
              onClick={() => {
                try {
                  sessionStorage.clear();
                  localStorage.removeItem("findlab.labsMatched");
                  localStorage.removeItem("findlab.alarmShown");
                } catch {}
                toast(L("Demo cache cleared", "데모 캐시를 지웠어요"));
              }}
            >
              <RotateCcw className="h-4 w-4" /> {L("Reset demo cache", "데모 캐시 초기화")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
