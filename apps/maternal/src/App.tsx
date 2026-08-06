import { useEffect } from 'react';
import { useApp } from './data/store';
import { AppShell } from './components/AppShell';
import { Dialogs } from './components/Dialogs';
import { Toast } from './components/Toast';
import { Launcher } from './screens/Launcher';
import { Lookup } from './screens/Lookup';
import { Register } from './screens/Register';
import { Worklist } from './screens/Worklist';
import { Alerts } from './screens/Alerts';
import { Journey } from './screens/Journey';
import { Capture } from './screens/Capture';

export default function App() {
  const { hydrated, role, screen, hydrate } = useApp();

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const isLauncher = screen === 'launcher' || !role;

  return (
    <div className="ns-app">
      {!hydrated ? (
        <Splash />
      ) : isLauncher ? (
        <Launcher />
      ) : (
        <AppShell>
          {screen === 'lookup' && <Lookup />}
          {screen === 'register' && <Register />}
          {screen === 'worklist' && <Worklist />}
          {screen === 'alerts' && <Alerts />}
          {screen === 'journey' && <Journey />}
          {screen === 'capture' && <Capture />}
        </AppShell>
      )}
      <Dialogs />
      <Toast />
    </div>
  );
}

function Splash() {
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--ml-blue)', color: '#fff' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--ml-mark-seafoam)', marginBottom: 8 }}>Medtronic LABS</div>
        <div style={{ fontSize: 22, fontWeight: 700 }}>Next Steps for Maternal Care</div>
      </div>
    </div>
  );
}
