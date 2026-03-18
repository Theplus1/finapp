import { Employee } from "@/lib/api/endpoints/employee";
import ActionResetPassword from "./action-reset-password";
import ActionDeactivate from "./action-deactivate";

export enum DrawerTypeEmployeeEnum {
  SET_ACCOUNT = "set-account",
}

type Props = {
  employee: Employee;
  onDeactivateSuccess?: () => void;
};

const ActionsTable = ({ employee, onDeactivateSuccess }: Props) => {
  return (
    <div>
      <div className="grid gap-2">
        <ActionResetPassword employee={employee} />
        <ActionDeactivate employee={employee} onDeactivateSuccess={onDeactivateSuccess} />
      </div>
    </div>
  );
};

export default ActionsTable;
