"use client";

import { motion } from "motion/react";
import Image from "next/image";
import { Star, Quote } from "lucide-react";

type Testimonial = {
  quote: string;
  name: string;
  role: string;
  image: string;
};

const featured: Testimonial = {
  quote:
    "Velte replied to 2,300 messages last month and closed deals while I slept. My WhatsApp went from a missed-message graveyard to my single biggest sales channel. I genuinely can't run the store without it now.",
  name: "David Mensah",
  role: "Founder, SoleStreet Sneakers · Accra",
  image:
    "https://images.unsplash.com/photo-1531384441138-2736e62e0919?w=600&q=80&auto=format&fit=crop&crop=faces",
};

const testimonials: Testimonial[] = [
  {
    quote:
      "It negotiates exactly the way I trained it — never below my margin. Sales are up 38% and I haven't hired a single extra rep.",
    name: "Amaka Okafor",
    role: "Owner, Lola's Fashion House · Lagos",
    image:
      "https://images.unsplash.com/photo-1611432579699-484f7990b127?w=400&q=80&auto=format&fit=crop&crop=faces",
  },
  {
    quote:
      "Customers think they're chatting with my best salesperson. The inventory checks alone have killed our overselling problem completely.",
    name: "Tunde Adeyemi",
    role: "Director, Gadget Hub · Abuja",
    image:
      "https://images.unsplash.com/photo-1508243771214-6e95d137426b?w=400&q=80&auto=format&fit=crop&crop=faces",
  },
  {
    quote:
      "Setup took one afternoon. By the next morning Velte had already sent its first payment link and made me a sale. Unreal.",
    name: "Zainab Bello",
    role: "Founder, Glow Beauty Co. · Kano",
    image:
      "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=400&q=80&auto=format&fit=crop&crop=faces",
  },
];

function Stars() {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className="w-4 h-4 fill-[rgb(247,107,16)] text-[rgb(247,107,16)]"
        />
      ))}
    </div>
  );
}

export default function Testimonials() {
  return (
    <section id="reviews" className="bg-white py-24 lg:py-32">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="inline-block text-xs font-semibold tracking-widest text-[rgb(247,107,16)] uppercase mb-4">
            Loved by sellers
          </span>
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-950 tracking-tight mb-5 text-balance">
            Real businesses. Real revenue.
          </h2>
          <p className="text-lg text-gray-500 max-w-xl mx-auto">
            Don&apos;t take our word for it — hear from the merchants who let
            Velte do the talking.
          </p>
        </motion.div>

        {/* Featured testimonial */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="grid lg:grid-cols-5 gap-0 rounded-3xl overflow-hidden border border-gray-100 shadow-xl shadow-gray-200/50 mb-6"
        >
          {/* Photo */}
          <div className="relative lg:col-span-2 min-h-[280px] lg:min-h-[420px]">
            <Image
              src={featured.image}
              alt={featured.name}
              fill
              sizes="(max-width: 1024px) 100vw, 40vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#050d08]/60 via-transparent to-transparent lg:bg-gradient-to-r" />
          </div>

          {/* Quote */}
          <div className="lg:col-span-3 bg-[#050d08] p-8 sm:p-12 flex flex-col justify-center">
            <Quote className="w-10 h-10 text-[rgb(247,107,16)] mb-6" />
            <p className="text-xl sm:text-2xl text-white font-medium leading-relaxed mb-8 text-balance">
              &ldquo;{featured.quote}&rdquo;
            </p>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-white font-semibold">{featured.name}</p>
                <p className="text-white/50 text-sm">{featured.role}</p>
              </div>
              <Stars />
            </div>
          </div>
        </motion.div>

        {/* Supporting testimonials */}
        <div className="grid md:grid-cols-3 gap-5">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: i * 0.1 }}
              className="flex flex-col rounded-2xl border border-gray-100 bg-gray-50 p-7 hover:bg-white hover:border-[rgb(247,107,16)]/30 hover:shadow-lg hover:shadow-[rgba(247,107,16,0.08)] transition-all duration-300"
            >
              <Stars />
              <p className="text-gray-600 text-[15px] leading-relaxed my-5 flex-1">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                <span className="relative w-11 h-11 rounded-full overflow-hidden shrink-0 ring-2 ring-[rgb(247,107,16)]/15">
                  <Image
                    src={t.image}
                    alt={t.name}
                    fill
                    sizes="44px"
                    className="object-cover"
                  />
                </span>
                <div className="min-w-0">
                  <p className="text-gray-900 font-semibold text-sm truncate">
                    {t.name}
                  </p>
                  <p className="text-gray-500 text-xs truncate">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
