# Quick Schools - Enterprise Architecture

Welcome to the Quick Schools project hub! This documentation provides a comprehensive overview of the application's feature-based architecture, designed for maximum scalability, maintainability, and clean separation of concerns.

## 1. Complete Folder Tree

```text
/
├── app/                      # Next.js 15 App Router Core
│   ├── (public)/             # Unauthenticated routes
│   │   ├── login/page.tsx
│   │   └── about/page.tsx
│   ├── (protected)/          # Authenticated routes (Auth.js)
│   │   ├── super-admin/      # System-wide administration
│   │   ├── admin/            # School-level administration
│   │   ├── teacher/          # Subject teacher portal
│   │   ├── homeroom/         # Homeroom teacher portal
│   │   ├── student/          # Student portal
│   │   └── parent/           # Parent portal
│   ├── api/                  # API Routes / Webhooks
│   ├── layout.tsx            # Root layout with providers
│   └── page.tsx              # Landing page
├── components/               # Global shared components
│   ├── ui/                   # Shadcn UI primitives (buttons, inputs)
│   ├── forms/                # Reusable RHF + Zod form wrappers
│   ├── tables/               # Reusable TanStack Table components
│   ├── filters/              # Reusable query filters (url-based)
│   ├── modals/               # Global modals/dialogs
│   ├── cards/                # Shared layout cards
│   ├── charts/               # Reusable Recharts templates
│   └── layouts/              # Shared structural layouts (Sidebars, Navbars)
├── features/                 # DOMAIN-DRIVEN: Feature modules
│   ├── auth/                 # Authentication & Session logic
│   ├── students/             # Student management feature
│   │   ├── components/       # Feature-specific components
│   │   ├── actions/          # Server Actions
│   │   ├── validations/      # Zod schemas for validation
│   │   ├── services/         # Business logic & DB queries
│   │   └── types/            # TypeScript interfaces
│   ├── teachers/             # Teacher management feature
│   ├── attendance/           # Attendance tracking
│   ├── grades/               # Grading module
│   └── billing/              # SaaS subscription & fees module
├── hooks/                    # Global React Hooks
├── lib/                      # External library configurations
│   ├── prisma.ts             # Prisma client instance
│   └── utils.ts              # cn() utility
├── providers/                # Global React Context Providers
├── utils/                    # Generic pure utility functions
├── constants/                # App-wide constants (Roles, Enum mappings)
├── permissions/              # RBAC & ACL logic (CASL or custom)
├── types/                    # Global TypeScript typings
└── prisma/                   # Database
    ├── schema.prisma         # Prisma Schema (Models)
    ├── seed/                 # Database seeders
    └── migrations/           # DB Migrations
```

## 2. Explanation of Directories

*   **`app/(role)`**: Leverages Next.js Route Groups to isolate layouts without affecting URL structure (e.g., `/admin` remains clean but inherits the `(protected)` layout shell).
*   **`components/`**: Strict separation of global, domain-agnostic UI elements. A `books` modal does not belong here, but a base `ConfirmDialog` does.
*   **`features/`**: The core of Clean Architecture. Business domains are kept modular. You shouldn't have to look through 5 directories to understand how the "Student" feature works. Everything related to it (UI, Actions, Schema, DB queries) is co-located in `features/students/`.
*   **`lib/`**: Single-point configuration for external libraries to prevent vendor lock-in leaking across the app.
*   **`permissions/`**: Centralizes Role-Based Access Control (RBAC). Never scatter `if (user.role === 'ADMIN')` in UI components; instead use `if (canEditStudent(user))`.
*   **`prisma/`**: Complete database modeling, maintaining multi-tenant abstractions (e.g., `schoolId` indexed on all core models).

## 3. Best Practices & Rules

1.  **Server Components Default**: Every component is a server component by default. Only use `'use client'` at the leaves of the tree when `useState`, `useEffect`, or event listeners are strictly necessary.
2.  **Server Actions for Mutations**: Isolate form submissions and data mutations in `app/actions` or `features/[name]/actions`. Never write sensitive Prisma code in client components.
3.  **Zod at the Boundary**: Validate everything entering the application using Zod schemas located in `features/[name]/validations`. Use `next-safe-action` or similar to strongly type your Next.js Server Actions.
4.  **Colocation**: If a component, utility, or hook is only used by one feature, keep it inside that feature's folder. Only promote to the global `/components` or `/utils` when used by 2 or more features.
5.  **Data Access Layer (Services)**: Server Actions handle the HTTP/Form boundary, but they should call pure asynchronous functions in `features/[name]/services/`. This allows you to test business logic independently of Next.js requests.

## 4. Naming Conventions

*   **Directories**: `kebab-case` (e.g., `super-admin`, `billing-dashboard`)
*   **Files (React Components)**: `PascalCase.tsx` (e.g., `StudentList.tsx`, `ConfirmModal.tsx`)
*   **Files (Non-React)**: `kebab-case.ts` (e.g., `student-service.ts`, `auth-utils.ts`)
*   **Server Actions**: `[action-name].action.ts` (e.g., `create-student.action.ts`)
*   **Zod Schemas**: `[model].schema.ts` (e.g., `student.schema.ts`)
*   **Prisma Models**: `PascalCase` and singular (e.g., `model Student`, not `Students`)
*   **Database Tables**: `snake_case` using `@@map("table_name")` (e.g., `@@map("students")`)

## 5. Scalability Recommendations

1.  **Multi-Tenancy (Multi-School)**: 
    *   Add a `school_id` foreign key to almost all transactional tables (Students, Teachers, Classes).
    *   Enable Row Level Security (RLS) in PostgreSQL if moving beyond Prisma, or implement strict application-level scoping in your `permissions/` rules ensuring no query fails to include `where: { schoolId: currentUser.schoolId }`.
2.  **Multi-Academic Years**: 
    *   Never overwrite historical class data. Entities like `ClassEnrollment` must link to an `AcademicYear` model. 
3.  **High Volume (10,000+ Students)**: 
    *   Transition away from purely synchronous dashboards. 
    *   Utilize **Cursor-based Pagination** (supported uniquely well by Prisma) for feeds and tables instead of Offset pagination which slows down at scale.
    *   Implement **React Suspense** + **Streaming** in Next.js to load the UI instantly and stream heavy SQL aggregations within `Suspense` boundaries.
    *   Offload heavy tasks (report card PDF generation) to background queues (e.g., Inngest or Upstash) instead of blocking Server Actions.
