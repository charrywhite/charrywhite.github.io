
import React, { useState } from 'react';
import Aquarium from './components/Aquarium';
import './styles.css';

const App: React.FC = () => {
  const [lightsOn, setLightsOn] = useState(true);

  return (
    <div className="zc-minimal-shell">
      <div className="zc-aquarium-frame">
        <Aquarium lightsOn={lightsOn} />
        <button
          type="button"
          aria-pressed={lightsOn}
          className={`zc-lamp-toggle ${lightsOn ? 'is-on' : 'is-off'}`}
          onClick={() => setLightsOn(!lightsOn)}
        >
          <span className="zc-lamp-icon" aria-hidden="true">
            <span className="zc-lamp-circle" />
            <span className="zc-lamp-switch" />
          </span>
          <span className="zc-sr-only">
            {lightsOn ? 'Turn lights off' : 'Turn lights on'}
          </span>
        </button>
      </div>
    </div>
  );
};

export default App;
