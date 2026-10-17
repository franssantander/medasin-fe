import { AuthShowcase } from "@/features/auth/components/auth-showcase";
import { MedasinHomeLink } from "@/features/auth/components/medasin-home-link";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="grid min-h-svh items-start bg-background lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <div className="flex min-h-svh min-w-0 flex-col px-4 py-5 sm:px-8 sm:py-6 h-shorter:py-4">
        {/* On large screens the brand sits at the top of the showcase panel. */}
        <div className="mx-auto w-full max-w-sm lg:hidden">
          <MedasinHomeLink />
        </div>
        <div className="flex flex-1 items-center justify-center py-10 h-short:py-4 h-shorter:py-2">
          <div className="w-full max-w-sm">{children}</div>
        </div>
        <p className="text-center text-xs text-muted-foreground lg:hidden">
          A connected system for a thoughtful life.
        </p>
      </div>
      {/* Placed after the form so keyboard and screen-reader order stays form-first. */}
      <AuthShowcase />
    </main>
  );
}
