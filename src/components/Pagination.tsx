'use client'
import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ChevronDown } from "@/components/icons";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  totalItems: number;
  handlePreviousPage: () => void;
  handleNextPage: () => void;
  handleItemPerPageChange: (value: any) => void;
  handleFirstPage?: () => void;
  handleLastPage?: () => void;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  itemsPerPage,
  totalItems,
  handlePreviousPage,
  handleNextPage,
  handleItemPerPageChange,
  handleFirstPage,
  handleLastPage
}) => {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // Helper function to navigate to a specific page
  const goToPage = (pageNumber: number) => {
    if (pageNumber === currentPage) return;

    if (pageNumber < currentPage) {
      for (let i = 0; i < currentPage - pageNumber; i++) {
        handlePreviousPage();
      }
    } else {
      for (let i = 0; i < pageNumber - currentPage; i++) {
        handleNextPage();
      }
    }
  };

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5;

    if (totalPages <= maxPagesToShow) {
      // Show all pages if total pages are less than or equal to maxPagesToShow
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      // Always include first page, last page, current page, and pages around current
      let startPage = Math.max(1, currentPage - 1);
      let endPage = Math.min(totalPages, startPage + 2);

      // Adjust if we're near the end
      if (endPage === totalPages) {
        startPage = Math.max(1, endPage - 2);
      }

      // Add pages
      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
      }

      // Add ellipsis and first/last page indicators
      if (startPage > 1) {
        pageNumbers.unshift(1);
        if (startPage > 2) {
          pageNumbers.splice(1, 0, -1); // -1 represents ellipsis
        }
      }

      if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
          pageNumbers.push(-1); // -1 represents ellipsis
        }
        pageNumbers.push(totalPages);
      }
    }

    return pageNumbers;
  };

  return (
    <div className="flex flex-col md:flex-row items-center justify-between p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-b-lg">
      {/* Items Per Page and Count */}
      <div className="flex items-center space-x-4 mb-4 md:mb-0">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Show</span>
          <div className="relative">
            <select
              value={itemsPerPage}
              onChange={(e) => handleItemPerPageChange(e)}
              className="appearance-none px-3 py-1.5 pr-8 border border-gray-300 dark:border-gray-700 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#DB7007]/50 focus:border-[#DB7007] shadow-sm"
            >
              {[10, 20, 50, 100].map(size => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500 dark:text-gray-400">
              <ChevronDown className="h-4 w-4" />
            </div>
          </div>
        </div>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          Showing <span className="font-medium text-gray-800 dark:text-white">{startItem}-{endItem}</span> of <span className="font-medium text-gray-800 dark:text-white">{totalItems}</span> items
        </span>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center space-x-1.5">
        {/* First Page Button */}
        {handleFirstPage && (
          <button
            onClick={handleFirstPage}
            disabled={currentPage === 1}
            className="flex items-center justify-center w-9 h-9 border border-gray-300 dark:border-gray-700 rounded-md text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="First page"
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>
        )}

        {/* Previous Page Button */}
        <button
          onClick={handlePreviousPage}
          disabled={currentPage === 1}
          className="flex items-center justify-center w-9 h-9 border border-gray-300 dark:border-gray-700 rounded-md text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* Page Numbers - Desktop Only */}
        <div className="hidden md:flex items-center space-x-1">
          {getPageNumbers().map((pageNum, index) =>
            pageNum === -1 ? (
              <div key={`ellipsis-${index}`} className="w-9 text-center text-gray-500 dark:text-gray-400">...</div>
            ) : (
              <button
                key={pageNum}
                onClick={() => goToPage(pageNum)}
                className={`flex items-center justify-center w-9 h-9 text-sm font-medium rounded-md transition-colors
                  ${pageNum === currentPage
                    ? 'bg-[#DB7007] text-neutral-950 border border-[#DB7007]'
                    : 'border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
              >
                {pageNum}
              </button>
            )
          )}
        </div>

        {/* Mobile Page Information */}
        <div className="md:hidden px-4 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 shadow-sm">
          {currentPage} <span className="text-gray-500 dark:text-gray-400">of</span> {totalPages}
        </div>

        {/* Next Page Button */}
        <button
          onClick={handleNextPage}
          disabled={currentPage === totalPages}
          className="flex items-center justify-center w-9 h-9 border border-gray-300 dark:border-gray-700 rounded-md text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        {/* Last Page Button */}
        {handleLastPage && (
          <button
            onClick={handleLastPage}
            disabled={currentPage === totalPages}
            className="flex items-center justify-center w-9 h-9 border border-gray-300 dark:border-gray-700 rounded-md text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Last page"
          >
            <ChevronsRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default Pagination;