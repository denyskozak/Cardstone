import React, { useRef } from "react";

export function SoundButton({ onClick,  ...props }) {
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
      <button
        onClick={handlePress}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 18px',
          borderRadius: '16px',
          border: 'none',
          background: 'linear-gradient(90deg,#f97316,#facc15)',
          color: '#0b1324',
          fontWeight: 700,
          cursor: 'pointer'
        }}
        {...props}
      >
        {props.children}
      </button>
    </>
  );
}
