import type { RefObject } from 'react';

export function Overlay({ counterRef }: { counterRef: RefObject<HTMLSpanElement | null> }) {
  return (
    <div className="overlay" aria-hidden="true">
      <svg className="mark-defs" width="0" height="0" focusable="false">
        <defs>
          <filter id="rough-line">
            <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="1" result="noise">
              <animate attributeName="seed" values="1;2;3;4;5" dur="0.5s" calcMode="discrete" repeatCount="indefinite" />
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="4" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <filter id="rough-line-still">
            <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="1" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="4" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <linearGradient id="pencil-stroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="currentColor" stopOpacity="0" />
            <stop offset="0.12" stopColor="currentColor" stopOpacity="1" />
            <stop offset="0.6" stopColor="currentColor" stopOpacity="0.7" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
      <div className="scroll-cue" />
      <div className="scroll-track">
        <i className="scroll-tick" />
      </div>
      <div className="registration">
        <svg className="corner corner-tl" viewBox="0 0 16 16">
          <path d="M1.2 15 Q0.6 8 1 1.2 Q8 0.5 14 1.1" />
        </svg>
        <svg className="corner corner-tr" viewBox="0 0 16 16">
          <path d="M2 1 Q8.5 1.4 14.8 1 Q15.3 8 14.6 14.5" />
        </svg>
        <svg className="corner corner-bl" viewBox="0 0 16 16">
          <path d="M1 2 Q1.5 8 0.9 14.8 Q8 15.4 14.5 14.9" />
        </svg>
        <svg className="corner corner-br" viewBox="0 0 16 16">
          <path d="M14.6 1.5 Q15.2 8 15 15 Q8 14.5 1.5 15.2" />
        </svg>
        <span className="timecode" ref={counterRef}>00:00</span>
      </div>
      <div className="connections">
        <i className="connection connection-one" />
        <i className="connection connection-two" />
      </div>
      <div className="expanding-circle">
        <svg viewBox="0 0 100 100">
          <path d="M45.0 2.3 C58.3 0.9 71.9 4.5 82.1 13.5 C92.3 22.4 97.4 35.5 97.7 48.8 C98.0 62.1 93.8 75.6 84.1 85.1 C74.3 94.6 60.6 98.2 47.4 97.4 C34.2 96.7 21.4 91.2 12.8 80.8 C4.2 70.4 0.7 56.8 2.5 43.6 C4.3 30.3 10.9 17.9 22.1 10.1" />
          <path
            className="second-pass"
            d="M66.8 93.9 C54.4 98.7 40.7 97.2 29.0 91.3 C17.3 85.3 7.5 75.4 4.0 62.3 C0.5 49.3 3.7 35.7 10.9 24.6 C18.1 13.5 29.3 5.3 42.6 3.2 C55.9 1.1 68.9 5.9 79.1 14.1 C89.3 22.3 96.3 34.2 97.0 47.5 C97.7 60.9 92.2 73.6 82.9 82.9"
          />
        </svg>
      </div>
      <div className="strata">
        <svg className="stratum" viewBox="0 0 100 6" preserveAspectRatio="none">
          <path d="M0 3 Q12 0.8 25 3.1 T50 3.6 T75 2.4 T100 3.2" />
        </svg>
        <svg className="stratum" viewBox="0 0 100 6" preserveAspectRatio="none">
          <path d="M0 3.4 Q16 5.2 31 3 T58 2.6 T82 3.8 T100 2.9" />
        </svg>
        <svg className="stratum" viewBox="0 0 100 6" preserveAspectRatio="none">
          <path d="M0 2.8 Q10 3.9 24 2.6 T49 3.3 T73 2.2 T100 3.1" />
        </svg>
      </div>
    </div>
  );
}
