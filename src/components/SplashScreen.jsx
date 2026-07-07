import { useEffect, useState } from "react";

function SplashScreen({ onFinish }) {
  const [step, setStep] = useState(1);
  const [progress, setProgress] = useState(0);

  const logoPath = `${import.meta.env.BASE_URL}printai-logo.png`;

  useEffect(() => {
    const progressTimer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 100;
        return prev + 2;
      });
    }, 90);

    const stepTimer = setTimeout(() => {
      setStep(2);
    }, 2600);

    const finishTimer = setTimeout(() => {
      onFinish();
    }, 6200);

    return () => {
      clearInterval(progressTimer);
      clearTimeout(stepTimer);
      clearTimeout(finishTimer);
    };
  }, [onFinish]);

  return (
    <div style={styles.page}>
      <div style={styles.glowBlue}></div>
      <div style={styles.glowPink}></div>

      {step === 1 && (
        <div style={styles.card}>
          <div style={styles.logoWrap}>
            <img
              src={logoPath}
              alt="Digital Pehlwan PrintAI"
              style={styles.logo}
            />
          </div>

          <div style={styles.betaBadge}>Version 0.9 Beta</div>

          <h1 style={styles.title}>Digital Pehlwan PrintAI</h1>

          <p style={styles.tagline}>
            From AI Images to Print-Ready Artwork
          </p>

          <div style={styles.moduleRow}>
            <span style={styles.modulePill}>Smart Studio</span>
            <span style={styles.modulePill}>Smart Analysis</span>
            <span style={styles.modulePill}>Smart Repair</span>
          </div>

          <div style={styles.loadingBox}>
            <div style={styles.progressTrack}>
              <div style={{ ...styles.progressBar, width: `${progress}%` }} />
            </div>

            <p style={styles.loadingText}>Loading PrintAI Beta...</p>
          </div>
        </div>
      )}

      {step === 2 && (
        <div style={styles.card}>
          <div style={styles.logoMiniWrap}>
            <img
              src={logoPath}
              alt="Digital Pehlwan PrintAI"
              style={styles.smallLogo}
            />
          </div>

          <div style={styles.betaBadge}>Version 0.9 Beta</div>

          <h1 style={styles.title}>Digital Pehlwan PrintAI</h1>

          <p style={styles.tagline}>
            From AI Images to Print-Ready Artwork
          </p>

          <div style={styles.founderBox}>
            <p style={styles.founderLabel}>Founder</p>
            <h2 style={styles.founderName}>Monika Hingle</h2>
            <p style={styles.brandLine}>The Brand Builders</p>
          </div>

          <div style={styles.missionBox}>
            <h3 style={styles.missionTitle}>Mission</h3>
            <p style={styles.missionText}>
              हर designer, print shop और creative professional को AI की मदद से
              professional print-ready artwork मिनटों में उपलब्ध कराना।
            </p>
          </div>

          <div style={styles.moduleGrid}>
            <span style={styles.modulePill}>Smart Studio</span>
            <span style={styles.modulePill}>Smart Analysis</span>
            <span style={styles.modulePill}>Smart Repair</span>
            <span style={styles.modulePill}>Smart Editing</span>
            <span style={styles.modulePill}>Smart Print Studio</span>
            <span style={styles.modulePill}>Smart Batch Studio</span>
          </div>

          <div style={styles.loadingBox}>
            <div style={styles.progressTrack}>
              <div style={{ ...styles.progressBar, width: `${progress}%` }} />
            </div>

            <p style={styles.loadingText}>Opening Smart Studio...</p>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "26px",
    position: "relative",
    overflow: "hidden",
    background:
      "radial-gradient(circle at 18% 12%, rgba(7,151,232,0.22), transparent 30%), radial-gradient(circle at 82% 16%, rgba(230,0,126,0.22), transparent 34%), radial-gradient(circle at 50% 100%, rgba(124,58,237,0.10), transparent 36%), linear-gradient(135deg, #ffffff 0%, #f4fbff 48%, #fff1fa 100%)",
    fontFamily: "'Inter', Arial, Helvetica, sans-serif",
  },

  glowBlue: {
    position: "absolute",
    width: "360px",
    height: "360px",
    borderRadius: "50%",
    background: "rgba(7,151,232,0.18)",
    filter: "blur(36px)",
    left: "-100px",
    top: "80px",
  },

  glowPink: {
    position: "absolute",
    width: "420px",
    height: "420px",
    borderRadius: "50%",
    background: "rgba(230,0,126,0.16)",
    filter: "blur(42px)",
    right: "-120px",
    bottom: "40px",
  },

  card: {
    width: "min(760px, 100%)",
    borderRadius: "34px",
    padding: "34px",
    position: "relative",
    zIndex: 2,
    textAlign: "center",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(255,255,255,0.88))",
    border: "1px solid rgba(7,151,232,0.20)",
    boxShadow:
      "0 30px 90px rgba(0,64,128,0.18), inset 0 1px 0 rgba(255,255,255,0.85)",
    backdropFilter: "blur(18px)",
  },

  logoWrap: {
    width: "230px",
    height: "230px",
    margin: "0 auto 12px",
    borderRadius: "34px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      "linear-gradient(135deg, rgba(7,151,232,0.10), rgba(230,0,126,0.10))",
    boxShadow: "0 18px 45px rgba(0,64,128,0.12)",
  },

  logoMiniWrap: {
    width: "150px",
    height: "150px",
    margin: "0 auto 10px",
    borderRadius: "28px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      "linear-gradient(135deg, rgba(7,151,232,0.10), rgba(230,0,126,0.10))",
    boxShadow: "0 18px 45px rgba(0,64,128,0.12)",
  },

  logo: {
    width: "205px",
    height: "205px",
    objectFit: "contain",
    borderRadius: "26px",
  },

  smallLogo: {
    width: "130px",
    height: "130px",
    objectFit: "contain",
    borderRadius: "22px",
  },

  betaBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "8px auto 12px",
    padding: "8px 16px",
    borderRadius: "999px",
    color: "#ffffff",
    fontSize: "13px",
    fontWeight: 900,
    letterSpacing: "0.3px",
    background:
      "linear-gradient(135deg, #0797e8 0%, #7c3aed 48%, #e6007e 100%)",
  },

  title: {
    margin: "4px 0 8px",
    fontSize: "clamp(34px, 5vw, 58px)",
    lineHeight: 1.02,
    fontWeight: 950,
    letterSpacing: "-1.8px",
    background:
      "linear-gradient(90deg, #0797e8 0%, #0077c8 28%, #7c3aed 55%, #e6007e 100%)",
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    color: "transparent",
  },

  tagline: {
    margin: "0 auto 18px",
    maxWidth: "620px",
    color: "#1f2937",
    fontSize: "18px",
    fontWeight: 800,
    lineHeight: 1.45,
  },

  moduleRow: {
    display: "flex",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: "10px",
    margin: "18px 0 22px",
  },

  moduleGrid: {
    display: "flex",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: "10px",
    margin: "18px 0 22px",
  },

  modulePill: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "9px 13px",
    borderRadius: "999px",
    background: "rgba(7,151,232,0.08)",
    border: "1px solid rgba(7,151,232,0.18)",
    color: "#243041",
    fontSize: "12.5px",
    fontWeight: 850,
  },

  founderBox: {
    margin: "16px auto",
    padding: "18px",
    borderRadius: "24px",
    background:
      "linear-gradient(135deg, rgba(7,151,232,0.08), rgba(230,0,126,0.08))",
    border: "1px solid rgba(7,151,232,0.16)",
  },

  founderLabel: {
    margin: "0 0 4px",
    color: "#6b7280",
    fontSize: "13px",
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: "2px",
  },

  founderName: {
    margin: "0",
    fontSize: "30px",
    fontWeight: 950,
    color: "#111827",
    letterSpacing: "-0.8px",
  },

  brandLine: {
    margin: "6px 0 0",
    color: "#e6007e",
    fontSize: "15px",
    fontWeight: 900,
    letterSpacing: "3px",
  },

  missionBox: {
    margin: "16px auto",
    padding: "18px 20px",
    borderRadius: "24px",
    background: "#ffffff",
    border: "1px solid rgba(230,0,126,0.16)",
    boxShadow: "0 14px 34px rgba(0,64,128,0.08)",
  },

  missionTitle: {
    margin: "0 0 8px",
    color: "#0797e8",
    fontSize: "18px",
    fontWeight: 950,
  },

  missionText: {
    margin: "0",
    color: "#374151",
    fontSize: "15px",
    fontWeight: 650,
    lineHeight: 1.7,
  },

  loadingBox: {
    marginTop: "20px",
  },

  progressTrack: {
    width: "100%",
    height: "12px",
    borderRadius: "999px",
    overflow: "hidden",
    background: "rgba(15,23,42,0.08)",
    border: "1px solid rgba(7,151,232,0.14)",
  },

  progressBar: {
    height: "100%",
    borderRadius: "999px",
    background:
      "linear-gradient(90deg, #0797e8 0%, #7c3aed 52%, #e6007e 100%)",
    transition: "width 0.2s ease",
  },

  loadingText: {
    margin: "12px 0 0",
    color: "#6b7280",
    fontSize: "13px",
    fontWeight: 850,
    letterSpacing: "0.5px",
  },
};

export default SplashScreen;