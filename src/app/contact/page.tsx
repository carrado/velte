"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Mail, Phone, MapPin, CheckCircle2 } from "lucide-react";
import { useAutoResizeTextarea } from "@/hooks/useAutoResizeTextarea";

// Posts straight to Web3Forms — same third-party form service the vendor
// waitlist and the dashboard's Settings > Send Feedback both already use.
// A separate access key (own Web3Forms submission/export, distinct inbox)
// keeps public contact-page inquiries from mixing with vendor feedback.
// NEXT_PUBLIC_WEB3FORMS_CONTACT_ACCESS_KEY is a Web3Forms *public* key by
// their own design — meant to sit in client-side form code, not a secret.
export default function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const messageAutoResize = useAutoResizeTextarea(message);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast.error("Fill in your name, email, and a message first");
      return;
    }
    const accessKey = process.env.NEXT_PUBLIC_WEB3FORMS_CONTACT_ACCESS_KEY;
    if (!accessKey) {
      toast.error("Contact form isn't set up yet — email us directly for now");
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
          subject: "Velte contact form",
          from_name: name.trim(),
          name: name.trim(),
          email: email.trim(),
          message: message.trim(),
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        success?: boolean;
      } | null;
      if (!res.ok || !data?.success) throw new Error("Submission failed");
      setSubmitted(true);
      setName("");
      setEmail("");
      setMessage("");
    } catch {
      toast.error("Couldn't send that — check your connection and try again");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="bg-[#F1F5F9] min-h-screen pt-24 pb-20">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <h1 className="text-5xl lg:text-6xl font-bold text-[#023337] mb-6">
              Let’s <span className="text-orange-500">talk</span>
            </h1>
            <p className="text-gray-500 text-lg">
              Have questions? We’d love to hear from you. Send us a message and
              we’ll respond as soon as possible.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-12">
            {/* Contact form */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="bg-white border border-gray-200 shadow-sm rounded-2xl p-8"
            >
              <h2 className="text-2xl font-bold text-[#023337] mb-6">
                Send a message
              </h2>
              {submitted ? (
                <div className="flex items-center gap-2 text-[#023337] bg-green-50 rounded-lg px-4 py-4">
                  <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                  Thanks — your message is in. We&apos;ll get back to you soon.
                </div>
              ) : (
                <form className="space-y-5" onSubmit={handleSubmit}>
                  <div>
                    <label className="text-gray-500 text-sm block mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-[#F1F5F9] border border-gray-200 rounded-lg px-4 py-3 text-[#023337] focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="text-gray-500 text-sm block mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-[#F1F5F9] border border-gray-200 rounded-lg px-4 py-3 text-[#023337] focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="text-gray-500 text-sm block mb-1">
                      Message
                    </label>
                    <textarea
                      {...messageAutoResize}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={4}
                      className="w-full min-h-[140px] sm:min-h-[120px] resize-none overflow-hidden bg-[#F1F5F9] border border-gray-200 rounded-lg px-4 py-3 text-[#023337] focus:outline-none focus:ring-1 focus:ring-orange-500"
                    ></textarea>
                  </div>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-60"
                  >
                    {submitting ? "Sending…" : "Send Message"}
                  </Button>
                </form>
              )}
            </motion.div>

            {/* Contact info */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-8">
                <h2 className="text-2xl font-bold text-[#023337] mb-6">
                  Other ways to reach us
                </h2>
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <Mail className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-gray-400 text-sm">Email</p>
                      <a
                        href="mailto:hello@velte.ng"
                        className="text-[#023337] hover:text-orange-500"
                      >
                        hello@velte.ng
                      </a>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <Phone className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-gray-400 text-sm">Phone</p>
                      <a
                        href="tel:+2348163276826"
                        className="text-[#023337] hover:text-orange-500"
                      >
                        +234 (0) 816 327 6826
                      </a>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <MapPin className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-gray-400 text-sm">Headquarters</p>
                      <p className="text-[#023337]">
                        Plot XI, Republic Estate, Independence Layout, Enugu,
                        Nigeria
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
