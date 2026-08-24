import Image from "next/image";
import Link from "next/link";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 px-4 py-12">
      <Link href="/" className="flex flex-col items-center">
        <Image
          src="/images/medasin-ph.svg"
          alt="Medasin Logo"
          width={50}
          height={50}
          className="rounded-md"
          priority
        />
        <span className="text-lg font-semibold font-mono">Medasin</span>
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
