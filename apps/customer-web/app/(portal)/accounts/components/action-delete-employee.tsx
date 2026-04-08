"use client";

import { useState } from "react";
import { Button } from "@repo/ui/components/button";
import { Spinner } from "@repo/ui/components/spinner";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Employee } from "@/lib/api/endpoints/employee";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@repo/ui/components/alert-dialog";

type Props = {
  employee: Employee;
  onDeleteSuccess: () => void;
};

const ActionDeleteEmployee = ({ employee, onDeleteSuccess }: Props) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = async () => {
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
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm" className="w-full">
          {isLoading ? <Spinner /> : "Delete permanently"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Xóa nhân viên vĩnh viễn?</AlertDialogTitle>
          <AlertDialogDescription>
            Tài khoản <strong>{employee.username}</strong> sẽ bị xóa hoàn toàn khỏi hệ thống. Không thể khôi phục.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Hủy</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Xóa vĩnh viễn
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ActionDeleteEmployee;
