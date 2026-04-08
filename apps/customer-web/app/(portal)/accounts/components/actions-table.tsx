import { Employee } from "@/lib/api/endpoints/employee";
import ActionResetPassword from "./action-reset-password";
import ActionEditEmployee from "./action-edit-employee";
import ActionDeleteEmployee from "./action-delete-employee";

export enum DrawerTypeEmployeeEnum {
  SET_ACCOUNT = "set-account",
}

type Props = {
  employee: Employee;
  onEditEmployee: () => void;
  onDeleteSuccess: () => void;
};

const ActionsTable = ({ employee, onEditEmployee, onDeleteSuccess }: Props) => {
  return (
    <div className="grid gap-2">
      <ActionEditEmployee onClickEditEmployee={onEditEmployee} />
      <ActionResetPassword employee={employee} />
      <ActionDeleteEmployee employee={employee} onDeleteSuccess={onDeleteSuccess} />
    </div>
  );
};

export default ActionsTable;
