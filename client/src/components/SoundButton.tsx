import React, { useRef } from "react";

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
      <button
        onClick={handlePress}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "12px 18px",
          borderRadius: "16px",
          border: "none",
          background: "linear-gradient(90deg,#f97316,#facc15)",
          color: "#0b1324",
          fontWeight: 700,
          cursor: "pointer",
          ...style,
        }}
        {...buttonProps}
      >
        {children}
      </button>
    </>
  );
}
