# Route Map

The application uses Next.js App Router route groups. All protected pages use `src/app/(app)/layout.tsx`; authentication pages use `src/app/(auth)/layout.tsx`.

| URL | Entry file | Layout | Summary |
| --- | --- | --- | --- |
| `/` | `src/app/page.tsx` | Root | Landing/redirect entry. |
| `/login` | `src/app/(auth)/login/page.tsx` | Auth | User login. |
| `/home` | `src/app/(app)/home/page.tsx` | App dashboard | Dashboard home. |
| `/projects` | `src/app/(app)/projects/page.tsx` | App dashboard | Active project card grid and project creation. |
| `/projects/[uuid]` | `src/app/(app)/projects/[uuid]/page.tsx` | App dashboard | Project details, goals, and Kanban boards. |
| `/areas` | `src/app/(app)/areas/page.tsx` | App dashboard | Area card grid. |
| `/areas/[uuid]` | `src/app/(app)/areas/[uuid]/page.tsx` | App dashboard | Area projects, goals, habits, notes, and resources. |
| `/resources` | `src/app/(app)/resources/page.tsx` | App dashboard | Resources workspace. |
| `/archives` | `src/app/(app)/archives/page.tsx` | App dashboard | Archived areas and projects. |

There is no centralized router configuration; route files above are the source of truth.
