"use client";

import { motion } from "motion/react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Mail, Phone, MapPin } from "lucide-react";

export default function Contact() {
  return (
    <>
      <Navbar />
      <main className="bg-[#050d08] min-h-screen pt-24 pb-20">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <h1 className="text-5xl lg:text-6xl font-bold text-white mb-6">
              Let’s <span className="text-[rgb(247,107,16)]">talk</span>
            </h1>
            <p className="text-white/60 text-lg">
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
              className="bg-white/5 border border-white/10 rounded-2xl p-8"
            >
              <h2 className="text-2xl font-bold text-white mb-6">
                Send a message
              </h2>
              <form className="space-y-5">
                <div>
                  <label className="text-white/60 text-sm block mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-[rgb(247,107,16)]"
                  />
                </div>
                <div>
                  <label className="text-white/60 text-sm block mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-[rgb(247,107,16)]"
                  />
                </div>
                <div>
                  <label className="text-white/60 text-sm block mb-1">
                    Message
                  </label>
                  <textarea
                    rows={4}
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-[rgb(247,107,16)]"
                  ></textarea>
                </div>
                <Button className="w-full bg-[rgb(247,107,16)] hover:bg-[rgb(247,107,16)]/90 text-white">
                  Send Message
                </Button>
              </form>
            </motion.div>

            {/* Contact info */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
                <h2 className="text-2xl font-bold text-white mb-6">
                  Other ways to reach us
                </h2>
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <Mail className="w-5 h-5 text-[rgb(247,107,16)] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-white/40 text-sm">Email</p>
                      <a
                        href="mailto:hello@velte.ai"
                        className="text-white hover:text-[rgb(247,107,16)]"
                      >
                        hello@velte.ng
                      </a>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <Phone className="w-5 h-5 text-[rgb(247,107,16)] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-white/40 text-sm">Phone</p>
                      <a
                        href="tel:+15551234567"
                        className="text-white hover:text-[rgb(247,107,16)]"
                      >
                        +1 (555) 123-4567
                      </a>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <MapPin className="w-5 h-5 text-[rgb(247,107,16)] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-white/40 text-sm">Headquarters</p>
                      <p className="text-white">
                        548 Market St, San Francisco, CA 94104
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
