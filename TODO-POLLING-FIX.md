# Fix Overlapping Supabase Polling

## Information Gathered
- `suspended-context.tsx`: setInterval(checkStatus, 5000), DB write in checkStatus, client recreate.
- `useAccessControl.ts`: setInterval(fetchPermissions, 5000), client recreate.
- No other polling (search_files 0 results).
- Issues: concurrent requests, "steal lock" AbortError, slow nav.
- RLS/DB: team_members queries.

## Plan
1. [x] Create TODO (done)
2. Edit suspended-context.tsx: add ref lock, remove interval, add auth.onAuthStateChange + realtime team_members sub.
3. Edit useAccessControl.ts: add ref lock, remove interval, auth listener + realtime sub.
4. Centralize supabase client use.
5. Test no overlaps, real-time updates.

## Dependent Files
- saas-marketplace/src/components/ui/suspended-context.tsx
- saas-marketplace/src/hooks/useAccessControl.ts

## Followup
- Run `npm run dev`, login as admin, check console no errors.
- Test suspend/restore real-time.

