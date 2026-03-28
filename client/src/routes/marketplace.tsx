import { Badge, Button, Card, Flex, Grid, Heading, Inset, Separator, Text } from '@radix-ui/themes';

interface SkinListing {
  id: string;
  title: string;
  rarity: 'Common' | 'Rare' | 'Epic';
  price: string;
  image: string;
  description: string;
}

const cardSkinListings: SkinListing[] = [
  {
    id: 'skin-1',
    title: 'Astral Prism',
    rarity: 'Epic',
    price: '14 SUI',
    image: '/assets/card_skins/1.webp',
    description: 'Holographic card back with a luminous crystal core.'
  },
  {
    id: 'skin-2',
    title: 'Arcane Velvet',
    rarity: 'Rare',
    price: '8 SUI',
    image: '/assets/card_skins/1.webp',
    description: 'Deep violet trim inspired by ancient spellbooks.'
  },
  {
    id: 'skin-3',
    title: 'Molten Crest',
    rarity: 'Common',
    price: '4 SUI',
    image: '/assets/card_skins/1.webp',
    description: 'A forged style with ember accents for bold decks.'
  }
];

function getRarityColor(rarity: SkinListing['rarity']) {
  switch (rarity) {
    case 'Epic':
      return 'purple';
    case 'Rare':
      return 'indigo';
    case 'Common':
    default:
      return 'gray';
  }
}

export function MarketplacePage() {
  return (
    <Flex direction="column" gap="6" style={{ maxWidth: 1120, margin: '0 auto', padding: '24px 16px 48px' }}>
      <Flex direction="column" gap="2">
        <Text size="2" color="gray">
          Cardstone Store
        </Text>
        <Heading size="8">Marketplace</Heading>
        <Text size="3" color="gray">
          Buy collectible card backs and equip them in battle.
        </Text>
      </Flex>
      <Separator size="4" />
      <Grid columns={{ initial: '1', sm: '2', md: '3' }} gap="5">
        {cardSkinListings.map((skin) => (
          <Card key={skin.id} size="3" style={{ background: 'rgba(15, 23, 42, 0.74)' }}>
            <Flex direction="column" gap="4">
              <Inset clip="padding-box" side="top" pb="current">
                <img
                  src={skin.image}
                  alt={skin.title}
                  style={{
                    width: '100%',
                    aspectRatio: '8 / 11',
                    objectFit: 'cover',
                    borderTopLeftRadius: 12,
                    borderTopRightRadius: 12
                  }}
                />
              </Inset>
              <Flex justify="between" align="start" gap="2">
                <Flex direction="column" gap="1">
                  <Heading size="4">{skin.title}</Heading>
                  <Text size="2" color="gray">
                    {skin.description}
                  </Text>
                </Flex>
                <Badge color={getRarityColor(skin.rarity)}>{skin.rarity}</Badge>
              </Flex>
              <Flex align="center" justify="between">
                <Text size="4" weight="bold">
                  {skin.price}
                </Text>
                <Button color="green">Buy</Button>
              </Flex>
            </Flex>
          </Card>
        ))}
      </Grid>
    </Flex>
  );
}
