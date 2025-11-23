
import React, { useState, useEffect, useRef } from 'react';
import Aquarium from './components/Aquarium';
import './styles.css';

const TARGET_RATIO = 3 / 4;
const MAX_WIDTH = 520;

const App: React.FC = () => {
  const [lightsOn, setLightsOn] = useState(true);
  const [dimensions, setDimensions] = useState({
    width: MAX_WIDTH,
    height: MAX_WIDTH / TARGET_RATIO,
  });
  const shellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const calculateLayout = () => {
      if (!shellRef.current) return;
      const availableWidth = shellRef.current.clientWidth;
      if (!availableWidth) return;

      const width = Math.min(availableWidth, MAX_WIDTH);
      const height = width / TARGET_RATIO;
      setDimensions({ width, height });
    };

    calculateLayout();
    window.addEventListener('resize', calculateLayout);

    return () => window.removeEventListener('resize', calculateLayout);
  }, []);

  const stageStyle =
    dimensions.width && dimensions.height
      ? { width: dimensions.width, height: dimensions.height }
      : undefined;

  return (
    <div className="zc2-shell" ref={shellRef}>
      <div className="zc2-stage" style={stageStyle}>
        <button
          onClick={() => setLightsOn(!lightsOn)}
          className={`zc2-toggle ${lightsOn ? 'is-on' : 'is-off'}`}
          aria-label={lightsOn ? 'Turn lights off' : 'Turn lights on'}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 18h6" />
            <path d="M10 22h4" />
            <path d="M15 14a3 3 0 0 0-3-3" />
            <path d="M6 12a6 6 0 0 1 12 0" />
          </svg>
        </button>

        <div className="zc2-frame">
          <div className="zc2-frame-overlay" aria-hidden="true"></div>
          <div className="zc2-frame-canvas">
            <Aquarium lightsOn={lightsOn} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
