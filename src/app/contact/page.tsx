"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Phone, Mail, MapPin, Send, Clock } from "lucide-react";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/use-toast";

const contactInfo = [
  {
    icon: Phone,
    title: "Phone",
    details: ["+1 (555) 123-4567", "+1 (555) 987-6543"],
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  {
    icon: Mail,
    title: "Email",
    details: ["hello@nexushub.com", "support@nexushub.com"],
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    icon: MapPin,
    title: "Address",
    details: ["123 Innovation Drive", "San Francisco, CA 94105"],
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  {
    icon: Clock,
    title: "Business Hours",
    details: ["Mon - Fri: 9AM - 6PM PST", "Sat - Sun: 10AM - 4PM PST"],
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
  },
];

const socialLinks: { name: string; url: string; label: string; href: string; color: string }[] = [
  { name: "Facebook", url: "https://facebook.com", label: "Facebook", href: "https://facebook.com", color: "text-blue-500" },
  { name: "Twitter", url: "https://twitter.com", label: "Twitter", href: "https://twitter.com", color: "text-blue-400" },
];

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    phone: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);

    const { error } = await supabase.from("contact_submissions").insert(formData);

    if (!error) {
      toast({
        title: "Message sent!",
        description: "We'll get back to you as soon as possible.",
      });
    }

    setSubmitting(false);
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      {/* Hero */}
      <section className="relative pb-16">
        <div className="absolute inset-0 gradient-bg-subtle" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <ScrollReveal className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">
              Contact Us
            </Badge>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
              Let&apos;s Start a{" "}
              <span className="gradient-text">Conversation</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Have a question, partnership idea, or just want to say hello?
              We&apos;d love to hear from you.
            </p>
          </ScrollReveal>
        </div>
      </section>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-5 gap-12 max-w-6xl mx-auto">
          {/* Contact Info */}
          <div className="lg:col-span-2 space-y-6">
            {contactInfo.map((info, index) => (
              <ScrollReveal key={info.title} delay={index * 0.1}>
                <motion.div
                  whileHover={{ x: 4 }}
                  className="glass-card rounded-2xl p-5 flex items-start gap-4"
                >
                  <div
                    className={`w-12 h-12 rounded-xl ${info.bgColor} flex items-center justify-center flex-shrink-0`}
                  >
                    <info.icon className={`w-5 h-5 ${info.color}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{info.title}</h3>
                    {info.details.map((detail) => (
                      <p key={detail} className="text-sm text-muted-foreground">
                        {detail}
                      </p>
                    ))}
                  </div>
                </motion.div>
              </ScrollReveal>
            ))}

            {/* Social Media */}
            <ScrollReveal delay={0.4}>
              <div className="glass-card rounded-2xl p-6">
                <h3 className="font-semibold mb-4">Follow Us</h3>
                <div className="grid grid-cols-2 gap-3">
                  {socialLinks.map((social) => {
                    return (
                      <motion.a
                        key={social.label}
                        href={social.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`px-4 py-2 rounded-xl bg-muted flex items-center justify-center transition-colors ${social.color}`}
                      >
                        {social.label}
                      </motion.a>
                    );
                  })}
                </div>
              </div>
            </ScrollReveal>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-3">
            <ScrollReveal direction="right">
              <div className="glass-card rounded-3xl p-8">
                <h2 className="text-2xl font-bold mb-2">Send us a Message</h2>
                <p className="text-muted-foreground mb-8">
                  Fill out the form below and we&apos;ll get back to you within 24 hours.
                </p>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Full Name *</label>
                      <Input
                        placeholder="John Doe"
                        value={formData.name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        required
                        className="h-12 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Email Address *</label>
                      <Input
                        type="email"
                        placeholder="john@example.com"
                        value={formData.email}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        required
                        className="h-12 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Subject</label>
                      <Input
                        placeholder="How can we help?"
                        value={formData.subject}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setFormData({ ...formData, subject: e.target.value })
                        }
                        className="h-12 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Phone Number</label>
                      <Input
                        type="tel"
                        placeholder="+1 (555) 000-0000"
                        value={formData.phone}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setFormData({ ...formData, phone: e.target.value })
                        }
                        className="h-12 rounded-xl"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Message *</label>
                    <Textarea
                      placeholder="Tell us more about your inquiry..."
                      value={formData.message}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setFormData({ ...formData, message: e.target.value })
                      }
                      rows={6}
                      required
                      className="rounded-xl"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 gradient-bg text-white border-0 hover:opacity-90 rounded-xl text-base"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <span className="flex items-center gap-2">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                          className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                        />
                        Sending...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Send className="w-4 h-4" />
                        Send Message
                      </span>
                    )}
                  </Button>
                </form>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </div>
    </div>
  );
}