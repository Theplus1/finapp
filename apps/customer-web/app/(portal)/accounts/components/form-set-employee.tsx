import { Field } from "@repo/ui/components/field";
import { InputGroup, InputGroupInput } from "@repo/ui/components/input-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select";
import { RoleUserEnum } from "@/lib/api/endpoints/users";
import { isEmail } from "@repo/ui/lib/utils";
import { FormItemWrapper } from "@repo/ui/components/form-item-wrapper";
import { CreateEmployeeData } from "@/lib/api/endpoints/employee";
// import { Checkbox } from "@repo/ui/components/checkbox";

type Props = {
  employeeData: CreateEmployeeData;
  onChangeEmployeeData: (employeeData: CreateEmployeeData) => void;
  onCancelSetEmployee: () => void;
  onSubmitEmployeeSuccess: () => void;
};

const FormSetEmployee = ({ employeeData, onChangeEmployeeData }: Props) => {
  // const [permission, setPermission] = useState<PermissionEnum[]>([]);

  // const onCheckPermission = (value: PermissionEnum) => {
  //   if (permission.includes(value)) {
  //     setPermission(permission.filter((item) => item !== value));
  //   } else {
  //     setPermission([...permission, value]);
  //   }
  // };

  const handleChangeEmployeeData = (
    field: keyof CreateEmployeeData,
    value: string,
  ) => {
    onChangeEmployeeData({
      ...employeeData,
      [field]: value,
    });
  };

  const isEdit = !!employeeData.username;

  return (
    <>
      <div className="px-4 flex flex-col gap-4">
        <FormItemWrapper
          label="Username"
          labelClassName="text-sm font-medium text-muted-foreground"
        >
          <Field>
            <InputGroup className="pr-1">
              <InputGroupInput
                placeholder="Enter username"
                value={employeeData.username}
                onChange={(e) => {
                  const value = e.target.value;
                  handleChangeEmployeeData("username", value);
                }}
              />
            </InputGroup>
          </Field>
        </FormItemWrapper>
        <FormItemWrapper
          label="Role"
          labelClassName="text-sm font-medium text-muted-foreground"
        >
          <Field>
            <InputGroup className="pr-1">
              <Select
                disabled={isEdit}
                onValueChange={(
                  value: RoleUserEnum.ADS | RoleUserEnum.ACCOUNTANT,
                ) => {
                  handleChangeEmployeeData("role", value);
                }}
                value={employeeData.role}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem key="ads" value={RoleUserEnum.ADS}>
                      Ads
                    </SelectItem>
                    <SelectItem
                      key="accountant"
                      value={RoleUserEnum.ACCOUNTANT}
                    >
                      Accountant
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </InputGroup>
          </Field>

          {/* <div className="grid grid-cols-2 gap-2">
            <Field orientation="horizontal">
              <Checkbox
                id={PermissionEnum.TRANSACTIONS}
                name={PermissionEnum.TRANSACTIONS}
                checked={permission.includes(PermissionEnum.TRANSACTIONS)}
                onCheckedChange={() =>
                  onCheckPermission(PermissionEnum.TRANSACTIONS)
                }
              />
              <FieldLabel htmlFor={PermissionEnum.TRANSACTIONS} className="text-muted-foreground">
                Transactions
              </FieldLabel>
            </Field>
            <Field orientation="horizontal">
              <Checkbox
                id={PermissionEnum.CARD_LIST}
                name={PermissionEnum.CARD_LIST}
                checked={permission.includes(PermissionEnum.CARD_LIST)}
                onCheckedChange={() =>
                  onCheckPermission(PermissionEnum.CARD_LIST)
                }
              />
              <FieldLabel htmlFor={PermissionEnum.CARD_LIST} className="text-muted-foreground">
                Card list
              </FieldLabel>
            </Field>
            <Field orientation="horizontal">
              <Checkbox
                id={PermissionEnum.PAYMENTS}
                name={PermissionEnum.PAYMENTS}
                checked={permission.includes(PermissionEnum.PAYMENTS)}
                onCheckedChange={() =>
                  onCheckPermission(PermissionEnum.PAYMENTS)
                }
              />
              <FieldLabel htmlFor={PermissionEnum.PAYMENTS} className="text-muted-foreground">
                Payments
              </FieldLabel>
            </Field>
            <Field orientation="horizontal">
              <Checkbox
                id={PermissionEnum.CARD_SPEND}
                name={PermissionEnum.CARD_SPEND}
                checked={permission.includes(PermissionEnum.CARD_SPEND)}
                onCheckedChange={() =>
                  onCheckPermission(PermissionEnum.CARD_SPEND)
                }
              />
              <FieldLabel htmlFor={PermissionEnum.CARD_SPEND} className="text-muted-foreground">
                Card spend
              </FieldLabel>
            </Field>
          </div> */}
        </FormItemWrapper>
        <FormItemWrapper
          label="Email"
          labelClassName="text-sm font-medium text-muted-foreground"
        >
          <Field data-invalid={!isEmail(employeeData.email)}>
            <InputGroup className="pr-1">
              <InputGroupInput
                type="email"
                disabled={isEdit}
                placeholder="Enter email"
                value={employeeData.email}
                onChange={(e) => {
                  const value = e.target.value;
                  handleChangeEmployeeData("email", value);
                }}
              />
            </InputGroup>
          </Field>
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
                onChange={(e) => {
                  const value = e.target.value;
                  handleChangeEmployeeData("password", value);
                }}
              />
            </InputGroup>
          </Field>
        </FormItemWrapper>
        <FormItemWrapper
          label="Confirm Password"
          labelClassName="text-sm font-medium text-muted-foreground"
        >
          <Field
            data-invalid={
              employeeData.password !== employeeData.confirmPassword
            }
          >
            <InputGroup className="pr-1">
              <InputGroupInput
                type="password"
                disabled={isEdit}
                placeholder="Enter confirm password"
                value={employeeData.confirmPassword}
                onChange={(e) => {
                  const value = e.target.value;
                  handleChangeEmployeeData("confirmPassword", value);
                }}
              />
            </InputGroup>
          </Field>
        </FormItemWrapper>
      </div>
      {/* <DrawerFooter className="px-4">
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={handleDrawerClose}>
            Cancel
          </Button>
          <Button
            className={cn(disableSubmit && "cursor-not-allowed opacity-50")}
            onClick={!disableSubmit ? onSubmit : undefined}
          >
            {isLoading ? <Spinner /> : ""}
            Submit
          </Button>
        </div>
      </DrawerFooter> */}
    </>
  );
};

export default FormSetEmployee;
