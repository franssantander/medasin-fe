# Key Page Dependency Trees

## /projects

Entry: `src/app/(app)/projects/page.tsx`

Dependencies:
- `src/features/projects/components/project-list.tsx`
  - `src/components/shared/page-header.tsx`
    - `src/components/ui/button.tsx`
    - `src/lib/utils.ts`
  - `src/components/ui/card.tsx`
  - `src/components/ui/skeleton.tsx`
  - `src/features/projects/hooks/use-project-form-dialog.ts`
    - `src/features/projects/queries/project-query.ts`
      - `src/features/projects/services/project-service.ts`
      - `src/features/projects/type.ts`
  - `src/features/projects/components/project-card.tsx`
    - `src/components/ui/badge.tsx`
    - `src/components/ui/button.tsx`
    - `src/components/ui/card.tsx`
    - `src/components/ui/dropdown-menu.tsx`
    - `src/components/ui/progress.tsx`
    - `src/features/projects/project-status.ts`
    - `src/features/projects/components/project-icons.tsx`
    - `src/features/projects/components/project-action-dialog.tsx`
      - `src/components/ui/dialog.tsx`
  - `src/features/projects/components/project-form-dialog.tsx`
    - `src/components/ui/dialog.tsx`
    - `src/components/ui/input.tsx`
    - `src/components/ui/textarea.tsx`
    - `src/components/ui/select.tsx`
    - `src/features/projects/components/project-icons.tsx`
    - `src/features/projects/schemas/project-schema.ts`

Shared shell:
- `src/app/(app)/layout.tsx`
  - `src/features/home/components/dashboard-header.tsx`
  - `src/features/home/components/dashboard-sidebar.tsx`
  - `src/features/home/components/dashboard-navigation.ts`
  - `src/components/ui/skeleton.tsx`

## /projects/[uuid]

Entry: `src/app/(app)/projects/[uuid]/page.tsx`

Dependencies:
- `src/features/projects/components/project-detail.tsx`
  - `src/features/projects/components/project-kanban.tsx`
  - `src/features/projects/components/project-goals-dialog.tsx`
  - `src/features/projects/components/project-icons.tsx`
  - `src/features/projects/project-status.ts`
  - `src/features/projects/queries/project-query.ts`
  - shared Button, Badge, Card, Dialog, Progress, and Skeleton primitives

## /areas

Entry: `src/app/(app)/areas/page.tsx`

Dependencies:
- `src/features/areas/components/area-list.tsx`
  - area cards, form dialog, queries, services, schemas, and shared UI primitives

## /areas/[uuid]

Entry: `src/app/(app)/areas/[uuid]/page.tsx`

Dependencies:
- `src/features/areas/components/area-detail.tsx`
  - goals, habits, notes, resources, projects, dialogs, queries, and shared UI primitives

## /archives

Entry: `src/app/(app)/archives/page.tsx`

Dependencies:
- `src/features/areas/components/area-archives.tsx`
- `src/features/projects/components/project-archives.tsx`
- shared Card, Button, Dialog, Badge, and Skeleton primitives

## /home and /resources

- `src/app/(app)/home/page.tsx` renders a minimal dashboard heading.
- `src/app/(app)/resources/page.tsx` uses `src/components/shared/page-header.tsx`.
