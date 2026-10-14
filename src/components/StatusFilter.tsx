import React from "react";
import { ChevronDown } from "@/components/icons";

interface StatusFilterProps {
    filterQuery: any;
    setFilterQuery: (query: any) => void;
}

const StatusFilter: React.FC<StatusFilterProps> = ({ filterQuery, setFilterQuery }) => {
    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;

        // Set isActive to `null` for "Both" or `boolean` for Active/Inactive
        const isActive = value === "" ? null : value === "true";

        setFilterQuery({ ...filterQuery, isActive });
    };

    return (
        <div className="relative inline-block">
            <select
                value={filterQuery.isActive === null ? "" : String(filterQuery.isActive)}
                onChange={handleChange}
                className="appearance-none min-w-[120px] bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-white py-2 px-4 pr-10 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#66B788]/50 focus:border-[#66B788] hover:border-gray-400 dark:hover:border-gray-600 cursor-pointer text-sm transition-colors"
            >
                <option value="">All Status</option>
                <option value="true" className="text-green-600 dark:text-green-400">Active</option>
                <option value="false" className="text-red-600 dark:text-red-400">Inactive</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500 dark:text-gray-400">
                <ChevronDown className="h-4 w-4" />
            </div>
        </div>
    );
};

export default StatusFilter;
