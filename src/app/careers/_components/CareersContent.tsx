"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { useAutoResizeTextarea } from "@/hooks/useAutoResizeTextarea";
import {
  ArrowRightIcon,
  BriefcaseIcon,
  CheckCircleIcon,
  CheckIcon,
  GlobeIcon,
  SearchIcon,
  ShieldCheckIcon,
  StoreIcon,
  TargetIcon,
  UsersIcon,
} from "@/components/icons/hero";
import type { IconComponent } from "@/types/common";

// Redesigned 2026-09-23 (explicit request: "redesign the careers page
// completely"). Was the one page of the five that went dark end to end
// (bg-[#023337] — a TEXT colour in this palette, never a surface) with a
// numbered manifesto and a mailto: button. Now the site's standard themed
// layout, so it follows light/dark like every other public page:
// hero → what we're building → how we work → open roles → introduce
// yourself.
//
// The honesty rule the old page set is kept, deliberately: no invented
// perks, salaries, equity or roles, and no fabricated team numbers. Every
// statement here is either true of how Velte works or true of how we hire.
//
// The contact route moved off mailto:hello@velte.ng to the same Web3Forms
// submission the /contact page uses (its own key, its own inbox) — velte.ng
// mailboxes were deferred when DNS moved to Cloudflare, so a mailto there
// isn't a channel anyone can rely on. A distinct subject line keeps these
// easy to pick out of that inbox.

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45 } },
};

const principles: {
  icon: IconComponent;
  title: string;
  detail: string;
}[] = [
  {
    icon: SearchIcon,
    title: "Search that understands people",
    detail:
      "Buyers describe what they need in their own words, or send a photo — Velte works out what they mean.",
  },
  {
    icon: StoreIcon,
    title: "Built for local vendors",
    detail:
      "Small businesses list once and get matched to real demand near them, paying only when a buyer reaches out.",
  },
  {
    icon: ShieldCheckIcon,
    title: "Nothing invented",
    detail:
      "The AI translates; the data decides. Vendors, prices and stock only ever come from real listings.",
  },
];

const ways: {
  icon: IconComponent;
  title: string;
  detail: string;
}[] = [
  {
    icon: GlobeIcon,
    title: "Remote, genuinely",
    detail:
      "Work from wherever you're actually good — we care about the work, not a desk.",
  },
  {
    icon: UsersIcon,
    title: "Small team, real reach",
    detail:
      "No big org chart to get lost in — what you ship reaches real buyers and vendors within days, not quarters.",
  },
  {
    icon: ShieldCheckIcon,
    title: "Honest, including here",
    detail:
      "The rule that keeps Velte's search honest applies to hiring too: no fabricated perks, no roles that don't exist.",
  },
  {
    icon: TargetIcon,
    title: "Outcomes, not hours",
    detail:
      "We judge the work that gets shipped, not the hours logged getting there.",
  },
];

const areas = [
  "Engineering",
  "Design",
  "Product",
  "Vendor growth & operations",
  "Marketing & community",
  "Something else",
];

const inputClass =
  "w-full bg-canvas border border-gray-200 rounded-lg px-4 py-3 text-ink focus:outline-none focus:ring-1 focus:ring-orange-500";

