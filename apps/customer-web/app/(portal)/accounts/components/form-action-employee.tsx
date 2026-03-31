import { DrawerFooter } from "@repo/ui/components/drawer";
import { Button } from "@repo/ui/components/button";
import { useEffect, useState } from "react";
import { Spinner } from "@repo/ui/components/spinner";
import { cn } from "@/lib/utils";
import {
  CreateEmployeeData,
  Employee,
  EmployeeDrawerTypeEnum,
} from "@/lib/api/endpoints/employee";
import FormSetEmployee from "./form-set-employee";
import { RoleUserEnum } from "@/lib/api/endpoints/users";
import { isEmail } from "@repo/ui/lib/utils";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";

type Props = {
  employee: Employee | null;
  drawerType: EmployeeDrawerTypeEnum;
  onCancelDrawer: () => void;
  onSubmitDrawerSuccess: () => void;
};

const initEmployee: CreateEmployeeData = {
  username: "",
  password: "",
  email: "",
  role: RoleUserEnum.ADS,
  confirmPassword: "",
};

const FormActionEmployee = ({
  employee,
  drawerType,
  onCancelDrawer,
  onSubmitDrawerSuccess,
}: Props) => {
  const [formEmployee, setFormEmployee] = useState(initEmployee);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (employee) {
      setFormEmployee({
        username: employee.username,
        password: "",
        email: employee.email,
        role: employee.role,
      });
    }
  }, [employee]);

  const disabledCreate =
    isLoading ||
    !formEmployee.username ||
    !formEmployee.email ||
    !isEmail(formEmployee.email) ||
    !formEmployee.password ||
    formEmployee.password !== formEmployee.confirmPassword;

  const disabledEdit =
    isLoading ||
    !formEmployee.username ||
    employee?.username === formEmployee.username;

  const disabledSubmit =
    drawerType === EmployeeDrawerTypeEnum.CREATE
      ? disabledCreate
      : disabledEdit;

  const { mutateAsync: createAccount } = useMutation({
    mutationFn: async () => {
      setIsLoading(true);
      api.employees
        .createEmployee({
          username: formEmployee.username!,
          email: formEmployee.email!,
          password: formEmployee.password!,
          role: formEmployee.role,
        })
        .then(() => {
          toast.success("Employee set successfully");
          onSubmitDrawerSuccess();
        })
        .catch((error) => {
          toast.error(error.message);
        })
        .finally(() => {
          setIsLoading(false);
        });
    },
  });
  const { mutateAsync: editAccount } = useMutation({
    mutationFn: async () => {
      setIsLoading(true);
      api.employees
        .updateEmployee(employee!.id, {
          username: formEmployee.username!,
        })
        .then(() => {
          toast.success("Employee set successfully");
          onSubmitDrawerSuccess();
        })
        .catch((error) => {
          toast.error(error.message);
        })
        .finally(() => {
          setIsLoading(false);
        });
    },
  });

  const onSubmitCreate = () => {
    createAccount();
  };

  const onSubmitEdit = () => {
    editAccount();
  };

  return (
    <>
      <FormSetEmployee
        employeeData={formEmployee}
        onChangeEmployeeData={setFormEmployee}
        onCancelSetEmployee={onCancelDrawer}
        onSubmitEmployeeSuccess={onSubmitDrawerSuccess}
      />
      <DrawerFooter className="px-4">
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onCancelDrawer}>
            Cancel
          </Button>
          <Button
            className={cn(disabledSubmit && "cursor-not-allowed opacity-50")}
            onClick={
              !disabledSubmit
                ? drawerType === EmployeeDrawerTypeEnum.CREATE
                  ? onSubmitCreate
                  : onSubmitEdit
                : undefined
            }
          >
            {isLoading ? <Spinner /> : ""}
            Submit
          </Button>
        </div>
      </DrawerFooter>
    </>
  );
};

export default FormActionEmployee;
