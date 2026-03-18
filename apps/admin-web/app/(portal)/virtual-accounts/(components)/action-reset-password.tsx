import { Button } from "@repo/ui/components/button";
import { VirtualAccount } from "@/lib/api/endpoints/virtual-account";
import { KeyRound } from "lucide-react";
import { api } from "@/lib/api";
import { useState } from "react";
import { Spinner } from "@repo/ui/components/spinner";
import { toast } from "sonner";

type Props = {
  virtualAccount: VirtualAccount;
};

const ActionResetPassword = ({ virtualAccount }: Props) => {
  const [loading, setLoading] = useState(false);

  const onClickResetPassword = () => {
    setLoading(true);
    api.virtualAccounts
      .resetPassword(virtualAccount.bossUsername!)
      .then((data: any) => {
        toast.success(`Copied to clipboard: ${data.data.newPassword}`);
        navigator.clipboard.writeText(data.data.newPassword);
      })
      .catch(() => {
        toast.error("Failed to reset password");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <Button
      variant={"outline"}
      size={"default"}
      className={
        !virtualAccount.bossUsername ? "cursor-not-allowed" : "cursor-pointer"
      }
      onClick={() =>
        virtualAccount.bossUsername ? onClickResetPassword() : undefined
      }
    >
      {loading ? <Spinner /> : <KeyRound data-icon="inline-start" />}
      Reset boss password
    </Button>
  );
};

export default ActionResetPassword;