export default function CareersContent() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [area, setArea] = useState(areas[0]);
  const [link, setLink] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const messageAutoResize = useAutoResizeTextarea(message);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast.error("Add your name, email and a short note first");
      return;
    }
    const accessKey = process.env.NEXT_PUBLIC_WEB3FORMS_CONTACT_ACCESS_KEY;
    if (!accessKey) {
      toast.error("This form isn't set up yet — please try again later");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          access_key: accessKey,
          subject: `Careers — introduction (${area})`,
          from_name: name.trim(),
          name: name.trim(),
          email: email.trim(),
          area,
          link: link.trim() || "—",
          message: message.trim(),
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        success?: boolean;
      } | null;
      if (!res.ok || !data?.success) throw new Error("Submission failed");
      setSubmitted(true);
    } catch {
      toast.error("Couldn't send that — check your connection and try again");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="bg-canvas min-h-screen pt-28 sm:pt-32 pb-24">
        {/* Hero */}
        <section className="max-w-7xl mx-auto px-5 sm:px-8 mb-20 sm:mb-24">
          <motion.div
            initial="hidden"
            animate="show"
            variants={stagger}
            className="max-w-3xl"
          >
            <motion.p
              variants={fadeUp}
              className="text-xs font-semibold uppercase tracking-wider text-orange-500 mb-4"
            >
              Careers at Velte
            </motion.p>
            <motion.h1
              variants={fadeUp}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold text-ink tracking-tight text-balance mb-6"
            >
              Help people find what they need, from vendors near them.
            </motion.h1>
            <motion.p
              variants={fadeUp}
              className="text-gray-500 text-lg leading-relaxed max-w-2xl mb-8"
            >
              We&apos;re a small team building Velte for buyers and local
              businesses across Nigeria. There are no open roles right now — but
              we&apos;d rather meet good people early than post a job later.
            </motion.p>
            <motion.div
              variants={fadeUp}
              className="flex flex-col sm:flex-row gap-3"
            >
              <a href="#introduce">
                <Button
                  size="lg"
                  className="bg-orange-500 hover:bg-orange-600 text-white gap-2 h-12 w-full sm:w-auto cursor-pointer"
                >
                  Introduce yourself
                  <ArrowRightIcon className="w-4 h-4" />
                </Button>
              </a>
              <a href="#building">
                <Button
                  size="lg"
                  variant="outline"
                  className="text-ink border-gray-300 hover:bg-gray-100 h-12 w-full sm:w-auto cursor-pointer"
                >
                  What we&apos;re building
                </Button>
              </a>
            </motion.div>
          </motion.div>
        </section>

        {/* What we're building */}
        <section
          id="building"
          className="max-w-7xl mx-auto px-5 sm:px-8 mb-20 sm:mb-24 scroll-mt-24"
        >
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
            className="grid gap-10 lg:grid-cols-2 lg:gap-16"
          >
            <div>
              <motion.p
                variants={fadeUp}
                className="text-xs font-semibold uppercase tracking-wider text-orange-500 mb-3"
              >
                What we&apos;re building
              </motion.p>
              <motion.h2
                variants={fadeUp}
                className="text-3xl sm:text-4xl font-bold text-ink tracking-tight mb-5 text-balance"
              >
                A discovery engine for real, local commerce.
              </motion.h2>
              <motion.p
                variants={fadeUp}
                className="text-gray-500 leading-relaxed"
              >
                A buyer tells Velte what they need. Velte matches it against
                real vendor listings by meaning, distance and trust, shows the
                nearest vendors who actually have it, and hands the buyer over
                to chat with them directly. When nobody has it yet, that gap
                becomes a signal vendors can act on.
              </motion.p>
            </div>

            <motion.ul variants={stagger} className="space-y-3">
              {principles.map(({ icon: Icon, title, detail }) => (
                <motion.li
                  key={title}
                  variants={fadeUp}
                  className="flex gap-4 rounded-2xl border border-gray-200 bg-surface p-5"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50">
                    <Icon className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-semibold text-ink">
                      {title}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 leading-relaxed">
                      {detail}
                    </p>
                  </div>
                </motion.li>
              ))}
            </motion.ul>
          </motion.div>
        </section>

        {/* How we work */}
        <section className="max-w-7xl mx-auto px-5 sm:px-8 mb-20 sm:mb-24">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
          >
            <motion.div variants={fadeUp} className="max-w-2xl mb-10">
              <p className="text-xs font-semibold uppercase tracking-wider text-orange-500 mb-3">
                How we work
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold text-ink tracking-tight text-balance">
                What working here is actually like.
              </h2>
            </motion.div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {ways.map(({ icon: Icon, title, detail }) => (
                <motion.div
                  key={title}
                  variants={fadeUp}
                  className="rounded-2xl border border-gray-200 bg-surface p-6"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 mb-5">
                    <Icon className="w-5 h-5 text-ink" />
                  </div>
                  <h3 className="text-base font-semibold text-ink mb-2">
                    {title}
                  </h3>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    {detail}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* Open roles */}
        <section className="max-w-7xl mx-auto px-5 sm:px-8 mb-20 sm:mb-24">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45 }}
          >
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-orange-500 mb-3">
                  Open roles
                </p>
                <h2 className="text-3xl sm:text-4xl font-bold text-ink tracking-tight">
                  Current openings
                </h2>
              </div>
              <p className="text-sm text-gray-500">0 open roles</p>
            </div>
            <div className="rounded-2xl border border-dashed border-gray-300 bg-surface px-6 py-12 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100">
                <BriefcaseIcon className="w-6 h-6 text-gray-500" />
              </div>
              <h3 className="text-lg font-semibold text-ink mb-2">
                No open roles right now
              </h3>
              <p className="text-sm text-gray-500 max-w-md mx-auto leading-relaxed">
                When we hire, roles will be listed here first. Until then,
                introduce yourself below — we read every note.
              </p>
            </div>
          </motion.div>
        </section>

        {/* Introduce yourself */}
        <section
          id="introduce"
          className="max-w-7xl mx-auto px-5 sm:px-8 scroll-mt-24"
        >
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45 }}
            className="grid gap-10 lg:grid-cols-5 lg:gap-16"
          >
            <div className="lg:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-orange-500 mb-3">
                Introduce yourself
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold text-ink tracking-tight mb-5 text-balance">
                Tell us what you&apos;d want to work on.
              </h2>
              <p className="text-gray-500 leading-relaxed mb-6">
                A short note is plenty. The most useful ones cover:
              </p>
              <ul className="space-y-3">
                {[
                  "The problem at Velte you'd most like to take on",
                  "Something you've built, designed or grown — with a link",
                  "Where you're based and how you like to work",
                ].map((item) => (
                  <li key={item} className="flex gap-3 text-sm text-ink">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-50">
                      <CheckIcon className="w-3 h-3 text-orange-500" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="lg:col-span-3 rounded-2xl border border-gray-200 bg-surface p-6 sm:p-8 shadow-sm">
              {submitted ? (
                <div className="flex flex-col items-center text-center py-10">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-50">
                    <CheckCircleIcon className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-ink mb-2">
                    Thanks — your note is in.
                  </h3>
                  <p className="text-sm text-gray-500 max-w-sm">
                    We read every one, and we&apos;ll reach out when
                    there&apos;s something that fits.
                  </p>
                </div>
              ) : (
                <form className="space-y-5" onSubmit={handleSubmit}>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="careers-name"
                        className="text-gray-500 text-sm block mb-1"
                      >
                        Name
                      </label>
                      <input
                        id="careers-name"
                        type="text"
                        autoComplete="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="careers-email"
                        className="text-gray-500 text-sm block mb-1"
                      >
                        Email
                      </label>
                      <input
                        id="careers-email"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="careers-area"
                        className="text-gray-500 text-sm block mb-1"
                      >
                        Area of interest
                      </label>
                      <select
                        id="careers-area"
                        value={area}
                        onChange={(e) => setArea(e.target.value)}
                        className={inputClass}
                      >
                        {areas.map((a) => (
                          <option key={a} value={a}>
                            {a}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label
                        htmlFor="careers-link"
                        className="text-gray-500 text-sm block mb-1"
                      >
                        Link to your work{" "}
                        <span className="text-gray-400">(optional)</span>
                      </label>
                      <input
                        id="careers-link"
                        type="text"
                        inputMode="url"
                        placeholder="Portfolio, GitHub, LinkedIn…"
                        value={link}
                        onChange={(e) => setLink(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <div>
                    <label
                      htmlFor="careers-message"
                      className="text-gray-500 text-sm block mb-1"
                    >
                      Your note
                    </label>
                    <textarea
                      id="careers-message"
                      {...messageAutoResize}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={4}
                      className={`${inputClass} min-h-[140px] resize-none overflow-hidden`}
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white h-11 px-6 disabled:opacity-60 cursor-pointer"
                  >
                    {submitting ? "Sending…" : "Send introduction"}
                  </Button>
                </form>
              )}
            </div>
          </motion.div>
        </section>
      </main>
      <Footer />
    </>
  );
}
