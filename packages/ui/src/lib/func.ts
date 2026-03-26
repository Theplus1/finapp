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
