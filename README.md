This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Letter page regression tests

Run `npx playwright install chromium` once, then `npm test`. The tests start an
isolated development server on port 3107 and mock API responses; they do not
modify real letters. They exercise the actual page renderer, text-size reflow,
content preservation, and the ten-page limit. Run `npm run lint` and
`npm run build` for static checks.

## Signup and password recovery

Signup at `/register` requires matching password confirmation and an emailed
six-digit verification code before signing in. Unverified users who enter valid
credentials at `/login` continue directly to verification using their existing
code. They can resend an expired code, or resume verification at `/verify-email`.
Email verification codes expire after sixty minutes, with a sixty-second resend
cooldown. Password recovery at `/forgot-password` uses a ten-minute emailed code,
then a new password and confirmation; users sign in after a successful reset.

The frontend uses the existing `NEXT_PUBLIC_API_URL` and cookie authentication.
Laravel's mail configuration and queue worker must be running to deliver codes.
Recovery state is held in memory, so reloading restarts the flow.

Run `npm test -- src/features/auth/auth.browser.test.ts` for auth regression
tests. These mock API responses and do not create accounts or send real emails.

## Plan reminder updates

Set the public Reverb variables in `.env.example` for the browser's reachable
Reverb endpoint. `NEXT_PUBLIC_REVERB_APP_KEY` must match the Laravel
`REVERB_APP_KEY`; keep `REVERB_APP_SECRET` on the backend. Laravel must run its
scheduler, queue worker, and Reverb server to deliver live reminders. The
notification list also refreshes over HTTP every minute if the socket is
unavailable.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
