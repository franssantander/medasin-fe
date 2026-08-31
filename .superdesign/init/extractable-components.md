# Extractable Components

## DashboardSidebar
- Source: `src/features/home/components/dashboard-sidebar.tsx`
- Category: layout
- Description: Responsive desktop sidebar and mobile navigation sheet with Medasin branding.
- Extractable props: `pathname`, `isCollapsed`, `isMobileOpen`
- Hardcoded: logo asset, navigation labels, icons, layout, and Tailwind classes

## DashboardHeader
- Source: `src/features/home/components/dashboard-header.tsx`
- Category: layout
- Description: Dashboard header containing mobile navigation, search, notifications, and profile controls.
- Extractable props: `isMobileNavOpen`, user display name/initials
- Hardcoded: search and notification icons, control layout, spacing, and Tailwind classes

## PageHeader
- Source: `src/components/shared/page-header.tsx`
- Category: basic
- Description: Reusable wrapping page heading with a right-aligned action group.
- Extractable props: `title`, `action`
- Hardcoded: heading scale, responsive wrapping, and spacing

## ProjectCard
- Source: `src/features/projects/components/project-card.tsx`
- Category: basic
- Description: Project summary card with icon, status, progress, area, goals, dates, and actions.
- Extractable props: project name, status, progress, area, goal count, date range
- Hardcoded: card structure, icons, status treatments, and interaction layout

Basic Shadcn primitives are intentionally not extracted; they should remain inline in design drafts.
