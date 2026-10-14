import { Filter, X } from "@/components/icons";

interface SearchFiltersProps {
    filterFields: React.ReactNode[];
    onSearch: (filters?: any) => void;
    onReset?: () => void;
}

const SearchFilters: React.FC<SearchFiltersProps> = ({ filterFields, onSearch, onReset }) => {
    const handleReset = (e: React.MouseEvent) => {
        e.preventDefault();
        if (onReset) {
            onReset();
        }
    };

    const handleApplyFilters = (e: React.MouseEvent) => {
        e.preventDefault();
        // Pass the current filter values to the parent component
        onSearch(filterFields);
    };

    return (
        <div className="w-full">
            <div className="flex flex-wrap gap-3 items-center">
                {filterFields?.map((filterField, index) => (
                    <div
                        key={index}
                        className="flex-shrink-0 min-w-fit"
                    >
                        {filterField}
                    </div>
                ))}
                <div className="ml-auto mt-3 sm:mt-0 flex gap-2">
                    {onReset && (
                        <button
                            type="button"
                            onClick={handleReset}
                            className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md text-gray-600 dark:text-gray-300 px-3 py-1.5 text-xs font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-300/30"
                        >
                            <X size={14} className="transition-transform duration-200" />
                            <span>Reset</span>
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={handleApplyFilters}
                        className="flex items-center gap-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md text-[#DB7007] px-3 py-1.5 text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors duration-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#DB7007]/30"
                    >
                        <Filter size={14} className="transition-transform duration-200" />
                        <span>Apply Filters</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SearchFilters;