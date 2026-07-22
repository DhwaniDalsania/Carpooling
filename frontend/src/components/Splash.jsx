import React, { useEffect } from 'react';

export const Splash = ({ onFinish, isInitializing }) => {
  useEffect(() => {
    if (!isInitializing) {
      const timer = setTimeout(() => {
        onFinish();
      }, 600); // 600ms minimum show for smooth branding transition
      return () => clearTimeout(timer);
    }
  }, [isInitializing, onFinish]);

  return (
    <div className="splash-container animate-fade-in">
      <div className="splash-content">
        {/* Styled Logo Container */}
        <div className="splash-logo-container">
          {/* Detailed SVG drawing of the car with 3 passengers front-view */}
          <svg viewBox="0 0 120 100" fill="none" className="splash-car-drawing" xmlns="http://www.w3.org/2000/svg">
            {/* Road grid lines at bottom */}
            <path d="M10 90 H110 M20 90 L5 100 M100 90 L115 100" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.3" />
            
            {/* Passengers (3 heads with shoulders) */}
            {/* Left passenger */}
            <circle cx="42" cy="46" r="6" fill="currentColor" opacity="0.8" />
            <path d="M34 58 C34 52 50 52 50 58" fill="currentColor" opacity="0.8" />
            
            {/* Right passenger */}
            <circle cx="78" cy="46" r="6" fill="currentColor" opacity="0.8" />
            <path d="M70 58 C70 52 86 52 86 58" fill="currentColor" opacity="0.8" />
            
            {/* Middle passenger (shifted slightly up) */}
            <circle cx="60" cy="42" r="7" fill="currentColor" />
            <path d="M50 56 C50 49 70 49 70 56" fill="currentColor" />

            {/* Car Cabin / Windshield outline */}
            <path d="M32 60 L40 32 C42 27 46 25 52 25 H68 C74 25 78 27 80 32 L88 60" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
            
            {/* Car body lower section */}
            <rect x="22" y="58" width="76" height="24" rx="8" fill="var(--bg-card)" stroke="currentColor" strokeWidth="3.5" />
            
            {/* Headlights */}
            <circle cx="34" cy="70" r="5" fill="currentColor" />
            <circle cx="86" cy="70" r="5" fill="currentColor" />
            
            {/* Grill / License plate */}
            <rect x="48" y="68" width="24" height="6" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
            <line x1="53" y1="71" x2="67" y2="71" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            
            {/* Wheels / Tires underneath */}
            <rect x="28" y="82" width="14" height="6" rx="2" fill="currentColor" />
            <rect x="78" y="82" width="14" height="6" rx="2" fill="currentColor" />
          </svg>
        </div>

        <div className="splash-text-section">
          <h1 className="splash-title">FindMeARide</h1>
          <p className="splash-tagline">Commute Smarter Together</p>
        </div>

        <div className="splash-loading-bar">
          <div className="splash-loading-progress"></div>
        </div>
      </div>
    </div>
  );
};

export default Splash;
