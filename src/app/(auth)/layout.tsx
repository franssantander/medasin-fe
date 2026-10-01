export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-background px-4 py-8 sm:py-12">
      <div className="w-full max-w-sm">{children}</div>
    </main>
  );
}
