import { Settings } from "lucide-react";
import { Employee } from "@/lib/api/endpoints/employee";
import { Button } from "@repo/ui/components/button";

type Props = {
  onClickAction: (type: "set-account") => void;
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
            !!employee.username ? undefined : onClickAction("set-account")
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
