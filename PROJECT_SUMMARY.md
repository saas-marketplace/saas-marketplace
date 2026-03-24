# SaaS Marketplace - Project Summary

## Overview

This is a comprehensive SaaS marketplace application built with Next.js, Supabase (PostgreSQL + Auth), and TypeScript. The platform connects freelancers with clients, allowing product browsing, requests management, team collaboration, and administrative control.

---

## Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | Next.js 14 (App Router) |
| **Language** | TypeScript |
| **Database** | Supabase (PostgreSQL) |
| **Auth** | Supabase Auth |
| **Styling** | Tailwind CSS |
| **Icons** | Lucide React |
| **State** | React Context + Zustand (cart) |
| **Deployment** | Netlify |

---

## Project Structure

```
saas-marketplace/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── auth/               # Authentication (login, signup)
│   │   ├── dashboard/           # Admin/management dashboards
│   │   │   ├── settings/        # Profile, permissions, team, utilities
│   │   │   ├── products/       # Product management
│   │   │   ├── freelancers/    # Freelancer management
│   │   │   ├── requests/       # Client requests management
│   │   │   ├── team/           # Team management
│   │   │   └── blog/           # Blog management
│   │   ├── marketplace/        # Public marketplace
│   │   ├── requests/           # Client request portal
│   │   ├── api/               # API routes
│   │   └── ...                 # Other pages (pricing, about, contact, etc.)
│   │
│   ├── components/
│   │   ├── providers/          # React Context providers
│   │   │   ├── auth-provider.tsx    # Auth & user context
│   │   │   └── theme-provider.tsx    # Theme context
│   │   ├── dashboard/          # Dashboard-specific components
│   │   ├── ui/                 # Reusable UI components
│   │   └── requests/           # Request-related components
│   │
│   ├── lib/                    # Utilities & services
│   │   ├── supabase/           # Supabase client config
│   │   ├── services/           # API service functions
│   │   └── auth-lock-manager.ts # Auth utilities (simplified)
│   │
│   ├── hooks/                  # Custom React hooks
│   │   ├── useSession.ts       # Session & permissions hook
│   │   └── useAccessControl.ts # Access control hook
│   │
│   ├── stores/                 # State management
│   │   ├── cart-store.ts       # Shopping cart (Zustand)
│   │   └── cart-context.tsx   # Cart context
│   │
│   └── types/                  # TypeScript types
│
├── public/                     # Static assets
└── package.json                # Dependencies
```

---

## Core Features

### 1. Authentication System

**File:** [`src/components/providers/auth-provider.tsx`](saas-marketplace/src/components/providers/auth-provider.tsx)

- Supabase Auth integration (email/password)
- Session management via React Context
- User roles: `user`, `admin`, `super_admin`
- Permission system per role
- Auth state listeners for real-time updates

**Key Exports:**
- `AuthProvider` - Wraps app with auth context
- `useAuth()` - Access auth state
- `useUser()` - Get current user
- `useHasRole()` - Role-based access helper

### 2. User Roles & Permissions

| Role | Access Level |
|------|-------------|
| `user` | Browse marketplace, make requests |
| `admin` | Dashboard access, team management |
| `super_admin` | Full system access, user management |

**Permission Structure:**
```typescript
{
  dashboard: ['view'],
  domains: ['view', 'create', 'update', 'delete'],
  freelancers: ['view', 'create', 'update', 'delete'],
  products: ['view', 'create', 'update', 'delete'],
  blogs: ['view', 'create', 'update', 'delete'],
  requests: ['view', 'create', 'delete'],
  team: ['view', 'create', 'update', 'delete'],
  users: ['view', 'create', 'update', 'delete'], // super_admin only
}
```

### 3. Marketplace

**Files:**
- [`src/app/marketplace/page.tsx`](saas-marketplace/src/app/marketplace/page.tsx) - Product listing
- [`src/app/marketplace/[slug]/page.tsx`](saas-marketplace/src/app/marketplace/[slug]/page.tsx) - Product details

**Features:**
- Product grid with filtering
- Shopping cart (Zustand store)
- Product categories
- Freelancer profiles linked to products

### 4. Requests System

**Files:**
- [`src/app/requests/page.tsx`](saas-marketplace/src/app/requests/page.tsx) - Client request portal
- [`src/app/dashboard/requests/page.tsx`](saas-marketplace/src/app/dashboard/requests/page.tsx) - Admin request management

