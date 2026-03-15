"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  image?: string;
}

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function formatMessage(content: string) {
  if (!content) return "";
  return content
    .replace(/\n/g, "<br>")
    .replace(
      /(https?:\/\/[^\s<]+)/g,
      '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
    );
}

export default function AIChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFirstOpen, setIsFirstOpen] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesRef = useRef<Message[]>([]);
  
  // Keep ref in sync with state
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => scrollToBottom(), [messages, scrollToBottom]);
  useEffect(() => {
    if (!open) return;
    const timeoutId = setTimeout(() => inputRef.current?.focus(), 150);
    return () => clearTimeout(timeoutId);
  }, [open]);

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setImage(reader.result as string);
    reader.readAsDataURL(file);
  }

  function handleOpen() {
    setOpen(true);
    if (isFirstOpen) {
      setIsFirstOpen(false);
      setTimeout(() => {
        addAIMessage(
          `👋 Hello! I'm your <strong> AI Assistant</strong>.<br>` +
            `I can help you with products, freelancers, domains, blogs, and dashboard tasks.<br>` +
            `<em style="opacity:0.8;">You can also send me screenshots or images.</em>`
        );
      }, 500);
    }
  }

  function addAIMessage(content: string) {
    const validContent = content || "Sorry, I couldn't process that request.";
    setMessages((prev) => [...prev, { id: uid(), role: "assistant", content: validContent }]);
  }

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text && !image) return;
    if (isLoading) return;

    // Create the new user message object
    const newUserMessage = { id: uid(), role: "user" as const, content: text, image: image || undefined };
    
    // Add user message to state
    setMessages((prev) => [...prev, newUserMessage]);

    setInput("");
    setImage(null);
    setIsLoading(true);

    try {
      // Send message to API in the correct format
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: text,
          pageContent: "",
          attachments: image ? [{ type: "image", data: image }] : []
        }),
      });

      const data = await res.json();
      
      // Check for specific error messages from the server
      if (!res.ok || data.error) {
        const errorMsg = data.error?.message || data.reply || `Server error (${res.status})`;
        
        // Provide helpful context based on the error
        let helpfulMessage = errorMsg;
        if (errorMsg.includes("unavailable") || errorMsg.includes("error")) {
          helpfulMessage = errorMsg + "<br><br>💡 You can also try:<br>• Browsing our <a href='/marketplace' target='_blank'>marketplace</a><br>• Viewing <a href='/freelancers' target='_blank'>freelancers</a><br>• Contacting <a href='/contact' target='_blank'>support</a>";
        }
        
        addAIMessage(`⚠️ ${helpfulMessage}`);
        return;
      }

      if (!data.reply) {
        addAIMessage("⚠️ I didn't receive a response. Please try again!");
        return;
      }

      addAIMessage(data.reply);
    } catch (err) {
      console.error(err);
      addAIMessage("⚠️ Something went wrong. Please try again!");
    } finally {
      setIsLoading(false);
    }
  }, [input, image, isLoading]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      {!open && (
        <div className="aiw-icon" onClick={handleOpen} role="button">
          💬
        </div>
      )}

      {open && (
        <div className="aiw-widget">
          <div className="aiw-header">
            <div>
              <div className="aiw-header-title">AI Support</div>
              <div className="aiw-header-status">Online</div>
            </div>
            <button className="aiw-close" onClick={() => setOpen(false)}>
              ×
            </button>
          </div>

          <div className="aiw-messages">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`aiw-msg ${msg.role === "user" ? "aiw-msg-user" : "aiw-msg-ai"}`}
              >
                {msg.image && (
                  <img
                    src={msg.image}
                    alt="uploaded"
                    style={{ maxWidth: "100%", borderRadius: "10px", marginBottom: "6px" }}
                  />
                )}
                <div dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }} />
              </div>
            ))}

            {isLoading && (
              <div className="aiw-msg aiw-msg-ai aiw-typing">
                <div className="aiw-dot" />
                <div className="aiw-dot" />
                <div className="aiw-dot" />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {image && (
            <div style={{ padding: "10px" }}>
              <img src={image} style={{ maxHeight: "120px", borderRadius: "10px" }} />
            </div>
          )}

          <div className="aiw-input-area">
            <div className="aiw-input-row">
              <label className="aiw-upload">
                📎
                <input type="file" accept="image/*" hidden onChange={handleImageUpload} />
              </label>

              <input
                ref={inputRef}
                className="aiw-input"
                type="text"
                placeholder="Ask me anything..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
              />

              <button
                className="aiw-send-btn"
                onClick={sendMessage}
                disabled={isLoading || (!input.trim() && !image)}
              >
                ➤
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


// ── Styles ──────────────────────────────────────
const STYLES = `
.aiw-icon{position:fixed;bottom:20px;right:20px;width:60px;height:60px;background:#000;color:#fff;display:flex;align-items:center;justify-content:center;border-radius:50%;cursor:pointer;font-size:24px;z-index:9999;}
.aiw-widget{position:fixed;bottom:20px;right:20px;width:380px;height:520px;background:#000;border-radius:16px;display:flex;flex-direction:column;overflow:hidden;z-index:9999;border:1px solid #333;}
.aiw-header{display:flex;justify-content:space-between;padding:14px;border-bottom:1px solid #333;color:#fff;}
.aiw-header-title{color:#9aedff;font-weight:600;}
.aiw-header-status{font-size:12px;color:#4ade80;}
.aiw-close{background:none;border:none;color:#fff;font-size:20px;cursor:pointer;}
.aiw-messages{flex:1;overflow-y:auto;padding:14px;background:#0a0a0a;display:flex;flex-direction:column;gap:10px;}
.aiw-msg{padding:10px 14px;border-radius:12px;font-size:13px;max-width:85%;}
.aiw-msg-user{align-self:flex-end;background:#9aedff;color:#000;}
.aiw-msg-ai{align-self:flex-start;background:#1a1a1a;color:#eee;border:1px solid #333;}
.aiw-input-area{padding:12px;border-top:1px solid #333;background:#0a0a0a;}
.aiw-input-row{display:flex;gap:8px;align-items:center;}
.aiw-input{flex:1;padding:10px;border-radius:10px;border:1px solid #333;background:#1a1a1a;color:#fff;}
.aiw-upload{cursor:pointer;font-size:18px;color:#9aedff;}
.aiw-send-btn{background:#9aedff;border:none;border-radius:10px;width:38px;height:38px;cursor:pointer;}
.aiw-typing{display:flex;gap:6px;}
.aiw-dot{width:6px;height:6px;background:#9aedff;border-radius:50%;animation:blink 1.4s infinite;}
@keyframes blink{0%,100%{opacity:0.2}50%{opacity:1}}
`;