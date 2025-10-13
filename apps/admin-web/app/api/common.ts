import { NextRequest } from "next/server";

const API_KEY = process.env.API_KEY as string;

export const API_SLASH_HEADERS = {
  headers: {
    "X-API-Key": API_KEY,
  },
};

export function serialize(obj: Record<string, string>) {
  const str: string[] = [];

  for (const key in obj) {
    if (!Object.hasOwn(obj, key)) continue;
    const value = obj[key];
    if (value === "" || value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item !== "" && item !== undefined && item !== null) {
          str.push(`${encodeURIComponent(key)}=${encodeURIComponent(item)}`);
        }
      }
      continue;
    }
    str.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
  }
  return str.join("&");
}

export function renderRequestUrl(url: string, headerRequest: NextRequest) {
  const { searchParams } = new URL(headerRequest.url);

  const params: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    params[key] = value;
  });

  return `${url}?${serialize(params)}`;
}
