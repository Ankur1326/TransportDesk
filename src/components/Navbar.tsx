"use client";

import React from "react";
import ProfileMenu from "@/components/ProfileMenu";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { Loader2 } from "@/components/icons";
import ThemeSelector from "@/components/ThemeSelector";
import FullScreenButton from "@/components/FullScreenButton";

function Navbar() {
    const isLoading = useSelector((state: RootState) => state.loading.isLoading);

    return (
        <nav className="flex items-center gap-2 sm:gap-3" aria-label="Admin toolbar">
            {isLoading && (
                <div className="mr-1 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-accent-500" />
                    <span className="hidden text-body-sm font-medium text-neutral-500 dark:text-neutral-400 sm:inline">
                        Loading...
                    </span>
                </div>
            )}

            <FullScreenButton />
            <div className="hidden h-5 w-px bg-neutral-200 dark:bg-brand-800 sm:block" aria-hidden="true" />
            <ThemeSelector />
            <div className="h-5 w-px bg-neutral-200 dark:bg-brand-800" aria-hidden="true" />
            <ProfileMenu />
        </nav>
    );
}

export default Navbar;
