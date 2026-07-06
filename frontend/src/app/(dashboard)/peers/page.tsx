"use client";

import { useEffect, useState } from "react";
import { Search, Plus, Calendar, X, MessageSquare, Clock, Star, Users, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type ProgrammeType = "Undergraduate" | "Masters" | "PhD";

type Ambassador = {
  id: string;
  name: string;
  initials: string;
  colour: string; // avatar bg/text tailwind classes
  programme: string; // full programme title
  programmeType: ProgrammeType;
  year: string;
  languages: string;
  from: string;
  fromFlag: string;
  qualification: string;
  majors: string;
  bio: string; // short (for card, truncated)
  bioFull: string; // full bio for modal
  hobbies: string[];
  clubs: string;
  favouriteCourses: string[];
  online: boolean;
};

const ambassadors: Ambassador[] = [
  {
    id: "1",
    name: "Adel Zeinab",
    initials: "AZ",
    colour: "bg-blue-100 text-blue-700",
    programme: "Bachelor of Science (Honours) in Computer Science",
    programmeType: "Undergraduate",
    year: "3rd Year",
    languages: "English, Arabic",
    from: "Cairo, Egypt",
    fromFlag: "🇪🇬",
    qualification: "GCE A-Levels (3 A*s)",
    majors: "BSc Computer Science / Minor in Math",
    bio: "Hey there! I am a final year CS student specialising in software engineering. Happy to help out with queries about course load...",
    bioFull:
      "Hey there! I am Adel, a final-year BSc Computer Science student specialising in Software Engineering at APU. Moving from Cairo was a huge change but the international student community here made it feel like home within weeks. I have been through the whole journey — stressing over visa papers, figuring out dorm life, navigating the first semester crunch — so I genuinely know what prospective students are worried about. Whether you need a breakdown of fee schedules, a virtual dorm tour, or just an honest chat about what CS coursework actually feels like day to day, I am always happy to jump on a call. My DMs are open!",
    hobbies: ["#Badminton", "#Basketball", "#Fitness", "#CodingClubs"],
    clubs: "Member of APU Computer Society, VP of International Student Association.",
    favouriteCourses: [
      "Advanced Algorithms",
      "Database Management Systems",
      "Human-Computer Interaction",
    ],
    online: true,
  },
  {
    id: "2",
    name: "Alyssandra Fong",
    initials: "AF",
    colour: "bg-pink-100 text-pink-700",
    programme: "Bachelor of Business Administration in Marketing",
    programmeType: "Undergraduate",
    year: "4th Year",
    languages: "English, Mandarin, Cantonese",
    from: "Kuala Lumpur, Malaysia",
    fromFlag: "🇲🇾",
    qualification: "Malaysian UEC (6 A+s)",
    majors: "BBA Marketing / Minor in Digital Media",
    bio: "Marketing student who loves branding, social media strategy, and bubble tea. Ask me anything about KL life or the BBA programme!",
    bioFull:
      "Hi! I am Alyssandra, a 4th-year BBA Marketing student from Kuala Lumpur. I chose APU because of the incredible industry connections and the exposure to real marketing campaigns during my studies. If you are thinking about business programmes, I can walk you through module choices, internship opportunities, and how to make the most of the campus clubs. Feel free to reach out!",
    hobbies: ["#BubbleTea", "#Branding", "#Hiking", "#Photography"],
    clubs: "President of Marketing Society, Member of Toastmasters APU.",
    favouriteCourses: [
      "Consumer Behaviour",
      "Digital Marketing Strategy",
      "Brand Management",
    ],
    online: true,
  },
  {
    id: "3",
    name: "Rahul Iyer",
    initials: "RI",
    colour: "bg-emerald-100 text-emerald-700",
    programme: "Bachelor of Engineering in Mechanical Engineering",
    programmeType: "Undergraduate",
    year: "2nd Year",
    languages: "English, Hindi, Tamil",
    from: "Chennai, India",
    fromFlag: "🇮🇳",
    qualification: "CBSE Class XII (95.6%)",
    majors: "BEng Mechanical Engineering / Minor in Robotics",
    bio: "Engineering student from Chennai. I can tell you everything about the workshops, lab access, and surviving second-year thermodynamics!",
    bioFull:
      "Hey! I am Rahul, a 2nd-year Mechanical Engineering student originally from Chennai, India. The transition from the Indian school system to a British-style degree was challenging at first, but APU's support network is fantastic. I spend most of my free time in the fabrication lab or on the football pitch. Happy to answer questions about the engineering faculty, lab facilities, or life as an international student from South Asia.",
    hobbies: ["#Football", "#Robotics", "#3DPrinting", "#Gaming"],
    clubs: "Secretary of Robotics Club, Member of APU Football Team.",
    favouriteCourses: [
      "Thermofluids",
      "Mechanics of Materials",
      "Engineering Design",
    ],
    online: false,
  },
  {
    id: "4",
    name: "Hana Kobayashi",
    initials: "HK",
    colour: "bg-violet-100 text-violet-700",
    programme: "Bachelor of Arts in Graphic Design",
    programmeType: "Undergraduate",
    year: "3rd Year",
    languages: "English, Japanese",
    from: "Osaka, Japan",
    fromFlag: "🇯🇵",
    qualification: "Japanese High School Diploma (Honours)",
    majors: "BA Graphic Design / Elective in UX Design",
    bio: "Designer obsessed with typography and UI. If you're coming from Japan or curious about the creative arts courses, let's chat!",
    bioFull:
      "Konnichiwa! I am Hana, a 3rd-year Graphic Design student from Osaka. APU has one of the strongest creative arts communities in Malaysia and I have loved every project here. I can talk at length about portfolio prep, the design studio culture, and how to navigate the visa process from Japan. Always happy to meet up over coffee — virtually or in person!",
    hobbies: ["#Typography", "#Illustration", "#AnimeFilms", "#Yoga"],
    clubs: "Creative Director of APU Design Society, Member of Photography Club.",
    favouriteCourses: [
      "Visual Communication",
      "UX Research & Prototyping",
      "Motion Graphics",
    ],
    online: true,
  },
  {
    id: "5",
    name: "Mateus Oliveira",
    initials: "MO",
    colour: "bg-amber-100 text-amber-700",
    programme: "Bachelor of Science in Data Science",
    programmeType: "Undergraduate",
    year: "4th Year",
    languages: "English, Portuguese, Spanish",
    from: "São Paulo, Brazil",
    fromFlag: "🇧🇷",
    qualification: "Brazilian ENEM (Top 5%)",
    majors: "BSc Data Science / Minor in Statistics",
    bio: "Data science nerd from São Paulo. I love Python, football (the real kind), and explaining complex ML concepts in plain language.",
    bioFull:
      "Oi! I am Mateus, a 4th-year Data Science student from São Paulo, Brazil. I came to APU for its focus on applied data analytics and I have not looked back. I have done two industry internships and I am happy to share how to land them as an international student. If maths or programming feels daunting, come talk to me — I promise to make it less scary!",
    hobbies: ["#Football", "#Python", "#Chess", "#Cooking"],
    clubs: "Founder of APU Data Science Society, Member of Futsal Team.",
    favouriteCourses: [
      "Machine Learning",
      "Statistical Modelling",
      "Big Data Analytics",
    ],
    online: false,
  },
  {
    id: "6",
    name: "Sara Okonkwo",
    initials: "SO",
    colour: "bg-rose-100 text-rose-700",
    programme: "Bachelor of Laws",
    programmeType: "Undergraduate",
    year: "2nd Year",
    languages: "English, French",
    from: "Abuja, Nigeria",
    fromFlag: "🇳🇬",
    qualification: "WAEC (7 A1s)",
    majors: "LLB Law / Elective in Human Rights Law",
    bio: "Law student with a passion for human rights and mooting. Ask me about the LLB programme, moot court competitions, or life in Abuja vs. KL!",
    bioFull:
      "Hello! I am Sara, a 2nd-year LLB student originally from Abuja, Nigeria. Law school anywhere is intense but APU has a brilliant mooting culture and the lecturers are genuinely accessible. I have competed in two international moot competitions and I love mentoring students who are curious about legal careers. Let us connect if you have questions about the course, scholarship applications, or navigating KL as a first-timer from Africa.",
    hobbies: ["#Mooting", "#PublicSpeaking", "#ReadingLegalThrillers", "#Running"],
    clubs: "President of APU Mooting Society, Member of Model UN.",
    favouriteCourses: [
      "Constitutional Law",
      "International Human Rights Law",
      "Advocacy & Mooting",
    ],
    online: true,
  },
];

// ─── Static data ──────────────────────────────────────────────────────────────

type Request = { student: string; requested: string; topic: string; time: string };

const requests: Request[] = [
  {
    student: "Carlos Mendoza",
    requested: "Requested 1h ago",
    topic: "Intent: Visa processing & Campus Life",
    time: "Tomorrow, 2:30 PM",
  },
  {
    student: "Priya Nair",
    requested: "Requested 3h ago",
    topic: "Intent: Scholarships & Course Load",
    time: "Friday, 10:00 AM",
  },
  {
    student: "Tomás Álvarez",
    requested: "Requested yesterday",
    topic: "Intent: Accommodation options",
    time: "Monday, 4:15 PM",
  },
];

const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getAmbassadorStats(a: Ambassador) {
  const seed = Number(a.id);
  const slotPatterns = [
    "9:00 AM – 12:00 PM",
    "1:00 PM – 4:00 PM",
    "10:00 AM – 1:00 PM",
    "2:00 PM – 6:00 PM",
    "Unavailable",
  ];
  return {
    totalConsults: 40 + seed * 17,
    avgResponse: `${2 + (seed % 5)}m ${((seed * 13) % 60)}s`,
    rating: (4.4 + (seed % 6) / 10).toFixed(1),
    availability: weekDays.map((day, i) => ({
      day,
      slot: i >= 5 ? "Unavailable" : slotPatterns[(seed + i) % 4],
    })),
  };
}

// ─── Programme badge ─────────────────────────────────────────────────────────

const programmeStyles: Record<ProgrammeType, string> = {
  Undergraduate: "text-emerald-700 bg-emerald-50 border-emerald-200",
  Masters: "text-blue-700 bg-blue-50 border-blue-200",
  PhD: "text-violet-700 bg-violet-50 border-violet-200",
};

function ProgrammeBadge({ type }: { type: ProgrammeType }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-medium",
        programmeStyles[type],
      )}
    >
      {type}
    </span>
  );
}

