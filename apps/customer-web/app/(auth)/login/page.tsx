"use client";

import { LoginForm } from "@/components/auth/login-form";
import { useMutation } from "@tanstack/react-query";
import { api, ApiResponse, AuthResponse } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function Page() {
  const router = useRouter();

  const loginMutation = useMutation({
    mutationFn: api.auth.login,
    onError: (error) => {
      console.log("Login failed:", error);
    },
    onSuccess: (response: ApiResponse<AuthResponse>) => {
      const isCustomer = response.data.type === "customer";
      if (!isCustomer) {
        throw new Error("You don't have permission to access this page");
      }
      const { accessToken, ...rest } = response.data;

      localStorage.setItem("auth_token", accessToken);
      localStorage.setItem("user", JSON.stringify(rest));
      router.push("/dashboard");
    },
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const username = formData.get("username") as string;
    const password = formData.get("password") as string;

    loginMutation.mutate({ username, password });
  };

  return (
    <LoginForm
      onSubmit={handleSubmit}
      loading={loginMutation.isPending}
      error={loginMutation.error?.message}
    />
  );
}
