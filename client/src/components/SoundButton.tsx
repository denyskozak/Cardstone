import React, { useRef } from "react";
import { Button } from '@radix-ui/themes';

type ButtonElement = HTMLButtonElement;
type ButtonEvent = React.MouseEvent<ButtonElement>;

export interface SoundButtonProps
  extends React.ButtonHTMLAttributes<ButtonElement> {
  soundSrc?: string;
}

export function SoundButton({
  onClick,
  soundSrc = "/assets/sounds/components/button_click.ogg",
  children,
  style,
  ...buttonProps
}: SoundButtonProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handlePress = (event: ButtonEvent) => {
    const audio = audioRef.current;
    if (audio) {
      try {
        audio.currentTime = 0;
        audio.volume = 0.3;
        void audio.play().catch(() => {});
      } catch {
        // ignore play errors
      }
    }
    onClick?.(event);
  };

  return (
    <>
      <audio ref={audioRef} hidden src={soundSrc}>
        <track kind="captions" />
      </audio>
      <Button
        onClick={handlePress}
        {...buttonProps}
      >
        {children}
      </Button>
    </>
  );
}
