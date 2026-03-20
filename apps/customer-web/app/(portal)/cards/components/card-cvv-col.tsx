import { api } from "@/lib/api";
import { Button } from "@repo/ui/components/button";
import { Spinner } from "@repo/ui/components/spinner";
import { Download } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Card } from "@/lib/api/endpoints/card";

type GetConfirmCodeProps = {
  card: Card;
  onGetCodeSuccess?: (confirmCode: string) => void;
};

const CardCVVCol = ({ card, onGetCodeSuccess }: GetConfirmCodeProps) => {
  const [loading, setLoading] = useState(false);

  const onGetCode = () => {
    setLoading(true);
    api.cards
      .getCardCVV(card.slashId)
      .then((data) => {
        navigator.clipboard.writeText(data.data.cvv);
        onGetCodeSuccess?.(data.data.cvv);
        toast.success("CVV code copied to clipboard");
      })
      .catch(() => {
        toast.error("Failed to get CVV code");
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
        Get CVV
      </Button>
    </div>
  );
};

export default CardCVVCol;
