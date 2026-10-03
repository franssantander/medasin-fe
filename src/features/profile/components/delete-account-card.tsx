"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FieldGroup } from "@/components/ui/field";
import { AuthFormError } from "@/features/auth/components/auth-form-error";
import { AuthInputField } from "@/features/auth/components/auth-input-field";
import { applyAuthFormErrors } from "@/features/auth/utils/form-errors";
import { useDeleteAccountMutation } from "../queries/profile-query";
import { deleteAccountSchema, type DeleteAccountFormValues } from "../schemas/profile-schema";

export function DeleteAccountCard({ userId, busy }: { userId: number; busy: boolean }) {
  const mutation = useDeleteAccountMutation(userId);
  const submitting = useRef(false);
  const [open, setOpen] = useState(false);
  const form = useForm<DeleteAccountFormValues>({
    resolver: zodResolver(deleteAccountSchema),
    defaultValues: { confirmation: "" },
  });
  const confirmation = useWatch({ control: form.control, name: "confirmation" });
  const deleting = mutation.isPending || form.formState.isSubmitting;
  const disabled = busy || deleting;
  const { errors } = form.formState;

  const changeOpen = (nextOpen: boolean) => {
    if (deleting || submitting.current) return;
    form.reset();
    mutation.reset();
    setOpen(nextOpen);
  };

  const submit = async (values: DeleteAccountFormValues) => {
    if (busy || mutation.isPending || submitting.current || values.confirmation !== "DELETE") return;
    submitting.current = true;
    form.clearErrors();
    try {
      await mutation.mutateAsync({ confirmation: "DELETE" });
      form.reset();
    } catch (error) {
      applyAuthFormErrors(error, form, ["confirmation"]);
    } finally {
      submitting.current = false;
      mutation.reset();
    }
  };

  return (
    <Card>
      <CardHeader className="gap-1.5">
        <CardTitle><h2>Delete account</h2></CardTitle>
        <CardDescription>Delete your account and all your workspace data, including archived items and Trash.</CardDescription>
      </CardHeader>
      <CardContent className="gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
        <Button type="button" variant="destructive" disabled={disabled} className="h-11 w-full sm:w-auto md:h-9" onClick={() => changeOpen(true)}>
          Delete account
        </Button>
      </CardContent>
      <Dialog open={open} onOpenChange={changeOpen} disablePointerDismissal={deleting}>
        <DialogContent showCloseButton={!deleting}>
          <DialogHeader>
            <DialogTitle>Permanently delete account</DialogTitle>
            <DialogDescription>Your account and all its data will be permanently deleted. You cannot recover them afterward.</DialogDescription>
          </DialogHeader>
          <form id="delete-account-form" noValidate onSubmit={(event) => void form.handleSubmit(submit)(event)} className="flex flex-col gap-5" aria-busy={disabled}>
            <AuthFormError message={errors.root?.server?.message} />
            <FieldGroup className="gap-4">
              <AuthInputField id="delete-confirmation" label="Type DELETE to confirm" autoComplete="off" autoCapitalize="off" spellCheck={false} registration={form.register("confirmation")} error={errors.confirmation} disabled={disabled} hint="Enter DELETE exactly as shown to enable account deletion." />
            </FieldGroup>
          </form>
          <DialogFooter>
            <Button type="button" variant="outline" className="h-11 md:h-9" disabled={disabled} onClick={() => changeOpen(false)}>Cancel</Button>
            <Button type="submit" form="delete-account-form" variant="destructive" className="h-11 md:h-9" disabled={disabled || confirmation !== "DELETE"}>
              {mutation.isPending ? "Deleting account…" : "Permanently delete account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
