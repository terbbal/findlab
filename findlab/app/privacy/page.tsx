import Link from "next/link";
import { labsMeta } from "@/lib/labs";

export const metadata = { title: "Privacy — finD Lab" };

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-5 rounded-2xl bg-white p-6 text-sm leading-relaxed shadow-soft md:p-8">
      <h1 className="text-2xl font-bold">Privacy · 개인정보 안내</h1>
      <section>
        <h2 className="mb-1 font-bold">What we store</h2>
        <p>
          Your diary entries, profile/namecard, saved labs, skill roadmaps and imported LMS items (and your LMS calendar link, if you connect one) are stored
          <b> only in your own browser</b> (localStorage). There is no account and no database of students. 다이어리·로드맵·LMS 항목은 이 브라우저에만 저장돼요.
        </p>
      </section>
      <section>
        <h2 className="mb-1 font-bold">If you sign in (optional)</h2>
        <p>
          Signing in with your @dgist.ac.kr email (magic link, no password) saves a copy of the same data to your account in our Supabase database,
          so it follows you across devices. Row-level security means only you can read or change your row. You can delete it any time on the Account page.
          로그인하면 같은 데이터가 내 계정(Supabase)에 저장되고, 본인만 볼 수 있어요.
        </p>
      </section>
      <section>
        <h2 className="mb-1 font-bold">What we never store</h2>
        <p>We never ask for or store passwords (DGIST portal or LMS), and we never log in to or scrape the LMS. 비밀번호는 절대 묻거나 저장하지 않아요.</p>
      </section>
      <section>
        <h2 className="mb-1 font-bold">What passes through our server</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>When you use an AI feature (skill tags for a diary note, lab matching, namecard, nudges), the relevant text is sent to our server and to the Anthropic API to compute the result. It is not saved.</li>
          <li>When you connect an LMS calendar, our server fetches the calendar once to parse it and returns the items to your browser. It is not saved.</li>
          <li>Uploaded PDF/.ics files are processed in memory only.</li>
        </ul>
      </section>
      <section>
        <h2 className="mb-1 font-bold">Lab data</h2>
        <p>
          Lab and professor information is public data from{" "}
          <a className="underline" href="https://scholar.dgist.ac.kr" target="_blank" rel="noreferrer">
            DGIST Scholar
          </a>{" "}
          (crawled {labsMeta.crawledAt}, respecting robots.txt). Fields marked ✦ AI are generated summaries or inferences from that public text and are not official.
        </p>
      </section>
      <section>
        <h2 className="mb-1 font-bold">Delete your data</h2>
        <p>
          Go to{" "}
          <Link href="/settings" className="underline">
            Settings → Your data → Delete all my data
          </Link>
          . This removes everything finD Lab stored in this browser. 설정에서 언제든 모두 삭제할 수 있어요.
        </p>
      </section>
    </article>
  );
}
