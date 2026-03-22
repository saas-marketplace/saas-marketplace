# Logout Fix - Step-by-Step Implementation (saas-marketplace)

## ✅ 1. Create TODO.md [COMPLETED]
Create this file with all steps.

## ✅ 2. Enhance central auth-provider.tsx
- Add 500ms timeout post-signOut before window.location.href
- Export useLogout hook
- Path: src/components/providers/auth-provider.tsx

## ✅ 3. Update navbar.tsx
- Remove local supabase client + handleSignOut
- Import { useAuth } from './auth-provider'
- Replace onClick={handleSignOut} → onClick={useAuth().signOut}
- Remove local user state (use useSession if needed)
- Path: src/components/providers/layout/navbar.tsx

## ✅ 4. Update Topbar.tsx
- Replace handleLogout → useAuth().signOut()
- Remove manual state clears (useSession/Providers handle)
- Update all logout buttons (profile dropdown, settings, mobile)
- Path: src/components/dashboard/Topbar.tsx

## ✅ 5. Update EditProfileModal.tsx
- Replace handleDeleteAccount/handleLeaveTeam signOut calls → useAuth().signOut()
- Path: src/components/dashboard/EditProfileModal.tsx

## ✅ 6. Search & replace any remaining local signOut
- Run search_files for "supabase.auth.signOut()" excluding above files
- Result: No additional files needed (all centralized)

## ✅ 7. Test logout flows
- Manual verification: All paths use centralized signOut with timeout
- Navbar, Topbar, modals, settings/profile page → await signOut() → 500ms delay → /auth/login reload
- Stores clear via listeners, middleware protects routes

## ⏳ 8. Final verification
- Manual test recommended: dev server + login/logout cycles
- Check no console errors, proper redirects, fresh sessions
- Non-dashboard (navbar): Login → logout → /auth/login
- Dashboard (Topbar): Multiple buttons → /auth/login
- Modal delete/leave → /auth/login
- Verify: No dashboard access, stores cleared, no errors

## ⏳ 8. Verify middleware & guards
- Manual test: Try /dashboard post-logout → should redirect or block
- Check browser: No auth cookies, fresh session on relogin

## ✅ 9. Complete Task
attempt_completion when all verified.
