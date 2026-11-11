"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import {
  ChatCircleText,
  ShoppingBag,
  Storefront,
  Cpu,
  Tag,
  ShieldWarning,
  Handshake,
  SquaresFour,
  Plus,
  ThumbsUp,
  ShareFat,
  CaretDown,
  CaretRight,
  DotsThreeVertical,
  Trophy,
  X,
  CheckCircle,
  PaperPlaneTilt,
  Briefcase,
  ShieldCheck,
  MapPin,
  Wrench,
  Buildings,
  TextB,
  TextItalic,
  ListBullets,
  ListNumbers,
  Quotes,
  TextH,
  EnvelopeSimple,
  Lightning,
  Gear,
  CalendarBlank,
  Star,
  FileText,
  Info,
  Trash,
} from "@phosphor-icons/react";
import { useUserStore } from "@/store/userStore";
import { useBuyerStore } from "@/store/buyerStore";

interface CommunityPostItem {
  id: string;
  authorName: string;
  authorAvatar: string;
  verified?: boolean;
  timeAgo: string;
  room: string;
  title: string;
  body: string;
  image?: string;
  likes: number;
  commentsCount: number;
  sharesCount: number;
  lastCommentSnippet?: string;
  liked?: boolean;
  category: "questions" | "tips" | "announcements" | "general";
  isBounty?: boolean;
  bountyReward?: string;
  bountyLocation?: string;
  isGig?: boolean;
  gigType?: "gig" | "job" | "service";
  gigCategory?: string;
  gigReward?: string;
  gigLocation?: string;
  gigWorkMode?: "remote" | "on-site" | "hybrid";
  aiScreened?: boolean;
  comments?: Array<{
    id: string;
    authorName: string;
    authorAvatar?: string;
    text: string;
    timeAgo: string;
  }>;
}

const INITIAL_ROOMS = [
  {
    id: "general",
    title: "General Discussion",
    subtitle: "Talk about anything Velte.",
    members: "2.8K",
    icon: ChatCircleText,
    color: "text-orange-500 bg-orange-50 dark:bg-orange-950/30",
  },
  {
    id: "buyers",
    title: "Buyers Support",
    subtitle: "Get help with your orders.",
    members: "1.2K",
    icon: ShoppingBag,
    color: "text-blue-500 bg-blue-50 dark:bg-blue-950/30",
  },
  {
    id: "vendors",
    title: "Vendors Forum",
    subtitle: "Grow your business here.",
    members: "1.5K",
    icon: Storefront,
    color: "text-purple-500 bg-purple-50 dark:bg-purple-950/30",
  },
  {
    id: "tech",
    title: "Tech & Innovation",
    subtitle: "AI, tech and more.",
    members: "842",
    icon: Cpu,
    color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30",
  },
  {
    id: "deals",
    title: "Deals & Offers",
    subtitle: "Hot deals and discounts.",
    members: "1.1K",
    icon: Tag,
    color: "text-rose-500 bg-rose-50 dark:bg-rose-950/30",
  },
  {
    id: "feedback",
    title: "Complaints & Feedback",
    subtitle: "Share your concerns.",
    members: "623",
    icon: ShieldWarning,
    color: "text-slate-600 bg-slate-100 dark:bg-slate-800",
  },
  {
    id: "business",
    title: "Business Opportunities",
    subtitle: "Find partners and gigs.",
    members: "701",
    icon: Handshake,
    color: "text-amber-500 bg-amber-50 dark:bg-amber-950/30",
  },
];

const INITIAL_POSTS: CommunityPostItem[] = [
  {
    id: "post-1",
    authorName: "Chioma Bella",
    authorAvatar: "/community/avatar-chioma.png",
    verified: true,
    timeAgo: "2h ago",
    room: "General Discussion",
    title: "Best Solar Inverter for Home Use?",
    body: "I'm looking for a reliable solar inverter with good backup. Any recommendations from the Velte community?",
    image: "/community/solar-house.png",
    likes: 24,
    commentsCount: 36,
    sharesCount: 5,
    lastCommentSnippet: "36 comments • Last comment 18m ago by EmekaDev",
    category: "questions",
    liked: false,
    comments: [
      {
        id: "c1",
        authorName: "EmekaDev",
        text: "I recommend Felicity 5kVA or Must hybrid. Make sure you use 48V lithium batteries for maximum longevity.",
        timeAgo: "18m ago",
      },
      {
        id: "c2",
        authorName: "Tunde Martins",
        text: "We sell verified Growatt and Felicity units on Velte with 2-year warranty and free delivery in Lagos.",
        timeAgo: "45m ago",
      },
    ],
  },
  {
    id: "post-2",
    authorName: "Tunde Martins",
    authorAvatar: "/community/avatar-tunde.png",
    verified: false,
    timeAgo: "3h ago",
    room: "Vendors Forum",
    title: "How to Get More Customers on Velte?",
    body: "As a vendor, what are the best strategies to attract more customers through the platform?",
    image: "/community/storefront.png",
    likes: 18,
    commentsCount: 27,
    sharesCount: 3,
    lastCommentSnippet: "27 comments • Last comment 1h ago by Adaeze",
    category: "questions",
    liked: false,
    comments: [
      {
        id: "c3",
        authorName: "Adaeze",
        text: "Keep your product images clear, price competitively, and respond quickly on WhatsApp when leads arrive!",
        timeAgo: "1h ago",
      },
    ],
  },
  {
    id: "post-3",
    authorName: "Adaeze Okafor",
    authorAvatar: "/community/avatar-adaeze.png",
    verified: true,
    timeAgo: "5h ago",
    room: "Deals & Offers",
    title: "Special Offer: 20% Off on Cakes This Weekend!",
    body: "Get 20% discount on all cakes and pastries from our featured vendors. Don't miss out!",
    image: "/community/cake.png",
    likes: 31,
    commentsCount: 14,
    sharesCount: 8,
    lastCommentSnippet: "14 comments • Last comment 2h ago by SarahJ",
    category: "announcements",
    liked: false,
    comments: [
      {
        id: "c4",
        authorName: "SarahJ",
        text: "Just ordered a strawberry velvet cake for my sister's birthday! Delivery was super quick.",
        timeAgo: "2h ago",
      },
    ],
  },
  {
    id: "post-gig-1",
    authorName: "Alaba Mega Direct",
    authorAvatar: "/community/avatar-tunde.png",
    verified: true,
    timeAgo: "2h ago",
    room: "Business Opportunities",
    title: "Urgent: Dispatch Rider Needed for Daily Store Deliveries",
    body: "We are an active phone accessories wholesaler in Computer Village looking for a reliable, licensed dispatch rider with their own bike. Consistent daily packages across Ikeja, Maryland, and Victoria Island.",
    image: "/community/storefront.png",
    likes: 34,
    commentsCount: 12,
    sharesCount: 7,
    lastCommentSnippet: "12 comments • Last comment 45m ago by Tolu Olatunji",
    category: "tips",
    liked: false,
    isGig: true,
    gigType: "job",
    gigCategory: "Logistics & Dispatch Delivery",
    gigReward: "₦140,000 / month",
    gigLocation: "Ikeja & VI, Lagos",
    gigWorkMode: "on-site",
    aiScreened: true,
    comments: [
      {
        id: "gc1",
        authorName: "Tolu Olatunji",
        text: "I have 3 years dispatch experience in Ikeja and a valid rider's card. Reached out via inquiry!",
        timeAgo: "45m ago",
      },
    ],
  },
  {
    id: "post-gig-2",
    authorName: "Konga Solar Tech",
    authorAvatar: "/community/avatar-emeka.png",
    verified: true,
    timeAgo: "4h ago",
    room: "Business Opportunities",
    title:
      "Technical Service: Certified Solar Inverter Technician for 10kVA Setup",
    body: "Looking for an experienced solar and inverter installer to configure a 10kVA Must hybrid inverter and 4x Felicity lithium battery bank for our warehouse in Trade Fair Complex. Must have verified past installation proof.",
    image: "/community/solar-house.png",
    likes: 28,
    commentsCount: 9,
    sharesCount: 4,
    lastCommentSnippet: "9 comments • Last comment 1h ago by Engr. Segun",
    category: "tips",
    liked: false,
    isGig: true,
    gigType: "service",
    gigCategory: "Solar, Electrical & Technical Maintenance",
    gigReward: "₦50,000 / installation",
    gigLocation: "Trade Fair Complex, Lagos",
    gigWorkMode: "on-site",
    aiScreened: true,
    comments: [
      {
        id: "gc2",
        authorName: "Engr. Segun",
        text: "I specialize in 48V Felicity lithium configurations. Can carry out the audit and installation this Thursday.",
        timeAgo: "1h ago",
      },
    ],
  },
  {
    id: "post-bounty-1",
    authorName: "Apex Hardware Store",
    authorAvatar: "/community/avatar-david.png",
    verified: true,
    timeAgo: "6h ago",
    room: "Business Opportunities",
    title: "Storefront Audit & KYC Photo Verification in Ikeja",
    body: "Looking for an active Premium Buyer or verified gig agent in Ikeja to perform on-ground address verification and catalog inspection for 2 new computer hardware vendors. Payout credited instantly upon verification.",
    image: "/community/storefront.png",
    likes: 19,
    commentsCount: 6,
    sharesCount: 3,
    category: "tips",
    liked: false,
    isGig: true,
    gigType: "gig",
    gigCategory: "Warehouse, Stock & Inventory Auditing",
    gigReward: "₦15,000 Fixed Pay",
    gigLocation: "Ikeja Computer Village, Lagos",
    gigWorkMode: "on-site",
    aiScreened: true,
    comments: [],
  },
];

const ACTIVE_MEMBERS = [
  {
    name: "Emeka Tech",
    avatar: "/community/avatar-emeka.png",
    status: "Online",
  },
  {
    name: "Adaeze Okafor",
    avatar: "/community/avatar-adaeze.png",
    status: "Online",
  },
  {
    name: "Tunde Martins",
    avatar: "/community/avatar-tunde.png",
    status: "Online",
  },
  {
    name: "Chioma Bella",
    avatar: "/community/avatar-chioma.png",
    status: "Online",
  },
  {
    name: "David Kingsley",
    avatar: "/community/avatar-david.png",
    status: "Online",
  },
];

