import { Navigation } from '../components/Navigation'
import { MagicCanvas } from '../components/MagicCanvas'
import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router'
import { SoundButton as Button } from '../components/SoundButton'
import { useCurrentAccount } from '@mysten/dapp-kit'

export function MainRoute() {
  const navigate = useNavigate();
  const account = useCurrentAccount();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, 10 * 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const slides = [
    {
      titles: ['Collective', 'Cards Game'],
      subtitle: 'WEB Collective Card Game'
    },
    {
      titles: ['Dive into Sui Season', 'Earn Unique Cards'],
      subtitle: 'Innovative technology'
    },
    {
      titles: ['Powered by ', 'Sui Blockchain'],
      subtitle: 'Play-to-fun and earn'
    }
  ];

  return (
    <div className="h-full">
      <Navigation />

      <div className="relative justify-center align-middle items-center pt-8 flex flex-col w-full h-[calc(100%-98px)]">
        <MagicCanvas />
        <img
          alt="Big Logo"
          className="mt-[64px] max-w-[200px] object-cover z-[2]"
          src="/assets/images/logo_big.webp"
        />


        <img
          alt="Turtle Art"
          className="absolute top-0 left-0 w-full h-full object-fit z-[0]"
          src="/assets/images/background.webp"
        />

        <main className="z-[2] gap-5 flex  items-center flex-col w-full h-full overflow-y-auto">
          <div className="flex items-center flex-col">
            {/* HeroUI-like header */}
            <div className="text-center mt-4">
              <div className="inline-block  max-w-xl text-center justify-center items-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={slides[index].titles[0]}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-lg"
                    exit={{ opacity: 0, y: -10 }}
                    initial={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.5 }}
                  >
                    <span className="tracking-tight inline font-semibold title-text z-[2] text-2xl lg:text-3xl bg-clip-text bg-gradient-to-b">
                      {slides[index].titles[0]}
                    </span>
                    <span className="tracking-tight inline font-semibold title-text z-[2] text-2xl lg:text-3xl bg-clip-text bg-gradient-to-b">
                      {/*&nbsp;-&nbsp;*/}
                      <br />
                      {slides[index].titles[1]}
                    </span>

                    {/*<div className="mt-4 text-xl text-black">*/}
                    {/*  <span className="tracking-tight inline font-semibold title-text z-[2] text-black text-xl bg-clip-text ">*/}
                    {/*  {slides[index].subtitle}*/}
                    {/*</span>*/}
                    {/*</div>*/}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
          <div style={{ position: 'absolute', bottom: '5vh'}}>
            <Button
              size='4'
              onClick={() => navigate(account ? '/decks' : '/sign-in')}>
              {/*<span className="absolute inset-0 bg-gradient-to-r from-[#1E3A8A] via-[#38BDF8] to-[#FBBF24] animate-pulse opacity-100 group-hover:opacity-100 blur-md" />*/}
              Play
            </Button>
          </div>

          <div className="absolute bottom-4 right-2 transform -translate-x-1/2 z-[2] flex flex-col items-center">
            <img alt="Sui logo" height={120} src="/assets/images/Sui_Logo_White.svg" width={80} />
          </div>
        </main>
      </div>
    </div>
  );
}