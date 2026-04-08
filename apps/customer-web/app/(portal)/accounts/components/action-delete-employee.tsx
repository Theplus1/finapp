"use client";

import { useState } from "react";
import { Button } from "@repo/ui/components/button";
import { Spinner } from "@repo/ui/components/spinner";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Employee } from "@/lib/api/endpoints/employee";

type Props = {
  employee: Employee;
  onDeleteSuccess: () => void;
};

const ActionDeleteEmployee = ({ employee, onDeleteSuccess }: Props) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `Xóa vĩnh viễn tài khoản "${employee.username}"? Không thể khôi phục.`,
    );
    if (!confirmed) return;

    setIsLoading(true);
    try {
      await api.employees.deleteEmployee(employee.id);
      toast.success("Employee deleted permanently");
      onDeleteSuccess();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete employee");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="destructive"
      size="sm"
      className="w-full"
      onClick={handleDelete}
      disabled={isLoading}
    >
      {isLoading ? <Spinner /> : "Delete permanently"}
    </Button>
  );
};

export default ActionDeleteEmployee;
