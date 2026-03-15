import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

interface Message {
  role: "user" | "assistant" | "system";
  content: any;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

/* ---------------- DATABASE FUNCTIONS ---------------- */

async function getFreelancers(limit: number = 20) {
  const { data } = await supabase
    .from("freelancers")
    .select("*")
    .order("rating", { ascending: false })
    .limit(limit);

  return data || [];
}

async function getWebDevelopers(limit: number = 20) {
  const { data } = await supabase
    .from("freelancers")
    .select("*")
    .or("title.ilike.%web%,skills.ilike.%web%,skills.ilike.%react%,skills.ilike.%javascript%")
    .order("rating", { ascending: false })
    .limit(limit);

  return data || [];
}

async function getProducts(limit: number = 20) {
  const { data } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  return data || [];
}

async function getBlogs(limit: number = 20) {
  const { data } = await supabase
    .from("blogs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  return data || [];
}

/* ---------------- LANGUAGE DETECTION ---------------- */

function detectLanguage(text: string) {
  if (!text) return "english";

  const lower = text.toLowerCase();

  const tunisianLatin = [
    "slm",
    "3lech",
    "barcha",
    "nheb",
    "chnowa",
    "kifech",
    "labes",
    "3andi",
    "9adeh",
    "brabi"
  ];

  if (tunisianLatin.some(w => lower.includes(w))) return "tunisian";

  const arabic = /[\u0600-\u06FF]/;

  if (arabic.test(text)) {
    const tunisianWords = [
      "شنوا",
      "شكون",
      "برشا",
      "علاش",
      "نحب",
      "قداش",
      "كيفاش",
      "وين",
      "شبيك"
    ];

    if (tunisianWords.some(w => text.includes(w))) {
      return "tunisian";
    }

    return "arabic";
  }

  if (/\b(bonjour|merci|vous|pour|avec)\b/i.test(text)) return "french";
  if (/\b(hola|gracias|cómo|para)\b/i.test(text)) return "spanish";
  if (/\b(hallo|danke|bitte|ich)\b/i.test(text)) return "german";

  return "english";
}

/* ---------------- SYSTEM PROMPT ---------------- */

async function getSystemPrompt() {
  try {
    const path = join(process.cwd(), "ai", "system-prompt.txt");
    return readFileSync(path, "utf-8");
  } catch {
    return `
You are NexusHub AI.

STRICT DATABASE RULES:

If DATABASE_CONTEXT exists you MUST ONLY use that data.

Never invent:
- freelancers
- ratings
- reviews
- products
- prices

Only select items from DATABASE_CONTEXT.

When recommending freelancers prioritize:
1. rating
2. completed_projects
3. reviews

Never output internal database fields like:
id, slug, timestamps.

Summarize information clearly for users.

TUNISIAN LANGUAGE STYLE GUIDE:

If the user speaks Tunisian Arabic (Derja), respond ONLY in Tunisian dialect.

Use expressions like:
- slm
- chnowa
- kifech
- nheb
- barcha
- ya3tik sa7a
- m3allem

Example conversation:

User: slm
Assistant: slm! labes? kifesh najem n3awnek lyoum?

User: nheb web developer
Assistant: behi! fama barcha web developers behin. tnajem tchouf eli 3andhom a3la rating.

Avoid Modern Standard Arabic and avoid switching to English if the user wrote in Derja.
`;
  }
}

/* ---------------- FALLBACK ---------------- */

function getFallbackResponse() {
  return `⚠️ AI moch mawjouda taw.<br><br>
tnajem tzour:<br>
• <a href="/marketplace">Marketplace</a><br>
• <a href="/freelancers">Freelancers</a><br>
• <a href="/pricing">Pricing</a><br>
• <a href="/contact">Contact</a>`;
}

/* ---------------- MAIN API ---------------- */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const userMessage = body.message || "";
    const history = body.history || [];

    const lower = userMessage.toLowerCase();

    /* Tunisian greeting override */

    if (["slm", "salam", "salem"].includes(lower)) {
      return NextResponse.json({
        reply:
          "slm! labes? kifesh najem n3awnek lyoum? tnajem tal9a freelancers, produits, domains w blogs fel plateforme."
      });
    }

    const detectedLanguage = detectLanguage(userMessage);

    const systemPrompt = await getSystemPrompt();

    /* -------- KEYWORD DETECTION -------- */

    const webDevKeywords = [
      "web developer",
      "frontend",
      "backend",
      "react",
      "javascript",
      "website developer"
    ];

    const freelancerKeywords = [
      "freelancer",
      "developer",
      "programmer",
      "designer",
      "engineer"
    ];

    const productKeywords = ["product", "template", "theme"];
    const blogKeywords = ["blog", "article", "post"];

    let databaseContext: any = {};

    /* -------- DATABASE FETCH -------- */

    if (webDevKeywords.some(k => lower.includes(k))) {
      databaseContext.webDevelopers = await getWebDevelopers();
    } else if (freelancerKeywords.some(k => lower.includes(k))) {
      databaseContext.freelancers = await getFreelancers();
    }

    if (productKeywords.some(k => lower.includes(k))) {
      databaseContext.products = await getProducts();
    }

    if (blogKeywords.some(k => lower.includes(k))) {
      databaseContext.blogs = await getBlogs();
    }

    /* -------- LANGUAGE INSTRUCTION -------- */

    let languageInstruction = "Respond in English.";

    if (detectedLanguage === "tunisian") {
      languageInstruction =
        "Respond ONLY in Tunisian Arabic (Derja). Do not switch to English or Standard Arabic.";
    }

    if (detectedLanguage === "arabic")
      languageInstruction = "Respond in Arabic.";

    if (detectedLanguage === "french") languageInstruction = "Respond in French.";
    if (detectedLanguage === "german") languageInstruction = "Respond in German.";
    if (detectedLanguage === "spanish") languageInstruction = "Respond in Spanish.";

    /* -------- BUILD MESSAGES -------- */

    const messages: Message[] = [
      {
        role: "system",
        content:
          languageInstruction +
          "\n\n" +
          systemPrompt +
          "\n\nDATABASE_CONTEXT:\n" +
          JSON.stringify(databaseContext)
      },
      ...history,
      {
        role: "user",
        content: userMessage
      }
    ];

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        reply: "AI service not configured."
      });
    }

    /* -------- OPENROUTER CALL -------- */

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer":
            process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
          "X-Title":
            "AI assistant for a SaaS marketplace platform built with Next.js and Supabase"
        },
        body: JSON.stringify({
          model: "arcee-ai/trinity-large-preview:free",
          messages,
          temperature: 0.4,
          max_tokens: 1200
        })
      }
    );

    const data = await response.json();

    if (!data.choices || data.choices.length === 0) {
      return NextResponse.json({
        reply: getFallbackResponse()
      });
    }

    let reply = data.choices[0].message.content;

    reply = reply.replace(/\*\*/g, "").replace(/\n/g, "<br>");

    return NextResponse.json({
      reply
    });
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      {
        reply: "saret mochkel. 3awed jarreb."
      },
      { status: 500 }
    );
  }
}