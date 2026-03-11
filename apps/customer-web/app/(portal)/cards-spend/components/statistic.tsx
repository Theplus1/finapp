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

type Props = {
  data: PaymentSummary;
  containerClassName?: string;
};

const Statistic = ({ data, containerClassName }: Props) => {
  const dataStatistic = [
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
  ];
  return (
    <div
      className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 ${containerClassName}`}
    >
      {dataStatistic.map((item) => (
        <StatisticItem
          key={item.label}
          label={item.label}
          value={item.value}
          icon={item.icon}
        />
      ))}
    </div>
  );
};

export default Statistic;
