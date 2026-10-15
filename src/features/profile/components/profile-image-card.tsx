"use client";

import dynamic from "next/dynamic";
import { CameraIcon, UploadIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { CurrentUser } from "@/features/auth/type";
import { getImageAspectRatio } from "@/lib/image/crop-image";
import { parseApiError } from "@/lib/axios";
import { useProfileImageMutation } from "../queries/profile-query";
import { PROFILE_IMAGE_MAX_BYTES, PROFILE_IMAGE_TYPES } from "../types";
import { getUserDisplayName, UserAvatar } from "./user-avatar";

const ProfilePhotoCropDialog = dynamic(
  () => import("./profile-photo-crop-dialog").then((module) => module.ProfilePhotoCropDialog),
  { ssr: false },
);

type CropSource = { file: File; source: string };

const HERO_BAND = [
  "radial-gradient(circle at 15% 0%, color-mix(in oklch, var(--primary) 12%, transparent), transparent 55%)",
  "radial-gradient(circle at 85% 100%, color-mix(in oklch, var(--primary) 8%, transparent), transparent 50%)",
  "linear-gradient(to right, var(--muted), color-mix(in oklch, var(--muted) 60%, var(--card)))",
].join(", ");

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
    <Card className="gap-0 py-0">
      <div aria-hidden="true" className="h-20 sm:h-24" style={{ backgroundImage: HERO_BAND }} />
      <CardContent className="flex flex-col items-center gap-4 px-6 pb-6 text-center sm:flex-row sm:items-start sm:gap-6 sm:text-left">
        <div className="relative -mt-12 shrink-0">
          <UserAvatar user={user} className="size-24 ring-4 ring-card" fallbackClassName="text-2xl font-medium" />
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="absolute right-0 bottom-0 rounded-full bg-card shadow-sm"
            aria-label="Edit profile photo"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
          >
            <CameraIcon />
          </Button>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-4 sm:pt-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="break-words text-lg font-semibold">{getUserDisplayName(user)}</p>
            <p className="text-sm text-muted-foreground">
              <span className="break-all">@{user.username}</span>
              <span aria-hidden="true" className="mx-1.5">·</span>
              <span className="break-all">{user.email}</span>
            </p>
          </div>
          <Field className="gap-2" data-invalid={!!error} data-disabled={disabled}>
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
              <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
                <Button type="button" variant="outline" className="h-11 md:h-9" disabled={disabled} onClick={() => inputRef.current?.click()}>
                  <UploadIcon data-icon="inline-start" />
                  {reading ? "Reading image…" : mutation.isPending ? "Saving photo…" : user.profile_image_url ? "Change photo" : "Upload photo"}
                </Button>
                {user.profile_image_url ? (
                  <Button type="button" variant="ghost" className="h-11 text-muted-foreground md:h-9" disabled={disabled} onClick={() => void saveImage(null)}>
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
