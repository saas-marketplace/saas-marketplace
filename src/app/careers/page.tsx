"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function CareersPage() {
  const jobs = [
    {
      title: "Senior Frontend Developer",
      location: "Remote",
      type: "Full-time",
      description: "Join our team to build beautiful, performant web applications.",
    },
    {
      title: "Backend Engineer",
      location: "Remote",
      type: "Full-time",
      description: "Help us scale our infrastructure and build robust APIs.",
    },
    {
      title: "Product Designer",
      location: "Remote",
      type: "Full-time",
      description: "Design intuitive user experiences for our platform.",
    },
  ];

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Join Our <span className="gradient-text">Team</span>
          </h1>
          <p className="text-xl text-muted-foreground">
            Work with us to shape the future of freelancing
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          {jobs.map((job) => (
            <div key={job.title} className="border rounded-xl p-6 mb-4 bg-card">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-xl font-bold">{job.title}</h3>
                <span className="text-sm text-primary">{job.type}</span>
              </div>
              <p className="text-muted-foreground mb-4">{job.description}</p>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{job.location}</span>
                <Button>Apply Now</Button>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-muted-foreground mb-4">
            Don't see a role for you? We're always looking for talent.
          </p>
          <Button variant="outline" asChild>
            <Link href="/contact">Get in Touch</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
