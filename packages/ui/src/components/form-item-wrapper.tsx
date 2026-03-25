import { Label } from "@repo/ui/components/label";

type Props = {
  label: string | React.ReactNode;
  children: React.ReactNode;
  className?: string;
  labelClassName?: string;
};

export const FormItemWrapper = ({ label, children, className, labelClassName }: Props) => {
  return (
    <div className={`grid gap-2 ${className || ""}`}>
      <Label className={labelClassName || ""}>{label}</Label>
      {children}
    </div>
  );
};
