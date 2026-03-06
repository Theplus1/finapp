# FinPortal

A production-ready financial portal application built with Next.js 15, React 19, TypeScript, and Tailwind CSS.

## 🏗️ Project Structure

This project follows a production-ready architecture with clear separation of concerns:

- **Route Groups**: Separate layouts for auth and dashboard pages
- **Component Organization**: Grouped by feature (layouts, navigation, auth, ui)
- **Type Safety**: Full TypeScript coverage with centralized type definitions
- **Configuration Management**: Centralized navigation and app config

See [STRUCTURE.md](./STRUCTURE.md) for detailed architecture documentation.

## 🚀 Getting Started

### Prerequisites

- Node.js 20+ 
- npm, yarn, pnpm, or bun

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Copy environment variables:

```bash
cp env.example .env.local
```

4. Run the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## 📁 Key Directories

```
app/
├── (auth)/          # Public authentication pages
├── (dashboard)/     # Protected dashboard pages
└── layout.tsx       # Root layout

components/
├── layouts/         # Reusable layout components
├── navigation/      # Navigation components
├── auth/           # Authentication components
└── ui/             # shadcn/ui components

config/             # Application configuration
types/              # TypeScript type definitions
lib/                # Utility functions
```

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **UI Components**: shadcn/ui (Radix UI)
- **Icons**: Lucide React
- **Fonts**: Geist Sans & Geist Mono

## 📝 Available Scripts

```bash
npm run dev      # Start development server with Turbopack
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## 🎨 Features

- ✅ Production-ready folder structure
- ✅ Route groups for different layouts
- ✅ Collapsible sidebar navigation
- ✅ Breadcrumb navigation
- ✅ Responsive design
- ✅ Dark mode ready
- ✅ Type-safe configuration
- ✅ Modern UI components

## 📚 Documentation

- [Quick Start Guide](./docs/QUICK_START.md) - How to add pages and components
- [Architecture Overview](./docs/ARCHITECTURE.md) - System design and flows
- [Project Structure](./STRUCTURE.md) - Detailed folder structure
- [Next.js Documentation](https://nextjs.org/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)

## 🔜 Next Steps

This structure is ready for:
- Authentication implementation (NextAuth.js recommended)
- API integration
- State management (React Context/Zustand)
- Form validation (React Hook Form + Zod)
- Testing (Jest + React Testing Library)
- Error handling and monitoring

## 📄 License

This project is private and proprietary.
