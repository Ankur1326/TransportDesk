'use client'
import { useState, useEffect, useRef } from "react";
import { GST_STATES, GstState } from "@/data/gstStates";
import { Input } from "@/components/ui/Input";

interface StateAutocompleteProps {
    value: string;
    onChange: (value: string) => void;
    label?: string;
    required?: boolean;
    /** Render with the shared flat <Input> so it lines up with the other fields. */
    flat?: boolean;
    error?: string;
}

export default function StateAutocomplete({ value, onChange, label = "State", required = false, flat = false, error }: StateAutocompleteProps) {
    const [query, setQuery] = useState(value || "");
    const [showSuggestions, setShowSuggestions] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Keep local input text in sync when parent resets value (e.g. edit modal opening)
    useEffect(() => {
        setQuery(value || "");
    }, [value]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filtered: GstState[] = query
        ? GST_STATES.filter((s) =>
              s.stateCode.toLowerCase().includes(query.toLowerCase()) ||
              s.name.toLowerCase().includes(query.toLowerCase()) ||
              s.code.includes(query)
          )
        : GST_STATES;

    const handleSelect = (s: GstState) => {
        const formatted = `${s.code}-${s.name}`;
        setQuery(formatted);
        onChange(formatted);
        setShowSuggestions(false);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setQuery(e.target.value);
        onChange(e.target.value); // still let free typing be saved if user doesn't pick a suggestion
        setShowSuggestions(true);
    };

    return (
        <div className="relative" ref={wrapperRef}>
            {flat ? (
                <Input
                    label={label}
                    required={required}
                    error={error}
                    value={query}
                    onChange={handleInputChange}
                    onFocus={() => setShowSuggestions(true)}
                    placeholder="Type code or name, e.g. GJ"
                    autoComplete="off"
                />
            ) : (
                <>
            {label && (
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {label} {required && <span className="text-red-500">*</span>}
                    </label>
                )}
                <input
                    type="text"
                    value={query}
                    onChange={handleInputChange}
                    onFocus={() => setShowSuggestions(true)}
                    required={required}
                    placeholder="Type state code e.g. GJ or DL"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-bg_secondary dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#153a69]"
                    autoComplete="off"
                />
                </>
            )}
            {showSuggestions && filtered.length > 0 && (
                <ul className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto bg-white dark:bg-bg_secondary border border-gray-300 dark:border-gray-600 rounded-md shadow-lg">
                    {filtered.map((s) => (
                        <li
                            key={s.stateCode}
                            onClick={() => handleSelect(s)}
                            className="px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 dark:hover:bg-[#102E56]/30 text-gray-800 dark:text-gray-200"
                        >
                            <span className="font-semibold">{s.code}</span> - {s.name}{" "}
                            <span className="text-gray-400">({s.stateCode})</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}