// ─── Avatar with flag ─────────────────────────────────────────────────────────

function AvatarWithFlag({
  initials,
  colour,
  flag,
  size = 64,
  flagSize = 22,
}: {
  initials: string;
  colour: string;
  flag: string;
  size?: number;
  flagSize?: number;
}) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        className={cn(
          "w-full h-full rounded-full flex items-center justify-center font-semibold",
          colour,
        )}
        style={{ fontSize: size * 0.28 }}
      >
        {initials}
      </div>
      <span
        className="absolute bottom-0 right-0 rounded-full flex items-center justify-center bg-white border-2 border-white text-center leading-none"
        style={{ width: flagSize, height: flagSize, fontSize: flagSize * 0.7 }}
      >
        {flag}
      </span>
    </div>
  );
}

// ─── Part A: Ambassador Card ─────────────────────────────────────────────────

// Deterministic performance stats keyed by ambassador id
const perfStatsMap: Record<string, {
  studentsChatted: number;
  dealsClosed: number;
  avgResponseMin: number;
  hoursClocked: number;
  missedChats: number;
  // Sun Mon Tue Wed Thu Fri Sat bar heights (px)
  sparkline: number[];
}> = {
  "1": { studentsChatted: 118, dealsClosed: 24, avgResponseMin: 2.5, hoursClocked: 32.5, missedChats: 1, sparkline: [8, 20, 24, 16, 22, 28, 12] },
  "2": { studentsChatted: 95,  dealsClosed: 18, avgResponseMin: 3.1, hoursClocked: 27.0, missedChats: 4, sparkline: [6, 18, 20, 22, 18, 24, 10] },
  "3": { studentsChatted: 63,  dealsClosed: 11, avgResponseMin: 4.0, hoursClocked: 18.5, missedChats: 0, sparkline: [4, 14, 16, 12, 18, 20, 6]  },
  "4": { studentsChatted: 142, dealsClosed: 31, avgResponseMin: 1.8, hoursClocked: 41.0, missedChats: 2, sparkline: [10, 22, 28, 20, 26, 30, 14] },
  "5": { studentsChatted: 77,  dealsClosed: 15, avgResponseMin: 3.4, hoursClocked: 22.0, missedChats: 5, sparkline: [8, 16, 18, 14, 16, 22, 8]  },
  "6": { studentsChatted: 54,  dealsClosed: 9,  avgResponseMin: 5.2, hoursClocked: 15.5, missedChats: 0, sparkline: [4, 10, 14, 10, 12, 16, 4]  },
};

