export const formatNumber = (x: number, min = 0, max = 2, locale = "en-US") => {
  return x.toLocaleString(locale, {
    minimumFractionDigits: min,
    maximumFractionDigits: max,
  });
};

export const formatNumberAsPercentage = (number: number) => {
  return `${formatNumber(number, 2, 2)}%`;
};

export const formatCurrency = (number: number) => {
  if (!number && typeof number !== "number") {
    return `$${0}`;
  }
  return (
    number?.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) ?? `${0}`
  );
};

export const formatDatetimeMMDDYYYY = (datetime: string) => {
  return new Date(datetime).toLocaleString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

export const formatDollarByCent = (number: number) => {
  return `${formatCurrency(number / 100)}`;
};

export const renderNoTable = (
  pagination: { page: number; pageSize: number },
  index: number
) => {
  return (pagination.page - 1) * pagination.pageSize + index + 1;
};
