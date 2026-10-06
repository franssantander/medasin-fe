import type { Metadata } from "next";
import LoginForm from "@/features/auth/components/login-form";
import { getGoogleAuthResult } from "@/features/auth/utils/google-auth";

export const metadata: Metadata = {
  title: "Log in",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { google, code } = await searchParams;
  const googleResult = getGoogleAuthResult(google, code);

  return <LoginForm key={googleResult ? JSON.stringify(googleResult) : "login"} googleResult={googleResult} />;
}
