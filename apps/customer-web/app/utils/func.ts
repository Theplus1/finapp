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

export const formatUtcMMDDYYYY = (datetime: string) => {
  const date = new Date(datetime);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${month}/${day}/${year}`;
};

export const formatUtcMMDDYYYYHHMM = (datetime: string | Date): string => {
  const date = new Date(datetime);

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");

  const formatted = `${month}/${day}/${year} ${hours}:${minutes}`;

  return formatted;
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
