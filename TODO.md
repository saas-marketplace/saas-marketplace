# Fix Duplicate Supabase Auth Requests - TODO Checklist

## Plan Status: ✅ Approved by user

**Goal:** Centralize session fetching in `useUserPermissions.ts` → 1 auth request on load, 0 duplicates.

### Steps (in order):

- [x] **1. Create `src/hooks/useSession.ts`** (renamed/enhanced from useUserPermissions)  
  Added `sessionRef` guard, `getSession()`, exposes `user`, `session`, permissions.

- [x] **2. Update `src/components/providers/auth-provider.tsx`**  
  Removed `getSession()`/`onAuthStateChange`, uses `useSession()`.

**Current Progress: Step 3**

- [ ] **3. Fix `src/components/dashboard/Topbar.tsx`**  
  Remove direct `getUser()` calls, use `useUserPermissions()`, adapt profile/notifications.

- [ ] **4. Verify other components**  
  Check Sidebar (already good), dashboard pages for `useAuth()` → migrate if needed.

- [ ] **5. Test**  
  `npm run dev`  
  ✅ Network tab: 1 `getSession()` request only  
  ✅ No duplicate calls in Console/Network  
  ✅ Permissions work  
  ✅ Realtime notifications work  
  ✅ Login/logout works

**Current Progress: Starting Step 1**

---

*Completed steps will be marked here after each update.*

