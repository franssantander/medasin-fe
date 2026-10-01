import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type AuthCardProps = {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthCard({
  title,
  description,
  children,
  footer,
}: AuthCardProps) {
  return (
    <Card>
      <CardHeader className="gap-2">
        <Link
          href="/"
          aria-label="Medasin home"
          className="mx-auto mb-1 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Image
            src="/images/medasin-logo.svg"
            alt=""
            width={40}
            height={40}
            priority
          />
        </Link>
        <CardTitle className="text-center">
          <h1 className="text-lg font-semibold">{title}</h1>
        </CardTitle>
        <CardDescription className="break-words text-center">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
      {footer ? (
        <CardFooter className="justify-center">
          <div className="text-center text-sm text-muted-foreground">{footer}</div>
        </CardFooter>
      ) : null}
    </Card>
  );
}
