"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Users, Award, Globe, Heart } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            About <span className="gradient-text">Our Platform</span>
          </h1>
          <p className="text-xl text-muted-foreground">
            We're on a mission to connect talented freelancers with businesses
            that need their expertise.
          </p>
        </div>

        {/* Story Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-20">
          <div>
            <h2 className="text-3xl font-bold mb-4">Our Story</h2>
            <p className="text-muted-foreground mb-4">
              Founded in 2024, our platform was born from a simple idea: making it
              easy for businesses to find and work with talented freelancers from
              around the world.
            </p>
            <p className="text-muted-foreground mb-6">
              We believe in the power of remote work and want to create a marketplace
              where quality talent meets opportunity. Our team is passionate about
              building tools that help freelancers succeed and businesses grow.
            </p>
            <Button asChild>
              <Link href="/contact">Get in Touch</Link>
            </Button>
          </div>
          <div className="relative h-80 rounded-2xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <span className="text-muted-foreground">Our Team at Work</span>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-20">
          {[
            { icon: Users, value: "10,000+", label: "Freelancers" },
            { icon: Globe, value: "50+", label: "Countries" },
            { icon: Award, value: "5,000+", label: "Projects Completed" },
            { icon: Heart, value: "98%", label: "Satisfaction Rate" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <stat.icon className="w-6 h-6 text-primary" />
              </div>
              <div className="text-3xl font-bold mb-1">{stat.value}</div>
              <div className="text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Values Section */}
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">Our Values</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Everything we do is guided by these core principles
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 rounded-xl border bg-card text-center">
            <h3 className="text-xl font-bold mb-2">Trust & Transparency</h3>
            <p className="text-muted-foreground">
              We believe in honest, transparent relationships with our community.
            </p>
          </div>
          <div className="p-6 rounded-xl border bg-card text-center">
            <h3 className="text-xl font-bold mb-2">Quality First</h3>
            <p className="text-muted-foreground">
              We're committed to maintaining the highest standards.
            </p>
          </div>
          <div className="p-6 rounded-xl border bg-card text-center">
            <h3 className="text-xl font-bold mb-2">Continuous Innovation</h3>
            <p className="text-muted-foreground">
              We constantly evolve our platform based on community feedback.
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-20">
          <h2 className="text-3xl font-bold mb-4">Join Our Community</h2>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            Whether you're looking to hire talent or find your next project,
            we're here to help.
          </p>
          <div className="flex gap-4 justify-center">
            <Button asChild>
              <Link href="/freelancers">Find Freelancers</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/marketplace">Browse Products</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
