import { DrawerFooter } from "@repo/ui/components/drawer";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { VirtualAccount } from "@/lib/api/endpoints/virtual-account";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Spinner } from "@repo/ui/components/spinner";
import { cn } from "@/lib/utils";
import { Field } from "@repo/ui/components/field";
import { InputGroup, InputGroupInput } from "@repo/ui/components/input-group";
import { FormItemWrapper } from "@repo/ui/components/form-item-wrapper";

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
  const isEdit = !!virtualAccount?.bossUsername;
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!virtualAccount || !openDrawer) return;
    setUsername(virtualAccount.bossUsername ?? "");
    setPassword("");
    setConfirmPassword("");
  }, [openDrawer, virtualAccount]);

  const handleCreate = async () => {
    setIsLoading(true);
    try {
      await api.virtualAccounts.setAccount(virtualAccount!.slashId, { username, password });
      toast.success("Boss account created");
      onSubmitAccountSuccess();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!virtualAccount?.bossId) return;
    setIsLoading(true);
    try {
      const body: any = {};
      if (username !== virtualAccount.bossUsername) body.username = username;
      if (password) body.password = password;
      if (Object.keys(body).length === 0) { toast.info("Nothing changed"); return; }
      await api.virtualAccounts.updateBoss(virtualAccount.bossId, body);
      toast.success("Boss updated");
      onSubmitAccountSuccess();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const disableCreate = isLoading || !username ||
    !password || !confirmPassword || password !== confirmPassword;

  const disableEdit = isLoading || !username ||
    (!!password && password !== confirmPassword);

  return (
    <>
      <div className="px-4 flex flex-col gap-4">
        <FormItemWrapper label="Username" labelClassName="text-sm font-medium text-muted-foreground">
          <Input placeholder="Enter username" value={username}
            onChange={(e) => setUsername(e.target.value)} />
        </FormItemWrapper>
        <FormItemWrapper
          label={isEdit ? "New Password (để trống = giữ nguyên)" : "Password"}
          labelClassName="text-sm font-medium text-muted-foreground"
        >
          <Input placeholder={isEdit ? "Leave blank to keep" : "Enter password"}
            value={password} type="password" onChange={(e) => setPassword(e.target.value)} />
        </FormItemWrapper>
        {(!isEdit || password) && (
          <FormItemWrapper label="Confirm Password" labelClassName="text-sm font-medium text-muted-foreground">
            <Field data-invalid={password !== confirmPassword}>
              <InputGroup className="pr-1">
                <InputGroupInput type="password" placeholder="Confirm password"
                  value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              </InputGroup>
            </Field>
          </FormItemWrapper>
        )}
      </div>
      <DrawerFooter className="px-4">
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onCancelSetAccount}>Cancel</Button>
          <Button
            className={cn((isEdit ? disableEdit : disableCreate) && "cursor-not-allowed opacity-50")}
            onClick={!(isEdit ? disableEdit : disableCreate) ? (isEdit ? handleUpdate : handleCreate) : undefined}
          >
            {isLoading ? <Spinner /> : ""}{isEdit ? "Update" : "Create"}
          </Button>
        </div>
      </DrawerFooter>
    </>
  );
};

export default FormSetAccount;
