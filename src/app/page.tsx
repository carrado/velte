import CallToAction from "@/components/landing/CallToAction";
import Features from "@/components/landing/Features";
import Footer from "@/components/landing/Footer";
import Hero from "@/components/landing/Hero";
import HowItWorks from "@/components/landing/HowItWorks";
import Navbar from "@/components/landing/Navbar";
import Pricing from "@/components/landing/Pricing";
import Stats from "@/components/landing/Stats";

// import Image from "next/image";
{/* <Image
className="dark:invert"
src="/next.svg"
alt="Next.js logo"
width={100}
height={20}
priority
/> */}

export default function Home() {
  return (
    <>
    <div className="min-h-screen">
      <Navbar />
      <Hero />
      <Stats />
      <Features />
      <HowItWorks />
      <Pricing />
      <CallToAction />
      <Footer />
    </div>
    </>
  );
}
