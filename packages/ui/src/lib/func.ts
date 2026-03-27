export const upperCaseFirstCharacter = (str: string) => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};
export const formatDollarByCent = (number: number) => {
  return `${formatCurrency(number / 100)}`;
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

export const getISOStartOfDay = (date: Date): string => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T00:00:00.000Z`;
};

export const getISOEndOfDay = (date: Date): string => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T23:59:59.999Z`;
};
