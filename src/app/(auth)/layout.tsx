
export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 px-4 py-12">
      <div className="w-full max-w-sm">{children}</div>
      <p className="text-xs text-neutral-500">
        New to Medasin?{"  "}
        <span className="font-bold text-black">Create an account</span>
      </p>
    </div>
  );
}
