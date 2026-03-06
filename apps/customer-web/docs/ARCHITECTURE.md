# Architecture Overview

## Application Flow

```
┌──────────────────────────────────────────────────────────┐
│                    Root Layout                           │
│                  (app/layout.tsx)                        │
│                                                          │
│  • Global fonts & styles                                │
│  • Metadata                                             │
└──────────────────────────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
   ┌─────────┐    ┌──────────┐    ┌──────────┐
   │  Root   │    │  (auth)  │    │ (portal) │
   │ Page    │    │  Route   │    │  Route   │
   │   /     │    │  Group   │    │  Group   │
   └─────────┘    └──────────┘    └──────────┘
        │              │                │
        │              │                │
   Redirects      AuthLayout      MainLayout
   to /login      (centered)      (sidebar)
                       │                │
                       ▼                ▼
                  /login           /dashboard
                                   /settings
                                   /profile
```

## Layout Hierarchy

```
Root Layout
│
├─ (auth) Route Group
│  │
│  ├─ AuthLayout (centered, no sidebar)
│  │  └─ Login Page
│  │  └─ Register Page (future)
│  │
│
└─ (portal) Route Group
   │
   ├─ BreadcrumbProvider (context)
   │  │
   │  └─ MainLayout (sidebar + header)
   │     │
   │     ├─ Dashboard Page
   │     ├─ Settings Page
   │     └─ Other Pages...
```

## Component Structure

```
┌─────────────────────────────────────────────────────────┐
│                    MainLayout                           │
│                                                         │
│  ┌──────────────┐  ┌────────────────────────────────┐ │
│  │              │  │      SidebarInset              │ │
│  │  AppSidebar  │  │                                │ │
│  │              │  │  ┌──────────────────────────┐  │ │
│  │  • Team      │  │  │  Header                  │  │ │
│  │  • NavMain   │  │  │  • Trigger               │  │ │
│  │  • Projects  │  │  │  • Breadcrumbs (context) │  │ │
│  │  • NavUser   │  │  └──────────────────────────┘  │ │
│  │              │  │                                │ │
│  │              │  │  ┌──────────────────────────┐  │ │
│  │              │  │  │  Content Area            │  │ │
│  │              │  │  │  {children}              │  │ │
│  │              │  │  └──────────────────────────┘  │ │
│  └──────────────┘  └────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Data Flow: Breadcrumbs

```
1. Page Component
   │
   ├─ useBreadcrumbs() hook
   │
   └─ setBreadcrumbs([...]) in useEffect
          │
          ▼
2. BreadcrumbContext
   │
   └─ Stores breadcrumb state
          │
          ▼
3. MainLayout
   │
   ├─ useBreadcrumbs() hook
   │
   └─ Reads breadcrumbs from context
          │
          ▼
4. Header Component
   │
   └─ Displays breadcrumbs
```

## Configuration Flow

```
config/navigation.ts
   │
   ├─ teams: Team[]
   ├─ navMain: NavSection[]
   └─ projects: Project[]
          │
          ▼
components/navigation/app-sidebar.tsx
   │
   ├─ Imports config
   │
   └─ Passes to child components
          │
          ▼
NavMain, NavProjects, TeamSwitcher
   │
   └─ Render navigation UI
```

## Route Groups Concept

Route groups `(folder)` organize routes without affecting URLs:

```
app/
├── (auth)/              ← Group for authentication
│   ├── login/
│   │   └── page.tsx     → URL: /login (not /(auth)/login)
│   └── layout.tsx       → Applies AuthLayout to all (auth) pages
│
└── (portal)/            ← Group for main app
    ├── dashboard/
    │   └── page.tsx     → URL: /dashboard (not /(portal)/dashboard)
    └── layout.tsx       → Applies MainLayout to all (portal) pages
```

**Benefits:**
- Different layouts for different sections
- Organize by feature without affecting URLs
- Easy to add middleware for route protection

## Key Design Decisions

### 1. Context-Based Breadcrumbs
- **Why:** Ensures all pages in `(portal)` have consistent layout
- **How:** Pages set breadcrumbs via `useBreadcrumbs()` hook
- **Benefit:** Impossible to forget layout wrapper

### 2. Configuration-Driven Navigation
- **Why:** Single source of truth for menus
- **How:** Centralized in `config/navigation.ts`
- **Benefit:** Easy to update, type-safe

### 3. Feature-Based Components
- **Why:** Better organization and maintainability
- **How:** Grouped by feature (layouts, navigation, auth)
- **Benefit:** Easy to locate and scale

### 4. Route Groups for Layouts
- **Why:** Different layouts for auth vs main app
- **How:** `(auth)` and `(portal)` route groups
- **Benefit:** Clean separation, no URL pollution

## File Organization

```
app/
├── (auth)/              → Public pages
│   ├── login/
│   └── layout.tsx       → AuthLayout wrapper
│
├── (portal)/            → Protected pages
│   ├── dashboard/
│   ├── settings/
│   └── layout.tsx       → MainLayout wrapper
│
└── layout.tsx           → Root layout

components/
├── layouts/             → Layout wrappers
├── navigation/          → Navigation components
├── auth/                → Auth components
└── ui/                  → Generic UI (shadcn)

contexts/
└── breadcrumb-context.tsx  → Breadcrumb state

config/
└── navigation.ts        → Menu configuration

types/
├── index.ts
└── navigation.ts        → Type definitions
```

## Future Enhancements

### Authentication
```
middleware.ts
   │
   └─ Check auth status
      └─ Protect (portal) routes
         └─ Redirect to /login if unauthenticated
```

### State Management
```
contexts/
├── auth-context.tsx     → User session
├── theme-context.tsx    → Theme preferences
└── breadcrumb-context.tsx  → Breadcrumbs (✓ implemented)
```

### API Layer
```
lib/
├── api/
│   ├── client.ts        → Axios/Fetch setup
│   ├── auth.ts          → Auth endpoints
│   └── users.ts         → User endpoints
└── hooks/
    ├── use-auth.ts      → Auth hooks
    └── use-query.ts     → Data fetching hooks
```
