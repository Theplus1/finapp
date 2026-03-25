// ExportContext.tsx
import { createContext, useContext, useEffect, useState } from "react";
import { exportManager } from "./export-manager";

type ContextValue = {
  isExporting: boolean;
};

const ExportContext = createContext<ContextValue | null>(null);

export const ExportProvider = ({ children }: { children: React.ReactNode }) => {
  const [isExporting, setIsExporting] = useState(
    exportManager.getIsExporting(),
  );

  useEffect(() => {
    const unsubscribe = exportManager.subscribe(setIsExporting);
    return unsubscribe;
  }, []);

  return (
    <ExportContext.Provider value={{ isExporting }}>
      {children}
    </ExportContext.Provider>
  );
};

export const useExportStatus = () => {
  return useContext(ExportContext);
};
