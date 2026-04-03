"use client";

import React from "react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "./pagination";

type CursorPaginationProps = {
  hasNextPage: boolean;
  page: number;
  onPageChange: (cursor: string, newPage: number) => void;
  cursorMap: Record<number, string | null | undefined>;
  disableNext?: boolean;
};

export function CursorPagination({
  hasNextPage,
  page,
  onPageChange,
  cursorMap,
  disableNext,
}: CursorPaginationProps) {
  const loadedPages = React.useMemo(() => {
    const arr = Object.entries(cursorMap)
      .filter(([, v]) => typeof v !== "undefined" && v !== null)
      .map(([k]) => Number(k))
      .filter(Boolean)
      .sort((a, b) => a - b);

    if (!arr.includes(page)) {
      arr.push(page);
      arr.sort((a, b) => a - b);
    }

    return arr;
  }, [cursorMap, page]);

  const totalLoadedPages =
    loadedPages.length > 0 ? (loadedPages[loadedPages.length - 1] ?? 1) : 1;

  const handlePrev = () => {
    if (page > 1) {
      const prevCursor = cursorMap[page - 1] ?? "";
      onPageChange(prevCursor, page - 1);
    }
  };

  const handleNext = () => {
    if (hasNextPage && !disableNext) {
      const nextCursor = cursorMap[page + 1] ?? "";
      onPageChange(nextCursor, page + 1);
    }
  };

  const handleGoTo = (p: number) => {
    const cursor = cursorMap[p] ?? "";
    onPageChange(cursor, p);
  };

  const getVisiblePages = () => {
    const delta = 2;
    const maxPage = totalLoadedPages;
    const pages: (number | string)[] = [];

    const start = Math.max(1, page - delta);
    const end = Math.min(maxPage, page + delta);
    const range: number[] = [];
    for (let i = start; i <= end; i++) {
      if (loadedPages.includes(i) || i === page) range.push(i);
    }

    if (range.length > 0) {
      if ((range[0] ?? 0) > 2) {
        pages.push(1, "...");
      } else if (range[0] === 2) {
        pages.push(1);
      }
    }

    pages.push(...range);

    const lastInRange = range[range.length - 1] ?? page;
    if (!hasNextPage && lastInRange < maxPage) {
      pages.push("...", maxPage);
    } else if (hasNextPage) {
      if (!pages.includes("...")) pages.push("...");
    }

    return pages;
  };

  const visiblePages = getVisiblePages();

  return (
    <Pagination className="mt-4">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            className={`cursor-pointer ${
              page === 1 ? "opacity-50 pointer-events-none" : ""
            }`}
            onClick={handlePrev}
          />
        </PaginationItem>

        {visiblePages.map((p, i) => (
          <PaginationItem key={i}>
            {p === "..." ? (
              <span className="px-2 text-muted-foreground">...</span>
            ) : (
              <button
                onClick={() => handleGoTo(p as number)}
                className={`px-3 py-1 text-sm rounded-md ${
                  p === page
                    ? "bg-primary text-white"
                    : "hover:bg-muted text-foreground"
                }`}
              >
                {p}
              </button>
            )}
          </PaginationItem>
        ))}

        <PaginationItem>
          <PaginationNext
            className={`cursor-pointer ${
              !hasNextPage || disableNext
                ? "opacity-50 pointer-events-none"
                : ""
            }`}
            onClick={handleNext}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
