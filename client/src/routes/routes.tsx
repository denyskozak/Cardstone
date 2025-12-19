import { createBrowserRouter } from 'react-router'
import { MainRoute } from './main'
import { SignIn } from './sign-in'
import { PlayPage } from './play'
import { GameRoute } from './game';
import { DecksPage } from './decks';
import { DeckBuilderPage } from './deck-builder';
import { MenuPage } from './menu';
import { AdminPage } from './admin';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainRoute />,
  },
  {
    path: '/sign-in',
    element: <SignIn />,
  },
  {
    path: '/play',
    element: <PlayPage />,
  },
  {
    path: '/game',
    element: <GameRoute />,
  },
  {
    path: '/decks',
    element: <DecksPage />,
  },
  {
    path: '/decks/build',
    element: <DeckBuilderPage />,
  },
  {
    path: '/menu',
    element: <MenuPage />,
  },
  {
    path: '/admin',
    element: <AdminPage />,
  },
])
