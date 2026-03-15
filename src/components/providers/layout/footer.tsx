"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles, Heart } from "lucide-react";

import {
  FaFacebook,
  FaYoutube,
  FaDiscord,
  FaXTwitter,
  FaTiktok,
  FaGithub,
  FaLinkedin,
  FaSnapchat,
} from "react-icons/fa6";

import { Separator } from "@/components/ui/separator";

const footerLinks = {
  Platform: [
    { label: "Marketplace", href: "/marketplace" },
    { label: "Freelancers", href: "/freelancers" },
    { label: "Pricing", href: "/pricing" },
    { label: "Enterprise", href: "/enterprise" },
  ],
  Company: [
    { label: "About Us", href: "/about" },
    { label: "Blog", href: "/blog" },
    { label: "Careers", href: "/careers" },
    { label: "Contact", href: "/contact" },
  ],
  Resources: [
    { label: "Documentation", href: "/docs" },
    { label: "Help Center", href: "/help" },
    { label: "Community", href: "/community" },
    { label: "Templates", href: "/marketplace?category=templates" },
  ],
  Legal: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Cookie Policy", href: "/cookies" },
    { label: "GDPR", href: "/gdpr" },
  ],
};

const socialLinks = [
  { icon: FaFacebook, href: "#", label: "Facebook" },
  { icon: FaYoutube, href: "#", label: "YouTube" },
  { icon: FaDiscord, href: "#", label: "Discord" },
  { icon: FaXTwitter, href: "#", label: "X" },
  { icon: FaTiktok, href: "#", label: "TikTok" },
  { icon: FaGithub, href: "#", label: "GitHub" },
  { icon: FaLinkedin, href: "#", label: "LinkedIn" },
  { icon: FaSnapchat, href: "#", label: "Snapchat" },
];

export function Footer() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <footer className="relative bg-white dark:bg-neutral-900 border-t border-gray-200 dark:border-white/10">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 dark:via-[#0AA3C8]/50 to-transparent" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="py-16 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8"
        >
          <motion.div variants={itemVariants} className="col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-xl gradient-bg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
            </Link>

            <p className="text-[#525252] dark:text-gray-400 text-sm leading-relaxed max-w-xs mb-6">
              The ultimate platform for digital services, products, and
              freelance talent. Build, grow, and scale your business with
              NexusHub.
            </p>

            <div className="flex items-center gap-3">
              {socialLinks.map((social) => {
                const Icon = social.icon;

                return (
                  <Link
                    key={social.label}
                    href={social.href}
                    aria-label={social.label}
                    className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-cyan-50 dark:hover:bg-[#0AA3C8]/10 hover:text-cyan-500 dark:hover:text-[#0AA3C8] flex items-center justify-center transition-all duration-200"
                  >
                    <Icon className="w-4 h-4" />
                  </Link>
                );
              })}
            </div>
          </motion.div>

          {Object.entries(footerLinks).map(([category, links]) => (
            <motion.div key={category} variants={itemVariants}>
              <h3 className="font-semibold text-sm mb-4 text-[#0A0A0A] dark:text-white">{category}</h3>

              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </motion.div>

        <Separator className="bg-gray-200 dark:bg-white/10" />

        <div className="py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-[#525252] dark:text-gray-400">
            © {new Date().getFullYear()}. All rights reserved.
          </p>

          <p className="text-sm text-[#525252] dark:text-gray-400 flex items-center gap-1">
            Made with <Heart className="w-3 h-3 text-red-500 fill-red-500" /> for
            creators everywhere
          </p>
        </div>
      </div>
    </footer>
  );
}