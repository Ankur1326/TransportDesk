'use client'
import { useEffect, useRef, ReactNode, memo } from 'react';
import { X, Save } from "@/components/icons";

interface ModalWrapperProps {
    onClose: () => void;
    onSave?: (e: React.FormEvent<HTMLFormElement>) => void;
    title: string;
    isVisible: boolean;
    children: ReactNode;
    size?: 'small' | 'medium' | 'large' | 'very_large';
    saveBtnLabel?: string;
    hideDefaultButtons?: boolean;
    saveBtnClassName?: string;
    disabled?: boolean;
}

const sizeClasses = {
    small: 'max-w-sm',
    medium: 'max-w-2xl',
    large: 'max-w-4xl',
    very_large: 'max-w-6xl',
};

// Memoize the modal content to prevent unnecessary re-renders
const ModalContent = memo(({
    children,
    title,
    onClose,
    onSave,
    size,
    hideDefaultButtons,
    saveBtnLabel,
    saveBtnClassName,
    disabled,
}: Omit<ModalWrapperProps, 'isVisible'>) => {
    return (
        <div className="w-full">
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{title}</h3>
                <button
                    onClick={onClose}
                    className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-600"
                    type="button"
                    aria-label="Close"
                >
                    <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
            </div>

            {/* Content */}
            <div className="px-6 py-5 overflow-y-auto max-h-[calc(100vh-180px)]">
                {children}
            </div>

            {/* Footer */}
            {!hideDefaultButtons && (
                <div className="flex justify-end items-center gap-3 px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t dark:border-gray-700">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-1 focus:ring-[#DB7007] transition-colors"
                    >
                        Cancel
                    </button>
                    {
                        saveBtnLabel
                        &&
                        <button
                            type="submit"
                            disabled={disabled}
                            className={`inline-flex items-center px-4 py-2 text-sm font-medium text-neutral-950 bg-[#DB7007] hover:bg-[#c56306] border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#DB7007] transition-colors ${saveBtnClassName}`}
                        >
                            <Save className="w-4 h-4 mr-2" />
                            {saveBtnLabel}
                        </button>
                    }
                </div>
            )}
        </div>
    );
});

ModalContent.displayName = 'ModalContent';

export function EditOrCreateNewModalWrapper({
    onClose,
    onSave,
    title,
    isVisible,
    children,
    size = 'small',
    saveBtnLabel = "Save",
    hideDefaultButtons = false,
    saveBtnClassName = "",
    disabled = false
}: ModalWrapperProps) {
    const modalRef = useRef<any>(null);

    // Only handle body overflow when necessary
    useEffect(() => {
        if (isVisible) {
            document.body.style.overflow = 'hidden';

            // Only attach the listener when modal is visible
            const handleClickOutside = (event: MouseEvent) => {
                if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                    onClose();
                }
            };

            // Delay adding the listener to prevent immediate closure
            const timeoutId = setTimeout(() => {
                document.addEventListener('mousedown', handleClickOutside);
            }, 100);

            return () => {
                document.body.style.overflow = 'unset';
                document.removeEventListener('mousedown', handleClickOutside);
                clearTimeout(timeoutId);
            };
        }
    }, [isVisible, onClose]);

    // Don't render anything when not visible to save resources
    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute w-full inset-0 bg-black/60" />

            {/* Modal Form */}
            <div className={`relative w-full ${sizeClasses[size || 'small']} bg-white dark:bg-gray-800 rounded-sm shadow-xl overflow-hidden border border-gray-200 dark:border-gray-700`} ref={modalRef}>
                {onSave ? (
                    <form onSubmit={onSave}>
                        <ModalContent
                            title={title}
                            onClose={onClose}
                            onSave={onSave}
                            size={size}
                            hideDefaultButtons={hideDefaultButtons}
                            saveBtnLabel={saveBtnLabel}
                            saveBtnClassName={saveBtnClassName}
                            disabled={disabled}
                        >
                            {children}
                        </ModalContent>
                    </form>
                ) : (
                    <ModalContent
                        title={title}
                        onClose={onClose}
                        onSave={onSave}
                        size={size}
                        hideDefaultButtons={hideDefaultButtons}
                        saveBtnLabel={saveBtnLabel}
                        saveBtnClassName={saveBtnClassName}
                        disabled={disabled}
                    >
                        {children}
                    </ModalContent>
                )}
            </div>

        </div>
    );
}