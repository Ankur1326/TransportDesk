"use client";

import React from "react";
import { Provider } from "react-redux";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";

import { store } from "@/redux/store";
import AuthProvider from "@/context/authProvider";
import { AppearanceProvider } from "@/components/AppearanceProvider";

export function Providers({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <SessionProvider>
            <ThemeProvider
                attribute="class"
                defaultTheme="system"
                enableSystem
            >
                <AppearanceProvider>
                    <AuthProvider>
                        <Provider store={store}>
                            {children}
                        </Provider>
                    </AuthProvider>
                </AppearanceProvider>
            </ThemeProvider>
        </SessionProvider>
    );
}