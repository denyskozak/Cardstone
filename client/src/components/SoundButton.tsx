import React, { useRef } from "react";
import { Button } from '@radix-ui/themes'

export function SoundButton({ onClick, ...props }) {
  const audioRef = useRef(null);

  const handlePress = (event) => {
    if (audioRef.current) {
      try {
        audioRef.current.currentTime = 0;
        audioRef.current.volume = 0.3;
        audioRef.current.play().catch(() => {});
      } catch {
        // ignore play errors
      }
    }
    onClick?.(event);
  };

  return (
    <>
      <audio ref={audioRef} hidden src="/assets/sounds/components/button_click.ogg">
        <track kind="captions" />
      </audio>
      <Button variant="classic" {...props} onClick={handlePress} />
    </>
  );
}
