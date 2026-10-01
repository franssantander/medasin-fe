import type { Metadata } from "next";
import { EmailVerificationForm } from "@/features/auth/components/email-verification-form";

export const metadata: Metadata = { title: "Verify email" };

export default function VerifyEmailPage() {
  return <EmailVerificationForm />;
}
