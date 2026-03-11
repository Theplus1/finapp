import { Settings } from "lucide-react";
import { Employee } from "@/lib/api/endpoints/employee";
import { Button } from "@repo/ui/components/button";

export enum DrawerTypeEmployeeEnum {
  SET_ACCOUNT = "set-account",
}

type Props = {
  onClickAction: (type: DrawerTypeEmployeeEnum) => void;
  employee: Employee;
};

const ActionsTable = ({ onClickAction, employee }: Props) => {
  return (
    <div>
      <div className="grid gap-2">
        <Button
          variant={"outline"}
          size={"default"}
          className={
            !!employee.username ? "cursor-not-allowed" : "cursor-pointer"
          }
          onClick={() =>
            !!employee.username
              ? undefined
              : onClickAction(DrawerTypeEmployeeEnum.SET_ACCOUNT)
          }
        >
          <Settings data-icon="inline-start" />
          Edit employee
        </Button>
      </div>
    </div>
  );
};

export default ActionsTable;
