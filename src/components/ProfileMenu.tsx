'use client';

import { useEffect, useRef, useState, useCallback, memo } from 'react';
import { useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { useSelector, useDispatch } from 'react-redux';
import { AppDispatch, RootState } from '@/redux/store';
import { fetchUserProfile } from '@/redux/slices/userSlice';
import Skeleton from 'react-loading-skeleton';
import { UserRound, LogOut, User, ChevronUp } from "@/components/icons";
import { adminDropdownClass, adminToolbarButtonClass } from '@/components/admin/admin-toolbar-styles';
import { cn } from '@/lib/utils';

const RenderProfileImage = memo(
  ({ src, width, height }: { src?: string; width: number; height: number }) => (
    <div className="overflow-hidden rounded-full">
      <Image
        src={src || '/avatar-placeholder.png'}
        alt="Profile image"
        width={width}
        height={height}
        className="object-cover"
      />
    </div>
  )
);

RenderProfileImage.displayName = 'RenderProfileImage';

export default function ProfileMenu({
  variant = 'toolbar',
  onNavigate,
}: {
  variant?: 'toolbar' | 'sidebar';
  onNavigate?: () => void;
}) {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstActionRef = useRef<HTMLAnchorElement>(null);
  const menuId = `profile-menu-${variant}`;

  const [isOpen, setIsOpen] = useState(false);
  const { data: session } = useSession();

  const { profile, profilePicture, status } = useSelector(
    (state: RootState) => state.user
  );

  useEffect(() => {
    if (session?.user?.email) {
      dispatch(
        fetchUserProfile({
          email: session.user.email,
        })
      );
    }
  }, [session?.user?.email, dispatch]);

  const toggleMenu = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  const closeMenu = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleSignOut = useCallback(async () => {
    onNavigate?.();
    await signOut({ redirect: false });
    router.push('/sign-in');
  }, [onNavigate, router]);

  useEffect(() => {
    if (isOpen) firstActionRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        closeMenu();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        closeMenu();
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [closeMenu, isOpen]);

  return (
    <div
      ref={containerRef}
      className={cn('relative', variant === 'sidebar' && 'min-w-0 flex-1')}
    >
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleMenu}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-controls={menuId}
        aria-label="Profile options"
        className={cn(
          variant === 'sidebar'
            ? 'flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/50 dark:hover:bg-brand-900'
            : cn(adminToolbarButtonClass, 'overflow-hidden p-0')
        )}
      >
        {status === 'succeeded' ? (
          profilePicture ? (
            <RenderProfileImage src={profilePicture} height={36} width={36} />
          ) : (
            <UserRound size={18} className="text-accent-600 dark:text-accent-400" />
          )
        ) : (
          <Skeleton circle width={36} height={36} />
        )}
        {variant === 'sidebar' && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block text-caption font-medium text-neutral-500 dark:text-neutral-400">
                Profile
              </span>
              <span className="block truncate text-body-sm font-semibold text-brand-900 dark:text-white">
                {profile?.user?.fullName || profile?.user?.username || session?.user?.name || session?.user?.email || 'My Profile'}
              </span>
            </span>
            <ChevronUp
              aria-hidden="true"
              className={cn(
                'h-4 w-4 shrink-0 text-neutral-400 transition-transform dark:text-neutral-500',
                !isOpen && 'rotate-180'
              )}
            />
          </>
        )}
      </button>

      {isOpen && (
        <div
          id={menuId}
          role="region"
          aria-label="Profile options"
          className={cn(
            adminDropdownClass,
            variant === 'sidebar'
              ? 'bottom-full z-50 mb-2 mt-0 max-h-[calc(100dvh-1rem)] w-full overflow-y-auto'
              : 'w-72'
          )}
        >
          <div className="border-b border-neutral-100 p-4 dark:border-brand-800">
            <div className="flex items-center gap-3">
              {status === 'succeeded' ? (
                profilePicture ? (
                  <RenderProfileImage
                    src={profilePicture}
                    height={48}
                    width={48}
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-50 dark:bg-brand-800">
                    <UserRound size={24} className="text-accent-600 dark:text-accent-400" />
                  </div>
                )
              ) : (
                <Skeleton circle width={48} height={48} />
              )}

              <div className="min-w-0">
                <p className="truncate text-body-sm font-semibold text-brand-900 dark:text-white">
                  {profile?.user?.fullName || profile?.user?.username || session?.user?.name || 'Admin User'}
                </p>
                <p className="mt-0.5 truncate text-caption text-neutral-500 dark:text-neutral-400">
                  {profile?.user?.email || session?.user?.email || <Skeleton width={150} />}
                </p>
              </div>
            </div>
          </div>

          <div className="p-2">
            <Link
              ref={firstActionRef}
              href="/user/profile"
              onClick={() => {
                closeMenu();
                onNavigate?.();
              }}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-neutral-700 transition-colors hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/50 dark:text-neutral-200 dark:hover:bg-brand-800"
            >
              <User size={18} className="text-accent-600 dark:text-accent-400" />
              <span className="text-body-sm font-medium">My Profile</span>
            </Link>

            <button
              type="button"
              onClick={handleSignOut}
              className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-error-600 transition-colors hover:bg-error-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error-500/50 dark:text-error-500 dark:hover:bg-error-500/10"
            >
              <LogOut size={18} />
              <span className="text-body-sm font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
