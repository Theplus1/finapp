import { Employee } from "@/lib/api/endpoints/employee";
import ActionResetPassword from "./action-reset-password";

export enum DrawerTypeEmployeeEnum {
  SET_ACCOUNT = "set-account",
}

type Props = {
  employee: Employee;
};

const ActionsTable = ({ employee }: Props) => {
  return (
    <div>
      <div className="grid gap-2">
        <ActionResetPassword employee={employee} />
      </div>
    </div>
  );
};

export default ActionsTable;