**Features:**
- Client-submitted requests
- Real-time messaging between clients and admins
- Request status tracking (pending, in-progress, completed)
- Freelancer assignment

### 5. Dashboard & Settings

**Dashboard Pages:**
- `dashboard/products` - Product CRUD
- `dashboard/freelancers` - Freelancer management
- `dashboard/blog` - Blog content management
- `dashboard/team` - Team member management
- `dashboard/requests` - Request handling
- `dashboard/users` - User management (super_admin)

**Settings Pages:**
- `settings/profile` - Profile & password change
- `settings/permissions` - Permission configuration
- `settings/team` - Team settings
- `settings/utilities` - System utilities

### 6. Password Change Flow

**File:** [`src/app/dashboard/settings/profile/page.tsx`](saas-marketplace/src/app/dashboard/settings/profile/page.tsx)

**Logic:**
1. User enters current password
2. Re-authenticate with Supabase (`signInWithPassword`)
3. Update password (`updateUser`)
4. Redirect with success flag

**Security:** Uses global `isPasswordChanging` flag to prevent auth listener conflicts during the password change operation.

---

## Database Schema (Supabase)

### Tables

| Table | Purpose |
|-------|---------|
| `users` | User accounts with roles |
| `team_members` | Team/employee profiles |
| `products` | Marketplace products |
| `freelancers` | Freelancer profiles |
| `requests` | Client requests |
| `request_messages` | Chat messages for requests |
| `contact_submissions` | Contact form submissions |
| `audit_logs` | System audit trail |
| `domains` | Custom domain management |
| `notifications` | User notifications |

---

## API Routes

| Endpoint | Purpose |
|----------|---------|
| `/api/users` | User CRUD operations |
| `/api/team-members` | Team management |
| `/api/requests` | Request handling |
| `/api/notifications` | Notification management |
| `/api/permissions` | Permission management |
| `/api/checkout` | Payment processing |
| `/api/webhooks/stripe` | Stripe webhooks |
| `/api/system-settings` | System configuration |
| `/api/audit-logs` | Audit logging |

---

## State Management

### Auth State (Context)
- User session
- User profile & role
- Permissions
- Loading states

### Cart State (Zustand)
```typescript
interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}
```

---

## Key Utilities

### Supabase Client
**File:** [`src/lib/supabase/client.ts`](saas-marketplace/src/lib/supabase/client.ts)

- Browser client for client-side operations
- Server client for API routes

### Auth Lock Manager
**File:** [`src/lib/auth-lock-manager.ts`](saas-marketplace/src/lib/auth-lock-manager.ts)

- Simplified auth utilities
- Session/user getter wrappers
- **Note:** Complex locking removed to prevent password change race conditions

---

## Important Patterns

### 1. Password Change Race Condition Prevention
```typescript
// In auth-provider.tsx
export let isPasswordChanging = false;
export function setPasswordChanging(value: boolean) {
  isPasswordChanging = value;
}

// In onAuthStateChange
if (isPasswordChanging) {
  console.log('[AUTH IGNORED DURING PASSWORD CHANGE]', event);
  return;
}
```

### 2. Role-Based Access
```typescript
const { user } = useAuth();
if (user?.role === 'super_admin') {
  // Show admin features
}
```

### 3. Database Queries
```typescript
const { data } = await supabase
  .from('table')
  .select('columns')
  .eq('field', value);
```

---

## Recent Fixes

### Password Change Race Condition (March 2026)
- Removed complex AuthLockManager
- Added global `isPasswordChanging` flag
- Simplified password change flow
- Auth events ignored during password change

---

## Dependencies

```json
{
  "next": "^14.0.0",
  "@supabase/supabase-js": "^2.39.0",
  "@supabase/ssr": "^0.1.0",
  "react": "^18.2.0",
  "zustand": "^4.4.0",
  "lucide-react": "^0.294.0",
  "tailwindcss": "^3.3.0"
}
```

---

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local
# Add Supabase URL and Anon Key

# Run development server
npm run dev
```

---

## Build & Deploy

```bash
# Build for production
npm run build

# Deploy to Netlify
netlify deploy --prod
```

---

*Last Updated: March 2026*