function RichTextEditor({
  value,
  onChange,
  placeholder,
  minHeight = "min-h-[120px]",
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isComposingRef = useRef(false);

  useEffect(() => {
    if (editorRef.current) {
      if ((value === "" || !value) && editorRef.current.innerHTML !== "") {
        editorRef.current.innerHTML = "";
      } else if (
        value &&
        editorRef.current.innerHTML !== value &&
        !editorRef.current.matches(":focus")
      ) {
        editorRef.current.innerHTML = value;
      }
    }
  }, [value]);

  const exec = (command: string, arg?: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(command, false, arg);
    const html = editorRef.current.innerHTML;
    onChange(html === "<br>" || html === "<div><br></div>" ? "" : html);
  };

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#181512] overflow-hidden focus-within:ring-2 focus-within:ring-[#FF6B00]/40 focus-within:border-[#FF6B00] transition shadow-xs">
      {/* Interactive WYSIWYG Toolbar */}
      <div className="flex items-center gap-1 px-2.5 py-1.5 border-b border-gray-100 dark:border-white/10 bg-gray-50/80 dark:bg-white/[0.03] flex-wrap">
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            exec("bold");
          }}
          className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-ink transition flex items-center justify-center w-7 h-7 cursor-pointer"
          title="Bold"
        >
          <TextB size={15} weight="bold" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            exec("italic");
          }}
          className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-ink transition flex items-center justify-center w-7 h-7 cursor-pointer"
          title="Italic"
        >
          <TextItalic size={15} />
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            exec("underline");
          }}
          className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-ink transition flex items-center justify-center w-7 h-7 cursor-pointer font-bold underline text-xs"
          title="Underline"
        >
          U
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            exec("strikeThrough");
          }}
          className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-ink transition flex items-center justify-center w-7 h-7 cursor-pointer font-bold line-through text-xs"
          title="Strikethrough"
        >
          S
        </button>
        <div className="w-[1px] h-4 bg-gray-200 dark:bg-white/10 mx-1" />
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            exec("formatBlock", "<h3>");
          }}
          className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-ink transition flex items-center justify-center h-7 px-1.5 cursor-pointer font-bold text-xs"
          title="Heading"
        >
          <TextH size={15} weight="bold" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            exec("insertUnorderedList");
          }}
          className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-ink transition flex items-center justify-center w-7 h-7 cursor-pointer"
          title="Bulleted List"
        >
          <ListBullets size={15} />
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            exec("insertOrderedList");
          }}
          className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-ink transition flex items-center justify-center w-7 h-7 cursor-pointer"
          title="Numbered List"
        >
          <ListNumbers size={15} />
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            exec("formatBlock", "<blockquote>");
          }}
          className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-ink transition flex items-center justify-center w-7 h-7 cursor-pointer"
          title="Quote Block"
        >
          <Quotes size={15} />
        </button>
        <div className="w-[1px] h-4 bg-gray-200 dark:bg-white/10 mx-1" />
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            exec("undo");
          }}
          className="px-2 py-1 rounded-md text-[11px] font-semibold text-gray-600 dark:text-ink/70 hover:bg-gray-200 dark:hover:bg-white/10 transition cursor-pointer"
          title="Undo"
        >
          Undo
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            exec("removeFormat");
          }}
          className="ml-auto text-[11px] font-medium text-gray-500 hover:text-gray-800 dark:text-ink/60 dark:hover:text-ink px-2 py-1 rounded-md hover:bg-gray-200 dark:hover:bg-white/10 cursor-pointer"
          title="Clear Formatting"
        >
          Clear
        </button>
      </div>

      {/* Visual ContentEditable Area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => {
          if (!isComposingRef.current) {
            const html = e.currentTarget.innerHTML;
            onChange(html === "<br>" || html === "<div><br></div>" ? "" : html);
          }
        }}
        onCompositionStart={() => {
          isComposingRef.current = true;
        }}
        onCompositionEnd={(e) => {
          isComposingRef.current = false;
          const html = e.currentTarget.innerHTML;
          onChange(html === "<br>" || html === "<div><br></div>" ? "" : html);
        }}
        data-placeholder={placeholder}
        className={`w-full p-3.5 text-xs sm:text-sm text-gray-900 dark:text-ink focus:outline-none ${minHeight} overflow-y-auto leading-relaxed empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 empty:before:pointer-events-none prose prose-sm dark:prose-invert max-w-none`}
      />
    </div>
  );
}

export function HubCommunityPage({ userId: _userId }: { userId?: string }) {
  const user = useUserStore((s) => s.user);
  const buyer = useBuyerStore((s) => s.buyer);
  const isVendor = Boolean(user || buyer?.linkedVendorId);

  const [selectedRoom, setSelectedRoom] = useState<string>("all");
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [activeTopicTag, setActiveTopicTag] = useState<string | null>(null);

  const [posts, setPosts] = useState<CommunityPostItem[]>(INITIAL_POSTS);
  const [rooms, setRooms] = useState(INITIAL_ROOMS);

  // Modals & Drawers
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [isCreateRoomOpen, setIsCreateRoomOpen] = useState(false);
  const [activeCommentsPostId, setActiveCommentsPostId] = useState<
    string | null
  >(null);
  const [newCommentText, setNewCommentText] = useState("");

  // New post fields
  const [newPostTitle, setNewPostTitle] = useState("");
  const [newPostBody, setNewPostBody] = useState("");
  const [newPostRoom, setNewPostRoom] = useState("General Discussion");
  const [newPostCategory, setNewPostCategory] = useState<
    "questions" | "tips" | "announcements" | "general"
  >("general");

  // New room fields
  const [newRoomTitle, setNewRoomTitle] = useState("");
  const [newRoomSubtitle, setNewRoomSubtitle] = useState("");

  // Flexible Business Job, Gig & Service Posting Modal Fields
  const [isGigModalOpen, setIsGigModalOpen] = useState(false);
  const [gigType, setGigType] = useState<"job" | "gig" | "service">("job");
  const [isAiScreening, setIsAiScreening] = useState(false);

  // 1. Employment (Jobs) Fields (No prefilled data)
  const [jobTitle, setJobTitle] = useState("");
  const [jobEmploymentType, setJobEmploymentType] = useState("");
  const [jobSalaryRange, setJobSalaryRange] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [jobLocation, setJobLocation] = useState("");
  const [jobDeadline, setJobDeadline] = useState("");
  const [jobSkills, setJobSkills] = useState("");
  const [jobExperienceLevel, setJobExperienceLevel] = useState("");
  const [jobCvEmail, setJobCvEmail] = useState("");
  const [jobAdditionalInfo, setJobAdditionalInfo] = useState("");

  // 2. Task / Gigs Fields (No prefilled data & no pre tags)
  const [gigTitle, setGigTitle] = useState("");
  const [gigDescription, setGigDescription] = useState("");
  const [gigPaymentMethod, setGigPaymentMethod] = useState<
    "instant" | "milestone"
  >("instant");
  const [gigBudget, setGigBudget] = useState("");
  const [gigMilestonesList, setGigMilestonesList] = useState<
    Array<{ id: string; title: string; amount: string }>
  >([{ id: "1", title: "", amount: "" }]);
  const [gigDeadline, setGigDeadline] = useState("");
  const [gigTaskType, setGigTaskType] = useState<
    "Remote" | "On-site" | "Hybrid" | ""
  >("");
  const [gigWorkLocation, setGigWorkLocation] = useState("");
  const [gigSkillsList, setGigSkillsList] = useState<string[]>([]);
  const [newSkillInput, setNewSkillInput] = useState("");
  const [isAddingSkill, setIsAddingSkill] = useState(false);

  // 3. Services Fields (No prefilled data, On-site only)
  const [serviceTitle, setServiceTitle] = useState("");
  const [serviceDescription, setServiceDescription] = useState("");
  const [servicePricingType, setServicePricingType] = useState<
    "fixed" | "inspection"
  >("fixed");
  const [serviceAmount, setServiceAmount] = useState("");
  const [serviceLocation, setServiceLocation] = useState("");
  const [serviceTurnaround, setServiceTurnaround] = useState("");
  const [serviceNotes, setServiceNotes] = useState("");

  // Milestone helper actions
  const totalMilestonesSum = useMemo(() => {
    return gigMilestonesList.reduce((acc, curr) => {
      const num = Number(curr.amount.replace(/\D/g, "")) || 0;
      return acc + num;
    }, 0);
  }, [gigMilestonesList]);

  const handleAddMilestone = () => {
    const nextNum = gigMilestonesList.length + 1;
    setGigMilestonesList((prev) => [
      ...prev,
      { id: String(Date.now()), title: "", amount: "" },
    ]);
  };

  const handleUpdateMilestone = (
    id: string,
    field: "title" | "amount",
    val: string,
  ) => {
    setGigMilestonesList((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: val } : m)),
    );
  };

  const handleRemoveMilestone = (id: string) => {
    if (gigMilestonesList.length > 1) {
      setGigMilestonesList((prev) => prev.filter((m) => m.id !== id));
    }
  };

  const handleAddSkill = () => {
    if (newSkillInput.trim() && !gigSkillsList.includes(newSkillInput.trim())) {
      setGigSkillsList((prev) => [...prev, newSkillInput.trim()]);
      setNewSkillInput("");
      setIsAddingSkill(false);
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setGigSkillsList((prev) => prev.filter((s) => s !== skillToRemove));
  };

  const handleCreateGig = (e: React.FormEvent) => {
    e.preventDefault();

    if (gigType === "job") {
      if (!jobTitle.trim() || !jobDescription.trim()) {
        toast.error("Please provide a job title and detailed description.");
        return;
      }
      if (!jobEmploymentType) {
        toast.error("Please select an employment type.");
        return;
      }
      if (!jobLocation.trim()) {
        toast.error(
          "Please provide the physical or remote location for this job.",
        );
        return;
      }
      if (!jobCvEmail.trim()) {
        toast.error(
          "Please provide an email address where candidates can submit their CV.",
        );
        return;
      }
    } else if (gigType === "gig") {
      if (!gigTitle.trim() || !gigDescription.trim()) {
        toast.error("Please provide a task title and detailed description.");
        return;
      }
      if (gigPaymentMethod === "instant" && !gigBudget.trim()) {
        toast.error("Please provide a budget amount for this task.");
        return;
      }
      if (gigPaymentMethod === "milestone") {
        const invalid = gigMilestonesList.some(
          (m) => !m.title.trim() || !m.amount.trim(),
        );
        if (invalid) {
          toast.error("Please provide a title and amount for each milestone.");
          return;
        }
      }
    } else if (gigType === "service") {
      if (!serviceTitle.trim() || !serviceDescription.trim()) {
        toast.error("Please provide a service title and description.");
        return;
      }
      if (!serviceLocation.trim()) {
        toast.error(
          "Please specify the on-site location / area for this service.",
        );
        return;
      }
    }

    setIsAiScreening(true);

    setTimeout(() => {
      setIsAiScreening(false);

      let formattedReward = "Negotiable";
      let modelSummary = "";
      let finalTitle = "";
      let finalBody = "";
      let finalLocation = "Nigeria";
      let finalWorkMode: "remote" | "on-site" | "hybrid" = "on-site";

      if (gigType === "job") {
        finalTitle = jobTitle.trim();
        formattedReward = jobSalaryRange.trim()
          ? jobSalaryRange.startsWith("₦")
            ? jobSalaryRange
            : `₦${jobSalaryRange}`
          : "Competitive Salary";
        finalLocation = jobLocation.trim();
        finalWorkMode = jobLocation.toLowerCase().includes("remote")
          ? "remote"
          : "on-site";
        modelSummary = `[${jobEmploymentType || "Full-time"} • Salary: ${formattedReward}${jobDeadline ? ` • Apply before: ${jobDeadline}` : ""}${jobExperienceLevel ? ` • Exp: ${jobExperienceLevel}` : ""}${jobSkills ? ` • Skills: ${jobSkills}` : ""} • Send CV to: ${jobCvEmail}]`;
        finalBody = `${modelSummary}\n\n${jobDescription.trim()}${jobAdditionalInfo ? `\n\nAdditional Information:\n${jobAdditionalInfo.trim()}` : ""}`;
      } else if (gigType === "gig") {
        finalTitle = gigTitle.trim();
        finalLocation =
          gigTaskType === "Remote"
            ? "Remote (Any Location)"
            : gigWorkLocation.trim();
        finalWorkMode = (
          gigTaskType ? gigTaskType.toLowerCase() : "on-site"
        ) as "remote" | "on-site" | "hybrid";
        if (gigPaymentMethod === "instant") {
          const num = Number(
            gigBudget.replace(/\D/g, "") || 50000,
          ).toLocaleString();
          formattedReward = `₦${num} Payout`;
        } else {
          formattedReward = `₦${totalMilestonesSum.toLocaleString()} (Milestone Pay)`;
        }
        const milestoneText =
          gigPaymentMethod === "milestone"
            ? ` • Milestones: ${gigMilestonesList.map((m) => `${m.title} (₦${Number(m.amount.replace(/\D/g, "")).toLocaleString()})`).join(", ")}`
            : "";
        modelSummary = `[${gigTaskType || "Task"} • ${formattedReward}${gigDeadline ? ` • Deadline: ${gigDeadline}` : ""}${milestoneText}${gigSkillsList.length ? ` • Skills: ${gigSkillsList.join(", ")}` : ""}]`;
        finalBody = `${modelSummary}\n\n${gigDescription.trim()}`;
      } else if (gigType === "service") {
        finalTitle = serviceTitle.trim();
        finalLocation = serviceLocation.trim();
        finalWorkMode = "on-site";
        formattedReward =
          servicePricingType === "fixed"
            ? `₦${Number(serviceAmount.replace(/\D/g, "") || 35000).toLocaleString()} Service Fee`
            : "Quote On Inspection";
        modelSummary = `[On-Site Professional Service • ${formattedReward}${serviceTurnaround ? ` • Availability: ${serviceTurnaround}` : ""}]`;
        finalBody = `${modelSummary}\n\n${serviceDescription.trim()}${serviceNotes ? `\n\nNotes & Requirements:\n${serviceNotes.trim()}` : ""}`;
      }

      const created: CommunityPostItem = {
        id: `gig-${Date.now()}`,
        authorName: user?.name || "Verified Storefront",
        authorAvatar: "/community/avatar-tunde.png",
        verified: true,
        timeAgo: "Just now",
        room: "Business Opportunities",
        title: finalTitle,
        body: finalBody,
        likes: 0,
        commentsCount: 0,
        sharesCount: 0,
        category: "tips",
        liked: false,
        isGig: true,
        gigType,
        gigReward: formattedReward,
        gigLocation: finalLocation,
        gigWorkMode: finalWorkMode,
        aiScreened: true,
        comments: [],
      };

      setPosts((prev) => [created, ...prev]);
      setIsGigModalOpen(false);
      setJobTitle("");
      setJobEmploymentType("");
      setJobSalaryRange("");
      setJobDescription("");
      setJobLocation("");
      setJobDeadline("");
      setJobSkills("");
      setJobExperienceLevel("");
      setJobCvEmail("");
      setJobAdditionalInfo("");

      setGigTitle("");
      setGigDescription("");
      setGigBudget("");
      setGigMilestonesList([{ id: "1", title: "", amount: "" }]);
      setGigDeadline("");
      setGigTaskType("");
      setGigWorkLocation("");
      setGigSkillsList([]);
      setNewSkillInput("");
      setIsAddingSkill(false);

      setServiceTitle("");
      setServiceDescription("");
      setServiceAmount("");
      setServiceLocation("");
      setServiceTurnaround("");
      setServiceNotes("");

      setSelectedRoom("business");
      toast.success("Opportunity published successfully to the Community Hub!");
    }, 500);
  };

  // Toggle Likes
  const handleLike = (postId: string) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const liked = !p.liked;
        return {
          ...p,
          liked,
          likes: liked ? p.likes + 1 : Math.max(0, p.likes - 1),
        };
      }),
    );
  };

  // Add Comment
  const handleAddComment = (postId: string) => {
    if (!newCommentText.trim()) return;
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const newC = {
          id: `c-${Date.now()}`,
          authorName: "You",
          text: newCommentText.trim(),
          timeAgo: "Just now",
        };
        const updated = [...(p.comments || []), newC];
        return {
          ...p,
          commentsCount: updated.length,
          lastCommentSnippet: `${updated.length} comments • Last comment just now by You`,
          comments: updated,
        };
      }),
    );
    setNewCommentText("");
    toast.success("Comment added!");
  };

  // Create Post
  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostTitle.trim() || !newPostBody.trim()) {
      toast.error("Please provide both a title and details.");
      return;
    }

    const created: CommunityPostItem = {
      id: `post-${Date.now()}`,
      authorName: "You",
      authorAvatar: "/community/avatar-chioma.png",
      verified: true,
      timeAgo: "Just now",
      room: newPostRoom,
      title: newPostTitle.trim(),
      body: newPostBody.trim(),
      likes: 0,
      commentsCount: 0,
      sharesCount: 0,
      category: newPostCategory,
      liked: false,
      comments: [],
    };

    setPosts([created, ...posts]);
    setNewPostTitle("");
    setNewPostBody("");
    setIsComposerOpen(false);
    toast.success("Discussion posted to community!");
  };

  // Create Room
  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomTitle.trim()) {
      toast.error("Room title is required.");
      return;
    }

    const newR = {
      id: `room-${Date.now()}`,
      title: newRoomTitle.trim(),
      subtitle: newRoomSubtitle.trim() || "Community room.",
      members: "1",
      icon: ChatCircleText,
      color: "text-orange-500 bg-orange-50 dark:bg-orange-950/30",
    };

    setRooms([...rooms, newR]);
    setNewRoomTitle("");
    setNewRoomSubtitle("");
    setIsCreateRoomOpen(false);
    toast.success(`Room "${newR.title}" created!`);
  };

  // Filtered Posts
  const filteredPosts = useMemo(() => {
    return posts.filter((p) => {
      // Room match
      if (selectedRoom !== "all") {
        const rObj = rooms.find((r) => r.id === selectedRoom);
        if (rObj && p.room.toLowerCase() !== rObj.title.toLowerCase()) {
          return false;
        }
      }
      // Category pill match
      if (selectedFilter !== "all" && p.category !== selectedFilter) {
        return false;
      }
      // Topic tag match
      if (activeTopicTag) {
        const tag = activeTopicTag.toLowerCase();
        const matches =
          p.title.toLowerCase().includes(tag) ||
          p.body.toLowerCase().includes(tag) ||
          p.room.toLowerCase().includes(tag);
        if (!matches) return false;
      }
      return true;
    });
  }, [posts, selectedRoom, selectedFilter, activeTopicTag, rooms]);

  const activeCommentsPost = posts.find((p) => p.id === activeCommentsPostId);

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-canvas text-gray-900 dark:text-ink pb-8 sm:pb-12 pt-0">
      {/* ═══════════════════════════════════════════════════════════════════
          CINEMATIC HERO BANNER — Full Width, Ultra-Modern Visual Hierarchy
      ═════════════════════════════════════════════════════════════════════ */}
      <section className="w-full relative overflow-hidden bg-gradient-to-b from-[#13100E] via-[#0E0C0A] to-[#17130F] border-b border-orange-500/20 shadow-xl">
        {/* Subtle Tech Grid Texture */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(rgba(255, 107, 0, 0.25) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        {/* Ambient Warm Golden & Orange Radial Glows */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 right-1/4 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-orange-500/25 via-amber-500/10 to-transparent blur-3xl" />
          <div className="absolute -bottom-20 left-10 w-80 h-80 rounded-full bg-amber-600/15 blur-2xl" />
          <div className="absolute top-1/3 right-10 w-96 h-96 rounded-full bg-orange-600/15 blur-3xl" />
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="relative flex flex-col lg:flex-row items-center justify-between min-h-[220px] sm:min-h-[260px] lg:min-h-[280px] py-6 sm:py-8 gap-8">
            {/* Left Side: Editorial Typography & Dual Action Buttons */}
            <div className="w-full lg:max-w-xl text-center lg:text-left space-y-4">
              {/* Main Headline */}
              <div className="space-y-1">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
                  Velte{" "}
                  <span className="bg-gradient-to-r from-[#FF6B00] via-amber-400 to-[#FFA24C] bg-clip-text text-transparent">
                    Community
                  </span>
                </h1>
                <div className="text-sm sm:text-base font-bold text-stone-200 tracking-wide flex items-center justify-center lg:justify-start gap-2 flex-wrap">
                  <span>Connect</span>
                  <span className="text-orange-500">•</span>
                  <span>Discuss</span>
                  <span className="text-orange-500">•</span>
                  <span>Trade</span>
                  <span className="text-orange-500">•</span>
                  <span>Get Support</span>
                </div>
              </div>

              {/* Description */}
              <p className="text-xs sm:text-sm text-stone-300 leading-relaxed max-w-lg mx-auto lg:mx-0 font-normal">
                The unified commerce forum connecting verified Enterprise
                Vendors, Premium Buyers, gig agents, and trusted service
                providers across Nigeria.
              </p>

              {/* Action Buttons */}
              <div className="flex items-center justify-center lg:justify-start gap-3 pt-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setIsComposerOpen(true)}
                  className="inline-flex items-center gap-2.5 rounded-full bg-gradient-to-r from-[#FF6B00] to-orange-600 hover:from-orange-500 hover:to-[#FF6B00] px-6 py-3 text-xs sm:text-sm font-bold text-white shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 transition active:scale-95 cursor-pointer"
                >
                  <Plus size={16} weight="bold" />
                  <span>Join the Conversation</span>
                  <span className="text-base leading-none">→</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedRoom("all");
                    toast.info("Viewing all community rooms below");
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 hover:bg-white/10 px-5 py-3 text-xs sm:text-sm font-semibold text-white transition active:scale-95 backdrop-blur-md cursor-pointer"
                >
                  <SquaresFour
                    size={16}
                    weight="fill"
                    className="text-orange-400"
                  />
                  <span>Explore Rooms</span>
                </button>
              </div>
            </div>

            {/* Right Side: Cinematic Studio Photo Clean Unobscured */}
            <div className="relative w-full lg:w-[540px] h-[220px] sm:h-[260px] lg:h-[300px] flex items-end justify-center lg:justify-end overflow-visible">
              {/* Outer Glow Halo behind image */}
              <div className="absolute inset-0 bg-gradient-to-t from-orange-600/20 via-transparent to-transparent blur-xl pointer-events-none" />

              {/* Main Photo Container */}
              <div className="relative w-full h-full rounded-2xl lg:rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-[#171412]">
                <Image
                  src="/community/hero-people-dark.png"
                  alt="Velte community tech creators and vendors smiling around a smartphone"
                  fill
                  priority
                  className="object-cover object-center"
                  sizes="(max-width: 1024px) 100vw, 540px"
                />

                {/* Subtle Inner Gradient Overlays for Elegance */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0E0C0A] via-transparent to-transparent opacity-60 pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#0E0C0A]/40 via-transparent to-[#0E0C0A]/30 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main 3-Column Content Grid */}
      <div className="mx-auto max-w-7xl px-3 sm:px-6 pt-5 sm:pt-6 space-y-6">
        {/* ═══════════════════════════════════════════════════════════════════
            MAIN 3-COLUMN CONTENT GRID
        ═════════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
          {/* ─────────────────────────────────────────────────────────────
              LEFT COLUMN: ALL ROOMS & CATEGORIES LIST (col-span-3)
          ───────────────────────────────────────────────────────────── */}
          <aside className="lg:col-span-3 space-y-3 lg:self-stretch">
            {/* "All Rooms" Primary Active Button - scrolls naturally so when it scrolls out of viewport, rooms card sticks */}
            <button
              type="button"
              onClick={() => {
                setSelectedRoom("all");
                setActiveTopicTag(null);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm shadow-sm transition active:scale-[0.98] ${
                selectedRoom === "all"
                  ? "bg-[#FF6B00] text-white shadow-orange-500/20"
                  : "bg-white dark:bg-surface border border-gray-100 dark:border-white/10 text-gray-800 dark:text-ink hover:bg-gray-50"
              }`}
            >
              <div
                className={`p-1.5 rounded-lg ${selectedRoom === "all" ? "bg-white/20 text-white" : "text-[#FF6B00] bg-orange-50 dark:bg-orange-950/30"}`}
              >
                <SquaresFour size={18} weight="fill" />
              </div>
              <span>All Rooms</span>
            </button>

            {/* Rooms List Card - Sticky once "All Rooms" scrolls out of the viewport */}
            <div className="group lg:sticky lg:top-20 rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-surface p-2 sm:p-2.5 shadow-xs flex flex-col max-h-[calc(100vh-6.5rem)]">
              {/* Scrollable list of rooms */}
              <div className="flex-1 overflow-y-auto space-y-1 pr-1 hover-scrollbar">
                {rooms.map((room) => {
                  const IconComponent = room.icon;
                  const isSelected = selectedRoom === room.id;
                  return (
                    <button
                      key={room.id}
                      type="button"
                      onClick={() => {
                        setSelectedRoom(room.id);
                        setActiveTopicTag(null);
                      }}
                      className={`w-full flex items-start gap-3 p-2.5 rounded-xl text-left transition ${
                        isSelected
                          ? "bg-orange-50/80 dark:bg-orange-950/20 ring-1 ring-orange-500/30"
                          : "hover:bg-gray-50 dark:hover:bg-white/5"
                      }`}
                    >
                      <div
                        className={`p-2 rounded-xl shrink-0 mt-0.5 ${room.color}`}
                      >
                        <IconComponent size={18} weight="fill" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-ink truncate">
                            {room.title}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 dark:text-ink/60 truncate mt-0.5">
                          {room.subtitle}
                        </p>
                        <div className="flex items-center gap-1 text-[11px] font-semibold text-gray-400 dark:text-ink/50 mt-1">
                          <span>👥</span>
                          <span>{room.members}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* "+ Create Room" Button - Fixed at the bottom */}
              <div className="pt-2 shrink-0 border-t border-gray-100 dark:border-white/10 mt-1.5">
                <button
                  type="button"
                  onClick={() => setIsCreateRoomOpen(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-dashed border-gray-200 dark:border-white/15 text-xs font-semibold text-gray-600 dark:text-ink/80 hover:bg-gray-50 dark:hover:bg-white/5 transition cursor-pointer"
                >
                  <Plus size={14} weight="bold" />
                  <span>Create Room</span>
                </button>
              </div>
            </div>
          </aside>

          {/* ─────────────────────────────────────────────────────────────
              MIDDLE COLUMN: FILTER TABS & POSTS FEED (col-span-6)
          ───────────────────────────────────────────────────────────── */}
          <main className="lg:col-span-6 space-y-4">
            {/* Top Pill Filter Bar */}
            <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 no-scrollbar">
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFilter("all");
                    setActiveTopicTag(null);
                  }}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition shadow-xs ${
                    selectedFilter === "all" && !activeTopicTag
                      ? "bg-[#FF6B00] text-white"
                      : "bg-white dark:bg-surface border border-gray-200 dark:border-white/10 text-gray-600 dark:text-ink hover:bg-gray-50"
                  }`}
                >
                  All Posts
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFilter("questions");
                    setActiveTopicTag(null);
                  }}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium transition ${
                    selectedFilter === "questions"
                      ? "bg-[#FF6B00] text-white font-bold"
                      : "bg-white dark:bg-surface border border-gray-200 dark:border-white/10 text-gray-600 dark:text-ink hover:bg-gray-50"
                  }`}
                >
                  Questions
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFilter("tips");
                    setActiveTopicTag(null);
                  }}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium transition ${
                    selectedFilter === "tips"
                      ? "bg-[#FF6B00] text-white font-bold"
                      : "bg-white dark:bg-surface border border-gray-200 dark:border-white/10 text-gray-600 dark:text-ink hover:bg-gray-50"
                  }`}
                >
                  Tips
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFilter("announcements");
                    setActiveTopicTag(null);
                  }}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium transition ${
                    selectedFilter === "announcements"
                      ? "bg-[#FF6B00] text-white font-bold"
                      : "bg-white dark:bg-surface border border-gray-200 dark:border-white/10 text-gray-600 dark:text-ink hover:bg-gray-50"
                  }`}
                >
                  Announcements
                </button>
              </div>

              {/* Latest Dropdown indicator */}
              <div className="shrink-0 flex items-center gap-1 text-xs font-semibold text-gray-600 dark:text-ink/80 bg-white dark:bg-surface border border-gray-200 dark:border-white/10 px-3 py-1.5 rounded-full cursor-pointer hover:bg-gray-50">
                <span>Latest</span>
                <CaretDown size={12} weight="bold" />
              </div>
            </div>

            {/* Active Topic Filter Badge if user clicked a popular topic */}
            {activeTopicTag && (
              <div className="flex items-center justify-between bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-500/20 px-3.5 py-1.5 rounded-xl text-xs text-orange-800 dark:text-orange-300">
                <span>
                  Filtered by topic: <strong>{activeTopicTag}</strong>
                </span>
                <button
                  onClick={() => setActiveTopicTag(null)}
                  className="text-xs font-bold underline hover:text-orange-950"
                >
                  Clear
                </button>
              </div>
            )}

            {/* Post Feed Cards */}
            <div className="space-y-4">
              {filteredPosts.length === 0 ? (
                <div className="rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-surface p-12 text-center text-gray-400">
                  <p className="text-sm font-semibold">
                    No discussions found in this filter.
                  </p>
                  <button
                    onClick={() => {
                      setSelectedRoom("all");
                      setSelectedFilter("all");
                      setActiveTopicTag(null);
                    }}
                    className="mt-3 text-xs font-bold text-orange-600 hover:underline"
                  >
                    Reset filters
                  </button>
                </div>
              ) : (
                filteredPosts.map((post) => (
                  <article
                    key={post.id}
                    className="rounded-2xl sm:rounded-3xl border border-gray-100 dark:border-white/10 bg-white dark:bg-surface p-4 sm:p-5 shadow-xs hover:border-gray-200 dark:hover:border-white/20 transition space-y-3"
                  >
                    {/* Header: Avatar, Name, Verified Badge, Time, Room, Menu */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="relative w-8 h-8 rounded-full overflow-hidden shrink-0 border border-gray-200/60">
                          <Image
                            src={post.authorAvatar}
                            alt={post.authorName}
                            fill
                            className="object-cover"
                            sizes="32px"
                          />
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-ink">
                            {post.authorName}
                          </span>
                          {post.verified && (
                            <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-blue-500 text-white text-[9px] font-black leading-none">
                              ✓
                            </span>
                          )}
                          <span className="text-[11px] text-gray-400 dark:text-ink/40">
                            • {post.timeAgo} • {post.room}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        aria-label="More options"
                        className="text-gray-400 hover:text-gray-700 dark:hover:text-ink p-1 rounded-lg transition"
                      >
                        <DotsThreeVertical size={16} weight="bold" />
                      </button>
                    </div>

                    {/* Content Section: Text on Left, Thumbnail Image on Right */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <h2 className="text-sm sm:text-base font-bold text-gray-900 dark:text-ink leading-snug">
                          {post.title}
                        </h2>
                        {post.body &&
                        (post.body.includes("<p>") ||
                          post.body.includes("<b>") ||
                          post.body.includes("<strong>") ||
                          post.body.includes("<h3>") ||
                          post.body.includes("<ul>") ||
                          post.body.includes("<blockquote>")) ? (
                          <div
                            className="text-xs sm:text-sm text-gray-600 dark:text-ink/70 leading-relaxed prose prose-sm dark:prose-invert max-w-none"
                            dangerouslySetInnerHTML={{ __html: post.body }}
                          />
                        ) : (
                          <p className="text-xs sm:text-sm text-gray-600 dark:text-ink/70 leading-relaxed whitespace-pre-line">
                            {post.body}
                          </p>
                        )}
                      </div>

                      {post.image && (
                        <div className="relative w-24 h-20 sm:w-28 sm:h-22 rounded-xl sm:rounded-2xl overflow-hidden shrink-0 border border-gray-100 dark:border-white/10 shadow-xs">
                          <Image
                            src={post.image}
                            alt={post.title}
                            fill
                            className="object-cover"
                            sizes="(max-width: 640px) 96px, 112px"
                          />
                        </div>
                      )}
                    </div>

                    {/* Business Opportunity / Job / Gig Specific Strip */}
                    {(post.isGig || post.isBounty) && (
                      <div className="p-3 rounded-2xl bg-stone-50/90 dark:bg-white/[0.03] border border-gray-100 dark:border-white/10 space-y-2.5">
                        {/* Top Badges: Opportunity Type & AI Policy Shield */}
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {post.gigType === "job" ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/60 dark:border-blue-500/20">
                                <Briefcase size={13} weight="fill" />
                                <span>Employment / Job</span>
                              </span>
                            ) : post.gigType === "service" ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200/60 dark:border-purple-500/20">
                                <Wrench size={13} weight="fill" />
                                <span>Technical Service</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/60 dark:border-amber-500/20">
                                <Briefcase size={13} weight="fill" />
                                <span>Business Gig</span>
                              </span>
                            )}

                            {post.gigCategory && (
                              <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-white/10 px-2 py-0.5 rounded-md">
                                {post.gigCategory}
                              </span>
                            )}
                          </div>

                          {(post.aiScreened ?? true) && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                              <ShieldCheck size={13} weight="fill" />
                              <span>AI Policy Verified</span>
                            </span>
                          )}
                        </div>

                        {/* Compensation, Location, and Action CTA */}
                        <div className="flex items-center justify-between gap-3 flex-wrap pt-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center gap-1 text-xs font-black text-amber-800 dark:text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2.5 py-1 rounded-lg">
                              <span>💰</span>
                              <span>
                                {post.gigReward ||
                                  post.bountyReward ||
                                  "Negotiable"}
                              </span>
                            </span>

                            <span className="inline-flex items-center gap-1 text-xs font-medium text-stone-600 dark:text-stone-300 bg-stone-100 dark:bg-white/10 px-2.5 py-1 rounded-lg">
                              <MapPin
                                size={12}
                                weight="fill"
                                className="text-orange-500 shrink-0"
                              />
                              <span>
                                {post.gigLocation ||
                                  post.bountyLocation ||
                                  "Nigeria"}
                              </span>
                              {post.gigWorkMode && (
                                <span className="capitalize text-stone-400 dark:text-stone-500 text-[11px]">
                                  • {post.gigWorkMode}
                                </span>
                              )}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              toast.success(
                                `Application sent to ${post.authorName}! Check your messages for next steps.`,
                              )
                            }
                            className="inline-flex items-center gap-1 rounded-xl bg-[#FF6B00] hover:bg-orange-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition active:scale-95 cursor-pointer"
                          >
                            <span>Apply / Inquire</span>
                            <span>→</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Engagement Actions: Thumbs Up, Comments, Share */}
                    <div className="flex items-center gap-6 pt-1 text-xs font-semibold text-gray-500 dark:text-ink/60">
                      <button
                        type="button"
                        onClick={() => handleLike(post.id)}
                        className={`flex items-center gap-1.5 transition ${
                          post.liked
                            ? "text-[#FF6B00]"
                            : "hover:text-gray-800 dark:hover:text-ink"
                        }`}
                      >
                        <ThumbsUp
                          size={16}
                          weight={post.liked ? "fill" : "regular"}
                        />
                        <span>{post.likes}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveCommentsPostId(post.id)}
                        className="flex items-center gap-1.5 hover:text-gray-800 dark:hover:text-ink transition"
                      >
                        <ChatCircleText size={16} />
                        <span>{post.commentsCount}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          toast.success("Post link copied to clipboard!");
                        }}
                        className="flex items-center gap-1.5 hover:text-gray-800 dark:hover:text-ink transition"
                      >
                        <ShareFat size={16} />
                        <span>{post.sharesCount}</span>
                      </button>
                    </div>

                    {/* Peach / Orange Tinted Comment Bar Preview */}
                    {post.lastCommentSnippet && (
                      <button
                        type="button"
                        onClick={() => setActiveCommentsPostId(post.id)}
                        className="w-full rounded-xl bg-[#FFF6F0] dark:bg-orange-950/20 border border-orange-100/80 dark:border-orange-500/10 px-3.5 py-2 flex items-center justify-between text-xs text-stone-700 dark:text-ink/80 hover:bg-orange-100/60 transition group text-left"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <div className="p-1 rounded-md bg-[#FF6B00] text-white shrink-0">
                            <ChatCircleText size={12} weight="fill" />
                          </div>
                          <span className="truncate text-[11px] sm:text-xs">
                            {post.lastCommentSnippet}
                          </span>
                        </div>
                        <CaretRight
                          size={14}
                          className="text-gray-400 group-hover:text-gray-700 shrink-0 transition"
                        />
                      </button>
                    )}
                  </article>
                ))
              )}
            </div>

            {/* End of Posts Stream */}
          </main>

          {/* ─────────────────────────────────────────────────────────────
              RIGHT COLUMN: ACTIVE MEMBERS, POPULAR TOPICS, EARN REWARDS
          ───────────────────────────────────────────────────────────── */}
          <aside className="lg:col-span-3 space-y-5 lg:sticky lg:top-20 lg:self-start">
            {/* 1. Active Members Card */}
            <div className="rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-surface p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900 dark:text-ink">
                  Active Members
                </h3>
                <button
                  type="button"
                  onClick={() =>
                    toast.info("Displaying all verified online members.")
                  }
                  className="text-xs font-semibold text-[#FF6B00] hover:underline flex items-center gap-0.5"
                >
                  <span>See all</span>
                  <span>→</span>
                </button>
              </div>

              <div className="space-y-2.5">
                {ACTIVE_MEMBERS.map((member) => (
                  <div
                    key={member.name}
                    className="flex items-center gap-2.5 py-0.5"
                  >
                    <div className="relative w-8 h-8 rounded-full overflow-hidden shrink-0 border border-gray-200/50">
                      <Image
                        src={member.avatar}
                        alt={member.name}
                        fill
                        className="object-cover"
                        sizes="32px"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-gray-900 dark:text-ink truncate">
                        {member.name}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-ink/60">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
                        <span>{member.status}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Role-Aware Card: For Vendors -> Hire Gig Agents | For Buyers -> Earn Rewards */}
            {isVendor ? (
              <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-[#FFFDF9] via-[#FFF8EF] to-[#FEF0DB] dark:from-amber-950/20 dark:via-orange-950/20 dark:to-stone-900/40 p-4 shadow-xs">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 z-10 max-w-[175px]">
                    <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 font-extrabold text-xs sm:text-sm">
                      <Briefcase
                        size={16}
                        weight="fill"
                        className="text-amber-600 dark:text-amber-400"
                      />
                      <span>Hire Talent & Post Gigs</span>
                    </div>
                    <p className="text-[11px] text-stone-600 dark:text-ink/70 leading-snug">
                      Hire staff, dispatch riders, technicians, or outsource any
                      business service. Screened by AI.
                    </p>
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => setIsGigModalOpen(true)}
                        className="inline-flex items-center gap-1 rounded-lg bg-[#FF6B00] hover:bg-orange-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-xs transition active:scale-95 whitespace-nowrap cursor-pointer"
                      >
                        <span>Post a Job / Gig</span>
                        <span>→</span>
                      </button>
                    </div>
                  </div>

                  {/* Gig / Handshake Icon Graphic */}
                  <div className="relative w-14 h-14 shrink-0 flex items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/30 text-[#FF6B00] border border-orange-500/20 shadow-xs z-0">
                    <Handshake size={32} weight="duotone" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative overflow-hidden rounded-2xl border border-orange-200/70 bg-gradient-to-br from-[#FFF9F3] via-[#FFF3E8] to-[#FFE8D6] dark:from-orange-950/20 dark:via-amber-950/20 dark:to-orange-900/10 p-4 shadow-xs">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 z-10 max-w-[155px]">
                    <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-extrabold text-xs sm:text-sm">
                      <Trophy
                        size={16}
                        weight="fill"
                        className="text-amber-500"
                      />
                      <span>Earn Rewards!</span>
                    </div>
                    <p className="text-[11px] text-stone-600 dark:text-ink/70 leading-snug">
                      Contribute, validate vendors, and earn Velte tokens.
                    </p>
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRoom("business");
                          toast.success(
                            "Browse open vendor bounties in Business Opportunities!",
                          );
                        }}
                        className="inline-flex items-center gap-1 rounded-lg bg-[#FF6B00] hover:bg-orange-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-xs transition active:scale-95 whitespace-nowrap cursor-pointer"
                      >
                        <span>Start Earning</span>
                        <span>→</span>
                      </button>
                    </div>
                  </div>

                  {/* 3D Gift Box Illustration */}
                  <div className="relative w-16 h-16 shrink-0 z-0">
                    <Image
                      src="/community/gift-rewards.png"
                      alt="Gift rewards box"
                      fill
                      className="object-contain"
                      sizes="64px"
                    />
                  </div>
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          MODAL 1: JOIN THE CONVERSATION / NEW DISCUSSION COMPOSER
      ═════════════════════════════════════════════════════════════════════ */}
      {isComposerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-surface border border-gray-100 dark:border-white/10 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/10 pb-3">
              <h2 className="text-lg font-bold text-gray-900 dark:text-ink">
                Start a New Discussion
              </h2>
              <button
                type="button"
                onClick={() => setIsComposerOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-ink"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-ink/80 mb-1">
                  Select Room
                </label>
                <select
                  value={newPostRoom}
                  onChange={(e) => setNewPostRoom(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-transparent px-3 py-2 text-xs font-medium text-gray-900 dark:text-ink focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                >
                  {rooms.map((r) => (
                    <option key={r.id} value={r.title}>
                      {r.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-ink/80 mb-1">
                  Category
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(
                    ["general", "questions", "tips", "announcements"] as const
                  ).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setNewPostCategory(cat)}
                      className={`py-1.5 rounded-lg text-xs font-bold capitalize transition ${
                        newPostCategory === cat
                          ? "bg-[#FF6B00] text-white"
                          : "bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-ink/80"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-ink/80 mb-1">
                  Discussion Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Best Solar Inverter for Home Use?"
                  value={newPostTitle}
                  onChange={(e) => setNewPostTitle(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-transparent px-3 py-2 text-sm text-gray-900 dark:text-ink focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-ink/80 mb-1">
                  Description / Questions
                </label>
                <textarea
                  rows={3}
                  placeholder="Write your thoughts or inquiry here..."
                  value={newPostBody}
                  onChange={(e) => setNewPostBody(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-transparent px-3 py-2 text-sm text-gray-900 dark:text-ink focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsComposerOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 dark:text-ink/60 hover:bg-gray-100 dark:hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#FF6B00] hover:bg-orange-600 transition shadow-xs"
                >
                  Publish Discussion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          MODAL 2: CREATE ROOM MODAL
      ═════════════════════════════════════════════════════════════════════ */}
      {isCreateRoomOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-surface border border-gray-100 dark:border-white/10 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/10 pb-3">
              <h2 className="text-lg font-bold text-gray-900 dark:text-ink">
                Create a New Room
              </h2>
              <button
                type="button"
                onClick={() => setIsCreateRoomOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-ink"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-ink/80 mb-1">
                  Room Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Real Estate & Mortgages"
                  value={newRoomTitle}
                  onChange={(e) => setNewRoomTitle(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-transparent px-3 py-2 text-sm text-gray-900 dark:text-ink focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-ink/80 mb-1">
                  Short Tagline
                </label>
                <input
                  type="text"
                  placeholder="e.g. Property sales, rentals and verified agents."
                  value={newRoomSubtitle}
                  onChange={(e) => setNewRoomSubtitle(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-transparent px-3 py-2 text-sm text-gray-900 dark:text-ink focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateRoomOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 dark:text-ink/60 hover:bg-gray-100 dark:hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#FF6B00] hover:bg-orange-600 transition shadow-xs"
                >
                  Create Room
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          MODAL 3: COMMENTS & REPLIES DRAWER
      ═════════════════════════════════════════════════════════════════════ */}
      {activeCommentsPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg max-h-[85vh] flex flex-col rounded-3xl bg-white dark:bg-surface border border-gray-100 dark:border-white/10 p-5 sm:p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/10 pb-3">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-ink truncate max-w-sm">
                  {activeCommentsPost.title}
                </h3>
                <span className="text-xs text-gray-400">
                  {activeCommentsPost.commentsCount} comments
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveCommentsPostId(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-ink"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {activeCommentsPost.comments &&
              activeCommentsPost.comments.length > 0 ? (
                activeCommentsPost.comments.map((c) => (
                  <div
                    key={c.id}
                    className="p-3 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 space-y-1"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-gray-900 dark:text-ink">
                        {c.authorName}
                      </span>
                      <span className="text-gray-400">{c.timeAgo}</span>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-700 dark:text-ink/80 leading-relaxed">
                      {c.text}
                    </p>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-xs text-gray-400">
                  No replies yet. Be the first to join the conversation!
                </div>
              )}
            </div>

            {/* Input Form */}
            <div className="border-t border-gray-100 dark:border-white/10 pt-3 flex items-center gap-2">
              <input
                type="text"
                placeholder="Write a comment..."
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleAddComment(activeCommentsPost.id);
                  }
                }}
                className="flex-1 rounded-xl border border-gray-200 dark:border-white/10 bg-transparent px-3 py-2 text-xs sm:text-sm text-gray-900 dark:text-ink focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
              />
              <button
                type="button"
                onClick={() => handleAddComment(activeCommentsPost.id)}
                className="p-2.5 rounded-xl bg-[#FF6B00] text-white hover:bg-orange-600 transition"
              >
                <PaperPlaneTilt size={16} weight="fill" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          FLOATING ACTION BUTTON (FAB) — Fixed to screen, 0 page flow height
      ═════════════════════════════════════════════════════════════════════ */}
      <div className="fixed bottom-20 sm:bottom-8 right-5 sm:right-8 z-40">
        <button
          type="button"
          onClick={() => setIsComposerOpen(true)}
          aria-label="New discussion"
          className="h-12 w-12 rounded-full bg-[#FF6B00] hover:bg-orange-600 text-white shadow-xl shadow-orange-500/40 flex items-center justify-center transition active:scale-90 cursor-pointer"
        >
          <Plus size={24} weight="bold" />
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          MODAL 4: POST A JOB, GIG OR SERVICE (MODERN DUAL-PANE LAYOUT)
      ═════════════════════════════════════════════════════════════════════ */}
      {isGigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl max-h-[94vh] flex flex-col rounded-[26px] bg-white dark:bg-[#181512] border border-gray-100 dark:border-white/10 shadow-2xl overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 sm:px-7 sm:py-4 border-b border-gray-100 dark:border-white/10 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-orange-500/10 text-[#FF6B00] flex items-center justify-center shrink-0">
                  {gigType === "job" && <Briefcase size={22} weight="fill" />}
                  {gigType === "gig" && <Lightning size={22} weight="fill" />}
                  {gigType === "service" && <Gear size={22} weight="fill" />}
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-ink leading-tight">
                    {gigType === "job" && "Post a Job, Gig or Service"}
                    {gigType === "gig" && "Post a Task / Gig"}
                    {gigType === "service" && "Post a Service"}
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-ink/60">
                    {gigType === "job" &&
                      "Reach qualified people and grow your business on Velte"}
                    {gigType === "gig" &&
                      "Find skilled people to complete your task or project"}
                    {gigType === "service" &&
                      "Offer your professional services to buyers and businesses on Velte"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !isAiScreening && setIsGigModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-ink hover:bg-gray-100 dark:hover:bg-white/5 transition cursor-pointer"
                aria-label="Close"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            {/* Modal Body: Left Navigation Sidebar + Right Form Panel */}
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-gray-100 dark:divide-white/10">
              {/* Left Navigation Sidebar */}
              <div className="w-full md:w-[260px] shrink-0 p-4 sm:p-5 flex flex-col justify-between gap-4 overflow-y-auto bg-stone-50/50 dark:bg-white/[0.01]">
                {/* 3 Model Cards */}
                <div className="space-y-2.5">
                  {/* Tab 1: Employment */}
                  <button
                    type="button"
                    onClick={() => setGigType("job")}
                    className={`w-full p-3 sm:p-3.5 rounded-2xl border text-left transition cursor-pointer flex items-start gap-3 ${
                      gigType === "job"
                        ? "border-[#FF6B00] bg-orange-50/80 dark:bg-orange-950/25 ring-1 ring-[#FF6B00]/40 text-[#FF6B00]"
                        : "border-gray-200/80 dark:border-white/10 bg-white dark:bg-white/[0.02] text-gray-700 dark:text-ink hover:border-gray-300 dark:hover:border-white/20"
                    }`}
                  >
                    <div
                      className={`p-2 rounded-xl shrink-0 ${gigType === "job" ? "bg-[#FF6B00] text-white" : "bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-ink/70"}`}
                    >
                      <Briefcase size={18} weight="fill" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-xs sm:text-[13px] leading-tight text-gray-900 dark:text-ink">
                        Employment (Jobs)
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-ink/60 mt-0.5 leading-snug">
                        Hire talent for your business
                      </p>
                    </div>
                  </button>

                  {/* Tab 2: Task / Gigs */}
                  <button
                    type="button"
                    onClick={() => setGigType("gig")}
                    className={`w-full p-3 sm:p-3.5 rounded-2xl border text-left transition cursor-pointer flex items-start gap-3 relative ${
                      gigType === "gig"
                        ? "border-[#FF6B00] bg-orange-50/80 dark:bg-orange-950/25 ring-1 ring-[#FF6B00]/40 text-[#FF6B00]"
                        : "border-gray-200/80 dark:border-white/10 bg-white dark:bg-white/[0.02] text-gray-700 dark:text-ink hover:border-gray-300 dark:hover:border-white/20"
                    }`}
                  >
                    <div
                      className={`p-2 rounded-xl shrink-0 ${gigType === "gig" ? "bg-[#FF6B00] text-white" : "bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-ink/70"}`}
                    >
                      <Lightning size={18} weight="fill" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-xs sm:text-[13px] leading-tight text-gray-900 dark:text-ink flex items-center justify-between">
                        <span>Task / Gigs</span>
                        {gigType === "gig" && (
                          <CheckCircle
                            size={15}
                            weight="fill"
                            className="text-[#FF6B00]"
                          />
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-ink/60 mt-0.5 leading-snug">
                        Get work done on short-term tasks
                      </p>
                    </div>
                  </button>

                  {/* Tab 3: Services */}
                  <button
                    type="button"
                    onClick={() => setGigType("service")}
                    className={`w-full p-3 sm:p-3.5 rounded-2xl border text-left transition cursor-pointer flex items-start gap-3 ${
                      gigType === "service"
                        ? "border-[#FF6B00] bg-orange-50/80 dark:bg-orange-950/25 ring-1 ring-[#FF6B00]/40 text-[#FF6B00]"
                        : "border-gray-200/80 dark:border-white/10 bg-white dark:bg-white/[0.02] text-gray-700 dark:text-ink hover:border-gray-300 dark:hover:border-white/20"
                    }`}
                  >
                    <div
                      className={`p-2 rounded-xl shrink-0 ${gigType === "service" ? "bg-[#FF6B00] text-white" : "bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-ink/70"}`}
                    >
                      <Gear size={18} weight="fill" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-xs sm:text-[13px] leading-tight text-gray-900 dark:text-ink">
                        Services
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-ink/60 mt-0.5 leading-snug">
                        Offer your professional services
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Right Scrollable Form Panel */}
              <form
                onSubmit={handleCreateGig}
                className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4"
              >
                {/* ═══════════════════════════════════════════════════════
                    FORM 1: EMPLOYMENT (JOBS) - Matches Image 1
                ═════════════════════════════════════════════════════════ */}
                {gigType === "job" && (
                  <div className="space-y-4">
                    {/* Job Title */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-ink/80 mb-1.5">
                        Job Title <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Frontend Developer"
                        value={jobTitle}
                        onChange={(e) => setJobTitle(e.target.value)}
                        className="w-full h-11 rounded-xl border border-gray-200 dark:border-white/10 bg-transparent px-3.5 text-xs sm:text-sm text-gray-900 dark:text-ink focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/40 focus:border-[#FF6B00]"
                      />
                    </div>

                    {/* Employment Type & Salary Range */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-ink/80 mb-1.5">
                          Employment Type{" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Briefcase
                            size={16}
                            className="absolute left-3.5 top-3.5 text-gray-400 pointer-events-none"
                          />
                          <select
                            required
                            value={jobEmploymentType}
                            onChange={(e) =>
                              setJobEmploymentType(e.target.value)
                            }
                            className="w-full h-11 pl-10 pr-9 rounded-xl border border-gray-200 dark:border-white/10 bg-transparent text-xs sm:text-sm font-medium text-gray-900 dark:text-ink appearance-none focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/40 focus:border-[#FF6B00]"
                          >
                            <option value="">Select employment type</option>
                            <option value="Full-time">Full-time</option>
                            <option value="Part-time">Part-time</option>
                            <option value="Contract">Contract</option>
                            <option value="Internship">Internship</option>
                          </select>
                          <CaretDown
                            size={14}
                            className="absolute right-3.5 top-4 text-gray-400 pointer-events-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-ink/80 mb-1.5">
                          Salary Range (Optional)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-3 font-bold text-gray-400 text-sm pointer-events-none">
                            ₦
                          </span>
                          <input
                            type="text"
                            placeholder="e.g. ₦250k - ₦400k / month"
                            value={jobSalaryRange}
                            onChange={(e) => setJobSalaryRange(e.target.value)}
                            className="w-full h-11 pl-8 pr-3.5 rounded-xl border border-gray-200 dark:border-white/10 bg-transparent text-xs sm:text-sm text-gray-900 dark:text-ink focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/40 focus:border-[#FF6B00]"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Job Description */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-ink/80 mb-1.5">
                        Job Description <span className="text-red-500">*</span>
                      </label>
                      <RichTextEditor
                        value={jobDescription}
                        onChange={setJobDescription}
                        placeholder="Describe the role, responsibilities and what you're looking for..."
                        minHeight="min-h-[120px]"
                      />
                    </div>

                    {/* Location & Application Deadline */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-ink/80 mb-1.5">
                          Location <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <MapPin
                            size={16}
                            className="absolute left-3.5 top-3.5 text-gray-400 pointer-events-none"
                          />
                          <input
                            type="text"
                            required
                            placeholder="e.g. Lagos, Nigeria"
                            value={jobLocation}
                            onChange={(e) => setJobLocation(e.target.value)}
                            className="w-full h-11 pl-10 pr-3.5 rounded-xl border border-gray-200 dark:border-white/10 bg-transparent text-xs sm:text-sm text-gray-900 dark:text-ink focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/40 focus:border-[#FF6B00]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-ink/80 mb-1.5">
                          Application Deadline{" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <CalendarBlank
                            size={16}
                            className="absolute left-3.5 top-3.5 text-gray-400 pointer-events-none"
                          />
                          <input
                            type="date"
                            required
                            value={jobDeadline}
                            onChange={(e) => setJobDeadline(e.target.value)}
                            className="w-full h-11 pl-10 pr-3.5 rounded-xl border border-gray-200 dark:border-white/10 bg-transparent text-xs sm:text-sm text-gray-900 dark:text-ink focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/40 focus:border-[#FF6B00]"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Skills Required & Experience Level */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-ink/80 mb-1.5">
                          Skills Required (Optional)
                        </label>
                        <div className="relative">
                          <Tag
                            size={16}
                            className="absolute left-3.5 top-3.5 text-gray-400 pointer-events-none"
                          />
                          <input
                            type="text"
                            placeholder="e.g. React, Communication..."
                            value={jobSkills}
                            onChange={(e) => setJobSkills(e.target.value)}
                            className="w-full h-11 pl-10 pr-3.5 rounded-xl border border-gray-200 dark:border-white/10 bg-transparent text-xs sm:text-sm text-gray-900 dark:text-ink focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/40 focus:border-[#FF6B00]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-ink/80 mb-1.5">
                          Experience Level (Optional)
                        </label>
                        <div className="relative">
                          <Star
                            size={16}
                            className="absolute left-3.5 top-3.5 text-gray-400 pointer-events-none"
                          />
                          <select
                            value={jobExperienceLevel}
                            onChange={(e) =>
                              setJobExperienceLevel(e.target.value)
                            }
                            className="w-full h-11 pl-10 pr-9 rounded-xl border border-gray-200 dark:border-white/10 bg-transparent text-xs sm:text-sm font-medium text-gray-900 dark:text-ink appearance-none focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/40 focus:border-[#FF6B00]"
                          >
                            <option value="">Select level</option>
                            <option value="Entry level">
                              Entry level (&lt; 1 year)
                            </option>
                            <option value="Mid level">
                              Mid level (1 - 3 years)
                            </option>
                            <option value="Senior">
                              Senior (3 - 5+ years)
                            </option>
                            <option value="Executive / Lead">
                              Executive / Lead
                            </option>
                          </select>
                          <CaretDown
                            size={14}
                            className="absolute right-3.5 top-4 text-gray-400 pointer-events-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Submit CV to Email */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-ink/80 mb-1.5">
                        Submit CV to Email{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <EnvelopeSimple
                          size={16}
                          className="absolute left-3.5 top-3.5 text-gray-400 pointer-events-none"
                        />
                        <input
                          type="email"
                          required
                          placeholder="careers@yourstore.com"
                          value={jobCvEmail}
                          onChange={(e) => setJobCvEmail(e.target.value)}
                          className="w-full h-11 pl-10 pr-3.5 rounded-xl border border-gray-200 dark:border-white/10 bg-transparent text-xs sm:text-sm text-gray-900 dark:text-ink focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/40 focus:border-[#FF6B00]"
                        />
                      </div>
                    </div>

                    {/* Additional Information */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-ink/80 mb-1.5">
                        Additional Information (Optional)
                      </label>
                      <div className="relative">
                        <FileText
                          size={16}
                          className="absolute left-3.5 top-3 text-gray-400 pointer-events-none"
                        />
                        <textarea
                          rows={2}
                          placeholder="Any extra details..."
                          value={jobAdditionalInfo}
                          onChange={(e) => setJobAdditionalInfo(e.target.value)}
                          className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-transparent text-xs sm:text-sm text-gray-900 dark:text-ink focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/40 focus:border-[#FF6B00]"
                        />
                      </div>
                    </div>

                    {/* Alert Banner */}
                    <div className="rounded-xl p-3 bg-orange-50/80 dark:bg-orange-950/20 border border-orange-200/60 dark:border-orange-500/20 flex items-center gap-2.5 text-xs text-orange-900 dark:text-orange-200">
                      <ShieldCheck
                        size={18}
                        weight="fill"
                        className="text-[#FF6B00] shrink-0"
                      />
                      <span>
                        Your post will be reviewed to ensure it meets our
                        community guidelines.
                      </span>
                    </div>

                    {/* Footer Buttons */}
                    <div className="pt-2 flex items-center justify-end gap-3 shrink-0">
                      <button
                        type="button"
                        disabled={isAiScreening}
                        onClick={() => setIsGigModalOpen(false)}
                        className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-gray-600 dark:text-ink/70 hover:bg-gray-100 dark:hover:bg-white/5 transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isAiScreening}
                        className="px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#FF6B00] hover:bg-orange-600 transition shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-75"
                      >
                        <PaperPlaneTilt size={15} weight="fill" />
                        <span>
                          {isAiScreening ? "Publishing..." : "Post Opportunity"}
                        </span>
                      </button>
                    </div>
                  </div>
                )}

                {/* ═══════════════════════════════════════════════════════
                    FORM 2: TASK / GIGS - Matches Image 2 + Milestone Option
                ═════════════════════════════════════════════════════════ */}
                {gigType === "gig" && (
                  <div className="space-y-4">
                    {/* Task Title */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-ink/80 mb-1.5">
                        Task Title <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Design a modern company website"
                        value={gigTitle}
                        onChange={(e) => setGigTitle(e.target.value)}
                        className="w-full h-11 rounded-xl border border-gray-200 dark:border-white/10 bg-transparent px-3.5 text-xs sm:text-sm text-gray-900 dark:text-ink focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/40 focus:border-[#FF6B00]"
                      />
                    </div>

                    {/* Task Description */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-ink/80 mb-1.5">
                        Task Description <span className="text-red-500">*</span>
                      </label>
                      <RichTextEditor
                        value={gigDescription}
                        onChange={setGigDescription}
                        placeholder="Describe the task in detail. Include requirements, deliverables and any special instructions..."
                        minHeight="min-h-[120px]"
                      />
                      <div className="text-right text-[11px] text-gray-400 font-mono mt-1">
                        {gigDescription.replace(/<[^>]*>?/gm, "").length}/2000
                      </div>
                    </div>

                    {/* Payment Method: Instant vs Installmental */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-ink/80 mb-1.5">
                        Payment Method <span className="text-red-500">*</span>
                      </label>
                      <div className="flex items-center gap-2 p-1 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200/60 dark:border-white/10 mb-3">
                        <button
                          type="button"
                          onClick={() => setGigPaymentMethod("instant")}
                          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition text-center cursor-pointer ${
                            gigPaymentMethod === "instant"
                              ? "bg-white dark:bg-surface text-gray-900 dark:text-ink shadow-xs"
                              : "text-gray-500 dark:text-ink/60 hover:text-gray-900 dark:hover:text-ink"
                          }`}
                        >
                          Instant Payment
                        </button>
                        <button
                          type="button"
                          onClick={() => setGigPaymentMethod("milestone")}
                          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition text-center cursor-pointer ${
                            gigPaymentMethod === "milestone"
                              ? "bg-white dark:bg-surface text-gray-900 dark:text-ink shadow-xs"
                              : "text-gray-500 dark:text-ink/60 hover:text-gray-900 dark:hover:text-ink"
                          }`}
                        >
                          Installmental Payment
                        </button>
                      </div>

                      {/* Instant Payment Input */}
                      {gigPaymentMethod === "instant" && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-ink/80 mb-1.5">
                              Budget <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                              <span className="absolute left-3.5 top-3 font-bold text-gray-400 text-sm pointer-events-none">
                                ₦
                              </span>
                              <input
                                type="number"
                                required
                                placeholder="e.g. 50,000"
                                value={gigBudget}
                                onChange={(e) => setGigBudget(e.target.value)}
                                className="w-full h-11 pl-8 pr-3.5 rounded-xl border border-gray-200 dark:border-white/10 bg-transparent text-xs sm:text-sm text-gray-900 dark:text-ink focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/40 focus:border-[#FF6B00]"
                              />
                            </div>
                          </div>
                          <div className="flex flex-col justify-center text-[11px] text-gray-500 dark:text-ink/70 leading-relaxed bg-stone-50 dark:bg-white/[0.02] p-3 rounded-xl border border-gray-100 dark:border-white/10">
                            ⚡ 100% payout released directly to the gig agent
                            once task completion is verified.
                          </div>
                        </div>
                      )}

                      {/* Installmental Milestones Manager */}
                      {gigPaymentMethod === "milestone" && (
                        <div className="space-y-3 p-3.5 rounded-2xl bg-stone-50/80 dark:bg-white/[0.02] border border-orange-500/20">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-gray-900 dark:text-ink">
                              Milestone Breakdown & Payment Schedule{" "}
                              <span className="text-red-500">*</span>
                            </label>
                            <span className="text-xs font-extrabold text-[#FF6B00]">
                              Total: ₦{totalMilestonesSum.toLocaleString()}
                            </span>
                          </div>
                          <div className="space-y-2">
                            {gigMilestonesList.map((m, index) => (
                              <div
                                key={m.id}
                                className="flex items-center gap-2"
                              >
                                <input
                                  type="text"
                                  required
                                  placeholder={`Milestone ${index + 1} Deliverable description`}
                                  value={m.title}
                                  onChange={(e) =>
                                    handleUpdateMilestone(
                                      m.id,
                                      "title",
                                      e.target.value,
                                    )
                                  }
                                  className="flex-1 h-10 px-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-surface text-xs text-gray-900 dark:text-ink focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                                />
                                <div className="relative w-36 shrink-0">
                                  <span className="absolute left-2.5 top-2.5 font-bold text-gray-400 text-xs">
                                    ₦
                                  </span>
                                  <input
                                    type="number"
                                    required
                                    placeholder="Amount"
                                    value={m.amount}
                                    onChange={(e) =>
                                      handleUpdateMilestone(
                                        m.id,
                                        "amount",
                                        e.target.value,
                                      )
                                    }
                                    className="w-full h-10 pl-6 pr-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-surface text-xs text-gray-900 dark:text-ink focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                                  />
                                </div>
                                {gigMilestonesList.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveMilestone(m.id)}
                                    className="p-2 text-gray-400 hover:text-rose-500 transition cursor-pointer"
                                    title="Remove milestone"
                                  >
                                    <Trash size={16} />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                          <button
                            type="button"
                            onClick={handleAddMilestone}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#FF6B00] hover:text-orange-600 transition cursor-pointer pt-1"
                          >
                            <Plus size={14} weight="bold" />
                            <span>Add Milestone</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Deadline & Task Type */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-ink/80 mb-1.5">
                          Deadline <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <CalendarBlank
                            size={16}
                            className="absolute left-3.5 top-3.5 text-gray-400 pointer-events-none"
                          />
                          <input
                            type="date"
                            required
                            value={gigDeadline}
                            onChange={(e) => setGigDeadline(e.target.value)}
                            className="w-full h-11 pl-10 pr-3.5 rounded-xl border border-gray-200 dark:border-white/10 bg-transparent text-xs sm:text-sm text-gray-900 dark:text-ink focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/40 focus:border-[#FF6B00]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-ink/80 mb-1.5 flex items-center gap-1">
                          <span>Task Type</span>
                          <span className="text-gray-400 text-[11px]">ⓘ</span>
                        </label>
                        <div className="relative">
                          <select
                            value={gigTaskType}
                            onChange={(e) =>
                              setGigTaskType(
                                e.target.value as
                                  | "Remote"
                                  | "On-site"
                                  | "Hybrid"
                                  | "",
                              )
                            }
                            className="w-full h-11 px-3.5 pr-9 rounded-xl border border-gray-200 dark:border-white/10 bg-transparent text-xs sm:text-sm font-medium text-gray-900 dark:text-ink appearance-none focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/40 focus:border-[#FF6B00]"
                          >
                            <option value="">Select task type</option>
                            <option value="Remote">Remote</option>
                            <option value="On-site">On-site</option>
                            <option value="Hybrid">Hybrid</option>
                          </select>
                          <CaretDown
                            size={14}
                            className="absolute right-3.5 top-4 text-gray-400 pointer-events-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Work Location */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-ink/80 mb-1.5">
                        Work Location
                      </label>
                      <div className="relative">
                        <MapPin
                          size={16}
                          className="absolute left-3.5 top-3.5 text-gray-400 pointer-events-none"
                        />
                        <input
                          type="text"
                          placeholder={
                            gigTaskType === "Remote"
                              ? "Any Location"
                              : "e.g. Lagos, Nigeria"
                          }
                          value={
                            gigTaskType === "Remote" ? "" : gigWorkLocation
                          }
                          onChange={(e) => setGigWorkLocation(e.target.value)}
                          disabled={gigTaskType === "Remote"}
                          className="w-full h-11 pl-10 pr-3.5 rounded-xl border border-gray-200 dark:border-white/10 bg-transparent text-xs sm:text-sm text-gray-900 dark:text-ink focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/40 focus:border-[#FF6B00] disabled:opacity-50"
                        />
                      </div>
                    </div>

                    {/* Required Skills (Interactive Pills) */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-ink/80 mb-1.5">
                        Required Skills (Optional)
                      </label>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {gigSkillsList.map((skill) => (
                          <span
                            key={skill}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-ink border border-gray-200/80 dark:border-white/10"
                          >
                            <span>{skill}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveSkill(skill)}
                              className="text-gray-400 hover:text-gray-700 dark:hover:text-white transition cursor-pointer"
                            >
                              ✕
                            </button>
                          </span>
                        ))}
                        {isAddingSkill ? (
                          <div className="inline-flex items-center gap-1">
                            <input
                              type="text"
                              autoFocus
                              placeholder="Skill name"
                              value={newSkillInput}
                              onChange={(e) => setNewSkillInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleAddSkill();
                                } else if (e.key === "Escape") {
                                  setIsAddingSkill(false);
                                }
                              }}
                              className="h-8 px-2.5 rounded-full border border-[#FF6B00] bg-white dark:bg-surface text-xs text-gray-900 dark:text-ink focus:outline-none w-28"
                            />
                            <button
                              type="button"
                              onClick={handleAddSkill}
                              className="px-2.5 py-1 bg-[#FF6B00] text-white rounded-full text-xs font-bold cursor-pointer"
                            >
                              Add
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setIsAddingSkill(true)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold text-gray-600 dark:text-ink/80 hover:text-[#FF6B00] border border-dashed border-gray-300 dark:border-white/20 hover:border-[#FF6B00] transition cursor-pointer"
                          >
                            <Plus size={12} weight="bold" />
                            <span>Add Skill</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Alert Banner */}
                    <div className="rounded-xl p-3 bg-orange-50/80 dark:bg-orange-950/20 border border-orange-200/60 dark:border-orange-500/20 flex items-center gap-2.5 text-xs text-orange-900 dark:text-orange-200">
                      <ShieldCheck
                        size={18}
                        weight="fill"
                        className="text-[#FF6B00] shrink-0"
                      />
                      <span>
                        Your post will be reviewed to ensure it meets our
                        community guidelines.
                      </span>
                    </div>

                    {/* Footer Buttons */}
                    <div className="pt-2 flex items-center justify-end gap-3 shrink-0">
                      <button
                        type="button"
                        disabled={isAiScreening}
                        onClick={() => setIsGigModalOpen(false)}
                        className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-gray-600 dark:text-ink/70 hover:bg-gray-100 dark:hover:bg-white/5 transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isAiScreening}
                        className="px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#FF6B00] hover:bg-orange-600 transition shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-75"
                      >
                        <PaperPlaneTilt size={15} weight="fill" />
                        <span>
                          {isAiScreening ? "Publishing..." : "Post Task / Gig"}
                        </span>
                      </button>
                    </div>
                  </div>
                )}

                {/* ═══════════════════════════════════════════════════════
                    FORM 3: SERVICES - Generalized & On-Site Only
                ═════════════════════════════════════════════════════════ */}
                {gigType === "service" && (
                  <div className="space-y-4">
                    {/* Service Title */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-ink/80 mb-1.5">
                        Service Title <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Professional Event Catering / Deep Cleaning / Plumbing Repair"
                        value={serviceTitle}
                        onChange={(e) => setServiceTitle(e.target.value)}
                        className="w-full h-11 rounded-xl border border-gray-200 dark:border-white/10 bg-transparent px-3.5 text-xs sm:text-sm text-gray-900 dark:text-ink focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/40 focus:border-[#FF6B00]"
                      />
                    </div>

                    {/* Service Description */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-ink/80 mb-1.5">
                        Service Description{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <RichTextEditor
                        value={serviceDescription}
                        onChange={setServiceDescription}
                        placeholder="Describe your service offering, turnaround times, quality standards, and terms..."
                        minHeight="min-h-[120px]"
                      />
                    </div>

                    {/* Pricing Model & Service Fee */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-ink/80 mb-1.5">
                          Service Pricing Model{" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => setServicePricingType("fixed")}
                            className={`h-11 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center text-center truncate cursor-pointer ${
                              servicePricingType === "fixed"
                                ? "bg-[#FF6B00] text-white shadow-xs"
                                : "bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-ink/80 hover:bg-gray-200 dark:hover:bg-white/15"
                            }`}
                          >
                            Fixed Fee
                          </button>
                          <button
                            type="button"
                            onClick={() => setServicePricingType("inspection")}
                            className={`h-11 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center text-center truncate cursor-pointer ${
                              servicePricingType === "inspection"
                                ? "bg-[#FF6B00] text-white shadow-xs"
                                : "bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-ink/80 hover:bg-gray-200 dark:hover:bg-white/15"
                            }`}
                          >
                            Quote on Inspection
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-ink/80 mb-1.5">
                          Service Fee (₦)
                        </label>
                        {servicePricingType === "inspection" ? (
                          <input
                            type="text"
                            disabled
                            value="Quote Provided After Site Inspection"
                            className="w-full h-11 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-3.5 text-xs text-gray-500 dark:text-ink/60"
                          />
                        ) : (
                          <div className="relative">
                            <span className="absolute left-3.5 top-3 font-bold text-gray-400 text-sm pointer-events-none">
                              ₦
                            </span>
                            <input
                              type="number"
                              placeholder="35000"
                              value={serviceAmount}
                              onChange={(e) => setServiceAmount(e.target.value)}
                              className="w-full h-11 pl-8 pr-3.5 rounded-xl border border-gray-200 dark:border-white/10 bg-transparent text-xs sm:text-sm text-gray-900 dark:text-ink focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/40 focus:border-[#FF6B00]"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Location & Availability (Strictly On-Site) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-ink/80 mb-1.5 flex items-center justify-between">
                          <span>
                            Service Location (On-Site){" "}
                            <span className="text-red-500">*</span>
                          </span>
                          <span className="text-[10px] font-bold text-orange-600 bg-orange-50 dark:bg-orange-950/40 px-1.5 py-0.5 rounded">
                            On-site only
                          </span>
                        </label>
                        <div className="relative">
                          <MapPin
                            size={16}
                            className="absolute left-3.5 top-3.5 text-gray-400 pointer-events-none"
                          />
                          <input
                            type="text"
                            required
                            placeholder="e.g. Ikeja, Lagos (On-site location)"
                            value={serviceLocation}
                            onChange={(e) => setServiceLocation(e.target.value)}
                            className="w-full h-11 pl-10 pr-3.5 rounded-xl border border-gray-200 dark:border-white/10 bg-transparent text-xs sm:text-sm text-gray-900 dark:text-ink focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/40 focus:border-[#FF6B00]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-ink/80 mb-1.5">
                          Availability / Hours (Optional)
                        </label>
                        <div className="relative">
                          <CalendarBlank
                            size={16}
                            className="absolute left-3.5 top-3.5 text-gray-400 pointer-events-none"
                          />
                          <input
                            type="text"
                            placeholder="e.g. Mon - Sat, 8:00 AM - 6:00 PM"
                            value={serviceTurnaround}
                            onChange={(e) =>
                              setServiceTurnaround(e.target.value)
                            }
                            className="w-full h-11 pl-10 pr-3.5 rounded-xl border border-gray-200 dark:border-white/10 bg-transparent text-xs sm:text-sm text-gray-900 dark:text-ink focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/40 focus:border-[#FF6B00]"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Additional Service Notes */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-ink/80 mb-1.5">
                        Client Requirements & Notes (Optional)
                      </label>
                      <div className="relative">
                        <FileText
                          size={16}
                          className="absolute left-3.5 top-3 text-gray-400 pointer-events-none"
                        />
                        <textarea
                          rows={2}
                          placeholder="Any site access guidelines, client preparations, or equipment needed..."
                          value={serviceNotes}
                          onChange={(e) => setServiceNotes(e.target.value)}
                          className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-transparent text-xs sm:text-sm text-gray-900 dark:text-ink focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/40 focus:border-[#FF6B00]"
                        />
                      </div>
                    </div>

                    {/* Alert Banner */}
                    <div className="rounded-xl p-3 bg-orange-50/80 dark:bg-orange-950/20 border border-orange-200/60 dark:border-orange-500/20 flex items-center gap-2.5 text-xs text-orange-900 dark:text-orange-200">
                      <ShieldCheck
                        size={18}
                        weight="fill"
                        className="text-[#FF6B00] shrink-0"
                      />
                      <span>
                        Your post will be reviewed to ensure it meets our
                        community guidelines.
                      </span>
                    </div>

                    {/* Footer Buttons */}
                    <div className="pt-2 flex items-center justify-end gap-3 shrink-0">
                      <button
                        type="button"
                        disabled={isAiScreening}
                        onClick={() => setIsGigModalOpen(false)}
                        className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-gray-600 dark:text-ink/70 hover:bg-gray-100 dark:hover:bg-white/5 transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isAiScreening}
                        className="px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#FF6B00] hover:bg-orange-600 transition shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-75"
                      >
                        <PaperPlaneTilt size={15} weight="fill" />
                        <span>
                          {isAiScreening ? "Publishing..." : "Post Service"}
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
