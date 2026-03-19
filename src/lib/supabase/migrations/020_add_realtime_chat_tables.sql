-- Create request_typing table to track typing status
CREATE TABLE IF NOT EXISTS request_typing (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_typing BOOLEAN DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(request_id, user_id)
);

-- Enable RLS on request_typing
ALTER TABLE request_typing ENABLE ROW LEVEL SECURITY;

-- Create policy for users to update their own typing status
CREATE POLICY "Users can update own typing status"
  ON request_typing
  FOR ALL
  USING (auth.uid() = user_id);

-- Create policy for authenticated users to read typing status
CREATE POLICY "Authenticated users can read typing status"
  ON request_typing
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Create user_status table to track online/offline status
CREATE TABLE IF NOT EXISTS user_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  is_online BOOLEAN DEFAULT false,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on user_status
ALTER TABLE user_status ENABLE ROW LEVEL SECURITY;

-- Create policy for users to update their own status
CREATE POLICY "Users can update own status"
  ON user_status
  FOR ALL
  USING (auth.uid() = user_id);

-- Create policy for authenticated users to read user status
CREATE POLICY "Authenticated users can read user status"
  ON user_status
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_request_typing_request_id ON request_typing(request_id);
CREATE INDEX IF NOT EXISTS idx_request_typing_user_id ON request_typing(user_id);
CREATE INDEX IF NOT EXISTS idx_user_status_user_id ON user_status(user_id);

-- Enable realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE request_typing;
ALTER PUBLICATION supabase_realtime ADD TABLE user_status;



Optimize the chat and request system to be fully production-ready, minimizing reloads and improving real-time reliability on free hosting (Supabase + Netlify) without changing UI.

Goals:

Ensure instant real-time messaging for both User and Admin

Keep presence / online / last seen accurate for both

Ensure typing indicators work reliably

Minimize need for manual refresh in production

Optimize for free Supabase + Netlify limitations

1. Force client-side realtime + no caching

All message fetching should use client-side logic only

Use:

fetch("/api/messages", { cache: "no-store" });

For Next.js routes, ensure dynamic fetching:

export const dynamic = "force-dynamic";
2. Realtime subscription improvements

Only one subscription per conversation per client

Filter by conversation ID:

supabase
  .channel("messages")
  .on(
    "postgres_changes",
    { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
    (payload) => {
      setMessages((prev) => {
        if (prev.some(m => m.id === payload.new.id)) return prev;
        return [...prev, payload.new];
      });
    }
  )
  .subscribe();

Reconnect logic if subscription drops

3. Presence / Online / Last Seen

Use Supabase Presence channel for both user and admin

Update onlineStatus on sync events

Update last_seen on leave / unload:

window.addEventListener("beforeunload", async () => {
  await supabase
    .from("users")
    .update({ last_seen: new Date().toISOString() })
    .eq("id", currentUser.id);
});

Display online/last seen dynamically under sender name

Always override by typing indicator

4. Typing indicator

Broadcast typing on input change

Stop typing after 1–2 seconds of inactivity

Show "Typing..." under sender’s name

Works for both sides:

channel.on("broadcast", { event: "typing" }, (payload) => {
  if (payload.payload.conversationId !== conversationId) return;
  setTypingUser(payload.payload.isTyping ? payload.payload.userId : null);
});
5. Prevent duplicate messages

Only insert messages into state via realtime subscription

Optional safety check:

setMessages(prev => {
  if(prev.some(m => m.id === newMessage.id)) return prev;
  return [...prev, newMessage];
});
6. Optimize for free-tier limitations

Keep subscriptions minimal

Reduce heavy queries → filter by conversation ID

Reconnect on disconnect (Supabase free plan sometimes drops connections)

Show temporary loading / retry if update is delayed

7. Expected production behavior

Real-time chat is instant ⚡

Online / last seen is accurate ✅

Typing indicator works live ✅

Minimal reloads required

Compatible with free Supabase + Netlify

No UI changes, works for both light and dark themes