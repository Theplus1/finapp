import { api } from "@/lib/api";
import { Button } from "@repo/ui/components/button";
import { Spinner } from "@repo/ui/components/spinner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/ui/components/popover";
import { CreditCard } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Card } from "@/lib/api/endpoints/card";

type Props = {
  card: Card;
};

type CardInfo = {
  pan: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
};

function formatPan(pan: string): string {
  return pan.replace(/(.{4})/g, "$1 ").trim();
}

function CopyText({ text, label, className }: { text: string; label: string; className?: string }) {
  const copy = () => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  return (
    <span
      onClick={copy}
      className={`cursor-pointer hover:text-primary transition-colors ${className ?? ""}`}
      title={`Click to copy ${label}`}
    >
      {text}
    </span>
  );
}

const CardCVVCol = ({ card }: Props) => {
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState<CardInfo | null>(null);
  const [open, setOpen] = useState(false);

  const onGetCode = () => {
    if (info) {
      setOpen(true);
      return;
    }
    setLoading(true);
    api.cards
      .getCardCVV(card.slashId)
      .then((data) => {
        const d = data.data;
        setInfo({
          pan: d.pan || `**** **** **** ${d.last4 || card.last4}`,
          expiryMonth: d.expiryMonth || card.expiryMonth,
          expiryYear: d.expiryYear || card.expiryYear,
          cvv: d.cvv,
        });
        setOpen(true);
      })
      .catch(() => {
        toast.error("Failed to get card info");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          onClick={onGetCode}
          disabled={loading}
        >
          {loading ? <Spinner /> : <CreditCard className="h-4 w-4" />}
          {info ? "View" : "Get CVV"}
        </Button>
      </PopoverTrigger>
      {info && (
        <PopoverContent className="w-[260px] p-3" align="center">
          <div className="space-y-1.5">
            {/* Row 1: Card Number */}
            <div>
              <CopyText
                text={formatPan(info.pan)}
                label="Card number"
                className="text-sm font-mono font-semibold tracking-wider"
              />
            </div>

            {/* Row 2: Expiry */}
            <div>
              <span className="text-xs text-muted-foreground mr-1">EXP</span>
              <CopyText
                text={`${info.expiryMonth}/${info.expiryYear.slice(-2)}`}
                label="Expiry"
                className="text-sm font-mono font-medium"
              />
            </div>

            {/* Row 3: CVV */}
            <div>
              <span className="text-xs text-muted-foreground mr-1">CVV</span>
              <CopyText
                text={info.cvv}
                label="CVV"
                className="text-sm font-mono font-medium"
              />
            </div>
          </div>
        </PopoverContent>
      )}
    </Popover>
  );
};

export default CardCVVCol;
