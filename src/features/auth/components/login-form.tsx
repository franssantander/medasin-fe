"use client";

import { Button } from "@/components/ui/button";
import { useLogin } from "../hooks/use-login";
import { Input } from "@/components/ui/input";

export default function LoginForm() {
  const { onSubmit, handleSubmit, register, errors, isPendingLogin, error } =
    useLogin();
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div>
        <Input placeholder="Username" {...register("username")} />
        {errors.username && (
          <p className="mt-1 text-sm text-red-500">{errors.username.message}</p>
        )}
      </div>

      <div>
        <Input
          type="password"
          placeholder="Password"
          {...register("password")}
        />
        {errors.password && (
          <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
        )}
      </div>

      <Button type="submit" disabled={isPendingLogin}>
        {isPendingLogin ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}
