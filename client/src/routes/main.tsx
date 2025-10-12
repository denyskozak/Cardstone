import { Navigation } from '../components/Navigation'
import { MagicCanvas } from '../components/MagicCanvas'
import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router'
import { SoundButton as Button } from '../components/SoundButton'
import { useCurrentAccount } from '@mysten/dapp-kit'

export function MainRoute() {
  const logoRef = useRef(null)
  const navigate = useNavigate()
  const account = useCurrentAccount();
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (!logoRef.current) return
    const tl = gsap.timeline({ repeat: -1, yoyo: true })

    tl.to(logoRef.current, { y: -20, duration: 2, ease: 'sine.inOut' })

    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length)
    }, 10000)


    return () => {
      tl.kill()
      clearInterval(interval)
    }
  }, [])


  const slides = [
    {
      titles: ['Online', 'Collectible Cards Game'],
      subtitle: 'Spell-slinging PvP with the thrill of FPS combat',
    },
    {
      titles: ['Built by', 'Hearthstone Fan'],
      subtitle: 'Innovative technology which opens new world of opportunities',
    },
    {
      titles: ['Powered by ', 'Sui Blockchain'],
      subtitle: 'Claim $SuiWars tokens, loot, and rare gear — fully tradable',
    },
  ];

  return (
    <div className="h-full">
      <Navigation />

      <div className="relative justify-center align-middle items-center flex flex-col w-full h-[calc(100%-98px)]">
        <MagicCanvas />
        <img
          ref={logoRef}
          alt="Big Logo"
          className="mt-[64px] max-w-[280px] object-cover z-[2]"
          src="/assets/images/logo_big.webp"
        />

        <img
          alt="Turtle Art"
          className="absolute top-0 left-0 w-full h-full object-fit z-[0]"
          src="/assets/images/background.webp"
        />

        <main className="z-[2] flex justify-center w-full h-full overflow-y-auto">
          <div className="flex items-center flex-col">
            {/* HeroUI-like header */}
            <div className="text-center mt-12">
              <div className="inline-block max-w-xl text-center justify-center items-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={slides[index].titles[0]}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-lg"
                    exit={{ opacity: 0, y: -10 }}
                    initial={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.5 }}
                  >
              <span className="tracking-tight inline font-semibold title-text z-[2] from-[#00b7fa] to-[#01cfea] text-4xl lg:text-5xl bg-clip-text text-transparent bg-gradient-to-b">
                {slides[index].titles[0]}
              </span>
                    <span className="tracking-tight inline font-semibold title-text z-[2] from-[#FF705B] to-[#FFB457] text-4xl lg:text-5xl bg-clip-text text-transparent bg-gradient-to-b">
                &nbsp;-&nbsp;<br />{slides[index].titles[1]}
              </span>

                    {/*<div*/}
                    {/*  className="mt-4 text-xl text-[#FF705B"*/}
                    {/*>*/}
                    {/*  {slides[index].subtitle}*/}
                    {/*</div>*/}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
          <div
            className="absolute bottom-[15vh]"
          >
            <Button
              onClick={() => navigate(account ? '/matches' : '/sign-in')}
            >
              {/*<span className="absolute inset-0 bg-gradient-to-r from-[#1E3A8A] via-[#38BDF8] to-[#FBBF24] animate-pulse opacity-100 group-hover:opacity-100 blur-md" />*/}

              <span aria-hidden style={{ fontSize: '1.1rem' }}>🔮</span> Launch Game
            </Button>
          </div>

          <div className="absolute bottom-4 right-2 transform -translate-x-1/2 z-[2] flex flex-col items-center">
            <img
              alt="Sui logo"
              height={120}
              src="/assets/images/Sui_Logo_White.svg"
              width={80}
            />
          </div>
        </main>
      </div>

    </div>
  )
}