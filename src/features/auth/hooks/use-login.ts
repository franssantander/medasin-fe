import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLoginMutation } from "../queries/auth-query";
import { useForm, SubmitHandler } from "react-hook-form";
import { loginSchema, LoginFormValues } from "../schemas/login-schema";
import { ApiError } from "@/lib/axios";

export function useLogin() {
  const router = useRouter();

  const {
    mutate: loginFn,
    isPending: isPendingLogin,
    error,
  } = useLoginMutation();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit: SubmitHandler<LoginFormValues> = (data) => {
    loginFn(data, {
      onSuccess: () => {
        router.push("/dashboard");
      },
      onError: (error) => {
        if (error instanceof ApiError && error.validationErrors) {
          Object.entries(error.validationErrors).forEach(
            ([field, messages]) => {
              setError(field as keyof LoginFormValues, {
                type: "server",
                message: messages[0],
              });
            },
          );
        }
      },
    });
  };

  console.log("error", error?.message);

  return {
    onSubmit,
    handleSubmit,
    register,
    errors,
    isPendingLogin,
    error,
  };
}
