export type Category = "Research" | "Project" | "Course" | "Club" | "Award" | "Volunteer" | "Other";
export const CATEGORIES: Category[] = ["Research", "Project", "Course", "Club", "Award", "Volunteer", "Other"];

export type Lang = "ko" | "en";

export interface DiaryEntry {
  id: string;
  date: string; // YYYY-MM-DD
  rawNote: string;
  source: "text" | "voice" | "course" | "lms";
  category: Category;
  skills: string[];
  cvBullet: string;
  cvBulletEdited?: string;
  highlight?: boolean;
}

export interface Profile {
  userId: string;
  name: string;
  /** Korean name, used in Korean emails/CV */
  nameKo?: string;
  year: string;
  interests: string[];
  interestsKo?: string[];
  oneLineIntro: string;
  topSkills: { name: string; level: 1 | 2 | 3 | 4 }[];
  bestProjects: string[];
  email: string;
}

export type ContactRole = "Professor" | "Postdoc" | "PhD student" | "MS student" | "Lab manager" | "Other";
export type RecruitType = "Undergrad intern" | "UGRP" | "Grad student";

export interface Lab {
  id: string;
  name: string;
  professor: string | null;
  website: string | null;
  researchAreas: string[];
  plainSummary: string;
  /** Optional Korean version of plainSummary */
  plainSummaryKo?: string;
  recentPapers: { title: string; url: string | null; year?: number }[];
  contacts: { name: string; role: ContactRole; email: string | null }[];
  recruiting: { status: "Recruiting" | "Not recruiting" | "Unknown"; note: string | null; types: RecruitType[] };
  keywords: string[];
  isSample: boolean;
  lastUpdated: string;
  /** Optional: helps the Computational / Experimental filter. */
  style?: "Computational" | "Experimental" | "Both";
}

export interface Opportunity {
  id: string;
  name: string;
  description: string;
  deadline: string;
  link: string | null;
  isSample: true;
}

export interface MailRecord {
  id: string;
  labId: string;
  contactName: string;
  contactEmail: string | null;
  subject: string;
  body: string;
  language: Lang;
  status: "draft" | "sent" | "replied";
  sentAt?: string;
  followUpDueAt?: string;
  replyText?: string;
  replySummary?: { summary: string; sentiment: "positive" | "neutral" | "negative"; nextSteps: string[] };
}

export interface LabMatch {
  labId: string;
  fitScore: number;
  whyItFits: string[];
  /** entry ids cited by whyItFits (same order, may be shorter) */
  citedEntryIds?: string[];
  prepare: { courses: string[]; skills: string[] };
}

/** Every AI route returns its payload plus whether the demo fallback was used. */
export type AIResult<T> = T & { demoMode?: boolean };
