import { RouterProvider } from 'react-router'
import {Theme, ThemePanel} from '@radix-ui/themes'
// sui
import { createNetworkConfig, SuiClientProvider, WalletProvider } from '@mysten/dapp-kit'
import { getFullnodeUrl } from '@mysten/sui/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

//CSS
import '@mysten/dapp-kit/dist/index.css';
import '@radix-ui/themes/styles.css'
import './styles.css';

// Config options for the networks you want to connect to
const { networkConfig } = createNetworkConfig({
  testnet: { url: getFullnodeUrl('testnet') },
})

import { router } from './routes/routes'

const queryClient = new QueryClient()

export function App() {
  const showThemeEdit = window.location.search === '?them-edit=true'
  return (
    <Theme accentColor="amber"  radius="full" appearance="dark" panelBackground="translucent" className="theme-provider">
      <QueryClientProvider client={queryClient}>
        <SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
          <WalletProvider autoConnect>
            <RouterProvider router={router} />
          </WalletProvider>
        </SuiClientProvider>
      </QueryClientProvider>
      {showThemeEdit && <ThemePanel />}
    </Theme>
  )
}
