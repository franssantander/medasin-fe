# Repository Guidelines

## Project Structure & Module Organization

This is a Next.js 16 TypeScript application using the App Router. Pages and layouts live in `src/app/`; route groups such as `(auth)` and `(app)` separate public and protected areas. Organize domain code under `src/features/<feature>/`, keeping components, hooks, queries, schemas, services, and types close to their feature. Shared UI primitives belong in `src/components/ui/`, providers in `src/providers/`, and reusable infrastructure in `src/lib/`. Static files are stored in `public/`, with branding under `public/images/`. Generated types in `types/` should not be edited manually.

## Build, Test, and Development Commands

- `npm install` installs dependencies from `package-lock.json`.
- `npm run dev` starts the local Next.js development server with hot reload.
- `npm run lint` runs ESLint across the project.
- `npm run build` creates a production build and catches type or rendering failures.
- `npm start` serves the completed production build.

Run lint and build before opening a pull request. No automated test script is configured.

## Coding Style & Naming Conventions

Use TypeScript and React function components. Follow the existing two-space indentation, semicolons, and double-quoted imports. Name component files and feature modules in kebab case (`login-form.tsx`, `auth-service.ts`), React components in PascalCase, hooks with a `use` prefix, and types/interfaces in PascalCase. Prefer the `@/*` path alias for imports from `src/`. Use Tailwind CSS utilities for styling and shared primitives from `src/components/ui/`. ESLint is configured through `eslint.config.mjs`; resolve warnings rather than disabling rules broadly.

## Testing Guidelines

No test framework or coverage threshold is currently defined. For each change, at minimum run `npm run lint` and `npm run build`, then manually verify affected routes and responsive states. If tests are introduced, colocate them with the feature using names such as `login-form.test.tsx`, and add the corresponding `npm test` script and documentation.

## Commit & Pull Request Guidelines

Recent commits favor concise, imperative summaries and often use Conventional Commit prefixes, for example `feat(auth): implement login functionality`. Use `feat`, `fix`, `refactor`, `docs`, or `chore` with an optional scope. Pull requests should explain the problem and solution, list verification performed, link relevant issues, and include screenshots or recordings for visible UI changes. Keep changes focused and call out configuration or environment-variable requirements.

## Security & Configuration

Never commit secrets or local `.env` files. Access backend services through the shared Axios client in `src/lib/axios/` and document any new public environment variables in the pull request.
