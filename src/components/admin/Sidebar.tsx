'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useState, type CSSProperties } from 'react';
import Image from 'next/image';
import { FaAngleDown } from "@/components/icons";
import { NAVIGATION_CONFIG, NavigationConfig } from '@/lib/navigationConfig';
import { cn } from '@/lib/utils';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { siteConfig } from '@/lib/site-config';
import ProfileMenu from '@/components/ProfileMenu';
import ThemeSelector from '@/components/ThemeSelector';

type UserRole = 'transporter';

interface SidebarProps {
    isSidebarOpen: boolean;
    userRole: UserRole;
    onNavigate?: () => void;
    onCollapsedChange?: (collapsed: boolean) => void;
}

const AURORA: CSSProperties = {
    background: [
        'radial-gradient(120% 55% at 0% 0%, color-mix(in srgb, var(--primary) 24%, transparent), transparent 62%)',
        'radial-gradient(90% 45% at 100% 38%, color-mix(in srgb, var(--accent) 12%, transparent), transparent 70%)',
        'radial-gradient(120% 50% at 100% 100%, color-mix(in srgb, var(--accent) 22%, transparent), transparent 62%)',
    ].join(','),
};
 

export default function Sidebar({
    isSidebarOpen,
    userRole = 'transporter',
    onNavigate,
}: SidebarProps) {
    const router = useRouter();
    const currentRoute = usePathname();
    const { settings } = useCompanySettings();
    const companyName = settings.companyName || siteConfig.name;
    const companyEmail = settings.email || siteConfig.email;

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
            <div className="flex items-center gap-2 px-4 pb-1 pt-5">
                <h3 className="whitespace-nowrap text-overline font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
                    {name}
                </h3>
                <span className="h-px flex-1 bg-neutral-200 dark:bg-brand-800" aria-hidden="true" />
            </div>
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
            <div key={item.route} className="relative mb-0.5 pr-1">
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
                        'group relative flex w-full cursor-pointer items-center gap-3 px-3 py-3',
                        'text-body-sm transition-all duration-150 outline-none',
                        'focus-visible:ring-2 focus-visible:ring-accent-500/40 focus-visible:ring-offset-2',
                        'dark:focus-visible:ring-offset-brand-950',
                        isActive
                            ? 'bg-brand-900/[0.06] font-semibold text-brand-900 dark:bg-accent-500/10 dark:text-accent-300'
                            : 'font-medium text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-brand-900/60'
                    )}
                >
                    {isActive && (
                        <span
                            aria-hidden="true"
                            data-sidebar-marker="true"
                            className="absolute bottom-0 left-0 top-0 w-1 bg-accent-500"
                            // style={{ clipPath: 'polygon(0 0, 100% 12%, 100% 88%, 0 100%)' }}
                        />
                    )}

                    <span
                        className={cn(
                            '',
                        )}
                        aria-hidden="true"
                    >
                        {item.icon}
                    </span>

                    <span className="min-w-0 flex-1 truncate text-left leading-none">
                        {item.title}
                    </span>

                    {hasChildren && (
                        <FaAngleDown
                            aria-hidden="true"
                            className={cn(
                                'shrink-0 text-neutral-400 transition-transform duration-200 dark:text-neutral-500',
                                isExpanded && 'rotate-180'
                            )}
                            size={12}
                        />
                    )}
                </button>

                {hasChildren && (
                    <div
                        id={`section-${item.route}`}
                        aria-hidden={!isExpanded}
                        className={cn(
                            'overflow-hidden transition-all duration-200 ease-in-out',
                            isExpanded ? 'mt-0.5 max-h-96 opacity-100' : 'max-h-0 opacity-0'
                        )}
                    >
                        <div className="ml-6 space-y-0.5 border-l border-neutral-200 py-1 pl-3 dark:border-brand-800">
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
                                            'flex w-full items-center gap-2.5 px-3 py-2 text-left text-body-sm',
                                            '  outline-none',
                                            'focus-visible:ring-2 focus-visible:ring-accent-500/40',
                                            childActive
                                                ? 'bg-white font-medium text-white dark:bg-accent-600'
                                                : 'text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-brand-900/60'
                                        )}
                                    >
                                        <span data-sidebar-icon="true" className="shrink-0 !text-neutral-900 dark:!text-white" aria-hidden="true">
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
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 -z-10"
                style={AURORA}
            />
            <div className="flex shrink-0 items-center gap-3 border-b border-neutral-200 px-4 py-4 dark:border-brand-800">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-neutral-200 bg-white dark:border-brand-800">
                    {settings.companyLogo ? (
                        <Image
                            src={settings.companyLogo}
                            alt={`${companyName} logo`}
                            width={44}
                            height={44}
                            unoptimized
                            className="h-full w-full object-contain"
                        />
                    ) : (
                        <span className="text-sm font-bold text-brand-800 dark:text-accent-300">
                            {companyName.slice(0, 3).toUpperCase()}
                        </span>
                    )}
                </div>
                <div className="min-w-0">
                    <p className="truncate text-body-sm font-semibold text-brand-900 dark:text-white" title={companyName}>
                        {companyName}
                    </p>
                    <p className="truncate text-caption text-neutral-500 dark:text-neutral-400" title={companyEmail}>
                        {companyEmail}
                    </p>
                </div>
            </div>

            {/* Navigation */}
            <nav className="min-h-0 flex-1 space-y-0 overflow-y-auto overflow-x-hidden py-3">
                {sidebarConfig?.sections?.map((section, index) => (
                    <div key={index}>
                        {renderSectionDivider(section.name)}
                        {section.items.map((item) => renderNavItem(item))}
                    </div>
                ))}
            </nav>

            <div className="flex shrink-0 items-center gap-2 border-t border-neutral-200 px-3 py-3 dark:border-brand-800">
                <ProfileMenu variant="sidebar" onNavigate={onNavigate} />
                <ThemeSelector />
            </div>

            {/* Footer tagline */}
            <div className="shrink-0 border-t border-neutral-200 px-4 py-3 dark:border-brand-800">
                <p className="text-caption leading-snug text-neutral-400 dark:text-neutral-500">
                    Reliable freight & logistics
                </p>
            </div>
        </aside>
    );
}
