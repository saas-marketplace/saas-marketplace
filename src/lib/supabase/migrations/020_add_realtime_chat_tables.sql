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




Fix the data fetching and real-time behavior to achieve fast navigation and no manual refresh in my Next.js app.

⚠️ Problems:

Sometimes I need to reload the page to see new data

Real-time updates are inconsistent

Navigation is not always instant (stale data appears)

Goal:

Make the app behave like a fully real-time system:

No refresh needed ❌

Instant updates ✅

Smooth navigation between pages ✅

1. Disable ALL caching (CRITICAL)
Fix all fetch calls:
fetch(url, {
  cache: "no-store",
});
For Next.js pages / routes:

Add:

export const dynamic = "force-dynamic";
If using revalidation:

Remove or disable:

revalidate: ...
2. Move chat data to CLIENT SIDE only
What to do:

Do NOT rely on server-rendered messages for UI

Fetch messages inside useEffect

Then use realtime to keep them updated

Correct pattern:
useEffect(() => {
  fetchMessages();        // initial load
  subscribeToMessages();  // realtime updates
}, [conversationId]);
3. Fix Realtime Subscription (VERY IMPORTANT)
Ensure:

Only ONE subscription per conversation

Correct filter by conversation_id

Implementation:
const channel = supabase
  .channel("messages")
  .on(
    "postgres_changes",
    {
      event: "INSERT",
      schema: "public",
      table: "messages",
      filter: `conversation_id=eq.${conversationId}`,
    },
    (payload) => {
      setMessages((prev) => {
        const exists = prev.some((m) => m.id === payload.new.id);
        if (exists) return prev;
        return [...prev, payload.new];
      });
    }
  )
  .subscribe();
Cleanup (IMPORTANT):
return () => {
  supabase.removeChannel(channel);
};
4. NEVER overwrite realtime state
❌ Wrong:
setMessages(fetchedMessages);
✅ Correct:
setMessages((prev) => {
  const merged = [...prev];

  fetchedMessages.forEach((msg) => {
    if (!merged.some((m) => m.id === msg.id)) {
      merged.push(msg);
    }
  });

  return merged;
});
5. Ensure navigation does NOT refetch stale data

Do NOT rely on cached server props

Keep state in client

Reuse state when switching conversations if possible

6. Debug (must add temporarily)
console.log("Realtime:", payload.new);

If not triggered → subscription issue

If triggered but UI not updating → state issue

7. Final Rules

One source of truth = client state + realtime

No duplicated subscriptions

No cached fetches

No manual refresh needed

Expected Result:

Messages appear instantly ⚡

No reload required ❌

Navigation is smooth and fast 🚀

Data always fresh and synced ✅
