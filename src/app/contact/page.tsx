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
              <form className="space-y-5">
                <div>
                  <label className="text-gray-500 text-sm block mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    className="w-full bg-[#F1F5F9] border border-gray-200 rounded-lg px-4 py-3 text-[#023337] focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="text-gray-500 text-sm block mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    className="w-full bg-[#F1F5F9] border border-gray-200 rounded-lg px-4 py-3 text-[#023337] focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="text-gray-500 text-sm block mb-1">
                    Message
                  </label>
                  <textarea
                    rows={4}
                    className="w-full bg-[#F1F5F9] border border-gray-200 rounded-lg px-4 py-3 text-[#023337] focus:outline-none focus:ring-1 focus:ring-orange-500"
                  ></textarea>
                </div>
                <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white">
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
                        href="mailto:hello@velte.ai"
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
                        href="tel:+15551234567"
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
