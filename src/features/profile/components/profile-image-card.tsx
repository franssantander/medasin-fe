"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { CurrentUser } from "@/features/auth/type";
import { getImageAspectRatio } from "@/lib/image/crop-image";
import { parseApiError } from "@/lib/axios";
import { useProfileImageMutation } from "../queries/profile-query";
import { PROFILE_IMAGE_MAX_BYTES, PROFILE_IMAGE_TYPES } from "../types";
import { UserAvatar } from "./user-avatar";

const ProfilePhotoCropDialog = dynamic(
  () => import("./profile-photo-crop-dialog").then((module) => module.ProfilePhotoCropDialog),
  { ssr: false },
);

type CropSource = { file: File; source: string };

export function ProfileImageCard({ user, busy }: { user: CurrentUser; busy: boolean }) {
  const mutation = useProfileImageMutation(user.id);
  const inputRef = useRef<HTMLInputElement>(null);
  const sourceRef = useRef<CropSource | null>(null);
  const [cropSource, setCropSource] = useState<CropSource | null>(null);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<string>();
  const disabled = busy || reading;

  useEffect(() => () => {
    if (sourceRef.current) URL.revokeObjectURL(sourceRef.current.source);
    sourceRef.current = null;
  }, []);

  const closeCrop = () => {
    if (sourceRef.current) URL.revokeObjectURL(sourceRef.current.source);
    sourceRef.current = null;
    setCropSource(null);
  };

  const selectImage = async (file?: File) => {
    if (!file || disabled) return;
    setError(undefined);
    setMessage(undefined);
    if (!PROFILE_IMAGE_TYPES.includes(file.type as (typeof PROFILE_IMAGE_TYPES)[number])) {
      setError("Choose a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > PROFILE_IMAGE_MAX_BYTES) {
      setError("Choose an image up to 5 MB.");
      return;
    }
    const nextSource = { file, source: URL.createObjectURL(file) };
    if (sourceRef.current) URL.revokeObjectURL(sourceRef.current.source);
    sourceRef.current = nextSource;
    setReading(true);
    try {
      await getImageAspectRatio(nextSource.source);
      if (sourceRef.current === nextSource) setCropSource(nextSource);
    } catch {
      if (sourceRef.current === nextSource) {
        closeCrop();
        setError("The selected image could not be loaded. Choose another image.");
      }
    } finally {
      setReading(false);
    }
  };

  const saveImage = async (image: File | null) => {
    if (busy || mutation.isPending) return;
    setError(undefined);
    setMessage(undefined);
    try {
      await mutation.mutateAsync(image);
      setMessage(image ? "Your profile photo was updated." : "Your profile photo was removed.");
    } catch (cause) {
      const apiError = parseApiError(cause);
      const errorMessage = apiError.validationErrors?.image?.[0] ?? apiError.message;
      setError(errorMessage);
      if (image) throw new Error(errorMessage);
    } finally {
      mutation.reset();
    }
  };

  return (
    <Card>
      <CardHeader className="gap-1.5">
        <CardTitle><h2>Profile photo</h2></CardTitle>
        <CardDescription>Add a photo so your account is easy to recognize.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
          <UserAvatar user={user} className="size-20" />
          <Field className="min-w-0 flex-1 gap-3" data-invalid={!!error} data-disabled={disabled}>
            <div className="flex min-w-0 flex-col gap-1">
              <p className="break-words font-medium">{user.full_name || [user.first_name, user.last_name].filter(Boolean).join(" ") || user.username}</p>
              <p className="break-all text-sm text-muted-foreground">{user.email}</p>
            </div>
            <div className="relative">
              <FieldLabel htmlFor="profile-photo" className="sr-only">Profile photo</FieldLabel>
              <Input
                ref={inputRef}
                id="profile-photo"
                type="file"
                accept={PROFILE_IMAGE_TYPES.join(",")}
                className="sr-only size-px"
                disabled={disabled}
                aria-invalid={!!error}
                aria-describedby="profile-photo-hint profile-photo-error"
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0];
                  event.currentTarget.value = "";
                  void selectImage(file);
                }}
              />
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" className="h-11 md:h-9" disabled={disabled} onClick={() => inputRef.current?.click()}>
                  {reading ? "Reading image…" : mutation.isPending ? "Saving photo…" : user.profile_image_url ? "Change photo" : "Upload photo"}
                </Button>
                {user.profile_image_url ? (
                  <Button type="button" variant="ghost" className="h-11 md:h-9" disabled={disabled} onClick={() => void saveImage(null)}>
                    Remove photo
                  </Button>
                ) : null}
              </div>
            </div>
            <FieldDescription id="profile-photo-hint">JPG, PNG, or WebP. Maximum 5 MB.</FieldDescription>
            <FieldError id="profile-photo-error">{error}</FieldError>
            {message ? <p role="status" className="text-sm text-muted-foreground">{message}</p> : null}
          </Field>
        </div>
      </CardContent>
      {cropSource ? (
        <ProfilePhotoCropDialog
          open
          source={cropSource.source}
          file={cropSource.file}
          maxBytes={PROFILE_IMAGE_MAX_BYTES}
          onOpenChange={(open) => { if (!open) closeCrop(); }}
          onCrop={saveImage}
        />
      ) : null}
    </Card>
  );
}
