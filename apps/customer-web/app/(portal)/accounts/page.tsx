"use client";

import { useEffect, useMemo, useState } from "react";
import { useBreadcrumbs } from "@/contexts/breadcrumb-context";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatUtcMMDDYYYY, renderNoTable } from "@/app/utils/func";
import { Skeleton } from "@repo/ui/components/skeleton";
import {
  PageActions,
  PageHeader,
  PageTitle,
} from "@/components/layouts/page-header";
import { Section, SectionContent } from "@/components/layouts/section";
import { PageLayout } from "@/components/layouts/page-layout";
import { DataTable } from "@repo/ui/components/data-table";
import { CellContext, ColumnDef } from "@tanstack/react-table";
import { EMPTY_LABEL } from "@/app/utils/constants";
import { ClientPagination } from "@repo/ui/components/client-pagination";
import { Employee } from "@/lib/api/endpoints/employee";
import { Button } from "@repo/ui/components/button";
import { Switch } from "@repo/ui/components/switch";
import { Ellipsis } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@repo/ui/components/drawer";
import FormSetEmployee from "./components/form-set-employee";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/ui/components/popover";
import ActionsTable from "./components/actions-table";
import { upperCaseFirstCharacter } from "@repo/ui/lib/func";
import { toast } from "sonner";
import { Spinner } from "@repo/ui/components/spinner";

const maskDataTable = Array.from({ length: 20 }, () => {
  return {};
}) as Employee[];
export default function Accounts() {
  const { setBreadcrumbs } = useBreadcrumbs();
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
  });
  const [openDrawer, setOpenDrawer] = useState(false);
  const [countGetList, setCountGetList] = useState(0);
  const [employeeLoadingStatus, setEmployeeLoadingStatus] = useState<
    string | null
  >(null);

  useEffect(() => {
    setBreadcrumbs([
      { label: "Dashboard", href: "/dashboard" },
      { label: "Accounts", href: "/accounts" },
    ]);
  }, [setBreadcrumbs]);

  const { data: accountInfors, isLoading } = useQuery({
    queryKey: ["accounts", countGetList, pagination.page],
    queryFn: async () => {
      const res = await api.employees.getEmployees({
        page: pagination.page,
        limit: pagination.pageSize,
      });
      setPagination((prev) => ({
        ...prev,
        total: res.pagination?.total ?? 0,
      }));
      return res;
    },
    refetchOnMount: "always",
    gcTime: 0,
  });

  const dataAccounts: Employee[] = useMemo(
    () => accountInfors?.data?.data ?? [],
    [accountInfors],
  );

  const dataCardGrouped = useMemo(() => {
    if (isLoading) return maskDataTable;
    return dataAccounts.map((card) => {
      const virtualAccountName = card.virtualAccountId ?? EMPTY_LABEL;
      return {
        ...card,
        groupName: EMPTY_LABEL,
        virtualAccountName,
      };
    });
  }, [dataAccounts, isLoading]);

  const handleChangeStatus = (employee: Employee) => {
    const isActivating = employee.isActive;
    setEmployeeLoadingStatus(employee.id);
    api.employees
      .activateEmployee(employee.id, !isActivating)
      .then(() => {
        toast.success(
          isActivating
            ? "Employee deactivated successfully"
            : "Employee activated successfully",
        );
        setCountGetList((prev) => prev + 1);
      })
      .catch(() => {
        toast.error("Failed to change employee status");
      })
      .finally(() => {
        setEmployeeLoadingStatus(null);
      });
  };

  const columns = [
    {
      header: "No",
      cell: ({ row }: CellContext<Employee, number>) => {
        return isLoading ? (
          <Skeleton />
        ) : (
          renderNoTable(
            {
              page: pagination.page,
              pageSize: pagination.pageSize,
            },
            row.index,
          )
        );
      },
    },
    {
      header: "Employee Name",
      cell: ({ row }: CellContext<Employee, string>) => {
        return isLoading ? <Skeleton /> : <span>{row.original.username}</span>;
      },
    },
    {
      header: "Email",
      cell: ({ row }: CellContext<Employee, string>) => {
        return isLoading ? <Skeleton /> : (row.original.email ?? EMPTY_LABEL);
      },
    },
    {
      header: "Role",
      cell: ({ row }: CellContext<Employee, string>) => {
        return isLoading ? (
          <Skeleton />
        ) : (
          upperCaseFirstCharacter(row.original.role)
        );
      },
    },
    {
      header: "Status",
      cell: ({ row }: CellContext<Employee, string>) => {
        return isLoading ? (
          <Skeleton />
        ) : employeeLoadingStatus === row.original.id ? (
          <Spinner />
        ) : (
          <Switch
            onCheckedChange={() => handleChangeStatus(row.original)}
            checked={row.original.isActive}
            className={"cursor-pointer"}
          />
        );
      },
    },
    {
      header: "Created",
      cell: ({ row }: CellContext<Employee, string>) => {
        return isLoading ? (
          <Skeleton />
        ) : (
          formatUtcMMDDYYYY(row.original.createdAt)
        );
      },
    },
    {
      id: "actions",
      header: <p className="text-center">Actions</p>,
      cell: ({ row }: CellContext<Employee, string>) => {
        return isLoading ? (
          <Skeleton />
        ) : (
          <div className="flex justify-center">
            <Popover>
              <PopoverTrigger className="cursor-pointer">
                <Ellipsis />
              </PopoverTrigger>
              <PopoverContent>
                <ActionsTable employee={row.original} />
              </PopoverContent>
            </Popover>
          </div>
        );
      },
    },
  ] as ColumnDef<Employee>[];
  const handleCancelDrawer = () => {
    setOpenDrawer(false);
  };
  const handleSuccessDrawer = () => {
    setOpenDrawer(false);
    setCountGetList((prev) => prev + 1);
  };
  return (
    <PageLayout>
      <PageHeader>
        <PageTitle>Accounts</PageTitle>
        <PageActions>
          <Button variant="outline" onClick={() => setOpenDrawer(true)}>
            Create Employee
          </Button>
        </PageActions>
      </PageHeader>
      <Section>
        <SectionContent>
          <DataTable
            columns={columns}
            data={dataCardGrouped}
            maxHeight={"70vh"}
          />
          <ClientPagination
            total={pagination.total}
            page={pagination.page}
            pageSize={pagination.pageSize}
            onChange={(page) => setPagination((prev) => ({ ...prev, page }))}
          />
          <Drawer direction="right" open={openDrawer}>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>Create Employee</DrawerTitle>
              </DrawerHeader>
              <FormSetEmployee
                openDrawer={openDrawer}
                onCancelSetEmployee={handleCancelDrawer}
                onSubmitEmployeeSuccess={handleSuccessDrawer}
              />
            </DrawerContent>
          </Drawer>
        </SectionContent>
      </Section>
    </PageLayout>
  );
}
