import { HeroSection } from "@/components/home/hero-section";
import { AboutSection } from "@/components/home/about-section";
import { TeamSection } from "@/components/home/team-section";
import { StatsSection } from "@/components/home/stats-section";
import { BlogSection } from "@/components/home/blog-section";

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <AboutSection />
      <StatsSection />
      <TeamSection />
      <BlogSection />
    </>
  );
}