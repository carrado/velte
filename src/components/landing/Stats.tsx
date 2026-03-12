import { motion } from "motion/react";

const stats = [
  { value: "$4.2M+", label: "Revenue generated for clients" },
  { value: "98%", label: "Message response rate" },
  { value: "< 3s", label: "Average AI response time" },
  { value: "43%", label: "Higher conversion vs human reps" },
];

export default function Stats() {
  return (
    <section className="bg-[#070f0a] border-y border-white/[0.06] py-14">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="text-center"
            >
              <p className="text-3xl lg:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300 mb-1.5">
                {stat.value}
              </p>
              <p className="text-white/45 text-sm leading-snug">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
