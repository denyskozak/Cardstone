import { TabNav } from '@radix-ui/themes'
import { useNavigate } from 'react-router'
import { useCurrentAccount } from '@mysten/dapp-kit'


export const Navigation = () => {
  const navigate =  useNavigate();
  const account =  useCurrentAccount();

  return (
    <TabNav.Root  justify="center" className="h-[98px] bg-black" color="gold"  >
      <div className="flex items-center space-x-6">
        <a href="#">
          <img src="/assets/logo.webp" alt="Mw-logo" className="w-14 h-16" />
        </a>
        <TabNav.Link href="#" active >
          Ranked
        </TabNav.Link>
        <TabNav.Link href="#" >FAQ</TabNav.Link>
        <TabNav.Link href="#" onClick={() => navigate('/profile')}>Profile</TabNav.Link>
        <TabNav.Link href="#" onClick={() => navigate('/dashboard')}>Dashboard</TabNav.Link>
        <a href="#">
          <img src="https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/discord-white-icon.png" alt="Discord" className="w-6 h-6" />
        </a>
        <a href="#">
          <img src="https://uxwing.com/wp-content/themes/uxwing/download/controller-and-music/volume-silent-white-icon.png" alt="Mute" className="w-6 h-6" />
        </a>
        {/*<Button onClick={() => navigate(account ? '/matches' : '/sign-in')}>Launch Game</Button>*/}
      </div>

    </TabNav.Root>
  )
}