import { Button } from "@repo/ui/components/button";
import { ShieldAlert } from "lucide-react";
import { api } from "@/lib/api";
import { useState } from "react";
import { Spinner } from "@repo/ui/components/spinner";
import { toast } from "sonner";
import { Employee } from "@/lib/api/endpoints/employee";

type Props = {
  employee: Employee;
  onDeactivateSuccess?: () => void;
};

const ActionDeactivate = ({ employee, onDeactivateSuccess }: Props) => {
  const [loading, setLoading] = useState(false);

  const onClickDeactivate = () => {
    setLoading(true);
    api.employees
      .deactivateEmployee(employee.id!)
      .then(() => {
        toast.success("Employee deactivated successfully");
        onDeactivateSuccess?.();
      })
      .catch(() => {
        toast.error("Failed to deactivate employee");
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
      onClick={() => (employee.username ? onClickDeactivate() : undefined)}
    >
      {loading ? <Spinner /> : <ShieldAlert data-icon="inline-start" />}
      Deactivate
    </Button>
  );
};

export default ActionDeactivate;
