"use client";
import { Button } from "@repo/ui/components/button";
import { useExport } from "@/components/export/useExport";
import { EXPORT_DATA_NAMES, EXPORT_URL } from "@/components/export/export.const";
import { Spinner } from "@repo/ui/components/spinner";

type Props = {
  currentFilter?: Record<string, unknown>;
};

export function ExportCardSpend({ currentFilter }: Props) {
  const { startExport, isExporting } = useExport();
  const disabledExportTransactions = isExporting;
  return (
    <Button
      disabled={disabledExportTransactions}
      variant={"outline"}
      onClick={() =>
        startExport({
          endpoint: EXPORT_URL.CARD_SPEND,
          params: {
            dataName: EXPORT_DATA_NAMES.CARD_SPEND,
            filters: currentFilter,
          },
        })
      }
    >
      {isExporting ? <Spinner /> : ""} Export
    </Button>
  );
}
