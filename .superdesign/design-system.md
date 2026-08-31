# Medasin Design System

## Product context

Medasin is a calm productivity application for organizing projects, areas, goals, habits, notes, and resources. Protected pages live in a desktop sidebar/mobile-sheet dashboard shell. The product emphasizes clear hierarchy, low visual noise, and actionable status information.

## Visual foundation

- Use Manrope for application UI and EB Garamond only for the Medasin wordmark or intentionally editorial brand moments.
- Preserve the neutral Shadcn/Base UI palette from `src/app/globals.css`; support both light and dark themes.
- Use white or near-black surfaces, subtle rings/borders, rounded-xl cards, and restrained shadows.
- Primary actions use the neutral primary token. Secondary actions use outlined or ghost button variants.
- Status semantics are fixed: slate = not started, blue = in progress, emerald = completed, amber = overdue/warning, destructive red = deletion/error.
- Use Lucide icons at 16–20px and never substitute emoji or invented marks.
- Main page spacing is `p-4 sm:p-6`, section gaps are 1rem–1.5rem, and dialog surfaces use rounded-2xl corners.
- Preserve visible focus rings, semantic labels, keyboard access, and motion-reduced fallbacks.

## Layout and component patterns

- Dashboard content sits under a 56px header, beside a 240px expandable sidebar, on a lightly muted page background.
- Page headers wrap on narrow screens and keep related actions grouped on the right.
- Cards are information-dense but calm, using compact badges, thin dividers, and small muted metadata.
- Dialogs use a blurred dark backdrop, scale/fade transitions, scrollable content, and a clearly labeled close control.
- Responsive behavior should retain information rather than hide it; use horizontal scrolling for inherently wide timeline/calendar content.

## Motion

Use 150–300ms transitions for opacity, scale, transform, hover elevation, and progress. Avoid decorative looping animation. Honor reduced-motion preferences.

## Project calendar timeline requirements

- Open from an outlined Calendar action beside New project on the Projects page.
- Use a large month-view dialog with Previous, Next, and Today navigation plus a seven-column, six-week calendar.
- Render complete project ranges as semantic status-colored bars split across week rows.
- Render start-only and due-only projects as labeled milestones.
- Clicking any project entry navigates to its project detail route.
- Highlight today, show a status legend, allow overlapping projects to create additional lanes, and keep the calendar horizontally scrollable on narrow screens.
- Match the existing Projects page visual language exactly; introduce no new fonts, colors, or control styles.
