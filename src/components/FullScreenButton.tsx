'use client';

import React, { useState } from 'react';
import { Maximize, Minimize } from "@/components/icons";
import { adminToolbarButtonClass } from '@/components/admin/admin-toolbar-styles';

interface FullScreenDocument extends Document {
  webkitExitFullscreen?: () => Promise<void>;
  mozCancelFullScreen?: () => Promise<void>;
  msExitFullscreen?: () => Promise<void>;
}

interface FullScreenElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void>;
  mozRequestFullScreen?: () => Promise<void>;
  msRequestFullscreen?: () => Promise<void>;
}

const FullScreenButton: React.FC = () => {
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);

  const handleFullScreenToggle = (): void => {
    const documentElement = document.documentElement as FullScreenElement;
    const fullScreenDoc = document as FullScreenDocument;

    if (!isFullScreen) {
      if (documentElement.requestFullscreen) {
        documentElement.requestFullscreen();
      } else if (documentElement.webkitRequestFullscreen) {
        documentElement.webkitRequestFullscreen();
      } else if (documentElement.mozRequestFullScreen) {
        documentElement.mozRequestFullScreen();
      } else if (documentElement.msRequestFullscreen) {
        documentElement.msRequestFullscreen();
      }
    } else {
      if (fullScreenDoc.exitFullscreen) {
        fullScreenDoc.exitFullscreen();
      } else if (fullScreenDoc.webkitExitFullscreen) {
        fullScreenDoc.webkitExitFullscreen();
      } else if (fullScreenDoc.mozCancelFullScreen) {
        fullScreenDoc.mozCancelFullScreen();
      } else if (fullScreenDoc.msExitFullscreen) {
        fullScreenDoc.msExitFullscreen();
      }
    }

    setIsFullScreen(!isFullScreen);
  };

  return (
    <button
      onClick={handleFullScreenToggle}
      aria-label="Toggle full screen"
      className={adminToolbarButtonClass}
    >
      {isFullScreen ? (
        <Minimize className="h-4 w-4" />
      ) : (
        <Maximize className="h-4 w-4" />
      )}
    </button>
  );
};

export default FullScreenButton;
