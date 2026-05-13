import { useState, useEffect, useCallback } from "react";

interface SplashScreenProps {
  onEnter: () => void;
}

export function SplashScreen({ onEnter }: SplashScreenProps) {
  const [showButton, setShowButton] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShowButton(true), 3000);
    return () => clearTimeout(t);
  }, []);

  const handleEnter = useCallback(() => {
    setExiting(true);
    setTimeout(onEnter, 700);
  }, [onEnter]);

  return (
    <>
      <style>{globalStyles}</style>
      <div
        style={{
          ...s.container,
          animation: exiting ? "splashExit 0.7s ease forwards" : undefined,
        }}
      >
        <img src="/grailbabe-splash.png" alt="GrailBabe" style={s.bgImage} />
        <div style={s.gradientOverlay} />
        <div
          style={{
            ...s.curtain,
            left: "0%",
            background: panel1Bg,
            animationDelay: "0.1s",
          }}
        />
        <div
          style={{
            ...s.curtain,
            left: "33.33%",
            background: panel2Bg,
            animationDelay: "0.8s",
          }}
        />
        <div
          style={{
            ...s.curtain,
            left: "66.66%",
            background: panel3Bg,
            animationDelay: "1.5s",
          }}
        />
        <img src="/grailbabe-logo.png" alt="GrailBabe" style={s.logo} />
        {showButton && (
          <div style={s.enterWrap}>
            <button
              onClick={handleEnter}
              style={s.enterBtn}
              onTouchEnd={(e) => {
                e.preventDefault();
                handleEnter();
              }}
            >
              ENTER
            </button>
            <span style={s.tapHint}>tap to begin</span>
          </div>
        )}
      </div>
    </>
  );
}

const panel1Bg =
  "linear-gradient(180deg, #060a14 0%, rgba(30,80,255,0.18) 50%, #060a14 100%)";
const panel2Bg =
  "linear-gradient(180deg, #060e09 0%, rgba(0,220,80,0.18) 50%, #060e09 100%)";
const panel3Bg =
  "linear-gradient(180deg, #140606 0%, rgba(255,50,30,0.18) 50%, #140606 100%)";

const globalStyles = `body,html{overscroll-behavior:none;-webkit-tap-highlight-color:transparent;}@keyframes neonFlicker{0%{opacity:0;filter:drop-shadow(0 0 0px rgba(255,255,255,0))}4%{opacity:0.9;filter:drop-shadow(0 0 40px rgba(255,255,255,0.9))}7%{opacity:0.1;filter:drop-shadow(0 0 4px rgba(255,255,255,0.1))}12%{opacity:1;filter:drop-shadow(0 0 50px rgba(255,255,255,1))}17%{opacity:0.5;filter:drop-shadow(0 0 10px rgba(255,255,255,0.4))}24%{opacity:1;filter:drop-shadow(0 0 40px rgba(255,255,255,0.8))}32%{opacity:0.8;filter:drop-shadow(0 0 20px rgba(255,255,255,0.5))}42%{opacity:1;filter:drop-shadow(0 0 30px rgba(255,255,255,0.7))}100%{opacity:1;filter:drop-shadow(0 0 18px rgba(255,255,255,0.3))}}@keyframes imageReveal{to{opacity:1}}@keyframes curtainLift{0%{transform:translateY(0%)}100%{transform:translateY(-101%)}}@keyframes splashEnterFade{from{opacity:0;transform:translateX(-50%) translateY(16px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}@keyframes buttonPulse{0%,100%{box-shadow:0 0 12px rgba(0,255,136,0.5),0 0 24px rgba(0,255,136,0.2)}50%{box-shadow:0 0 24px rgba(0,255,136,0.9),0 0 50px rgba(0,255,136,0.4)}}@keyframes splashExit{0%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(1.04)}}`;

const s: Record<string, React.CSSProperties> = {
  container: {
    position: "fixed",
    inset: 0,
    zIndex: 9999,
    overflow: "hidden",
    background: "#000",
    paddingTop: "env(safe-area-inset-top)",
    paddingBottom: "env(safe-area-inset-bottom)",
    paddingLeft: "env(safe-area-inset-left)",
    paddingRight: "env(safe-area-inset-right)",
  },
  bgImage: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition: "center top",
    display: "block",
    opacity: 0,
    animation: "imageReveal 0.15s ease 0.08s forwards",
  },
  gradientOverlay: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, transparent 35%, rgba(0,0,0,0.55) 100%)",
    zIndex: 1,
    pointerEvents: "none",
  },
  curtain: {
    position: "absolute",
    top: 0,
    width: "33.34%",
    height: "110%",
    zIndex: 2,
    animationName: "curtainLift",
    animationDuration: "1s",
    animationTimingFunction: "cubic-bezier(0.76, 0, 0.24, 1)",
    animationFillMode: "both",
  },
  logo: {
    position: "absolute",
    left: "50%",
    transform: "translateX(-50%)",
    bottom: "calc(16% + env(safe-area-inset-bottom))",
    width: "clamp(220px, 68vw, 520px)",
    zIndex: 3,
    opacity: 0,
    pointerEvents: "none",
    animation: "neonFlicker 1.6s ease-out 2.55s forwards",
    filter: "drop-shadow(0 0 18px rgba(255,255,255,0.25))",
  },
  enterWrap: {
    position: "absolute",
    bottom: "calc(8% + env(safe-area-inset-bottom))",
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 4,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "10px",
    animation: "splashEnterFade 0.6s ease forwards",
    touchAction: "manipulation",
  },
  enterBtn: {
    minWidth: "160px",
    minHeight: "48px",
    padding: "14px 52px",
    fontSize: "clamp(0.85rem, 3vw, 1.05rem)",
    fontWeight: 700,
    letterSpacing: "0.25em",
    textTransform: "uppercase",
    background: "transparent",
    color: "#00ff88",
    border: "2px solid #00ff88",
    borderRadius: "3px",
    cursor: "pointer",
    fontFamily: "inherit",
    animation: "buttonPulse 2s ease-in-out infinite",
    WebkitTouchCallout: "none",
    userSelect: "none",
  },
  tapHint: {
    fontSize: "clamp(0.6rem, 2vw, 0.7rem)",
    color: "rgba(255,255,255,0.4)",
    letterSpacing: "0.15em",
    textTransform: "uppercase",
    userSelect: "none",
  },
};
