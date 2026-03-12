import {
  BanknoteArrowDown,
  BadgeDollarSign,
  DatabaseBackup,
  HouseWifi,
  Building2,
  ClipboardClock,
} from "lucide-react";
import StatisticItem from "./statistic-item";
import { PaymentSummary } from "@/lib/api/endpoints/payment";
import { Skeleton } from "@repo/ui/components/skeleton";

type Props = {
  data: PaymentSummary;
  containerClassName?: string;
  loading?: boolean;
};

const Statistic = ({ data, containerClassName, loading }: Props) => {
  const dataStatistic = [
    {
      label: "Total charge",
      value: data.totalDepositCents,
      icon: <DatabaseBackup />,
    },
    {
      label: "Total spend",
      value: data.totalSpendCents,
      icon: <ClipboardClock />,
    },
    {
      label: "Total refund",
      value: data.totalRefundCents,
      icon: <BanknoteArrowDown />,
    },
    {
      label: "Account balance",
      value: data.endingAccountBalanceCents,
      icon: <BadgeDollarSign />,
    },
    {
      label: "Consume outside US",
      value: data.totalSpendNonUsCents,
      icon: <HouseWifi />,
    },
    {
      label: "Consume in US",
      value: data.totalSpendUsCents,
      icon: <Building2 />,
    },
  ];
  return (
    <div
      className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 ${containerClassName}`}
    >
      {dataStatistic.map((item) => (
        <StatisticItem
          key={item.label}
          label={item.label}
          value={loading ? <Skeleton /> : item.value}
          icon={item.icon}
        />
      ))}
    </div>
  );
};

export default Statistic;
