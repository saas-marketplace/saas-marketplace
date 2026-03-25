"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { Badge } from "@/components/ui/badge";
import { Linkedin, Twitter, Github } from "lucide-react";

// ✅ FIX: Removed createClient import — no longer querying Supabase directly from
// the browser. The team_members RLS policy only allows authenticated admins, so
// anonymous visitors received an error on every page load. We now call the public
// API route (/api/public/team-members) which runs server-side with the service
// role key and bypasses RLS safely.

export interface TeamMember {
  name: string;
  role: string;
  avatar_url: string | null;
  initials: string;
}

const gradients = [
  "from-purple-500 to-pink-500",
  "from-blue-500 to-cyan-500",
  "from-pink-500 to-orange-500",
  "from-green-500 to-emerald-500",
  "from-yellow-500 to-red-500",
  "from-indigo-500 to-purple-500",
];

function getGradient(index: number): string {
  return gradients[index % gradients.length];
}

export function TeamSection() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTeamMembers() {
      try {
        // ✅ FIX: Fetch from the public API route instead of Supabase directly.
        // This avoids the RLS "permission denied" error for unauthenticated visitors
        // and also avoids adding another concurrent getSession() call on page load
        // (which contributed to the Web Lock contention / AbortError cascade).
        const res = await fetch("/api/public/team-members");
        if (!res.ok) {
          throw new Error(`Request failed with status ${res.status}`);
        }
        const data: TeamMember[] = await res.json();
        setTeamMembers(data);
      } catch (err) {
        console.error("Error fetching team members:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchTeamMembers();
  }, []);

  // Show empty state when no team members in database
  if (teamMembers.length === 0) {
    return (
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal className="text-center mb-16 m-f1">
            <Badge variant="secondary" className="mb-4">
              Our Team
            </Badge>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
              Meet the <span className="gradient-text">dreamers</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              A passionate team of creators, engineers, and entrepreneurs
              dedicated to building the future of digital commerce.
            </p>
          </ScrollReveal>
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground">
              No team members available. Try to be part of our team.
            </p>
          </div>
        </div>
      </section>
    );
  }

  // Use only real data from database
  return (
    <section className="py-24 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal className="text-center mb-16 m-f1">
          <Badge variant="secondary" className="mb-4">
            Our Team
          </Badge>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            Meet the <span className="gradient-text">dreamers</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            A passionate team of creators, engineers, and entrepreneurs
            dedicated to building the future of digital commerce.
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {teamMembers.map((member, index) => (
            <ScrollReveal key={member.name + index} delay={index * 0.1}>
              <motion.div
                whileHover={{ y: -8 }}
                className=" p-6 text-center group cursor-pointer"
              >
                {member.avatar_url ? (
                  <motion.div
                    whileHover={{ scale: 1.55, rotate: 5 }}
                    className="w-28 h-28 rounded-full overflow-hidden mx-auto mb-4"
                  >
                    <img
                      src={member.avatar_url}
                      alt={member.name}
                      className="w-full h-full object-cover"
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    whileHover={{ scale: 1.05, rotate: 5 }}
                    className={`w-28 h-28 rounded-full bg-gradient-to-br ${getGradient(index)} flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4`}
                  >
                    {member.initials}
                  </motion.div>
                )}
                <h3 className="text-xl font-bold mb-2">{member.name}</h3>
                <span className="inline-block px-3 py-1 text-sm bg-transparent border border-primary/30 rounded-full text-primary">
                  {member.role}
                </span>
                <div className="flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity mt-4">
                  {[Twitter, Linkedin, Github].map((Icon, i) => (
                    <button
                      key={i}
                      className="w-8 h-8 rounded-lg bg-muted hover:bg-primary/10 hover:text-primary flex items-center justify-center transition-colors"
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  ))}
                </div>
              </motion.div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}