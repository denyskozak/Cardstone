import { useNavigate } from 'react-router'
import { Card } from '@radix-ui/themes'
import { Navigation } from '../components/Navigation';

export function PlayPage() {
  const navigate = useNavigate()


  return (
    <div className="h-full w-full  items-center justify-center">
      <Navigation />
      <div className="relative justify-center align-middle items-center flex  w-full h-[calc(100%-98px)] ">

        <Card
          className="w-2/4 h-[320px] cursor-pointer"
          onClick={() => navigate('/matches')}
        >
          <div className="pb-0 pt-2 px-4 flex-col items-start">
            <h4 className="font-bold text-large">Normal Game</h4>
          </div>
          <img
            alt="Arena Match"
            className="w-full h-full object-cover rounded-t-lg"
            height={1200}
            src={'/assets/logo.webp'}
            width={2000}
          />
        </Card>
      </div>


    </div>
  )
}
