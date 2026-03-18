import { Button } from "@repo/ui/components/button";
import { KeyRound } from "lucide-react";
import { api } from "@/lib/api";
import { useState } from "react";
import { Spinner } from "@repo/ui/components/spinner";
import { toast } from "sonner";
import { Employee } from "@/lib/api/endpoints/employee";

type Props = {
  employee: Employee;
};

const ActionResetPassword = ({ employee }: Props) => {
  const [loading, setLoading] = useState(false);

  const onClickResetPassword = () => {
    setLoading(true);
    api.employees
      .resetPassword(employee.id!)
      .then((data: { data: { newPassword: string } }) => {
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
      className={!employee.username ? "cursor-not-allowed" : "cursor-pointer"}
      onClick={() => (employee.username ? onClickResetPassword() : undefined)}
    >
      {loading ? <Spinner /> : <KeyRound data-icon="inline-start" />}
      Reset password
    </Button>
  );
};

export default ActionResetPassword;
