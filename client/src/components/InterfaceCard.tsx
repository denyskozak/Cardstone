import type { CardDefinition } from '@cardstone/shared/types';
import type { CatalogCard } from '@cardstone/shared/decks';
import styles from './InterfaceCard.module.css';

type InterfaceCardData = CardDefinition | CatalogCard;

interface InterfaceCardProps {
  card: InterfaceCardData;
  className?: string;
  showText?: boolean;
  showStats?: boolean;
}

export function InterfaceCard({
  card,
  className,
  showText = true,
  showStats = true
}: InterfaceCardProps) {
  const hasStats = 'attack' in card && 'health' in card;

  return (
    <div className={styles.container}>
      <div className={`${styles.card} ${className ?? ''}`}>
        <span className={styles.name}>{card.name}</span>
        <span className={styles.cost}>{card.cost}</span>
        {showText && card.text ? <span className={styles.text}>{card.text}</span> : null}
        {showStats && hasStats ? (
          <>
            <span className={styles.attack}>{card.attack}</span>
            <span className={styles.health}>{card.health}</span>
          </>
        ) : null}
      </div>
      <img
        className={styles.art}
        src={`/assets/cards/${card.id}.webp`}
        alt={card.name}
        loading="lazy"
      />
    </div>

  );
}
