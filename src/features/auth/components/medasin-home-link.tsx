import Image from "next/image";
import Link from "next/link";

export function MedasinHomeLink() {
  return (
    <Link
      href="/"
      aria-label="Medasin home"
      className="flex w-fit items-center gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Image src="/images/medasin-logo.svg" alt="" width={28} height={28} className="size-7" priority />
      <span className="font-garamond text-lg font-semibold tracking-tight">Medasin</span>
    </Link>
  );
}
