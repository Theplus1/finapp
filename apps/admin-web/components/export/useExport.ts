// useExport.ts
import { useEffect, useState } from "react";
import { exportManager } from "./export-manager";

export const useExport = () => {
  const [isExporting, setIsExporting] = useState(
    exportManager.getIsExporting(),
  );

  const [exportElement, setExportElement] = useState<string | null>(
    exportManager.getExportElement(),
  );

  useEffect(() => {
    const unsubscribe = exportManager.subscribe((isExporting, exportElement) => {
      setIsExporting(isExporting);
      setExportElement(exportElement);
    });
    return unsubscribe;
  }, []);

  return {
    isExporting,
    exportElement,
    startExport: exportManager.startExport.bind(exportManager),
  };
};
