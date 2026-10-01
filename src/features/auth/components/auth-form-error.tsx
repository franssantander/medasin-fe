"use client";

import { useEffect, useRef } from "react";

import { FieldError } from "@/components/ui/field";

export function AuthFormError({ message }: { message?: string }) {
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (message) {
      errorRef.current?.focus();
    }
  }, [message]);

  if (!message) {
    return null;
  }

  return (
    <FieldError ref={errorRef} tabIndex={-1}>
      {message}
    </FieldError>
  );
}
