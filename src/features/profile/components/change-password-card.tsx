"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { AuthFormError } from "@/features/auth/components/auth-form-error";
import { AuthInputField } from "@/features/auth/components/auth-input-field";
import { applyAuthFormErrors } from "@/features/auth/utils/form-errors";
import { useChangePasswordMutation } from "../queries/profile-query";
import { changePasswordSchema, type ChangePasswordFormValues } from "../schemas/profile-schema";

export function ChangePasswordCard({ userId, busy }: { userId: number; busy: boolean }) {
  const mutation = useChangePasswordMutation(userId);
  const submitting = useRef(false);
  const [message, setMessage] = useState<string>();
  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { current_password: "", password: "", password_confirmation: "" },
  });
  const disabled = busy || mutation.isPending || form.formState.isSubmitting;
  const { errors } = form.formState;

  const submit = async (values: ChangePasswordFormValues) => {
    if (busy || mutation.isPending || submitting.current) return;
    submitting.current = true;
    setMessage(undefined);
    form.clearErrors();
    try {
      const response = await mutation.mutateAsync(values);
      form.reset();
      setMessage(response.message || "Your password has been updated.");
    } catch (error) {
      applyAuthFormErrors(error, form, ["current_password", "password", "password_confirmation"]);
    } finally {
      submitting.current = false;
      mutation.reset();
    }
  };

  return (
    <Card>
      <CardHeader className="gap-1.5">
        <CardTitle><h2>Change password</h2></CardTitle>
        <CardDescription>You will stay signed in here. Your other sessions will be signed out.</CardDescription>
      </CardHeader>
      <CardContent>
        <form noValidate onSubmit={(event) => void form.handleSubmit(submit)(event)} className="flex w-full flex-col gap-5" aria-busy={disabled}>
          <AuthFormError message={errors.root?.server?.message} />
          <FieldGroup className="gap-4">
            <AuthInputField id="profile-current-password" label="Current password" type="password" autoComplete="current-password" registration={form.register("current_password")} error={errors.current_password} disabled={disabled} />
            <AuthInputField id="profile-new-password" label="New password" type="password" autoComplete="new-password" registration={form.register("password")} error={errors.password} disabled={disabled} hint="Use at least 8 characters." />
            <AuthInputField id="profile-password-confirmation" label="Confirm new password" type="password" autoComplete="new-password" registration={form.register("password_confirmation")} error={errors.password_confirmation} disabled={disabled} />
          </FieldGroup>
          {message ? <p role="status" className="text-sm text-muted-foreground">{message}</p> : null}
          <Button type="submit" disabled={disabled} className="h-11 w-full sm:w-auto sm:self-end md:h-9">
            {mutation.isPending ? "Updating password…" : "Update password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
