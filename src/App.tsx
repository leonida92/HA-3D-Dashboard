import { Scene } from './components/Scene';
import { UI } from './components/UI';
import { PinOverlay } from './components/PinOverlay';
import { useEffect } from 'react';
import { connectHA } from './ha/connection';
import { useStore } from './store/useStore';

function App() {
  const haUrl = useStore(state => state.haUrl);
  const haToken = useStore(state => state.haToken);

  useEffect(() => {
    // Attempt auto-connect on load if credentials exist
    if (haUrl && haToken) {
      connectHA();
    }
  }, [haUrl, haToken]);

  return (
    <>
      <UI />
      <PinOverlay />
      <Scene />
    </>
  );
}

export default App;
