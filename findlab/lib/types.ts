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
  /** Where the record came from. Missing = sample or homepage crawler. */
  source?: "dgist-scholar" | "crawler";
  /** DGIST department / division (from DGIST Scholar). */
  department?: string;
  /** Korean name of the PI, e.g. "강원석". */
  professorKo?: string;
  /** Public DGIST Scholar profile page. */
  scholarUrl?: string;
  /** National research-field categories (국가과학기술표준분류, 12대 국가전략기술 …). */
  fields?: string[];
  /** Other public profile links (lab website, Google Scholar, ORCiD …). */
  links?: { label: string; url: string }[];
  /** Where `recruiting` came from (e.g. 김박사넷 open-lab card the PI filled in). */
  recruitingSource?: { name: string; url: string; checkedAt: string };
  /** The professor's 김박사넷 (phdkim.net) page. */
  phdkimUrl?: string;
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
