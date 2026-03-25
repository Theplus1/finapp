"use client";
import { Button } from "@repo/ui/components/button";
import { useExport } from "@/components/export/useExport";
import { EXPORT_DATA_NAMES, EXPORT_URL } from "@/components/export/export.const";
import { Spinner } from "@repo/ui/components/spinner";

type Props = {
  currentFilter?: Record<string, unknown>;
};

export function ExportCards({ currentFilter }: Props) {
  const { startExport, isExporting } = useExport();
  const disabledExportTransactions = isExporting;
  return (
    <Button
      disabled={disabledExportTransactions}
      variant={"outline"}
      onClick={() =>
        startExport({
          endpoint: EXPORT_URL.CARDS,
          params: {
            dataName: EXPORT_DATA_NAMES.CARDS,
            filters: currentFilter,
          },
        })
      }
    >
      {isExporting ? <Spinner /> : ""} Export
    </Button>
  );
}
