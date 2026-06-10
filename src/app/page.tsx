import CallToAction from "@/components/landing/CallToAction";
import Features from "@/components/landing/Features";
import Footer from "@/components/landing/Footer";
import Hero from "@/components/landing/Hero";
import HowItWorks from "@/components/landing/HowItWorks";
import Navbar from "@/components/landing/Navbar";
import Pricing from "@/components/landing/Pricing";
import Stats from "@/components/landing/Stats";
import Testimonials from "@/components/landing/Testimonials";
import UseCases from "@/components/landing/UseCases";

export default function Home() {
  return (
    <>
      <div className="min-h-screen">
        <Navbar />
        <Hero />
        <Stats />
        <Features />
        <UseCases />
        <HowItWorks />
        <Testimonials />
        <Pricing />
        <CallToAction />
        <Footer />
      </div>
    </>
  );
}
