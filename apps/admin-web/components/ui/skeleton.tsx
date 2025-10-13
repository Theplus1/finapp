import { cn } from "@/lib/utils";

const DEFAULT_CLASS_NAME = "h-[20px] w-[100px] rounded-full";

function Skeleton({
  className = DEFAULT_CLASS_NAME,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-accent animate-pulse rounded-md", className)}
      {...props}
    />
  );
}

export { Skeleton };
