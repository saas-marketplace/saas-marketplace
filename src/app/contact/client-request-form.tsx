"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

interface ClientRequestFormProps {
  isAuthenticated: boolean;
}

export default function ClientRequestForm({ isAuthenticated }: ClientRequestFormProps) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const router = useRouter();
  const supabase = createClient();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Guest protection - redirect to register
    if (!isAuthenticated) {
      router.push("/auth/register");
      return;
    }

    if (!name || !email || !message) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/register");
        return;
      }

      // Create request in the new requests table via API
      const response = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Contact from ${name}`,
          message: message,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send request");
      }

      toast({
        title: "Request sent!",
        description: "We'll get back to you soon.",
      });
      
      // Clear form and redirect to user's requests page
      setName("");
      setEmail("");
      setMessage("");
      router.push("/requests");
    } catch (error: any) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send your request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Guest view - show login/register prompt
  if (!isAuthenticated) {
    return (
      <div className="text-center py-8 bg-white rounded-2xl border border-cyan-100 shadow-lg p-8">
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2 text-slate-900">Sign in to Contact Us</h3>
          <p className="text-slate-500">
            You need to be signed in to send us a message.
          </p>
        </div>
        <div className="flex gap-2 justify-center">
          <Button asChild className="bg-gradient-to-r from-[#249fd3] to-cyan-400 hover:from-[#1e8ac0] hover:to-cyan-500 shadow-lg shadow-cyan-500/25">
            <a href="/auth/login">Sign In</a>
          </Button>
          <Button variant="outline" asChild className="border-cyan-200 text-slate-600 hover:bg-cyan-50 hover:text-[#249fd3] hover:border-cyan-300">
            <a href="/auth/register">Register</a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white rounded-2xl border border-cyan-100 shadow-lg p-6">
      <div>
        <label htmlFor="name" className="block text-sm font-medium mb-2 text-slate-700">
          Name
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-cyan-200 bg-cyan-50/30 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#249fd3] focus:border-transparent transition-all duration-200"
          placeholder="Your name"
        />
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-2 text-slate-700">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-cyan-200 bg-cyan-50/30 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#249fd3] focus:border-transparent transition-all duration-200"
          placeholder="your@email.com"
        />
      </div>
      <div>
        <label htmlFor="message" className="block text-sm font-medium mb-2 text-slate-700">
          Message
        </label>
        <textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-cyan-200 bg-cyan-50/30 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#249fd3] focus:border-transparent transition-all duration-200 min-h-[120px] resize-none"
          placeholder="How can we help you?"
        />
      </div>
      <Button 
        type="submit" 
        className="w-full bg-gradient-to-r from-[#249fd3] to-cyan-400 hover:from-[#1e8ac0] hover:to-cyan-500 shadow-lg shadow-cyan-500/25 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
        disabled={loading}
      >
        {loading ? "Sending..." : "Send Message"}
      </Button>
    </form>
  );
}
