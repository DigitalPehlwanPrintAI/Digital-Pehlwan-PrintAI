import { useState } from "react";

function TopMenu() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeModal, setActiveModal] = useState(null);

  function openModal(type) {
    setActiveModal(type);
    setMenuOpen(false);
  }

  function closeModal() {
    setActiveModal(null);
  }

  return (
    <>
      <div style={styles.topBar}>
        <div>
          <h2 style={styles.brandTitle}>Digital Pehlwan PrintAI</h2>
          <p style={styles.brandSub}>Version 0.9 Beta • The Brand Builders</p>
        </div>

        <div style={styles.rightBox}>
          <span style={styles.versionBadge}>Beta</span>

          <button
            style={styles.menuButton}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            ☰ Menu
          </button>

          {menuOpen && (
            <div style={styles.dropdown}>
              <button style={styles.menuItem} onClick={() => openModal("about")}>
                ℹ About PrintAI
              </button>

              <button style={styles.menuItem} onClick={() => openModal("contact")}>
                📞 Contact
              </button>

              <button style={styles.menuItem} onClick={() => openModal("guide")}>
                📖 User Guide
              </button>

              <button style={styles.menuItem} onClick={() => openModal("help")}>
                ❓ Help Center
              </button>

              <button style={styles.menuItem} onClick={() => openModal("settings")}>
                ⚙ Settings
              </button>

              <button style={styles.menuItem} onClick={() => openModal("privacy")}>
                🔐 Privacy Policy
              </button>

              <button style={styles.menuItem} onClick={() => openModal("terms")}>
                📄 Terms & Conditions
              </button>
            </div>
          )}
        </div>
      </div>

      {activeModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBox}>
            <button style={styles.closeBtn} onClick={closeModal}>
              ×
            </button>

            {activeModal === "about" && (
              <>
                <h1>About Digital Pehlwan PrintAI</h1>
                <p>
                  Digital Pehlwan PrintAI is an AI-powered print-ready artwork
                  platform created for designers, print shops, agencies and
                  creative professionals.
                </p>

                <h2>Founder</h2>
                <p>
                  <b>Monika Hingle</b>
                </p>

                <h2>Brand</h2>
                <p>
                  <b>The Brand Builders</b>
                </p>

                <h2>Mission</h2>
                <p>
                  हर designer, print shop और creative professional को AI की मदद
                  से professional print-ready artwork मिनटों में उपलब्ध कराना।
                </p>

                <h2>Current Modules</h2>
                <p><b>Smart Studio:</b> Import, convert and export print-ready files.</p>
                <p><b>Smart Analysis:</b> Image quality, DPI and print risk check.</p>
                <p><b>Smart Repair:</b> Blur, sharpness and quality improvement.</p>
                <p><b>Smart Editing:</b> Background, logo, object and font tools.</p>
                <p><b>Smart Print Studio:</b> DPI, CMYK, bleed and cost calculator.</p>
                <p><b>Smart Batch Studio:</b> Multiple files process and export.</p>
              </>
            )}

            {activeModal === "contact" && (
              <>
                <h1>Contact</h1>
                <p>
                  For demo, support, feedback or business enquiry, contact
                  Digital Pehlwan.
                </p>

                <p>
                  <b>Brand:</b> Digital Pehlwan
                </p>

                <p>
                  <b>Founder:</b> Monika Hingle
                </p>

                <p>
                  <b>Email:</b> onlinecoursemonika@gmail.com
                </p>

                <p>
                  <b>Website:</b> digitalpehlwan.com
                </p>

                <p>
                  <b>Demo:</b> DM करें और अपना slot book करें.
                </p>
              </>
            )}

            {activeModal === "guide" && (
              <>
                <h1>User Guide</h1>

                <h2>1. Smart Studio</h2>
                <p>Files import करें, format convert करें और print-ready export करें.</p>

                <h2>2. Smart Analysis</h2>
                <p>Image upload करके DPI, pixels, quality और print risk check करें.</p>

                <h2>3. Smart Repair</h2>
                <p>Blur, sharpness और image quality improve करने के लिए use करें.</p>

                <h2>4. Smart Editing</h2>
                <p>Background remove, logo tools, object/text remover और font detection use करें.</p>

                <h2>5. Smart Print Studio</h2>
                <p>Print size, DPI, bleed, safe margin और cost calculation करें.</p>

                <h2>6. Smart Batch Studio</h2>
                <p>Multiple images को एक साथ process और export करें.</p>
              </>
            )}

            {activeModal === "help" && (
              <>
                <h1>Help Center</h1>

                <h2>Common Issues</h2>
                <p><b>Backend not connected:</b> Render API first request में slow हो सकती है.</p>
                <p><b>Logo missing:</b> Browser hard refresh करें: Ctrl + Shift + R.</p>
                <p><b>Export slow:</b> बड़ी images processing में time ले सकती हैं.</p>
                <p><b>Upload fail:</b> JPG, PNG या WEBP image से test करें.</p>

                <h2>Report a Bug</h2>
                <p>Error screenshot के साथ Digital Pehlwan को भेजें.</p>
              </>
            )}

            {activeModal === "settings" && (
              <>
                <h1>Settings</h1>

                <p>
                  Settings panel अभी Beta mode में है. Future updates में ये
                  options active होंगे:
                </p>

                <p>⚙ Default DPI</p>
                <p>⚙ Default Export Format</p>
                <p>⚙ Light / Dark Theme</p>
                <p>⚙ Language</p>
                <p>⚙ Auto Save</p>
                <p>⚙ API Status</p>
              </>
            )}

            {activeModal === "privacy" && (
              <>
                <h1>Privacy Policy</h1>

                <p>
                  Digital Pehlwan PrintAI Beta testing के दौरान uploaded images
                  processing purpose के लिए use की जाती हैं.
                </p>

                <p>
                  हम user की files को public share नहीं करते. Future version में
                  user accounts, cloud storage और privacy controls add किए जाएँगे.
                </p>

                <p>
                  Sensitive या confidential artwork upload करने से पहले final
                  production privacy policy का इंतज़ार करें.
                </p>
              </>
            )}

            {activeModal === "terms" && (
              <>
                <h1>Terms & Conditions</h1>

                <p>
                  Digital Pehlwan PrintAI अभी Beta Version में है. Features test
                  और improvement phase में हैं.
                </p>

                <p>
                  Output quality uploaded image, size, format और server processing
                  पर depend करेगी.
                </p>

                <p>
                  Commercial print से पहले final artwork को manually verify करना
                  recommended है.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

const styles = {
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    padding: "18px 22px",
    marginBottom: "20px",
    borderRadius: "26px",
    background:
      "linear-gradient(135deg, rgba(255,255,255,0.96), rgba(255,255,255,0.86))",
    border: "1px solid rgba(7,151,232,0.18)",
    boxShadow: "0 18px 45px rgba(0,64,128,0.12)",
    position: "relative",
    zIndex: 100,
  },

  brandTitle: {
    margin: 0,
    fontSize: "24px",
    fontWeight: 950,
    background:
      "linear-gradient(90deg, #0797e8 0%, #7c3aed 50%, #e6007e 100%)",
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    color: "transparent",
  },

  brandSub: {
    margin: "4px 0 0",
    fontSize: "13px",
    fontWeight: 700,
    color: "#6b7280",
  },

  rightBox: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    position: "relative",
  },

  versionBadge: {
    padding: "8px 13px",
    borderRadius: "999px",
    color: "#ffffff",
    fontSize: "12px",
    fontWeight: 900,
    background: "linear-gradient(135deg, #0797e8, #e6007e)",
  },

  menuButton: {
    border: 0,
    cursor: "pointer",
    padding: "11px 16px",
    borderRadius: "999px",
    color: "#ffffff",
    fontSize: "14px",
    fontWeight: 900,
    background: "linear-gradient(135deg, #0797e8, #7c3aed, #e6007e)",
    boxShadow: "0 12px 26px rgba(7,151,232,0.22)",
  },

  dropdown: {
    position: "absolute",
    top: "52px",
    right: 0,
    width: "260px",
    padding: "10px",
    borderRadius: "20px",
    background: "#ffffff",
    border: "1px solid rgba(7,151,232,0.18)",
    boxShadow: "0 24px 60px rgba(0,64,128,0.20)",
    zIndex: 300,
  },

  menuItem: {
    width: "100%",
    display: "block",
    textAlign: "left",
    border: 0,
    cursor: "pointer",
    padding: "12px 14px",
    borderRadius: "14px",
    background: "transparent",
    color: "#111827",
    fontSize: "14px",
    fontWeight: 800,
  },

  modalOverlay: {
    position: "fixed",
    inset: 0,
    zIndex: 999,
    background: "rgba(15,23,42,0.48)",
    backdropFilter: "blur(8px)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "20px",
  },

  modalBox: {
    width: "min(850px, 100%)",
    maxHeight: "86vh",
    overflowY: "auto",
    position: "relative",
    padding: "32px",
    borderRadius: "28px",
    background: "#ffffff",
    border: "1px solid rgba(7,151,232,0.20)",
    boxShadow: "0 30px 90px rgba(0,64,128,0.24)",
  },

  closeBtn: {
    position: "absolute",
    right: "18px",
    top: "14px",
    width: "38px",
    height: "38px",
    borderRadius: "50%",
    border: 0,
    cursor: "pointer",
    color: "#ffffff",
    fontSize: "24px",
    fontWeight: 900,
    background: "linear-gradient(135deg, #0797e8, #e6007e)",
  },
};

export default TopMenu;