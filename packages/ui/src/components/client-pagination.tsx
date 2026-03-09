"use client";

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "./pagination";
import React from "react";

type ClientPaginationProps = {
  total: number;
  page: number;
  pageSize: number;
  onChange: (page: number) => void;
};

export function ClientPagination({
  total,
  page,
  pageSize,
  onChange,
}: ClientPaginationProps) {
  const totalPages = Math.ceil(total / pageSize);

  const handleChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== page) {
      onChange(newPage);
    }
  };

  const visiblePages = React.useMemo(() => {
    const delta = 2;
    const start = Math.max(1, page - delta);
    const end = Math.min(totalPages, page + delta);
    const pages = [];

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  }, [page, totalPages]);

  const isFirstPage = page === 1;
  const isLastPage = page >= totalPages;

  return (
    <Pagination className="mt-4">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            className={
              isFirstPage ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
            }
            onClick={() => handleChange(page - 1)}
          />
        </PaginationItem>

        {visiblePages[0] > 1 && (
          <>
            <PaginationItem>
              <PaginationLink onClick={() => handleChange(1)}>1</PaginationLink>
            </PaginationItem>
            {visiblePages[0] > 2 && (
              <PaginationItem>
                <span className="px-2">...</span>
              </PaginationItem>
            )}
          </>
        )}

        {visiblePages.map((p) => (
          <PaginationItem key={p}>
            <PaginationLink
              isActive={p === page}
              onClick={() => handleChange(p)}
              className="cursor-pointer"
            >
              {p}
            </PaginationLink>
          </PaginationItem>
        ))}

        {visiblePages.at(-1)! < totalPages && (
          <>
            {visiblePages.at(-1)! < totalPages - 1 && (
              <PaginationItem>
                <span className="px-2 cursor-pointer">...</span>
              </PaginationItem>
            )}
            <PaginationItem>
              <PaginationLink onClick={() => handleChange(totalPages)}>
                <span className="cursor-pointer">{totalPages}</span>
              </PaginationLink>
            </PaginationItem>
          </>
        )}

        <PaginationItem>
          <PaginationNext
            className={
              isLastPage ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
            }
            onClick={() => handleChange(page + 1)}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
