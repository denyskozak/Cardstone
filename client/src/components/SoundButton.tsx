import React, { useRef } from "react";

type SoundButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  soundSrc?: string;
};

export function SoundButton({
  onClick,
  soundSrc = "/assets/sounds/components/button_click.ogg",
  style,
  children,
  ...props
}: SoundButtonProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handlePress = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (audioRef.current) {
      try {
        audioRef.current.currentTime = 0;
        audioRef.current.volume = 0.3;
        // Play might be rejected if autoplay policies block it. Ignore errors silently.
        void audioRef.current.play().catch(() => undefined);
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
        type="button"
        {...props}
      >
        {children}
      </button>
    </>
  );
}
