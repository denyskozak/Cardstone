import { createBrowserRouter } from 'react-router'
import { MainRoute } from './main'
import { SignIn } from './sign-in'
import { PlayPage } from './play'
import { Game } from '../components/Game';

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
    element: <Game />,
  },
])
