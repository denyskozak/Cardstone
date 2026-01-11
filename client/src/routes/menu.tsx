import { Button, Card, Flex, Grid, Heading, Text } from '@radix-ui/themes'
import { Link } from 'react-router'

const menuItems = [
  // {
  //   title: 'Quick Match',
  //   description: 'Jump straight into a live battle and test your deck against players from around the realm.',
  //   href: '/play',
  //   cta: 'Enter Arena',
  //   accent: 'rgba(34, 197, 254, 0.45)'
  // },
  {
    title: 'Play',
    description: 'Craft your deck and play.',
    href: '/decks',
    cta: 'Quick Start',
    accent: 'rgba(192, 132, 252, 0.45)'
  },
  {
    title: 'Quests',
    description: 'Track your progress and earn rewards.',
    href: '/quests',
    cta: 'View Quests',
    accent: 'rgba(34, 197, 94, 0.45)'
  },
  // {
  //   title: 'Spectate Match',
  //   description: 'Watch ongoing matches to study strategies and stay ahead of the evolving meta.',
  //   href: '/game',
  //   cta: 'Spectate',
  //   accent: 'rgba(74, 222, 128, 0.45)'
  // },
  {
    title: 'Account Settings',
    description: 'Securely connect your wallet to sync progress and unlock personalized rewards.',
    href: '/sign-in',
    cta: 'Sign In',
    accent: 'rgba(248, 113, 113, 0.45)'
  }
] as const

export function MenuPage() {
  return (
    <Flex direction="column" align="center" justify="center" gap="6" className="menu-page">
      <Flex direction="column" align="center" gap="3" className="menu-hero">
        <Text size="2" color="gray">Welcome to</Text>
        <Heading size="9" weight="bold" className="menu-title">
          Cardstone Nexus
        </Heading>
        <Text size="4" align="center" color="gray">
          Choose your path, rally your deck, and forge your legend in the arena.
        </Text>
      </Flex>

      <Grid
        columns={{ initial: '1', sm: '1' }}
        gap="5"
        className="menu-grid  items-center"
      >
        {menuItems.map((item) => (
          <Card
            key={item.title}
            size="5"
            className="menu-card max-w-[320px]"
            style={{
              border: `1px solid ${item.accent}`,
              boxShadow: `0 0 28px ${item.accent}`,
              background: 'rgba(7, 12, 23, 0.85)'
            }}
          >
            <Flex direction="column" gap="4">
              <Heading size="6">{item.title}</Heading>
              <Text size="3" color="gray">
                {item.description}
              </Text>
              <Button size="3" color="cyan" variant="solid" asChild>
                <Link to={item.href}>{item.cta}</Link>
              </Button>
            </Flex>
          </Card>
        ))}
      </Grid>
    </Flex>
  )
}
