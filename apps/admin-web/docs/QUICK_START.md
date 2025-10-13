# Quick Start Guide

## Adding a New Portal Page

### 1. Create the page file

```bash
mkdir -p app/\(portal\)/your-page
touch app/\(portal\)/your-page/page.tsx
```

### 2. Implement the page

```tsx
"use client"

import { useEffect } from "react"
import { useBreadcrumbs } from "@/contexts/breadcrumb-context"

export default function YourPage() {
  const { setBreadcrumbs } = useBreadcrumbs()

  useEffect(() => {
    setBreadcrumbs([
      { label: "Home", href: "/dashboard" },
      { label: "Your Page" },
    ])
  }, [setBreadcrumbs])

  return (
    <div>
      <h1>Your Page Content</h1>
      {/* MainLayout is automatically applied by route group */}
    </div>
  )
}
```

**Important:** 
- Add `"use client"` directive at the top
- The `MainLayout` (sidebar + header) is automatically applied
- Just return your content - no layout wrapper needed!

---

## Adding a Navigation Menu Item

Edit `config/navigation.ts`:

```typescript
import { YourIcon } from "lucide-react"

export const navMain: NavSection[] = [
  // ... existing items
  {
    title: "Your Section",
    url: "/your-page",
    icon: YourIcon,
    items: [
      {
        title: "Sub Item",
        url: "/your-page/sub",
      },
    ],
  },
]
```

---

## Creating a New Component

### 1. Determine the category

- `components/layouts/` - Layout wrappers
- `components/navigation/` - Navigation components
- `components/auth/` - Auth-related components
- `components/ui/` - Generic UI components

### 2. Create the component

```tsx
// components/your-category/your-component.tsx

interface YourComponentProps {
  title: string
  children: React.ReactNode
}

export function YourComponent({ title, children }: YourComponentProps) {
  return (
    <div>
      <h2>{title}</h2>
      {children}
    </div>
  )
}
```

---

## Adding shadcn/ui Components

Use the CLI to add new components:

```bash
npx shadcn@latest add dialog
npx shadcn@latest add form
npx shadcn@latest add table
```

Components are automatically added to `components/ui/`.

---

## Common Patterns

### Dynamic Breadcrumbs

```tsx
export default function UserPage({ params }: { params: { id: string } }) {
  const { setBreadcrumbs } = useBreadcrumbs()

  useEffect(() => {
    setBreadcrumbs([
      { label: "Users", href: "/users" },
      { label: `User ${params.id}` },
    ])
  }, [params.id, setBreadcrumbs])

  return <div>User {params.id} content</div>
}
```

### Page with Loading State

```tsx
import { Suspense } from "react"

function LoadingSkeleton() {
  return <div>Loading...</div>
}

export default function Page() {
  const { setBreadcrumbs } = useBreadcrumbs()

  useEffect(() => {
    setBreadcrumbs([{ label: "Page" }])
  }, [setBreadcrumbs])

  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <YourContent />
    </Suspense>
  )
}
```

### Conditional Breadcrumbs

```tsx
const { setBreadcrumbs } = useBreadcrumbs()
const [showDetails, setShowDetails] = useState(false)

useEffect(() => {
  const crumbs = [{ label: "Dashboard", href: "/dashboard" }]
  
  if (showDetails) {
    crumbs.push({ label: "Details" })
  }
  
  setBreadcrumbs(crumbs)
}, [showDetails, setBreadcrumbs])
```

---

## File Naming Conventions

- **Pages**: `page.tsx`
- **Layouts**: `layout.tsx`
- **Components**: `kebab-case.tsx` (e.g., `user-profile.tsx`)
- **Types**: `kebab-case.ts` (e.g., `user-types.ts`)
- **Config**: `kebab-case.ts` (e.g., `api-config.ts`)

---

## Import Aliases

Always use the `@/` alias for imports:

```tsx
// ✅ Good
import { Button } from "@/components/ui/button"
import { MainLayout } from "@/components/layouts/main-layout"
import { useBreadcrumbs } from "@/contexts/breadcrumb-context"
import { NavSection } from "@/types"

// ❌ Avoid
import { Button } from "../../components/ui/button"
```

---

## Development Commands

```bash
# Start dev server
npm run dev

# Type check
npx tsc --noEmit

# Lint code
npm run lint

# Build for production
npm run build

# Start production server
npm run start
```

---

## Troubleshooting

### Error: "useBreadcrumbs must be used within a BreadcrumbProvider"

**Cause:** Page is outside `(portal)` route group

**Solution:** Move page to `app/(portal)/` or add provider to parent layout

### Breadcrumbs not updating

**Cause:** Missing `setBreadcrumbs` in dependency array

**Solution:**
```tsx
useEffect(() => {
  setBreadcrumbs([...])
}, [setBreadcrumbs])  // ← Add this
```

### Import errors

- Ensure the file exists
- Check the `@/` alias in `tsconfig.json`
- Restart TypeScript server in your IDE

### Layout not applying

- Check route group parentheses: `(portal)` not `portal`
- Ensure `layout.tsx` exists in the route group
- Verify page is inside the route group folder

---

## Best Practices

1. ✅ Always add `"use client"` for pages using hooks
2. ✅ Include `setBreadcrumbs` in useEffect dependencies
3. ✅ Keep breadcrumb labels concise and meaningful
4. ✅ Provide `href` for all but the last breadcrumb
5. ✅ Use TypeScript for all components
6. ✅ Follow the established folder structure
7. ✅ Use `@/` alias for all imports

---

## Next Steps

- Review [ARCHITECTURE.md](./ARCHITECTURE.md) for system design
- Check [STRUCTURE.md](../STRUCTURE.md) for detailed project structure
- Read the main [README.md](../README.md) for project overview
