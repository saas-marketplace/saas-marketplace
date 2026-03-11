"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function HelpPage() {
  const faqs = [
    {
      question: "How do I create an account?",
      answer: "Click the Sign Up button and follow the instructions to create your account.",
    },
    {
      question: "How do I hire a freelancer?",
      answer: "Browse our freelancer directory, view profiles, and contact them directly.",
    },
    {
      question: "How do I get paid?",
      answer: "We support various payment methods. Check your dashboard for details.",
    },
    {
      question: "How do I contact support?",
      answer: "You can reach our support team through the contact form or email.",
    },
  ];

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Help <span className="gradient-text">Center</span>
          </h1>
          <p className="text-xl text-muted-foreground">
            Find answers to common questions
          </p>
        </div>

        <div className="max-w-2xl mx-auto space-y-4">
          {faqs.map((faq) => (
            <div key={faq.question} className="border rounded-xl p-6 bg-card">
              <h3 className="font-bold mb-2">{faq.question}</h3>
              <p className="text-muted-foreground">{faq.answer}</p>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-muted-foreground mb-4">Can't find what you're looking for?</p>
          <Button asChild>
            <Link href="/contact">Contact Support</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
