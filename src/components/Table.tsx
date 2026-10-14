import React, { useState, useEffect } from "react";
import SearchFilters from "./SearchFilters";
import { Loader2, Search, ChevronRight, Filter, Check, ChevronUp, ChevronDown } from "@/components/icons";

interface TableProps<T> {
    headings: Array<React.ReactNode>;
    data: T[];
    isLoading: boolean;
    filterFields?: any;
    handleSearch?: any
    renderActions?: (item: T) => React.ReactNode;
    itemsPerPage?: number;
    renderCell?: (item: T, key: string) => React.ReactNode;
    initialSearchQuery?: string;
    onSelectAll?: (selected: boolean) => void;
    selectAllChecked?: boolean;
    sortConfig?: {
        key: string;
        direction: 'asc' | 'desc';
    };
    onSort?: (key: string) => void;
    sortableColumns?: string[];
}

const Table = <T,>({
    headings,
    data,
    isLoading,
    filterFields,
    handleSearch,
    renderActions,
    itemsPerPage = 10,
    renderCell,
    initialSearchQuery = "",
    onSelectAll,
    selectAllChecked = false,
    sortConfig,
    onSort,
    sortableColumns,
}: TableProps<T>) => {
    // State management
    const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
    const [showFilters, setShowFilters] = useState(false);
    const [searchQuery, setSearchQuery] = useState(initialSearchQuery);

    // Toggle row expansion for mobile view
    const toggleRowExpansion = (index: number) => {
        setExpandedRows(prev => {
            const newSet = new Set(prev);
            if (newSet.has(index)) {
                newSet.delete(index);
            } else {
                newSet.add(index);
            }
            return newSet;
        });
    };

    // Search and filter handlers
    const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (handleSearch) {
            handleSearch({ ...filterFields, search: searchQuery });
        }
    };

    const handleFilterToggle = () => {
        setShowFilters(!showFilters);
    };

    const handleResetFilters = () => {
        setSearchQuery("");
        setShowFilters(false);
        if (handleSearch) {
            // Pass a reset flag to indicate this is a reset operation
            handleSearch({ reset: true });
        }
    };

    return (
        <div className="overflow-hidden rounded-t-lg border border-gray-200 dark:border-gray-700 relative">
            {/* Search Bar */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
                <div className="flex flex-col sm:flex-row gap-3">
                    {
                        handleSearch && (
                            <form onSubmit={handleSearchSubmit} className="flex-1">
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Search..."
                                        value={searchQuery}
                                        onChange={handleSearchInputChange}
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-[#DB7007] focus:border-[#DB7007] transition-all"
                                    />
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Search className="h-4 w-4 text-gray-400" />
                                    </div>
                                    <button
                                        type="submit"
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm font-medium text-[#DB7007] hover:text-[#A84F00] transition-colors"
                                    >
                                        Search
                                    </button>
                                </div>
                            </form>
                        )
                    }

                    {filterFields && (
                        <button
                            onClick={handleFilterToggle}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${showFilters
                                ? 'bg-[#DB7007]/10 text-[#DB7007] border border-[#DB7007]'
                                : 'bg-gray-50 dark:bg-gray-200 text-gray-700 dark:text-gray-300 border border-transparent hover:bg-gray-200 dark:hover:bg-gray-600'
                                }`}
                        >
                            <Filter className="h-4 w-4" />
                            Filters {showFilters ? '(Active)' : ''}
                        </button>
                    )}
                </div>

                {/* Filters Section */}
                {filterFields && showFilters && (
                    <div className="mt-4 bg-gray-50 p-2 dark:bg-gray-800/60 rounded-md border border-gray-200 dark:border-gray-700 animate-fadeIn">
                        <div className=" pb-2">
                            <div className="flex flex-wrap gap-3 min-w-fit sm:min-w-0">
                                <SearchFilters
                                    filterFields={filterFields}
                                    onSearch={handleSearch}
                                    onReset={handleResetFilters}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                            {headings.map((heading: any, index: number) => {
                                const isSortable = sortableColumns ? sortableColumns.includes(heading) :
                                    ['Rank', 'Score', 'Duration', 'Started At'].includes(heading);

                                return (
                                    <th
                                        key={index}
                                        className={`px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider ${isSortable ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700' : ''
                                            }`}
                                        onClick={() => isSortable && onSort && onSort(heading.toLowerCase())}
                                    >
                                        <div className="flex items-center gap-2">
                                            {heading}
                                            {isSortable && sortConfig && (
                                                <div className="flex flex-col">
                                                    <ChevronUp
                                                        className={`w-3 h-3 ${sortConfig.key === heading.toLowerCase() && sortConfig.direction === 'asc'
                                                            ? 'text-[#102E56]'
                                                            : 'text-gray-300'
                                                            }`}
                                                    />
                                                    <ChevronDown
                                                        className={`w-3 h-3 -mt-1 ${sortConfig.key === heading.toLowerCase() && sortConfig.direction === 'desc'
                                                            ? 'text-[#102E56]'
                                                            : 'text-gray-300'
                                                            }`}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </th>
                                );
                            })}
                            {renderActions && <th className="py-4 px-4 text-center text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Actions</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
                        {/* Table Rows */}
                        {!isLoading ? (
                            data.length > 0 ? (
                                data.map((item: any, index: number) => (
                                    <tr
                                        key={index}
                                        className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60"
                                    >
                                        {headings.map((heading, idx) => (
                                            <td
                                                key={idx}
                                                className={`py-4 px-4 text-sm text-gray-700 dark:text-gray-300 first:pl-6 last:pr-6
                                                    ${heading === "Question" ? "max-w-[300px] md:max-w-[400px] lg:max-w-[500px] break-words" : ""}
                                                    ${heading === "Actions" ? 'w-[90px]' : ""} 
                                                    ${heading === "Status" ? 'w-[80px]' : ""}
                                                    ${idx === 0 ? 'font-medium' : ''}
                                                `}
                                            >
                                                <div className={`${heading === "Question" ? "line-clamp-2 md:line-clamp-1" : ""}`}>
                                                    {renderCell
                                                        ? renderCell(item, heading as string)
                                                        : item[heading as keyof T]}
                                                </div>
                                            </td>
                                        ))}

                                        {renderActions && (
                                            <td className="py-4 px-4 text-sm text-gray-700 dark:text-gray-300 pr-6">
                                                <div className="flex items-center justify-end space-x-2">
                                                    {renderActions(item)}
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td
                                        colSpan={headings.length + (renderActions ? 1 : 0)}
                                        className="px-4 py-12 text-center text-sm text-gray-500 dark:text-gray-400"
                                    >
                                        <div className="flex flex-col items-center justify-center space-y-3">
                                            <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full">
                                                <Search className="h-6 w-6 text-gray-400 dark:text-gray-500" />
                                            </div>
                                            <p className="text-sm font-medium">No data found</p>
                                            <p className="text-xs text-gray-400 dark:text-gray-500">Try adjusting your search or filter</p>
                                        </div>
                                    </td>
                                </tr>
                            )
                        ) : (
                            // Desktop Skeleton Loading
                            Array.from({ length: itemsPerPage }).map((_, index) => (
                                <tr key={index}>
                                    {Array.from({ length: headings.length + (renderActions ? 1 : 0) }).map((_, headIndex) => (
                                        <td
                                            key={headIndex}
                                            className="px-4 py-4 first:pl-6 last:pr-6"
                                        >
                                            <div className="animate-pulse h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden bg-gray-50 dark:bg-gray-900 p-3">
                {/* Select All Checkbox for Mobile View */}
                {data.length > 0 && onSelectAll && !isLoading && (
                    <div className="sticky top-0 z-10 p-3 mb-3 bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div
                                className={`w-5 h-5 rounded-md flex items-center justify-center cursor-pointer transition-colors duration-300 ${selectAllChecked ? 'bg-[#66B788]' : 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600'}`}
                                onClick={() => onSelectAll(!selectAllChecked)}
                                role="checkbox"
                                aria-checked={selectAllChecked}
                                tabIndex={0}
                            >
                                {selectAllChecked && (
                                    <Check className="h-3 w-3 text-white" />
                                )}
                            </div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Select All
                            </span>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                            {data.length} items
                        </span>
                    </div>
                )}
                {!isLoading ? (
                    data.length > 0 ? (
                        <div className="space-y-3">
                            {data.map((item: any, index: number) => (
                                <div
                                    key={index}
                                    className="bg-white dark:bg-gray-800 p-4 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 relative overflow-hidden"
                                >
                                    {/* Left accent border */}
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#66B788]"></div>

                                    <div className="flex items-center justify-between mb-3 pl-2">
                                        {/* Item number and title */}
                                        <div className="flex items-center flex-1 min-w-0 pr-2">
                                            <span className="inline-flex items-center justify-center h-6 w-6 flex-shrink-0 rounded-full bg-[#66B788]/10 text-[#66B788] text-xs font-medium mr-2">
                                                #{index + 1}
                                            </span>
                                            <div className="font-medium text-gray-900 dark:text-gray-100 line-clamp-1 truncate">
                                                {renderCell
                                                    ? renderCell(item, headings[0] as string)
                                                    : item[headings[0] as keyof T]}
                                            </div>
                                        </div>

                                        {/* Always visible actions */}
                                        {renderActions && (
                                            <div className="flex items-center space-x-1 flex-shrink-0">
                                                {renderActions(item)}
                                            </div>
                                        )}
                                    </div>

                                    {/* Always show a few key fields */}
                                    <div className="grid grid-cols-1 gap-3 mb-2 pl-2 mt-3">
                                        {headings.slice(1, 3).map((heading, idx) => (
                                            <div key={idx} className="flex flex-col">
                                                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{heading}</span>
                                                <div className="text-sm text-gray-700 dark:text-gray-300 break-words">
                                                    {renderCell
                                                        ? renderCell(item, heading as string)
                                                        : item[heading as keyof T] || '-'}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Enhanced Show more/less toggle button */}
                                    {headings.length > 3 && (
                                        <button
                                            onClick={() => toggleRowExpansion(index)}
                                            className="mt-3 flex items-center justify-center w-full py-2 px-3 rounded-md bg-gray-50 dark:bg-gray-700/50 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
                                            aria-expanded={expandedRows.has(index)}
                                        >
                                            <span className="text-[#66B788] mr-1.5">
                                                {expandedRows.has(index) ? 'Show less' : 'Show more details'}
                                            </span>
                                            <ChevronRight
                                                className={`h-4 w-4 text-[#66B788] transition-transform duration-200 ease-in-out group-hover:translate-x-0.5 ${expandedRows.has(index) ? 'rotate-90' : ''}`}
                                            />
                                        </button>
                                    )}

                                    {/* Expanded content */}
                                    {expandedRows.has(index) && (
                                        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 animate-fadeIn">
                                            <div className="grid grid-cols-1 gap-4 pl-2">
                                                {headings.slice(3).map((heading, idx) => {
                                                    // Skip checkbox fields
                                                    const isCheckbox = typeof heading === 'string' &&
                                                        (heading.toLowerCase().includes('select') || heading.toLowerCase().includes('check'));

                                                    if (isCheckbox) return null;

                                                    return (
                                                        <div key={idx} className="flex flex-col">
                                                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{heading}</span>
                                                            <div className="text-sm text-gray-700 dark:text-gray-300 break-words">
                                                                {renderCell
                                                                    ? renderCell(item, heading as string)
                                                                    : item[heading as keyof T] || '-'}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                            <div className="flex flex-col items-center justify-center space-y-3">
                                <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full">
                                    <Search className="h-6 w-6 text-gray-400 dark:text-gray-500" />
                                </div>
                                <p className="text-sm font-medium">No data found</p>
                                <p className="text-xs text-gray-400 dark:text-gray-500">Try adjusting your search or filter</p>
                            </div>
                        </div>
                    )
                ) : (
                    // Mobile Skeleton Loading with improved visual design
                    <div className="p-4 space-y-4">
                        {Array.from({ length: Math.min(5, itemsPerPage) }).map((_, index) => (
                            <div key={index} className="bg-white dark:bg-gray-800 p-4 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 border-l-4 border-l-gray-200 dark:border-l-gray-700">
                                <div className="animate-pulse space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="h-5 w-5 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                                        <div className="h-5 w-5 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                                    </div>
                                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mt-2"></div>
                                    <div className="space-y-2 mt-3">
                                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                                    </div>
                                    <div className="space-y-2 mt-1">
                                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Loading Overlay with improved visual feedback */}
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm z-10">
                    <div className="flex flex-col items-center justify-center space-y-2 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                        <Loader2 className="h-8 w-8 animate-spin text-[#DB7007]" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Loading data...</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Table;