// 7-Day Sparkline chart — Sun to Sat
const SPARKLINE_DAYS = ["S", "M", "T", "W", "T", "F", "S"];
const WEEKEND_IDX = new Set([0, 6]);

function Sparkline({ heights }: { heights: number[] }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-1.5">7-Day Activity Trend</p>
      <div className="flex items-end gap-1">
        {heights.map((h, i) => (
          <div key={i} className="flex flex-col items-center gap-0.5">
            <div
              className="w-1.5 rounded-sm"
              style={{
                height: h,
                backgroundColor: WEEKEND_IDX.has(i) ? "#d1d5db" : "#1d4ed8",
              }}
            />
            <span className="text-[8px] text-gray-400">{SPARKLINE_DAYS[i]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AmbassadorCard({
  a,
  onViewProfile,
}: {
  a: Ambassador;
  onViewProfile: () => void;
}) {
  const [bioExpanded, setBioExpanded] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const firstName = a.name.split(" ")[0];
  const perf = perfStatsMap[a.id] ?? perfStatsMap["1"];

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col gap-3.5">
      {/* Avatar + name */}
      <div className="flex flex-col gap-2">
        <AvatarWithFlag initials={a.initials} colour={a.colour} flag={a.fromFlag} />
        <div>
          <div className="text-base font-bold text-gray-900 leading-tight">{a.name}</div>
          <div className="text-xs text-gray-500 mt-0.5 leading-snug">{a.programme}</div>
        </div>
        <ProgrammeBadge type={a.programmeType} />
      </div>

      {/* Chat button */}
      <button
        className="w-full h-[38px] rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold transition-colors"
      >
        Chat with {firstName}
      </button>

      {/* Bio box */}
      <div className="bg-gray-50 rounded-lg p-3 space-y-2">
        <div className="text-[11px]">
          <span className="font-semibold text-gray-600">Major(s): </span>
          <span className="text-gray-900">{a.majors}</span>
        </div>
        <div className="text-[11px]">
          <span className="font-semibold text-gray-600">I come from: </span>
          <span className="text-gray-900">{a.from} {a.fromFlag}</span>
        </div>
        <div className="text-[11px]">
          <span className="font-semibold text-gray-600">Previous Qualification: </span>
          <span className="text-gray-900">{a.qualification}</span>
        </div>
        <div className="text-[11px]">
          <span className="font-semibold text-gray-600">About me: </span>
          <span className={cn("text-gray-900", !bioExpanded && "line-clamp-2")}>{a.bio}</span>
          {!bioExpanded && (
            <button
              onClick={() => setBioExpanded(true)}
              className="text-blue-700 hover:underline ml-1 text-[11px]"
            >
              read more
            </button>
          )}
        </div>
      </div>

      {/* Performance stats toggle */}
      <button
        onClick={() => setStatsOpen((o) => !o)}
        className="flex items-center justify-center gap-1 text-xs font-medium text-blue-700 hover:underline"
      >
        {statsOpen ? "Hide Performance Stats" : "Show Performance Stats"}
        {statsOpen
          ? <ChevronUp className="w-3 h-3" />
          : <ChevronDown className="w-3 h-3" />}
      </button>

      {/* Expandable stats drawer */}
      {statsOpen && (
        <div className="border-t border-gray-200 pt-3 flex flex-col gap-3">
          {/* Metrics 2×2 grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <div>
              <p className="text-xs text-gray-500">Students Chatted</p>
              <p className="text-xs font-semibold text-gray-900">{perf.studentsChatted}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Deals Closed</p>
              <p className="text-xs font-semibold text-green-600">{perf.dealsClosed}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Avg Response</p>
              <p className="text-xs font-semibold text-gray-900">{perf.avgResponseMin} min</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Hours Clocked</p>
              <p className="text-xs font-semibold text-blue-700">{perf.hoursClocked}h</p>
            </div>
          </div>

          {/* Missed chats */}
          {perf.missedChats >= 3 ? (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-md px-2.5 py-1.5">
              <AlertTriangle className="w-3 h-3 text-red-600 shrink-0" />
              <span className="text-xs font-semibold text-red-800">
                {perf.missedChats} Missed Inquiries
              </span>
            </div>
          ) : (
            <p className="text-xs text-gray-600">Missed Chats: {perf.missedChats}</p>
          )}

          {/* Sparkline */}
          <Sparkline heights={perf.sparkline} />
        </div>
      )}

      {/* View Full Profile link */}
      <button
        onClick={onViewProfile}
        className="text-xs font-semibold text-blue-700 hover:underline text-center mt-auto"
      >
        View Full Profile
      </button>
    </div>
  );
}

// ─── Part B: Full Profile Modal ───────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
      {label}
    </div>
  );
}

function FullProfileModal({
  a,
  onClose,
}: {
  a: Ambassador;
  onClose: () => void;
}) {
  const isMobile = useMediaQuery("(max-width: 767px)");
  const firstName = a.name.split(" ")[0];
  const stats = getAmbassadorStats(a);

  return (
    <div className={cn("fixed inset-0 z-50 flex items-center justify-center p-4", isMobile && "p-0")}>
      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-label="Close modal"
      />

      {/* Modal */}
      <div
        className={cn("relative bg-white rounded-2xl border border-gray-200 shadow-xl overflow-y-auto flex flex-col", isMobile && "rounded-b-none rounded-t-2xl w-full h-[90vh] mt-auto")}
        style={isMobile ? undefined : { width: 720, maxHeight: "90vh" }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 z-10"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6 space-y-5">
          {/* ── Section 1: Header banner ────────────────────────────────── */}
          <div className="flex items-center gap-5 pb-5 border-b border-gray-100">
            <AvatarWithFlag
              initials={a.initials}
              colour={a.colour}
              flag={a.fromFlag}
              size={96}
              flagSize={32}
            />
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold text-gray-900 leading-tight">{a.name}</h2>
              <p className="text-sm text-gray-500 mt-1">
                {a.year} · {a.programmeType}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                <ProgrammeBadge type={a.programmeType} />
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs border",
                    a.online
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-gray-50 text-gray-600 border-gray-200",
                  )}
                >
                  <span
                    className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      a.online ? "bg-emerald-500" : "bg-gray-400",
                    )}
                  />
                  {a.online ? "Online now" : "Offline"}
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-2 shrink-0">
              <button className="h-9 px-4 bg-blue-700 hover:bg-blue-800 text-white text-sm rounded-md font-medium transition-colors">
                Chat with {firstName}
              </button>
              <button className="h-9 px-4 border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 text-sm rounded-md font-medium transition-colors">
                Mentor {firstName}
              </button>
            </div>
          </div>

          {/* ── Section 2: Stats row ─────────────────────────────────────── */}
          <div className={cn("grid gap-3", isMobile ? "grid-cols-1" : "grid-cols-3")}>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-center">
              <MessageSquare className="w-4 h-4 text-blue-700 mx-auto mb-1" />
              <div className="text-lg font-semibold text-gray-900">{stats.totalConsults}</div>
              <div className="text-[10px] text-gray-500">Total Consults</div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-center">
              <Clock className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
              <div className="text-lg font-semibold text-gray-900">{stats.avgResponse}</div>
              <div className="text-[10px] text-gray-500">Avg Response</div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-center">
              <Star className="w-4 h-4 text-amber-500 mx-auto mb-1" />
              <div className="text-lg font-semibold text-gray-900">{stats.rating}</div>
              <div className="text-[10px] text-gray-500">Rating</div>
            </div>
          </div>

          {/* ── Section 3: In Short ──────────────────────────────────────── */}
          <div>
            <SectionHeader label="In Short" />
            <div className={cn("grid gap-y-2", isMobile ? "grid-cols-1" : "grid-cols-2 gap-x-8")}>
              <div className="text-sm">
                <span className="text-gray-500">I come from: </span>
                <span className="text-gray-900">
                  {a.from} {a.fromFlag}
                </span>
              </div>
              <div className="text-sm">
                <span className="text-gray-500">I speak: </span>
                <span className="text-gray-900">{a.languages}</span>
              </div>
              <div className={cn("text-sm", !isMobile && "col-span-2")}>
                <span className="text-gray-500">I am currently in: </span>
                <span className="text-gray-900">
                  {a.year} ({a.programme.replace("Bachelor of", "").trim().split(" in")[1] ?? "Honours"})
                </span>
              </div>
            </div>
          </div>

          {/* ── Section 4: Area of Study ─────────────────────────────────── */}
          <div className="border-t border-gray-100 pt-5">
            <SectionHeader label="Area of Study" />
            <p className="text-sm text-gray-900">{a.programme}</p>
          </div>

          {/* ── Section 5: Academic Life ──────────────────────────────────── */}
          <div className="border-t border-gray-100 pt-5">
            <SectionHeader label="Academic Life" />
            <div className={cn("grid gap-y-4", isMobile ? "grid-cols-1" : "grid-cols-2 gap-x-8")}>
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1.5">Favourite courses:</p>
                <ul className="space-y-1">
                  {a.favouriteCourses.map((c) => (
                    <li key={c} className="text-xs text-gray-700 leading-relaxed">
                      — {c}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1.5">Previous Qualification:</p>
                <p className="text-xs text-gray-700 leading-relaxed">{a.qualification}</p>
              </div>
            </div>
          </div>

          {/* ── Section 6: Social Life ────────────────────────────────────── */}
          <div className="border-t border-gray-100 pt-5">
            <SectionHeader label="Social Life" />
            <div className="flex flex-wrap gap-2 mb-3">
              {a.hobbies.map((h) => (
                <span
                  key={h}
                  className="inline-flex items-center px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 text-xs"
                >
                  {h}
                </span>
              ))}
            </div>
            <p className="text-xs text-gray-700">
              <span className="font-semibold">Clubs & Societies: </span>
              {a.clubs}
            </p>
          </div>

          {/* ── Section 7: About Me ───────────────────────────────────────── */}
          <div className="border-t border-gray-100 pt-5">
            <SectionHeader label="About Me" />
            <p className="text-sm text-gray-700 leading-relaxed">{a.bioFull}</p>
          </div>

          {/* ── Section 8: Weekly Availability ───────────────────────────── */}
          <div className="border-t border-gray-100 pt-5">
            <SectionHeader label="Weekly Availability" />
            <div className="rounded-lg border border-gray-200 divide-y divide-gray-100">
              {stats.availability.map((slot) => {
                const unavailable = slot.slot === "Unavailable";
                return (
                  <div
                    key={slot.day}
                    className="flex items-center justify-between px-3 py-2"
                  >
                    <span className="text-sm text-gray-700 w-10">{slot.day}</span>
                    <span
                      className={cn(
                        "text-xs",
                        unavailable ? "text-gray-400" : "text-gray-900",
                      )}
                    >
                      {slot.slot}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Request Card (sidebar) ───────────────────────────────────────────────────

function RequestCard({ r }: { r: Request }) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-md p-3 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-gray-900 font-medium truncate">{r.student}</span>
        <span className="text-xs text-gray-400 shrink-0">{r.requested}</span>
      </div>
      <div className="space-y-1">
        <div className="text-xs text-gray-600">{r.topic}</div>
        <div className="text-xs text-gray-700 inline-flex items-center gap-1">
          <Calendar className="w-3 h-3 text-gray-400" />
          {r.time}
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 border-gray-200 text-red-600 hover:bg-red-50 hover:text-red-700"
        >
          Decline
        </Button>
        <Button size="sm" className="flex-1 bg-blue-700 hover:bg-blue-800 text-white">
          Approve & Schedule
        </Button>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

import { useMediaQuery } from "@/hooks/use-media-query";

export default function PeersPage() {
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [profileOpen, setProfileOpen] = useState<Ambassador | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 450);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="flex-1 flex bg-white min-w-0 h-full overflow-hidden">
      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <div className={cn("border-b border-gray-200", isMobile ? "px-4 py-4" : "px-8 pt-8 pb-6")}>
          <h1 className={cn("text-gray-900 font-semibold", isMobile ? "text-xl" : "text-2xl")}>Verified Ambassadors</h1>
          <p className="text-sm text-gray-500 mt-1">
            Browse peer profiles and connect with the right ambassador.
          </p>
        </div>

        {/* Toolbar */}
        <div className={cn("border-b border-gray-200 flex items-center gap-3", isMobile ? "px-4 py-3 flex-wrap" : "px-8 py-4")}>
          <div className={cn("relative", isMobile ? "w-full" : "w-80")}>
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search name, major, or language..."
              className="pl-9 bg-gray-50 border-gray-200"
            />
          </div>
          <Select defaultValue="all">
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Course: All</SelectItem>
              <SelectItem value="cs">Computer Science</SelectItem>
              <SelectItem value="bba">Business Administration</SelectItem>
              <SelectItem value="eng">Engineering</SelectItem>
            </SelectContent>
          </Select>
          <Select defaultValue="active">
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Status: Active</SelectItem>
              <SelectItem value="inactive">Status: Inactive</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
          <div className={cn(isMobile ? "w-full flex justify-between mt-2" : "ml-auto")}>
            <Button className="bg-blue-700 hover:bg-blue-800 text-white w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-1" />
              Add Ambassador
            </Button>
          </div>
        </div>

        {/* Grid */}
        <div className={cn(isMobile ? "p-4" : "p-8")}>
          {loading ? (
            <div className={cn("grid gap-5", isMobile ? "grid-cols-1" : "grid-cols-3")}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col gap-3.5"
                >
                  <div className="flex flex-col gap-2">
                    <Skeleton className="w-16 h-16 rounded-full" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                    <Skeleton className="h-5 w-24 rounded-full" />
                  </div>
                  <Skeleton className="h-[38px] w-full rounded-lg" />
                  <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-4/5" />
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                  <Skeleton className="h-3 w-28 mx-auto" />
                </div>
              ))}
            </div>
          ) : ambassadors.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-20 text-gray-400">
              <Users className="w-10 h-10 mb-3" />
              <p className="text-sm text-gray-500">No ambassadors found</p>
              <p className="text-xs mt-1">Try adjusting your search or filters.</p>
            </div>
          ) : (
            <div className={cn("grid gap-5", isMobile ? "grid-cols-1" : "grid-cols-3")}>
              {ambassadors.map((a) => (
                <AmbassadorCard
                  key={a.id}
                  a={a}
                  onViewProfile={() => setProfileOpen(a)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sidebar - hidden on mobile */}
      {!isMobile && (
        <aside className="w-96 shrink-0 border-l border-gray-200 bg-white flex flex-col">
          <div className="px-5 py-5 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-700" />
              <h2 className="text-sm text-gray-900 font-medium">Pending Appointments</h2>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Review and manage incoming chat requests.
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {requests.map((r) => (
              <RequestCard key={r.student} r={r} />
            ))}
          </div>
        </aside>
      )}

      {/* Full Profile Modal */}
      {profileOpen && (
        <FullProfileModal a={profileOpen} onClose={() => setProfileOpen(null)} />
      )}
    </div>
  );
}
