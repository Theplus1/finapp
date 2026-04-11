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
  isEdit: boolean;
};

const ALL_PERMISSIONS = Object.values(PermissionEnum);
const MIN_PASSWORD_LENGTH = 8;

// Mutually exclusive permission pairs: picking one auto-clears the other.
// Prevents boss from assigning both the "limited" and "full" view at once.
const MUTEX_PAIRS: ReadonlyArray<[string, string]> = [
  [PermissionEnum.TRANSACTIONS, PermissionEnum.TRANSACTIONS_FULL],
  [PermissionEnum.CARD_LIST_OWN, PermissionEnum.CARD_LIST_ALL],
];

function applyMutex(permissions: string[], justAdded: string): string[] {
  for (const [a, b] of MUTEX_PAIRS) {
    if (justAdded === a) return permissions.filter((p) => p !== b);
    if (justAdded === b) return permissions.filter((p) => p !== a);
  }
  return permissions;
}

const FormSetEmployee = ({ employeeData, onChangeEmployeeData, isEdit }: Props) => {
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
    let updated: string[];
    if (current.includes(permission)) {
      updated = current.filter((p) => p !== permission);
    } else {
      updated = applyMutex([...current, permission], permission);
    }
    onChangeEmployeeData({ ...employeeData, permissions: updated });
  };

  const passwordTooShort =
    !isEdit &&
    (employeeData.password ?? "").length > 0 &&
    (employeeData.password ?? "").length < MIN_PASSWORD_LENGTH;

  const confirmMismatch =
    !isEdit &&
    (employeeData.confirmPassword ?? "").length > 0 &&
    employeeData.password !== employeeData.confirmPassword;

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
              autoFocus={!isEdit}
              placeholder="Enter username"
              value={employeeData.username ?? ""}
              onChange={(e) => handleChangeField("username", e.target.value)}
            />
          </InputGroup>
        </Field>
      </FormItemWrapper>

      <FormItemWrapper
        label="Password"
        labelClassName="text-sm font-medium text-muted-foreground"
      >
        <Field data-invalid={passwordTooShort}>
          <InputGroup className="pr-1">
            <InputGroupInput
              type="password"
              disabled={isEdit}
              placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
              value={employeeData.password ?? ""}
              onChange={(e) => handleChangeField("password", e.target.value)}
            />
          </InputGroup>
        </Field>
        {passwordTooShort && (
          <p className="text-xs text-destructive mt-1">
            Password must be at least {MIN_PASSWORD_LENGTH} characters
          </p>
        )}
      </FormItemWrapper>

      <FormItemWrapper
        label="Confirm Password"
        labelClassName="text-sm font-medium text-muted-foreground"
      >
        <Field data-invalid={confirmMismatch}>
          <InputGroup className="pr-1">
            <InputGroupInput
              type="password"
              disabled={isEdit}
              placeholder="Re-enter password"
              value={employeeData.confirmPassword ?? ""}
              onChange={(e) => handleChangeField("confirmPassword", e.target.value)}
            />
          </InputGroup>
        </Field>
        {confirmMismatch && (
          <p className="text-xs text-destructive mt-1">
            Passwords do not match
          </p>
        )}
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
    </div>
  );
};

export default FormSetEmployee;
