import { Field } from "@repo/ui/components/field";
import { InputGroup, InputGroupInput } from "@repo/ui/components/input-group";
import { Checkbox } from "@repo/ui/components/checkbox";
import { PermissionEnum, PERMISSION_LABELS } from "@/lib/api/endpoints/users";
import { FormItemWrapper } from "@repo/ui/components/form-item-wrapper";
import { CreateEmployeeData } from "@/lib/api/endpoints/employee";
import { Label } from "@repo/ui/components/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/components/select";
import { useLayoutEffect, useState } from "react";

type Props = {
  employeeData: CreateEmployeeData;
  onChangeEmployeeData: (employeeData: CreateEmployeeData) => void;
  onCancelSetEmployee: () => void;
  onSubmitEmployeeSuccess: () => void;
};

const ALL_PERMISSIONS = Object.values(PermissionEnum);

const FormSetEmployee = ({ employeeData, onChangeEmployeeData }: Props) => {
  const isEdit = !!employeeData.username;
  const [bossVaIds, setBossVaIds] = useState<string[]>([]);

  useLayoutEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") ?? "{}");
    const vaIds: string[] = user.virtualAccountIds ?? [];
    setBossVaIds(vaIds);
    // Auto-set VA if only one
    if (vaIds.length === 1 && !employeeData.virtualAccountId) {
      onChangeEmployeeData({ ...employeeData, virtualAccountId: vaIds[0] });
    }
  }, []);

  const handleChangeField = (field: keyof CreateEmployeeData, value: string) => {
    onChangeEmployeeData({ ...employeeData, [field]: value });
  };

  const handleTogglePermission = (permission: string) => {
    const current = employeeData.permissions ?? [];
    const updated = current.includes(permission)
      ? current.filter((p) => p !== permission)
      : [...current, permission];
    onChangeEmployeeData({ ...employeeData, permissions: updated });
  };

  return (
    <div className="px-4 flex flex-col gap-4">
      {bossVaIds.length > 1 && (
        <FormItemWrapper
          label="Virtual Account"
          labelClassName="text-sm font-medium text-muted-foreground"
        >
          <Select
            value={employeeData.virtualAccountId ?? ""}
            onValueChange={(v) => onChangeEmployeeData({ ...employeeData, virtualAccountId: v })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select VA" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {bossVaIds.map((vaId) => (
                  <SelectItem key={vaId} value={vaId}>{vaId}</SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </FormItemWrapper>
      )}
      <FormItemWrapper
        label="Username"
        labelClassName="text-sm font-medium text-muted-foreground"
      >
        <Field>
          <InputGroup className="pr-1">
            <InputGroupInput
              placeholder="Enter username"
              value={employeeData.username}
              onChange={(e) => handleChangeField("username", e.target.value)}
            />
          </InputGroup>
        </Field>
      </FormItemWrapper>

      <FormItemWrapper
        label="Permissions"
        labelClassName="text-sm font-medium text-muted-foreground"
      >
        <div className="flex flex-col gap-2">
          {ALL_PERMISSIONS.map((permission) => (
            <div key={permission} className="flex items-center gap-2">
              <Checkbox
                id={permission}
                checked={(employeeData.permissions ?? []).includes(permission)}
                onCheckedChange={() => handleTogglePermission(permission)}
              />
              <Label htmlFor={permission} className="text-sm cursor-pointer">
                {PERMISSION_LABELS[permission]}
              </Label>
            </div>
          ))}
        </div>
      </FormItemWrapper>

      <FormItemWrapper
        label="Password"
        labelClassName="text-sm font-medium text-muted-foreground"
      >
        <Field>
          <InputGroup className="pr-1">
            <InputGroupInput
              type="password"
              disabled={isEdit}
              placeholder="Enter password"
              value={employeeData.password}
              onChange={(e) => handleChangeField("password", e.target.value)}
            />
          </InputGroup>
        </Field>
      </FormItemWrapper>

      <FormItemWrapper
        label="Confirm Password"
        labelClassName="text-sm font-medium text-muted-foreground"
      >
        <Field data-invalid={employeeData.password !== employeeData.confirmPassword}>
          <InputGroup className="pr-1">
            <InputGroupInput
              type="password"
              disabled={isEdit}
              placeholder="Enter confirm password"
              value={employeeData.confirmPassword}
              onChange={(e) => handleChangeField("confirmPassword", e.target.value)}
            />
          </InputGroup>
        </Field>
      </FormItemWrapper>
    </div>
  );
};

export default FormSetEmployee;
