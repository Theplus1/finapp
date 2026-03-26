import { HouseWifi, Building2 } from "lucide-react";
import { PaymentSummary } from "@/lib/api/endpoints/payment";
import { Skeleton } from "@repo/ui/components/skeleton";
import StatisticItem from "@repo/ui/components/statistic-item";

type Props = {
  data: PaymentSummary;
  containerClassName?: string;
  loading?: boolean;
};

const Statistic = ({ data, containerClassName, loading }: Props) => {
  const dataStatistic = [
    {
      label: "Consume outside US",
      value: data.totalSpendNonUsCentsForAdmin,
      icon: <HouseWifi />,
    },
    {
      label: "Consume in US",
      value: data.totalSpendUsCentsForAdmin,
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
