import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import {
  Field,
  // FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import { Spinner } from "@repo/ui/components/spinner";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

export function ChangePasswordForm() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const loginMutation = useMutation({
    mutationFn: async (newPassword: string) => {
      const { username } = JSON.parse(localStorage.getItem("user") ?? "{}");
      return api.auth
        .changePassword(username, newPassword)
        .then((data) => {
          toast.success("Change password successful");
          return data;
        })
        .catch((error) => {
          toast.error("Change password failed");
          throw error;
        });
    },
    onError: (error) => {
      console.log("Change password failed:", error);
    },
    onSuccess: (response: unknown) => {
      console.log("Change password successful:", response);
    },
  });

  const handleSubmit = async () => {
    loginMutation.mutate(newPassword);
  };

  const isLoading = loginMutation.isPending;
  const disabledSubmit =
    isLoading || !newPassword || newPassword !== confirmPassword;
  return (
    <div className={cn("flex flex-col gap-6")}>
      <Card className="w-[550px] m-auto">
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <div className="flex items-center">
                <FieldLabel htmlFor="password">Password</FieldLabel>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                required
                placeholder="Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </Field>
            <Field data-invalid={confirmPassword !== newPassword}>
              <div className="flex items-center">
                <FieldLabel htmlFor="confirmPassword">
                  Confirm Password
                </FieldLabel>
              </div>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </Field>
            <Field>
              <Button disabled={disabledSubmit} onClick={handleSubmit}>
                {isLoading ? <Spinner /> : "Change Password"}
              </Button>
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>
    </div>
  );
}
