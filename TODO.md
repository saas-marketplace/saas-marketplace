### 🔧 FULL ARCHITECTURE REFACTOR – NEXT.JS + SUPABASE (NO BREAKING CHANGES)

#### 🎯 Objective

Refactor the entire project architecture to achieve:

* No infinite loops
* No race conditions
* No Supabase auth lock issues
* No duplicate requests
* Predictable and stable behavior
* Faster navigation and rendering

⚠️ IMPORTANT:

* Do NOT break existing features
* Do NOT change business logic
* Do NOT change database schema
* Only improve structure, flow, and performance

---

# 🔴 1. AUTH SYSTEM (CRITICAL FIX)

### Problem:

Multiple auth calls causing:

* `[AuthLockManager] Lock timeout`
* race conditions
* UI freeze

### Tasks:

* Use ONLY `AuthProvider` as the single auth source
* Remove ALL direct calls to:

  * `supabase.auth.getSession()`
  * duplicate session hooks (like `useSession`)
* Ensure auth state is initialized ONCE and shared globally

### Rule:

All components must use:

```ts
const { user, loading } = useAuth();
```

---

# 🔴 2. REMOVE AUTH RACE CONDITIONS

### Tasks:

* Ensure `getSession()` runs ONLY once on app load
* Use `onAuthStateChange` to sync updates
* Prevent multiple concurrent auth calls

---

# 🟠 3. CENTRALIZE DATA FETCHING

### Problem:

Data is fetched in pages, hooks, and components → duplicates

### Tasks:

* Create: `src/lib/services/`
* Move ALL database calls into service files

Example:

```ts
// lib/services/users.ts
export async function getUsers() {
  return await supabase.from("users").select("*");
}
```

### Rule:

* ❌ No Supabase queries inside components
* ❌ No Supabase queries inside UI hooks

---

# 🟠 4. SERVER-FIRST DATA FETCHING

### Tasks:

* Convert dashboard pages to SERVER COMPONENTS where possible
* Fetch data directly in pages (not useEffect)

Example:

```tsx
export default async function Page() {
  const users = await getUsers();
  return <UsersTable users={users} />;
}
```

---

# 🟡 5. REMOVE INFINITE LOOPS

### Problem:

useEffect triggers re-fetch repeatedly

### Tasks:

* Remove all uncontrolled `useEffect` fetch calls
* If client-side fetch is required, guard it:

```ts
const fetched = useRef(false);

useEffect(() => {
  if (!user || fetched.current) return;
  fetched.current = true;
  fetchData();
}, [user]);
```

---

# 🟡 6. ELIMINATE DUPLICATE REQUESTS

### Tasks:

* Ensure each resource is fetched ONLY once per page
* Reuse fetched data instead of re-fetching
* Apply request deduplication globally

---

# 🟡 7. CLEAN COMPONENT RESPONSIBILITY

### Tasks:

* Components must be PURE UI
* Move:

  * API calls ❌
  * business logic ❌
    OUT of components

---

# 🟢 8. SIMPLIFY CONTEXT SYSTEM

### Problem:

Too many contexts causing re-renders

### Tasks:

* Keep ONLY:

  * AuthProvider
  * Cart (if needed)
* Merge:

  * permissions
  * user status
    INTO one unified user state

---

# 🟢 9. FIX MIDDLEWARE

### Tasks:

* Middleware should:

  * check authentication
  * check banned status
* Must be lightweight
* Avoid multiple DB calls

---

# 🟢 10. REMOVE OVER-ENGINEERING

### Tasks:

* Remove or simplify:

  * custom auth lock manager
  * unnecessary polling systems
* Rely on Supabase built-in behavior

---

# ⚡ 11. PERFORMANCE OPTIMIZATION

### Tasks:

* Avoid blocking navigation with heavy logic
* Use parallel fetching where needed:

```ts
await Promise.all([...])
```

* Add proper loading states
* Reduce unnecessary re-renders

---

# ✅ EXPECTED RESULT

After refactor:

* No more auth lock errors
* No infinite loops
* No repeated requests
* Smooth dashboard navigation
* Stable and predictable UI

---

# 🚨 FINAL RULES

* Do NOT rewrite everything from scratch
* Do NOT break UI
* Do NOT remove features
* Only refactor structure and flow

Focus on stability, performance, and clean architecture.
