import { useState } from 'react';
import { CyberBackground } from '@/components/CyberBackground';
import { IntroAnimation } from '@/components/IntroAnimation';
import { PortalSelection } from '@/components/PortalSelection';
import { CitizenPortal } from '@/components/CitizenPortal';
import { LawEnforcementPortal } from '@/components/LawEnforcementPortal';

type Screen = 'intro' | 'portals' | 'citizen' | 'law_enforcement';

function App() {
  const [screen, setScreen] = useState<Screen>('intro');

  if (screen === 'intro') {
    return (
      <>
        <CyberBackground />
        <IntroAnimation onComplete={() => setScreen('portals')} />
      </>
    );
  }

  if (screen === 'citizen') {
    return (
      <>
        <CyberBackground />
        <CitizenPortal onBack={() => setScreen('portals')} />
      </>
    );
  }

  if (screen === 'law_enforcement') {
    return (
      <>
        <CyberBackground />
        <LawEnforcementPortal onBack={() => setScreen('portals')} />
      </>
    );
  }

  return (
    <>
      <CyberBackground />
      <PortalSelection
        onSelect={(portal) => setScreen(portal === 'citizen' ? 'citizen' : 'law_enforcement')}
      />
    </>
  );
}

export default App;
