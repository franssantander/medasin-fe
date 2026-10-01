"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { useResendVerificationMutation, useVerifyEmailMutation } from "../queries/auth-query";
import { emailFormSchema, type EmailFormValues } from "../schemas/auth-schema";
import { applyAuthFormErrors } from "../utils/form-errors";
import { AuthCard } from "./auth-card";
import { AuthFormError } from "./auth-form-error";
import { AuthInputField } from "./auth-input-field";
import { OtpForm } from "./otp-form";

export function EmailVerificationForm() {
  const router = useRouter();
  const send = useResendVerificationMutation();
  const verification = useVerifyEmailMutation();
  const [email, setEmail] = useState<string>();
  const [message, setMessage] = useState("");
  const submitting = useRef(false);
  const form = useForm<EmailFormValues>({
    resolver: zodResolver(emailFormSchema), defaultValues: { email: "" }, mode: "onBlur",
  });
  const busy = send.isPending || form.formState.isSubmitting;

  async function submit(values: EmailFormValues) {
    if (submitting.current) return;
    submitting.current = true;
    form.clearErrors();
    try {
      const response = await send.mutateAsync(values);
      setEmail(values.email);
      setMessage(response.message);
      send.reset();
    } catch (error) {
      applyAuthFormErrors(error, form, ["email"]);
    } finally {
      submitting.current = false;
    }
  }

  return (
    <AuthCard
      title="Verify your email"
      description={email ? `Enter the code for ${email}.` : "Finish setting up your Medasin account."}
      footer={<Link href="/login" className="text-sm text-muted-foreground underline underline-offset-4">Back to sign in</Link>}
    >
      {email ? (
        <OtpForm
          description={message}
          codeLifetimeMinutes={60}
          isPending={verification.isPending}
          onVerify={async (otp) => {
            await verification.mutateAsync({ email, otp });
            verification.reset();
            router.replace("/home");
          }}
          onResend={async () => {
            const response = await send.mutateAsync({ email });
            send.reset();
            return response.message;
          }}
          onBack={() => {
            setEmail(undefined);
            setMessage("");
            form.clearErrors();
            verification.reset();
            window.requestAnimationFrame(() => form.setFocus("email"));
          }}
        />
      ) : (
        <form onSubmit={(event) => void form.handleSubmit(submit)(event)} noValidate className="flex flex-col gap-5" aria-busy={busy}>
          <AuthFormError message={form.formState.errors.root?.server?.message} />
          <FieldGroup className="gap-4">
            <AuthInputField id="verification-email" label="Email" type="email" autoComplete="email" registration={form.register("email")} error={form.formState.errors.email} disabled={busy} />
          </FieldGroup>
          <Button type="submit" size="default" disabled={busy} className="h-11 w-full md:h-9">{busy ? "Sending code..." : "Send verification code"}</Button>
        </form>
      )}
    </AuthCard>
  );
}
