import { DrawerFooter } from "@repo/ui/components/drawer";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { VirtualAccount } from "@/lib/api/endpoints/virtual-account";
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Spinner } from "@repo/ui/components/spinner";
import { cn } from "@/lib/utils";
import { Field } from "@repo/ui/components/field";
import { InputGroup, InputGroupInput } from "@repo/ui/components/input-group";
import { isEmail } from "@repo/ui/lib/utils";

type Props = {
  virtualAccount: VirtualAccount | null;
  openDrawer: boolean;
  onCancelSetAccount: () => void;
  onSubmitAccountSuccess: () => void;
};

const FormSetAccount = ({
  virtualAccount,
  openDrawer,
  onCancelSetAccount,
  onSubmitAccountSuccess,
}: Props) => {
  const [username, setUsername] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const { mutateAsync: setAccount } = useMutation({
    mutationFn: async () => {
      setIsLoading(true);
      api.virtualAccounts
        .setAccount(virtualAccount!.slashId, {
          username: username!,
          email: email!,
          password: password!,
        })
        .then(() => {
          toast.success("Account connect successfully");
          onSubmitAccountSuccess();
        })
        .catch((error) => {
          toast.error(error.message);
        })
        .finally(() => {
          setIsLoading(false);
        });
    },
  });

  useEffect(() => {
    if (!virtualAccount || !openDrawer) {
      return;
    }
    setUsername(virtualAccount.bossUsername ?? "");
    setEmail(virtualAccount.bossEmail ?? "");
  }, [openDrawer, virtualAccount]);

  const handleDrawerClose = () => {
    setUsername("");
    onCancelSetAccount();
  };

  const disableSubmit =
    isLoading ||
    !username ||
    !email ||
    !isEmail(email) ||
    !password ||
    !confirmPassword ||
    password !== confirmPassword;

  return (
    <>
      <div className="px-4 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label className="block text-sm font-medium text-muted-foreground">
            Username
          </label>
          <Input
            placeholder="Enter username"
            value={username}
            onChange={(e) => {
              const value = e.target.value;
              setUsername(value);
            }}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="block text-sm font-medium text-muted-foreground">
            Email (Use for login)
          </label>
          <Field data-invalid={!isEmail(email)}>
            <InputGroup className="pr-1">
              <InputGroupInput
                type="email"
                placeholder="Enter email"
                value={email}
                onChange={(e) => {
                  const value = e.target.value;
                  setEmail(value);
                }}
              />
            </InputGroup>
          </Field>
        </div>
        <div className="flex flex-col gap-2">
          <label className="block text-sm font-medium text-muted-foreground">
            Password
          </label>
          <Input
            placeholder="Enter password"
            value={password}
            type="password"
            onChange={(e) => {
              const value = e.target.value;
              setPassword(value);
            }}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="block text-sm font-medium text-muted-foreground">
            Confirm Password
          </label>
          <Field data-invalid={password !== confirmPassword}>
            <InputGroup className="pr-1">
              <InputGroupInput
                type="password"
                placeholder="Enter confirm password"
                value={confirmPassword}
                onChange={(e) => {
                  const value = e.target.value;
                  setConfirmPassword(value);
                }}
              />
            </InputGroup>
          </Field>
        </div>
      </div>
      <DrawerFooter className="px-4">
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={handleDrawerClose}
            className="cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            className={cn(
              "cursor-pointer",
              disableSubmit && "cursor-not-allowed opacity-50",
            )}
            onClick={!disableSubmit ? (setAccount as () => void) : undefined}
          >
            {isLoading ? <Spinner /> : ""}
            Submit
          </Button>
        </div>
      </DrawerFooter>
    </>
  );
};

export default FormSetAccount;
