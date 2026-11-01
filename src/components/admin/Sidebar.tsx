'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useState } from 'react';
import Image from 'next/image';
import { Building2, FaAngleDown } from "@/components/icons";
import { NAVIGATION_CONFIG, NavigationConfig } from '@/lib/navigationConfig';
import { cn } from '@/lib/utils';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import ProfileMenu from '@/components/ProfileMenu';
import ThemeSelector from '@/components/ThemeSelector';

type UserRole = 'transporter';

interface SidebarProps {
    isSidebarOpen: boolean;
    userRole: UserRole;
    onNavigate?: () => void;
    onCollapsedChange?: (collapsed: boolean) => void;
}

export default function Sidebar({
    isSidebarOpen,
    userRole = 'transporter',
    onNavigate,
}: SidebarProps) {
    const router = useRouter();
    const currentRoute = usePathname();
    const { settings, hasLoaded, error } = useCompanySettings();
    // Only this company's own details are ever shown here — never another company's defaults.
    const companyName = settings.companyName.trim();
    const companyEmail = settings.email.trim();
    const isLoadingCompany = !hasLoaded && !error;
    const needsCompanySetup = hasLoaded && !companyName;

    const [expansionOverride, setExpansionOverride] = useState<{
        pathname: string;
        route: string;
        expanded: boolean;
    } | null>(null);

    const sidebarConfig: NavigationConfig =
        NAVIGATION_CONFIG[userRole];

    const routeMatches = (route: string) =>
        currentRoute === route || currentRoute.startsWith(`${route}/`);

    const isRouteActive = routeMatches;
    const isItemActive = (item: (typeof sidebarConfig.sections)[0]['items'][0]) =>
        routeMatches(item.route) || item.childItems?.some((child) => routeMatches(child.route)) === true;

    const activeGroupRoute = sidebarConfig.sections
            .flatMap((section) => section.items)
            .find((item) => item.childItems?.some((child) => routeMatches(child.route)))?.route;

    const navigateTo = (path: string) => {
        router.push(path);
        onNavigate?.();
    };

    const toggleSection = (route: string, isExpanded: boolean) => {
        setExpansionOverride({
            pathname: currentRoute,
            route,
            expanded: !isExpanded,
        });
    };

    const renderSectionDivider = (name: string) => {
        if (!name) return null;
        return (
            <h3 className="px-3 pb-1 pt-3.5 text-xs font-medium text-neutral-400 dark:text-neutral-500">
                {name}
            </h3>
        );
    };

    const renderNavItem = (item: (typeof sidebarConfig.sections)[0]['items'][0]) => {
        const hasChildren = item.childItems && item.childItems.length > 0;
        const isActive = isItemActive(item);
        const isExpanded =
            expansionOverride?.pathname === currentRoute &&
            expansionOverride.route === item.route
                ? expansionOverride.expanded
                : item.route === activeGroupRoute;

        return (
            <div key={item.route} className="relative">
                <button
                    type="button"
                    onClick={() =>
                        hasChildren
                            ? toggleSection(item.route, isExpanded)
                            : navigateTo(item.route)
                    }
                    aria-current={isActive && !hasChildren ? 'page' : undefined}
                    data-sidebar-active={isActive ? "true" : "false"}
                    aria-expanded={hasChildren ? isExpanded : undefined}
                    aria-controls={hasChildren ? `section-${item.route}` : undefined}
                    className={cn(
                        'group relative flex w-full cursor-pointer items-center gap-2.5 px-3 py-1.5',
                        'text-sm outline-none transition-colors duration-100',
                        'focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-accent-500/50',
                        isActive
                            ? 'bg-brand-900/[0.06] font-semibold text-brand-900 dark:bg-accent-500/10 dark:text-accent-300'
                            : 'font-medium text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-brand-900/60'
                    )}
                >
                    {isActive && (
                        <span
                            aria-hidden="true"
                            data-sidebar-marker="true"
                            className="absolute bottom-0 left-0 top-0 w-0.5 bg-accent-500"
                            // style={{ clipPath: 'polygon(0 0, 100% 12%, 100% 88%, 0 100%)' }}
                        />
                    )}

                    <span
                        className="shrink-0 [&>svg]:h-[18px] [&>svg]:w-[18px]"
                        aria-hidden="true"
                    >
                        {item.icon}
                    </span>

                    <span className="min-w-0 flex-1 truncate text-left leading-tight">
                        {item.title}
                    </span>

                    {hasChildren && (
                        <FaAngleDown
                            aria-hidden="true"
                            className={cn(
                                'shrink-0 text-neutral-400 transition-transform duration-200 dark:text-neutral-500',
                                isExpanded && 'rotate-180'
                            )}
                            size={11}
                        />
                    )}
                </button>

                {hasChildren && (
                    <div
                        id={`section-${item.route}`}
                        aria-hidden={!isExpanded}
                        className={cn(
                            'overflow-hidden transition-all duration-200 ease-in-out',
                            isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                        )}
                    >
                        <div className="ml-6 border-l border-neutral-200 pl-2 dark:border-brand-800">
                            {item.childItems!.map((child) => {
                                const childActive = isRouteActive(child.route);

                                return (
                                    <button
                                        key={child.route}
                                        type="button"
                                        onClick={() => navigateTo(child.route)}
                                        aria-current={childActive ? 'page' : undefined}
                                        data-sidebar-active={childActive ? "true" : "false"}
                                        className={cn(
                                            'flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-[13px]',
                                            'outline-none',
                                            'focus-visible:ring-2 focus-visible:ring-accent-500/40',
                                            childActive
                                                ? 'bg-white font-medium text-white dark:bg-accent-600'
                                                : 'text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-brand-900/60'
                                        )}
                                    >
                                        <span data-sidebar-icon="true" className="shrink-0 !text-neutral-900 dark:!text-white [&>svg]:h-4 [&>svg]:w-4" aria-hidden="true">
                                            {child.icon}
                                        </span>
                                        <span>{child.title}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <aside
            id="main-sidebar"
            role="navigation"
            aria-label="Main navigation"
            className={cn(
                'fixed isolate z-40 flex h-dvh max-h-dvh w-64 flex-col overflow-hidden',
                'border-r border-[var(--app-border)] bg-[var(--app-sidebar-background)]',
                'transition-transform duration-300 ease-out motion-reduce:transition-none',
                isSidebarOpen
                    ? 'translate-x-0 shadow-2xl md:shadow-none'
                    : '-translate-x-full md:translate-x-0'
            )}
        >
            <div aria-hidden="true" className="sidebar-bg pointer-events-none absolute inset-0 -z-10" />
            {isLoadingCompany ? (
                <div
                    aria-hidden="true"
                    className="flex shrink-0 animate-pulse items-center gap-2.5 border-b border-neutral-200 px-3 py-3 dark:border-brand-800"
                >
                    <div className="h-10 w-10 shrink-0 rounded bg-neutral-200 dark:bg-brand-800" />
                    <div className="min-w-0 flex-1 space-y-2">
                        <div className="h-3 w-3/4 bg-neutral-200 dark:bg-brand-800" />
                        <div className="h-2.5 w-1/2 bg-neutral-200 dark:bg-brand-800" />
                    </div>
                </div>
            ) : needsCompanySetup || error ? (
                // No company details yet (new account) or they couldn't be loaded: prompt instead of showing placeholder data.
                <button
                    type="button"
                    onClick={() => navigateTo('/admin/settings')}
                    className="group flex w-full shrink-0 items-center gap-2.5 border-b border-neutral-200 px-3 py-3 text-left outline-none transition-colors hover:bg-neutral-100 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-500/40 dark:border-brand-800 dark:hover:bg-brand-900/60"
                >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded border border-dashed border-neutral-300 bg-white text-neutral-400 group-hover:border-accent-500 group-hover:text-accent-600 dark:border-brand-700 dark:bg-transparent">
                        <Building2 className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                        <span className="block truncate text-[13px] font-semibold leading-tight text-brand-900 dark:text-white">
                            {error ? 'Company details unavailable' : 'Add your company details'}
                        </span>
                        <span className="block truncate text-[11px] text-neutral-500 dark:text-neutral-400">
                            {error ? 'Open settings to check' : 'Name, email & logo · tap to set up'}
                        </span>
                    </span>
                </button>
            ) : (
                <div className="flex shrink-0 items-center gap-2.5 border-b border-neutral-200 px-3 py-3 dark:border-brand-800">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded border border-neutral-200 bg-white dark:border-brand-800">
                        {settings.companyLogo ? (
                            <Image
                                src={settings.companyLogo}
                                alt={`${companyName} logo`}
                                width={40}
                                height={40}
                                unoptimized
                                className="h-full w-full object-contain"
                            />
                        ) : (
                            <span className="text-xs font-bold text-brand-800 dark:text-accent-300">
                                {companyName.slice(0, 3).toUpperCase()}
                            </span>
                        )}
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold leading-tight text-brand-900 dark:text-white" title={companyName}>
                            {companyName}
                        </p>
                        {companyEmail ? (
                            <p className="truncate text-[11px] text-neutral-500 dark:text-neutral-400" title={companyEmail}>
                                {companyEmail}
                            </p>
                        ) : (
                            <button
                                type="button"
                                onClick={() => navigateTo('/admin/settings')}
                                className="truncate text-[11px] font-medium text-accent-600 underline-offset-2 hover:underline dark:text-accent-300"
                            >
                                Add company email
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Navigation */}
            <nav className="slim-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden py-1.5">
                {sidebarConfig?.sections?.map((section, index) => (
                    <div key={index}>
                        {renderSectionDivider(section.name)}
                        {section.items.map((item) => renderNavItem(item))}
                    </div>
                ))}
            </nav>

            <div className="flex shrink-0 items-center gap-2 border-t border-neutral-200 px-3 py-2.5 dark:border-brand-800">
                <ProfileMenu variant="sidebar" onNavigate={onNavigate} />
                <ThemeSelector />
            </div>

            {/* Footer tagline */}
            {/* <div className="shrink-0 border-t border-neutral-200 px-4 py-3 dark:border-brand-800">
                <p className="text-[11px] leading-snug text-neutral-400 dark:text-neutral-500">
                    Reliable freight & logistics
                </p>
            </div> */}
        </aside>
    );
}
