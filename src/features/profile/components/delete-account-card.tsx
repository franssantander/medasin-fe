"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FieldGroup } from "@/components/ui/field";
import { AuthFormError } from "@/features/auth/components/auth-form-error";
import { AuthInputField } from "@/features/auth/components/auth-input-field";
import { applyAuthFormErrors } from "@/features/auth/utils/form-errors";
import { parseApiError } from "@/lib/axios";
import { useDeleteAccountMutation, useSendDeletionCodeMutation } from "../queries/profile-query";
import { deleteAccountSchema, type DeleteAccountFormValues } from "../schemas/profile-schema";

const emptyValues: DeleteAccountFormValues = { method: "password", confirmation: "", current_password: "", otp: "" };

export function DeleteAccountCard({ userId, busy }: { userId: number; busy: boolean }) {
  const mutation = useDeleteAccountMutation(userId);
  const codeMutation = useSendDeletionCodeMutation(userId);
  const submitting = useRef(false);
  const [open, setOpen] = useState(false);
  const [codeNotice, setCodeNotice] = useState<string | null>(null);
  const form = useForm<DeleteAccountFormValues>({
    resolver: zodResolver(deleteAccountSchema),
    defaultValues: emptyValues,
  });
  const [confirmation, method, currentPassword, otp] = useWatch({ control: form.control, name: ["confirmation", "method", "current_password", "otp"] });
  const deleting = mutation.isPending || form.formState.isSubmitting;
  const disabled = busy || deleting;
  const proofEntered = method === "password" ? currentPassword !== "" : /^[0-9]{6}$/.test(otp);
  const { errors } = form.formState;

  const changeOpen = (nextOpen: boolean) => {
    if (deleting || submitting.current) return;
    form.reset(emptyValues);
    mutation.reset();
    codeMutation.reset();
    setCodeNotice(null);
    setOpen(nextOpen);
  };

  const sendCode = async () => {
    if (codeMutation.isPending) return;
    form.setValue("method", "code");
    form.clearErrors(["current_password", "otp"]);
    form.clearErrors("root.server");
    try {
      const response = await codeMutation.mutateAsync();
      setCodeNotice(response.message);
    } catch (error) {
      setCodeNotice(null);
      form.setError("root.server", { type: "server", message: parseApiError(error).message });
    }
  };

  const switchToPassword = () => {
    form.setValue("method", "password");
    form.setValue("otp", "");
    form.clearErrors("otp");
    form.clearErrors("root.server");
    setCodeNotice(null);
  };

  const submit = async (values: DeleteAccountFormValues) => {
    if (busy || mutation.isPending || submitting.current || values.confirmation !== "DELETE") return;
    submitting.current = true;
    form.clearErrors();
    try {
      await mutation.mutateAsync(values.method === "password"
        ? { confirmation: "DELETE", current_password: values.current_password }
        : { confirmation: "DELETE", otp: values.otp });
      form.reset(emptyValues);
    } catch (error) {
      applyAuthFormErrors(error, form, ["confirmation", "current_password", "otp"]);
    } finally {
      submitting.current = false;
      mutation.reset();
    }
  };

  return (
    <Card className="ring-destructive/30 dark:ring-destructive/40">
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="font-medium">Delete account</p>
          <p className="text-sm text-muted-foreground">Delete your account and all your workspace data, including archived items and Trash. You have 7 days to change your mind by signing in again.</p>
        </div>
        <Button type="button" variant="destructive" disabled={disabled} className="h-11 w-full sm:w-auto md:h-9" onClick={() => changeOpen(true)}>
          Delete account
        </Button>
      </CardContent>
      <Dialog open={open} onOpenChange={changeOpen} disablePointerDismissal={deleting}>
        <DialogContent showCloseButton={!deleting}>
          <DialogHeader>
            <DialogTitle>Permanently delete account</DialogTitle>
            <DialogDescription>You will be signed out on every device, and your account and all its data will be permanently deleted after 7 days. Sign in before then to keep it.</DialogDescription>
          </DialogHeader>
          <form id="delete-account-form" noValidate onSubmit={(event) => void form.handleSubmit(submit)(event)} className="flex flex-col gap-5" aria-busy={disabled}>
            <AuthFormError message={errors.root?.server?.message} />
            <FieldGroup className="gap-4">
              {method === "password" ? (
                <AuthInputField
                  id="delete-current-password"
                  label="Current password"
                  type="password"
                  autoComplete="current-password"
                  registration={form.register("current_password")}
                  error={errors.current_password}
                  disabled={disabled}
                  hint="Signed up with Google? Use an emailed code instead."
                  labelAction={(
                    <Button type="button" variant="link" className="h-auto p-0 text-xs" disabled={disabled || codeMutation.isPending} onClick={() => void sendCode()}>
                      Email me a code instead
                    </Button>
                  )}
                />
              ) : (
                <AuthInputField
                  id="delete-otp"
                  label="Confirmation code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  registration={form.register("otp")}
                  error={errors.otp}
                  disabled={disabled}
                  hint={codeMutation.isPending ? "Sending a code to your email…" : (codeNotice ?? "Enter the 6-digit code we emailed you.")}
                  labelAction={(
                    <Button type="button" variant="link" className="h-auto p-0 text-xs" disabled={disabled} onClick={switchToPassword}>
                      Use my password instead
                    </Button>
                  )}
                />
              )}
              {method === "code" && (
                <Button type="button" variant="outline" className="h-11 self-start md:h-9" disabled={disabled || codeMutation.isPending} onClick={() => void sendCode()}>
                  Send a new code
                </Button>
              )}
              <AuthInputField id="delete-confirmation" label="Type DELETE to confirm" autoComplete="off" autoCapitalize="off" spellCheck={false} registration={form.register("confirmation")} error={errors.confirmation} disabled={disabled} hint="Enter DELETE exactly as shown to enable account deletion." />
            </FieldGroup>
          </form>
          <DialogFooter>
            <Button type="button" variant="outline" className="h-11 md:h-9" disabled={disabled} onClick={() => changeOpen(false)}>Cancel</Button>
            <Button type="submit" form="delete-account-form" variant="destructive" className="h-11 md:h-9" disabled={disabled || confirmation !== "DELETE" || !proofEntered}>
              {mutation.isPending ? "Deleting account…" : "Permanently delete account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
