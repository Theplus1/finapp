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
  permissions: [],
  virtualAccountId: "",
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
        permissions: employee.permissions ?? [],
      });
    }
  }, [employee]);

  const isEdit = drawerType === EmployeeDrawerTypeEnum.EDIT;

  const disabledCreate =
    isLoading ||
    !formEmployee.username ||
    !formEmployee.password ||
    (formEmployee.password ?? "").length < 8 ||
    formEmployee.password !== formEmployee.confirmPassword ||
    (formEmployee.permissions ?? []).length === 0;

  const disabledEdit =
    isLoading ||
    !formEmployee.username;

  const disabledSubmit = isEdit ? disabledEdit : disabledCreate;

  const { mutateAsync: createAccount } = useMutation({
    mutationFn: async () => {
      setIsLoading(true);
      api.employees
        .createEmployee({
          username: formEmployee.username!,
          password: formEmployee.password!,
          permissions: formEmployee.permissions ?? [],
          ...(formEmployee.virtualAccountId ? { virtualAccountId: formEmployee.virtualAccountId } : {}),
        })
        .then(() => {
          toast.success("Employee created successfully");
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
          permissions: formEmployee.permissions ?? [],
        })
        .then(() => {
          toast.success("Employee updated successfully");
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

  return (
    <>
      <FormSetEmployee
        employeeData={formEmployee}
        onChangeEmployeeData={setFormEmployee}
        onCancelSetEmployee={onCancelDrawer}
        onSubmitEmployeeSuccess={onSubmitDrawerSuccess}
        isEdit={isEdit}
      />
      <DrawerFooter className="px-4">
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onCancelDrawer}>
            Cancel
          </Button>
          <Button
            className={cn(disabledSubmit && "cursor-not-allowed opacity-50")}
            onClick={!disabledSubmit
              ? drawerType === EmployeeDrawerTypeEnum.CREATE
                ? () => createAccount()
                : () => editAccount()
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
