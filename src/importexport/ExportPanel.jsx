import { useRef, useState } from "react";

const API_BASE = "https://digital-pehlwan-printai.onrender.com";

const EXPORT_FORMATS = [
  { key: "png", label: "PNG", note: "Transparent PNG" },
  { key: "jpg", label: "JPG", note: "Print/Web JPG" },
  { key: "webp", label: "WEBP", note: "Compressed Web Image" },
  { key: "pdf", label: "PDF", note: "Print Ready PDF" },
  { key: "tiff", label: "TIFF", note: "Print Industry TIFF" },
  { key: "bmp", label: "BMP", note: "Bitmap Image" },
  { key: "svg", label: "SVG", note: "Corel Compatible SVG" },
  { key: "eps", label: "EPS", note: "Corel/Illustrator EPS" },
  { key: "psd", label: "PSD", note: "Photoshop PSD Flattened" },
  { key: "cdr", label: "Corel ZIP", note: "SVG + PDF + EPS + TIFF + PNG" },
];

function ExportPanel() {
  const fileInputRef = useRef(null);

  const [sourceFile, setSourceFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [selectedFormat, setSelectedFormat] = useState("png");

  const [quality, setQuality] = useState(98);
  const [dpi, setDpi] = useState(300);
  const [colorMode, setColorMode] = useState("RGB");
  const [backgroundMode, setBackgroundMode] = useState("transparent");
  const [customBg, setCustomBg] = useState("#ffffff");

  const [resizeMode, setResizeMode] = useState("original");
  const [customWidth, setCustomWidth] = useState("");
  const [customHeight, setCustomHeight] = useState("");

  const [backendStatus, setBackendStatus] = useState("Not checked");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("Export ke liye image select karo.");

  function openPicker() {
    fileInputRef.current?.click();
  }

  async function checkBackend() {
    try {
      setBackendStatus("Checking...");
      const res = await fetch(`${API_BASE}/import-export/health`);
      if (!res.ok) throw new Error("Backend not responding");

      const data = await res.json();

      if (data.status === "ok") {
        setBackendStatus("Connected");
        setStatus("Backend connected successfully.");
      } else {
        setBackendStatus("Not connected");
      }
    } catch (error) {
      setBackendStatus("Not connected");
      setStatus("Backend connect nahi ho raha. Backend run karo.");
    }
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Image file select karo: JPG, PNG, WEBP, BMP, TIFF.");
      e.target.value = "";
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);

    const url = URL.createObjectURL(file);

    setSourceFile(file);
    setPreviewUrl(url);
    setStatus("Image ready for export.");
    e.target.value = "";
  }

  function getBaseName(name) {
    return name.replace(/\.[^/.]+$/, "");
  }

  function getDownloadExtension(format) {
    if (format === "jpeg") return "jpg";
    if (format === "cdr") return "zip";
    return format;
  }

  function downloadBlob(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = fileName;

    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
  }

  async function exportFile() {
    if (!sourceFile) {
      alert("Pehle image select karo.");
      return;
    }

    try {
      setLoading(true);
      setStatus(`${selectedFormat.toUpperCase()} export processing...`);

      const formData = new FormData();

      formData.append("file", sourceFile);
      formData.append("export_format", selectedFormat);
      formData.append("quality", String(quality));
      formData.append("dpi", String(dpi));
      formData.append("color_mode", colorMode);
      formData.append("background_mode", backgroundMode);
      formData.append("custom_bg", customBg);
      formData.append("resize_mode", resizeMode);
      formData.append("custom_width", customWidth || "0");
      formData.append("custom_height", customHeight || "0");

      const res = await fetch(`${API_BASE}/import-export/export-image`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.detail || "Export failed");
      }

      const blob = await res.blob();

      const baseName = getBaseName(sourceFile.name);
      const ext = getDownloadExtension(selectedFormat);

      const fileName =
        selectedFormat === "cdr"
          ? `${baseName}_corel_compatible_files.zip`
          : `${baseName}_${dpi}dpi_${colorMode}.${ext}`;

      downloadBlob(blob, fileName);

      setBackendStatus("Connected");
      setStatus(`${selectedFormat.toUpperCase()} download complete.`);
    } catch (error) {
      alert("Export Error: " + error.message);
      setStatus("Export failed: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="preview-box">
      <div className="analysis-box">
        <h2>Export Panel</h2>
        <p>
          PNG, JPG, WEBP, PDF, TIFF, BMP, SVG, EPS, PSD aur Corel Compatible ZIP export.
        </p>

        <button className="upload-btn" onClick={checkBackend}>
          Check Backend Connection
        </button>

        <p>
          <b>Backend Status:</b> {backendStatus}
        </p>

        <button className="upload-btn" onClick={openPicker}>
          Select Image for Export
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp,.bmp,.gif,.tif,.tiff"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />

        <p>{loading ? "Processing... please wait" : status}</p>
      </div>

      {previewUrl && (
        <div className="analysis-box">
          <h3>Export Preview</h3>
          <img src={previewUrl} alt="Export Preview" />

          <p>
            <b>File:</b> {sourceFile?.name}
          </p>

          <p>
            <b>Size:</b>{" "}
            {sourceFile ? (sourceFile.size / 1024 / 1024).toFixed(2) : "0"} MB
          </p>
        </div>
      )}

      <div className="analysis-box">
        <h3>Choose Export Format</h3>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "12px",
          }}
        >
          {EXPORT_FORMATS.map((format) => (
            <div
              key={format.key}
              onClick={() => setSelectedFormat(format.key)}
              style={{
                border:
                  selectedFormat === format.key
                    ? "2px solid #d4af37"
                    : "1px solid rgba(255,255,255,0.25)",
                borderRadius: "12px",
                padding: "14px",
                cursor: "pointer",
                background:
                  selectedFormat === format.key
                    ? "rgba(212, 175, 55, 0.14)"
                    : "rgba(255,255,255,0.04)",
              }}
            >
              <h3>{format.label}</h3>
              <p>{format.note}</p>
            </div>
          ))}
        </div>

        {selectedFormat === "cdr" && (
          <p>
            <b>Note:</b> Real .CDR direct export possible nahi hai. Is option me ZIP download hoga:
            SVG + PDF + EPS + TIFF + PNG. CorelDRAW me SVG/PDF/EPS open karke .CDR save kar sakte ho.
          </p>
        )}

        {selectedFormat === "psd" && (
          <p>
            <b>Note:</b> Abhi flattened PSD export hoga. Layered PSD next upgrade me add hoga.
          </p>
        )}
      </div>

      <div className="analysis-box">
        <h3>Export Settings</h3>

        <label>Quality: {quality}%</label>
        <input
          type="range"
          min="10"
          max="100"
          value={quality}
          onChange={(e) => setQuality(Number(e.target.value))}
        />

        <label>DPI</label>
        <select value={dpi} onChange={(e) => setDpi(Number(e.target.value))}>
          <option value={72}>72 DPI - Web</option>
          <option value={150}>150 DPI - Normal Print</option>
          <option value={300}>300 DPI - Print Ready</option>
          <option value={600}>600 DPI - High Quality Print</option>
          <option value={1200}>1200 DPI - Large Format</option>
        </select>

        <label>Color Mode</label>
        <select value={colorMode} onChange={(e) => setColorMode(e.target.value)}>
          <option value="RGB">RGB</option>
          <option value="CMYK">CMYK</option>
          <option value="Grayscale">Grayscale</option>
        </select>

        <label>Background</label>
        <select
          value={backgroundMode}
          onChange={(e) => setBackgroundMode(e.target.value)}
        >
          <option value="transparent">Transparent</option>
          <option value="white">White</option>
          <option value="black">Black</option>
          <option value="custom">Custom Color</option>
        </select>

        {backgroundMode === "custom" && (
          <>
            <label>Custom Background Color</label>
            <input
              type="color"
              value={customBg}
              onChange={(e) => setCustomBg(e.target.value)}
            />
          </>
        )}
      </div>

      <div className="analysis-box">
        <h3>Resize Preset</h3>

        <select value={resizeMode} onChange={(e) => setResizeMode(e.target.value)}>
          <option value="original">Original Size</option>
          <option value="instagram-post">Instagram Post - 1080×1080</option>
          <option value="instagram-story">Instagram Story - 1080×1920</option>
          <option value="facebook-post">Facebook Post - 1200×630</option>
          <option value="youtube-thumbnail">YouTube Thumbnail - 1280×720</option>
          <option value="a4-300dpi">A4 Print - 2480×3508</option>
          <option value="a3-300dpi">A3 Print - 3508×4961</option>
          <option value="visiting-card-300dpi">Visiting Card - 1050×600</option>
          <option value="custom">Custom Size</option>
        </select>

        {resizeMode === "custom" && (
          <div style={{ marginTop: "12px" }}>
            <input
              type="number"
              placeholder="Width px"
              value={customWidth}
              onChange={(e) => setCustomWidth(e.target.value)}
            />

            <input
              type="number"
              placeholder="Height px"
              value={customHeight}
              onChange={(e) => setCustomHeight(e.target.value)}
              style={{ marginLeft: "10px" }}
            />
          </div>
        )}
      </div>

      <div className="analysis-box">
        <button className="upload-btn" onClick={exportFile} disabled={loading}>
          {loading ? "Exporting..." : `Download ${selectedFormat.toUpperCase()}`}
        </button>
      </div>
    </div>
  );
}

export default ExportPanel;