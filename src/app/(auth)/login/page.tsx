import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import LoginForm from "@/features/auth/components/login-form";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Log in",
};

export default function LoginPage() {
  return (
    <Card>
      <CardHeader>
        <Link href="/" className="flex flex-col items-center">
          <Image
            src="/images/medasin-logo.svg"
            alt="Medasin Logo"
            width={46}
            height={46}
            priority
          />
        </Link>
        <CardTitle className="font-bold text-center text-lg">
          Welcome back
        </CardTitle>
        <CardDescription className="text-center">
          Sign in to your Medasin workspace.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* <GoogleSignInButton /> */}
        <Button variant="outline">
          <Image
            src="/images/google-logo.svg"
            alt="Google Logo"
            width={20}
            height={20}
          />
          Continue with Google
        </Button>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">OR</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <LoginForm />
      </CardContent>
    </Card>
  );
}
