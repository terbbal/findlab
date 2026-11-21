// Seeds the demo user "minji". Run: node scripts/seed.mjs  (overwrites minji's entries/profile/mails)
import fs from "fs";
import path from "path";
import matter from "gray-matter";

const dir = path.join(process.cwd(), "data/users/minji");
const entriesDir = path.join(dir, "entries");
fs.rmSync(entriesDir, { recursive: true, force: true });
fs.mkdirSync(entriesDir, { recursive: true });

const entries = [
  { id: "2026-03-14-python-data-analysis", date: "2026-03-14", source: "lms", category: "Course", skills: ["Python", "pandas", "Data visualization"],
    note: "finished python data analysis assignment for intro to programming, cleaned the daegu weather dataset with pandas and made plots",
    bullet: "Cleaned and analyzed a Daegu weather dataset with Python (pandas) and visualized trends for an Intro to Programming assignment." },
  { id: "2026-03-28-linear-algebra-study", date: "2026-03-28", source: "text", category: "Club", skills: ["Linear algebra", "Leadership", "Teamwork"],
    note: "started a linear algebra study group with 5 friends, i organize the weekly meetings and problem sets",
    bullet: "Founded and organized a weekly 6-member linear algebra study group, preparing problem sets for each session." },
  { id: "2026-04-11-arduino-plant-watering", date: "2026-04-11", source: "voice", category: "Project", skills: ["Arduino", "C++", "Sensors"], highlight: true,
    note: "made a plant watering thing with arduino for club, works with moisture sensor",
    bullet: "Built an Arduino-based automatic plant-watering system using a soil-moisture sensor for the robotics club." },
  { id: "2026-04-25-cell-imaging-report", date: "2026-04-25", source: "course", category: "Course", skills: ["Microscopy", "ImageJ", "Scientific writing"],
    note: "wrote intro to biology lab report on cell imaging, used fluorescence microscope and counted cells in imagej",
    bullet: "Imaged cells with a fluorescence microscope and quantified cell counts in ImageJ for an Intro to Biology lab report." },
  { id: "2026-05-17-robotics-competition", date: "2026-05-17", source: "text", category: "Award", skills: ["Robotics", "Arduino", "Teamwork"], highlight: true,
    note: "robotics club competition today, our line-following robot got 3rd place out of 12 teams!",
    bullet: "Won 3rd place out of 12 teams in a robotics club competition with a line-following robot." },
  { id: "2026-06-07-volunteer-coding-class", date: "2026-06-07", source: "text", category: "Volunteer", skills: ["Teaching", "Scratch", "Communication"],
    note: "volunteer coding class for local middle school students, taught scratch basics to about 15 kids",
    bullet: "Taught Scratch programming basics to about 15 local middle-school students as a volunteer instructor." },
  { id: "2026-07-05-hand-gesture-ml", date: "2026-07-05", source: "text", category: "Project", skills: ["Python", "Machine learning", "OpenCV", "PyTorch"], highlight: true,
    note: "started ML mini project classifying hand gestures with webcam, using opencv and a small pytorch cnn, 5 gestures",
    bullet: "Developed a webcam-based classifier for 5 hand gestures using OpenCV and a small PyTorch CNN." },
  { id: "2026-07-22-ros-online-course", date: "2026-07-22", source: "text", category: "Other", skills: ["ROS", "Linux"],
    note: "finished an online ROS beginner course during summer break, built turtlesim nodes in ubuntu",
    bullet: "Completed an online ROS beginner course, building turtlesim nodes on Ubuntu Linux." },
  { id: "2026-09-12-medical-robotics-seminar", date: "2026-09-12", source: "text", category: "Other", skills: ["Medical robotics"],
    note: "attended a medical robotics seminar at DGIST about rehabilitation exoskeletons, really interesting",
    bullet: "Attended a DGIST seminar on medical robotics focused on rehabilitation exoskeletons." },
  { id: "2026-10-03-club-pr-lead", date: "2026-10-03", source: "text", category: "Club", skills: ["Leadership", "Design", "Communication"],
    note: "became PR lead of the robotics club, made the poster and instagram posts for the fall recruiting",
    bullet: "Led PR for the robotics club as PR lead, designing the poster and Instagram posts for fall recruiting." },
  { id: "2026-10-24-signals-quiz-app", date: "2026-10-24", source: "lms", category: "Course", skills: ["Python", "Signal processing", "NumPy"],
    note: "signals and systems assignment: filtered EMG sample data with numpy, removed noise with a band-pass filter",
    bullet: "Filtered sample EMG signals with a NumPy band-pass filter to remove noise in a Signals and Systems assignment." },
  { id: "2026-11-08-hackathon-health-app", date: "2026-11-08", source: "voice", category: "Project", skills: ["React", "Teamwork", "UX design"],
    note: "weekend hackathon with 3 teammates, we made a medication reminder web app prototype in react for elderly people",
    bullet: "Co-developed a React medication-reminder web app prototype for elderly users with 3 teammates during a weekend hackathon." },
];

for (const e of entries) {
  const body = `## Note\n${e.note}\n\n## CV bullet\n${e.bullet}\n`;
  const fm = { id: e.id, date: e.date, source: e.source, category: e.category, skills: e.skills, highlight: Boolean(e.highlight) };
  fs.writeFileSync(path.join(entriesDir, `${e.id}.md`), matter.stringify(body, fm));
}

fs.writeFileSync(path.join(dir, "profile.json"), JSON.stringify({
  userId: "minji",
  name: "Minji Kim",
  nameKo: "김민지",
  year: "2nd-year undergraduate",
  interests: ["Robotics", "Healthcare", "AI"],
  interestsKo: ["로봇공학", "헬스케어", "인공지능"],
  oneLineIntro: "Hands-on builder who connects robots, code and healthcare — from Arduino gadgets to gesture-recognition ML.",
  topSkills: [
    { name: "Python", level: 4 },
    { name: "Arduino", level: 3 },
    { name: "Machine learning", level: 3 },
    { name: "Teamwork", level: 3 },
    { name: "ROS", level: 1 },
  ],
  bestProjects: ["2026-07-05-hand-gesture-ml", "2026-04-11-arduino-plant-watering", "2026-05-17-robotics-competition"],
  email: "minji@dgist.ac.kr",
}, null, 2) + "\n");

const DAY = 86400000;
const sent = new Date(Date.now() - 9 * DAY);
fs.writeFileSync(path.join(dir, "mails.json"), JSON.stringify([
  {
    id: "mail-seed-battery",
    labId: "sample-battery-materials",
    contactName: "Prof. Junho Kim (sample)",
    contactEmail: null,
    subject: "Undergraduate internship inquiry — Minji Kim, DGIST",
    body: "Dear Professor Kim,\n\nMy name is Minji Kim, a 2nd-year undergraduate at DGIST. I am curious about how machine learning can help find better battery materials, and I would be grateful for a 15-minute meeting to learn whether there might be an opportunity to join your lab as an undergraduate intern.\n\nThank you for your time.\n\nBest regards,\nMinji Kim\nminji@dgist.ac.kr",
    language: "en",
    status: "sent",
    sentAt: sent.toISOString(),
    followUpDueAt: new Date(sent.getTime() + 7 * DAY).toISOString(),
  },
], null, 2) + "\n");
console.log(`Seeded ${entries.length} entries for minji`);
