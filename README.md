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

The login page's unchecked “Remember me” option uses browser-session cookies.
Checking it retains the existing seven-day access cookie and rolling thirty-day
refresh cookie. The choice carries through email verification and token refresh.
After a successful remembered login, the username is saved on this browser and
pre-filled with the checkbox checked when returning to login, including after
logout. Unchecking the option immediately clears the saved username; otherwise
it remains until browser data is cleared. Failed logins and incomplete email
verification do not replace a saved username. Passwords are never saved by the
app; the login fields support your browser's password manager for autofill.
Protected pages check the session through the app layout, which can refresh an
expired access cookie before showing account content.
Deploy the backend `remember_me` refresh-token migration before the updated API.
Older clients that omit `remember_me`, including signup verification, retain
persistent cookies. Browser session restoration can retain session cookies.

Run `npm test -- src/features/auth/auth.browser.test.ts` for auth regression
tests. These mock API responses and do not create accounts or send real emails.

## Google sign-in

“Continue with Google” at `/login` opens Google's account chooser in the same
tab. It uses the login form's Remember me choice for session or persistent
cookies, without submitting the username or password or changing the saved
password-login username. New Google accounts and accounts already linked to
Google can sign in. Existing unlinked password accounts must sign in with their
password before linking Google; account-linking UI is not included here.

Configure these variables on the Laravel backend, using your public URLs:

```dotenv
GOOGLE_CLIENT_ID=<Google OAuth web client ID>
GOOGLE_CLIENT_SECRET=<Google OAuth web client secret>
GOOGLE_REDIRECT_URI=http://localhost:82/api/v1/auth/google/callback
GOOGLE_FRONTEND_REDIRECT_URI=http://localhost:3000/login
```

Register the exact `GOOGLE_REDIRECT_URI` as an authorized redirect URI for the
Google OAuth web client. Initiation and callback must use the same public API
host, including any API proxy: when `NEXT_PUBLIC_API_URL` points to the frontend's
`/api/v1` proxy, the Google callback must also point to that frontend host's
`/api/v1/auth/google/callback`. Use HTTPS in production and apply the backend
Google ID migration before enabling sign-in. No new frontend environment
variables or Google SDK are needed; credentials stay on the backend.

The backend returns to `/login?google=success` or
`/login?google=error&code=...`. The frontend removes these callback parameters,
confirms successful sign-in through `/auth/me`, and opens `/home` only after
the session is verified. Callback errors appear in the login form with a retry
or password-sign-in option. Initiation errors, including missing backend
credentials, retain the backend's existing response; browser Back returns to
the login page. Verify a real Google round trip after configuring the backend.

The Google icon is Google's official asset from
[its sign-in branding guidance](https://developers.google.com/identity/branding-guidelines).
Google auth coverage is included in `src/features/auth/auth.browser.test.ts`;
these tests mock redirects and cookies and never contact Google or create real
accounts.

## Profile and account management

Open **Profile** from the account menu to manage your photo, password, or account
at `/profile`. Photos support JPEG, PNG, and WebP up to 5 MiB, with a square crop
before upload. Drag the photo or use positioning buttons, adjust zoom, and reset
the crop in the circular preview. The saved photo appears in the account menu;
removing it restores the initials fallback.

Changing your password requires your current password and matching confirmation.
It ends other sessions and password-recovery proofs, while issuing fresh cookies
for this browser with its existing Remember me choice. Account deletion requires
an authenticated, verified account and typing exactly `DELETE`. It permanently
removes owned content, including archived and trashed items, clears this browser's
sign-in and remembered username, and returns to login.

Deploy the backend profile-image migration before enabling uploads. Use the
existing public storage link and `/storage` proxy. Permanent file deletion runs
through the `database` queue using the application's database connection: the
cleanup job is persisted in the account-deletion transaction before database
records disappear. Keep that queue worker running, restart workers after deploying
the new job, and monitor failed cleanup jobs for retries. No new public environment
variables are needed.

Run `npm test -- src/features/profile/profile.browser.test.ts` for profile
regressions. These mock API responses and never change or delete real accounts.

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
