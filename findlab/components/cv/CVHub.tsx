"use client";

import { useRouter, useSearchParams } from "next/navigation";
import clsx from "clsx";
import { BookOpen, CalendarDays, Compass, Contact, GitCommitVertical, NotebookPen, Users } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { useLang } from "@/components/Providers";
import { DiaryTab } from "./DiaryTab";
import { CVExportTab } from "./CVExportTab";
import { TimelineTab } from "./TimelineTab";
import { CalendarTab } from "./CalendarTab";
import { CoursesTab } from "./CoursesTab";
import { NamecardTab } from "@/components/namecard/NamecardTab";
import { ContactsTab } from "@/components/contacts/ContactsTab";

const TABS = [
  { id: "diary", en: "Diary", ko: "다이어리", icon: NotebookPen },
  { id: "calendar", en: "Calendar", ko: "캘린더", icon: CalendarDays },
  { id: "timeline", en: "Timeline", ko: "타임라인", icon: GitCommitVertical },
  { id: "courses", en: "Courses & LMS", ko: "수업 & LMS", icon: BookOpen },
  { id: "namecard", en: "My namecard", ko: "내 명함", icon: Contact },
  { id: "contacts", en: "Received cards", ko: "받은 명함", icon: Users },
  { id: "export", en: "CV Guide", ko: "CV 가이드", icon: Compass },
] as const;

export type CVTab = (typeof TABS)[number]["id"];

export function CVHub() {
  const params = useSearchParams();
  const router = useRouter();
  const { lang } = useLang();
  const tab = (TABS.find((x) => x.id === params.get("tab"))?.id ?? "diary") as CVTab;

  return (
    <div>
      <div className="print:hidden">
        <PageHeader step="cv" />
      </div>
      <div className="mb-6 flex gap-1 overflow-x-auto rounded-2xl bg-white p-1.5 shadow-soft print:hidden">
        {TABS.map((x) => {
          const Icon = x.icon;
          return (
            <button
              key={x.id}
              onClick={() => router.replace(`/cv?tab=${x.id}`, { scroll: false })}
              className={clsx(
                "flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition",
                tab === x.id ? "bg-cv text-white shadow-sm" : "text-slate-500 hover:bg-cv-tint hover:text-cv",
              )}
            >
              <Icon className="h-4 w-4" />
              {x[lang]}
            </button>
          );
        })}
      </div>
      {tab === "diary" && <DiaryTab />}
      {tab === "timeline" && <TimelineTab />}
      {tab === "calendar" && <CalendarTab />}
      {tab === "courses" && <CoursesTab />}
      {tab === "namecard" && <NamecardTab />}
      {tab === "contacts" && <ContactsTab />}
      {tab === "export" && <CVExportTab />}
    </div>
  );
}
