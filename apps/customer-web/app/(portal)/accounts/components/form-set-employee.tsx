import { DrawerFooter } from "@repo/ui/components/drawer";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Spinner } from "@repo/ui/components/spinner";
import { cn } from "@/lib/utils";
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
// import { Checkbox } from "@repo/ui/components/checkbox";

type Props = {
  openDrawer: boolean;
  onCancelSetEmployee: () => void;
  onSubmitEmployeeSuccess: () => void;
};

const FormSetEmployee = ({
  openDrawer,
  onCancelSetEmployee,
  onSubmitEmployeeSuccess,
}: Props) => {
  const [username, setUsername] = useState<string>("");
  const [role, setRole] = useState<RoleUserEnum.ADS | RoleUserEnum.ACCOUNTANT>(
    RoleUserEnum.ADS,
  );
  // const [permission, setPermission] = useState<PermissionEnum[]>([]);
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const { mutateAsync: setAccount } = useMutation({
    mutationFn: async () => {
      setIsLoading(true);
      api.employees
        .createEmployee({
          username: username!,
          email: email!,
          password: password!,
          role: role,
        })
        .then(() => {
          toast.success("Employee set successfully");
          onSubmitEmployeeSuccess();
        })
        .catch((error) => {
          toast.error(error.message);
        })
        .finally(() => {
          setIsLoading(false);
        });
    },
  });

  useEffect(() => {
    if (!openDrawer) {
      return;
    }
    setUsername("");
  }, [openDrawer]);

  const onSubmit = () => {
    if (!username) {
      toast.error("Username is required");
      return;
    }
    setAccount();
  };

  const handleDrawerClose = () => {
    setUsername("");
    onCancelSetEmployee();
  };

  const disableSubmit =
    isLoading ||
    !username ||
    !email ||
    !isEmail(email) ||
    !password ||
    password !== confirmPassword;

  // const onCheckPermission = (value: PermissionEnum) => {
  //   if (permission.includes(value)) {
  //     setPermission(permission.filter((item) => item !== value));
  //   } else {
  //     setPermission([...permission, value]);
  //   }
  // };

  return (
    <>
      <div className="px-4 flex flex-col gap-4">
        <FormItemWrapper
          label="Username"
          labelClassName="text-sm font-medium text-muted-foreground"
        >
          <Input
            placeholder="Enter username"
            value={username}
            onChange={(e) => {
              const value = e.target.value;
              setUsername(value);
            }}
          />
        </FormItemWrapper>
        <FormItemWrapper
          label="Role"
          labelClassName="text-sm font-medium text-muted-foreground"
        >
          <Select
            onValueChange={(
              value: RoleUserEnum.ADS | RoleUserEnum.ACCOUNTANT,
            ) => {
              setRole(value);
            }}
            value={role}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a role" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem key="ads" value={RoleUserEnum.ADS}>
                  Ads
                </SelectItem>
                <SelectItem key="accountant" value={RoleUserEnum.ACCOUNTANT}>
                  Accountant
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
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
          <Field data-invalid={!isEmail(email)}>
            <InputGroup className="pr-1">
              <InputGroupInput
                type="email"
                placeholder="Enter email"
                value={email}
                onChange={(e) => {
                  const value = e.target.value;
                  setEmail(value);
                }}
              />
            </InputGroup>
          </Field>
        </FormItemWrapper>
        <FormItemWrapper
          label="Password"
          labelClassName="text-sm font-medium text-muted-foreground"
        >
          <Input
            placeholder="Enter password"
            value={password}
            type="password"
            onChange={(e) => {
              const value = e.target.value;
              setPassword(value);
            }}
          />
        </FormItemWrapper>
        <FormItemWrapper
          label="Confirm Password"
          labelClassName="text-sm font-medium text-muted-foreground"
        >
          <Field data-invalid={password !== confirmPassword}>
            <InputGroup className="pr-1">
              <InputGroupInput
                type="password"
                placeholder="Enter confirm password"
                value={confirmPassword}
                onChange={(e) => {
                  const value = e.target.value;
                  setConfirmPassword(value);
                }}
              />
            </InputGroup>
          </Field>
        </FormItemWrapper>
      </div>
      <DrawerFooter className="px-4">
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
      </DrawerFooter>
    </>
  );
};

export default FormSetEmployee;
