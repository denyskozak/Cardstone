import { Navigation } from '../components/Navigation'
import { ConnectionButton } from '../components/ConnectionButton'
import { useCurrentAccount } from '@mysten/dapp-kit'
import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { Heading } from '@radix-ui/themes'


export function SignIn() {
  const account = useCurrentAccount()
  const navigate = useNavigate()

  useEffect(() => {
    if (account) navigate('/menu')
  }, [account])

  return (
    <div className="h-full">
      <Navigation />
      <div className="relative justify-center align-middle items-center flex  w-full h-[calc(100%-98px)] ">
        <img
          alt="Login Background"
          className="absolute top-0 left-0 w-full h-full object-cover z-[1] "
          src="/assets/board_template.webp"
        />


        <div className="z-10">
          <Heading mb="1" size="5">Sign-in</Heading>
          <ConnectionButton />
        </div>


      </div>
    </div>

  )
}