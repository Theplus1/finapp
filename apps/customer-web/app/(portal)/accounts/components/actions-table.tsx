import { Employee } from "@/lib/api/endpoints/employee";
import ActionResetPassword from "./action-reset-password";
import ActionEditEmployee from "./action-edit-employee";

export enum DrawerTypeEmployeeEnum {
  SET_ACCOUNT = "set-account",
}

type Props = {
  employee: Employee;
  onEditEmployee: () => void;
};

const ActionsTable = ({ employee, onEditEmployee }: Props) => {
  return (
    <div className="grid gap-2">
      <ActionEditEmployee onClickEditEmployee={onEditEmployee} />
      <ActionResetPassword employee={employee} />
    </div>
  );
};

export default ActionsTable;
