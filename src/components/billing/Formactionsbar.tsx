"use client";

import { useState } from "react";
import { RotateCcw, Printer, Eye, Save } from "@/components/icons";
import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

interface FormActionsBarProps {
  isDirty: boolean;
  isSubmitting: boolean;
  draftSavedLabel?: string;
  onSaveDraft: () => void;
  onSaveAndPrint: () => void;
  onPreview: () => void;
  onReset: () => void;
}

export function FormActionsBar({
  isDirty,
  isSubmitting,
  draftSavedLabel,
  onSaveDraft,
  onSaveAndPrint,
  onPreview,
  onReset,
}: FormActionsBarProps) {
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  const requestReset = () => {
    if (isDirty) {
      setResetDialogOpen(true);
    } else {
      onReset();
    }
  };

  return (
    <>
      <div className="sticky bottom-0 z-10 -mx-6 mt-3 border-t border-neutral-200 bg-white/95 px-6 py-2 backdrop-blur supports-[backdrop-filter]:bg-white/80 print:hidden">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-h-5 items-center gap-1.5 text-caption text-neutral-500">
            {draftSavedLabel && (
              <span key={draftSavedLabel} className="uts-pop flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-60 motion-reduce:hidden" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                </span>
                {draftSavedLabel}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" className="transition active:scale-95" onClick={requestReset} type="button">
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Reset
            </Button>
            <Button variant="ghost" size="sm" className="transition active:scale-95" onClick={onPreview} type="button">
              <Eye className="h-4 w-4" aria-hidden="true" />
              Preview
            </Button>
            <Button variant="outline" size="sm" className="transition active:scale-95" isLoading={isSubmitting} onClick={onSaveDraft} type="button">
              <Save className="h-4 w-4" aria-hidden="true" />
              Save Draft
            </Button>
            <Button variant="secondary" className="bg-[#ED7224] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-95" size="sm" isLoading={isSubmitting} onClick={onSaveAndPrint} type="button">
              <Printer className="h-4 w-4" aria-hidden="true" />
              Save & Print
            </Button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={resetDialogOpen}
        title="Discard all changes?"
        description="This will clear every field you've entered on this consignment note. This can't be undone."
        confirmLabel="Discard changes"
        destructive
        onConfirm={() => {
          setResetDialogOpen(false);
          onReset();
        }}
        onCancel={() => setResetDialogOpen(false)}
      />
    </>
  );
}