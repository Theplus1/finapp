import { api } from "@/lib/api";
import { Button } from "@repo/ui/components/button";
import { Spinner } from "@repo/ui/components/spinner";
import { Download } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type GetConfirmCodeProps = {
  tranId: string;
  onGetCodeSuccess?: (confirmCode: string) => void;
};

const GetConfirmCode = ({ tranId, onGetCodeSuccess }: GetConfirmCodeProps) => {
  const [loading, setLoading] = useState(false);

  const onGetCode = () => {
    setLoading(true);
    api.transactions
      .getFacebookVerifyConfirmCode(tranId)
      .then((data) => {
        navigator.clipboard.writeText(data.data.confirmCode);
        onGetCodeSuccess?.(data.data.confirmCode);
        toast.success("Confirm code copied to clipboard");
      })
      .catch(() => {
        toast.error("Failed to get confirm code");
      })
      .finally(() => {
        setLoading(false);
      });
  };
  return (
    <div className="text-center">
      <Button
        size={"sm"}
        variant={"outline"}
        onClick={() => {
          onGetCode();
        }}
        disabled={loading}
      >
        {loading ? <Spinner /> : <Download />}
        Get confirm code
      </Button>
    </div>
  );
};

export default GetConfirmCode;
