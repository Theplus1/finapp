import { Button } from "@repo/ui/components/button";
import { Pencil } from "lucide-react";

type Props = {
  onClickEditEmployee: () => void;
};

const ActionEditEmployee = ({ onClickEditEmployee }: Props) => {
  return (
    <Button variant={"outline"} size={"default"} onClick={onClickEditEmployee}>
      <Pencil data-icon="inline-start" />
      Edit employee
    </Button>
  );
};

export default ActionEditEmployee;
