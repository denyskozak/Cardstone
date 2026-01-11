import { Navigation } from '../components/Navigation'
import { ConnectionButton } from '../components/ConnectionButton'
import { useCurrentAccount, useSignPersonalMessage } from '@mysten/dapp-kit'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { Heading } from '@radix-ui/themes'
import { SoundButton } from '../components/SoundButton'
import { fetchAuthNonce, getAuthToken, loginWithSignature, setAuthToken } from '../net/auth'


export function SignIn() {
  const account = useCurrentAccount()
  const navigate = useNavigate()
  const signPersonalMessage = useSignPersonalMessage()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (account && getAuthToken()) {
      navigate('/menu')
    }
  }, [account, navigate])

  const handleSignIn = async () => {
    if (!account) {
      setError('Connect your wallet first.')
      return
    }
    setError(null)
    setLoading(true)
    try {
      const { nonce, message } = await fetchAuthNonce()
      const messageBytes = new TextEncoder().encode(message)
      const signatureResult = await signPersonalMessage.mutateAsync({
        message: messageBytes
      })
      const loginResult = await loginWithSignature({
        address: account.address,
        nonce,
        signature: signatureResult.signature
      })
      setAuthToken(loginResult.token)
      navigate('/menu')
    } catch (err) {
      console.error(err)
      setError('Failed to sign in. Please try again.')
    } finally {
      setLoading(false)
    }
  }

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
          {account && (
            <div className="mt-4 flex flex-col items-center gap-2">
              <SoundButton disabled={loading} onClick={handleSignIn}>
                {loading ? 'Signing...' : 'Sign in with wallet'}
              </SoundButton>
              {error && <p className="text-red-200 text-sm">{error}</p>}
            </div>
          )}
        </div>


      </div>
    </div>

  )
}
