import { useEffect, useState } from "react";

export function useDebounce(value: string, delay: number) {
  const [debounceValue, setDebounceValue] = useState("");

  useEffect(() => {
    const hadler = setTimeout(() => setDebounceValue(value), delay);

    return () => clearTimeout(hadler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return debounceValue;
}
