import { apiClient, ApiResponse } from "@/lib/api";

// export-manager.ts
type ExportListener = (
  isExporting: boolean,
  exportElement: string | null,
) => void;

type StartExportParams = {
  endpoint: string;
  params: {
    dataName: string;
    filters?: Record<string, unknown>;
  };
  onSuccess?: (data: unknown) => void;
  onError?: (error: unknown) => void;
  autoDownload?: boolean;
};

class ExportManager {
  private isExporting = false;
  private exportElement: string | null = null;
  private listeners: ExportListener[] = [];

  subscribe(listener: ExportListener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l(this.isExporting, this.exportElement));
  }

  getIsExporting() {
    return this.isExporting;
  }

  getExportElement() {
    return this.exportElement;
  }

  private setExporting(value: boolean) {
    this.isExporting = value;
    this.notify();
  }

  private setExportElement(element: string | null) {
    this.exportElement = element;
    this.notify();
  }

  async startExport({
    endpoint,
    params: payload,
    onSuccess,
    onError,
    autoDownload = true,
  }: StartExportParams) {
    try {
      this.setExporting(true);
      const { dataName, filters: payloadData } = payload;
      this.setExportElement(dataName);

      const res: ApiResponse<{
        downloadUrl: string;
        fileName: string;
        expiresAt: string;
      }> = await apiClient.post(
        endpoint,
        {},
        { params: payloadData as Record<string, string | number | boolean> },
      );

      const result = res.data;

      onSuccess?.(result);

      if (autoDownload && result?.downloadUrl) {
        window.open(result.downloadUrl);
      }
    } catch (error) {
      onError?.(error);
    } finally {
      this.setExporting(false);
      this.setExportElement(null);
    }
  }
}

export const exportManager = new ExportManager();
