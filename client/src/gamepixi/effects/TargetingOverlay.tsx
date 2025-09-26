import { useMemo } from 'react';
import TargetArrow, { type Point as ArrowPoint } from './TargetArrow';
import { useUiStore } from '../../state/store';

interface TargetingOverlayProps {
  width: number;
  height: number;
}

export default function TargetingOverlay({ width, height }: TargetingOverlayProps) {
  const targeting = useUiStore((s) => s.targeting);
  const currentTarget = useUiStore((s) => s.currentTarget ?? null);
  const candidatePoint = useUiStore((s) => s.currentTargetPoint ?? null);
  const cancelTargeting = useUiStore((s) => s.cancelTargeting);

  const snapPoint = useMemo<ArrowPoint | null>(() => {
    if (!candidatePoint) {
      return null;
    }
    return { x: candidatePoint.x, y: candidatePoint.y };
  }, [candidatePoint]);

  if (!targeting) {
    return null;
  }

  const source: ArrowPoint = targeting.origin;
  const cursor: ArrowPoint = targeting.current;
  const isValid = Boolean(currentTarget);

  return (
    <pixiContainer width={width} height={height} eventMode="none">
      <TargetArrow
        isAiming
        source={source}
        cursor={cursor}
        snapPoint={snapPoint}
        valid={isValid}
        onCancel={cancelTargeting}
      />
    </pixiContainer>
  );
}
