import ImportPanel from "../importexport/ImportPanel.jsx";
import ExportPanel from "../importexport/ExportPanel.jsx";

function ImportExportStudio() {
  return (
    <div className="preview-box">
      <div className="analysis-box">
        <h1>Smart Studio</h1>

        <h3>Import • Export • Convert • Print Ready</h3>

        <p>
          Professional file management for PrintAI. Import, Export, Convert,
          Print Ready Output, PSD, PDF, SVG, EPS, TIFF, Corel Compatible,
          Batch Export and Advanced Print Workflow.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "12px",
            marginTop: "20px",
          }}
        >
          <div style={cardStyle}>
            <h3>📂 Smart Import</h3>
            <p>JPG, PNG, WEBP, SVG, PDF, PSD, AI, EPS</p>
          </div>

          <div style={cardStyle}>
            <h3>📤 Smart Export</h3>
            <p>PNG, JPG, WEBP, PDF, TIFF, BMP, SVG, EPS, PSD</p>
          </div>

          <div style={cardStyle}>
            <h3>🎨 Corel Studio</h3>
            <p>SVG + PDF + EPS + TIFF + PNG ZIP</p>
          </div>

          <div style={cardStyle}>
            <h3>🖨 Print Studio</h3>
            <p>72, 150, 300, 600, 1200 DPI</p>
          </div>
        </div>
      </div>

      <ImportPanel />

      <ExportPanel />
    </div>
  );
}

const cardStyle = {
  border: "1px solid #d4af37",
  borderRadius: "12px",
  padding: "15px",
  background: "rgba(212, 175, 55, 0.08)",
};

export default ImportExportStudio;