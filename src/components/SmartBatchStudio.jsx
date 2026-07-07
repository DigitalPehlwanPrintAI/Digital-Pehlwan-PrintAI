import { useRef, useState } from "react";

const API_BASE = "https://digital-pehlwan-printai.onrender.com";

const EXPORT_FORMATS = [
  "png",
  "jpg",
  "webp",
  "pdf",
  "tiff",
  "bmp",
  "svg",
  "eps",
  "psd",
  "cdr",
];

function SmartBatchStudio() {
  const fileInputRef = useRef(null);

  const [files, setFiles] = useState([]);
  const [processed, setProcessed] = useState([]);
  const [format, setFormat] = useState("png");
  const [dpi, setDpi] = useState(300);
  const [quality, setQuality] = useState(95);
  const [resizeMode, setResizeMode] = useState("original");
  const [customWidth, setCustomWidth] = useState("");
  const [customHeight, setCustomHeight] = useState("");
  const [backgroundMode, setBackgroundMode] = useState("transparent");
  const [operation, setOperation] = useState("convert");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("Batch files select karo.");

  function openPicker() {
    fileInputRef.current?.click();
  }

  function handleFiles(e) {
    const selected = Array.from(e.target.files || []).filter((file) =>
      file.type.startsWith("image/")
    );

    setFiles(selected);
    setProcessed([]);
    setProgress(0);
    setStatus(`${selected.length} images selected.`);
    e.target.value = "";
  }

  function getBaseName(name) {
    return name.replace(/\.[^/.]+$/, "");
  }

  function getExtension(selectedFormat) {
    if (selectedFormat === "cdr") return "zip";
    if (selectedFormat === "jpeg") return "jpg";
    return selectedFormat;
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

  async function removeBackground(file) {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${API_BASE}/smart-edit/remove-bg`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) throw new Error(await res.text());

    const blob = await res.blob();

    return new File([blob], file.name.replace(/\.[^/.]+$/, ".png"), {
      type: "image/png",
    });
  }

  async function smartRepair(file) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("mode", "auto");

    const res = await fetch(`${API_BASE}/smart-repair`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) throw new Error(await res.text());

    const blob = await res.blob();

    return new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
      type: "image/jpeg",
    });
  }

  async function exportSingle(file) {
    let workingFile = file;

    if (operation === "remove-bg") {
      workingFile = await removeBackground(file);
    }

    if (operation === "smart-repair") {
      workingFile = await smartRepair(file);
    }

    const formData = new FormData();

    formData.append("file", workingFile);
    formData.append("export_format", format);
    formData.append("quality", String(quality));
    formData.append("dpi", String(dpi));
    formData.append("color_mode", "RGB");
    formData.append("background_mode", backgroundMode);
    formData.append("custom_bg", "#ffffff");
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

    return {
      blob,
      name:
        format === "cdr"
          ? `${getBaseName(file.name)}_corel_compatible_files.zip`
          : `${getBaseName(file.name)}_${dpi}dpi.${getExtension(format)}`,
      original: file.name,
      success: true,
    };
  }

  async function processBatch() {
    if (files.length === 0) {
      alert("Pehle multiple images select karo.");
      return;
    }

    setLoading(true);
    setProcessed([]);
    setProgress(0);
    setStatus("Batch processing start...");

    const results = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      try {
        setStatus(`Processing ${i + 1}/${files.length}: ${file.name}`);

        const result = await exportSingle(file);
        results.push(result);
      } catch (error) {
        results.push({
          original: file.name,
          success: false,
          error: error.message,
        });
      }

      setProgress(Math.round(((i + 1) / files.length) * 100));
    }

    setProcessed(results);
    setLoading(false);
    setStatus("Batch processing complete.");
  }

  function downloadAll() {
    const successFiles = processed.filter((item) => item.success);

    if (successFiles.length === 0) {
      alert("Download ke liye processed files nahi hain.");
      return;
    }

    successFiles.forEach((item, index) => {
      setTimeout(() => {
        downloadBlob(item.blob, item.name);
      }, index * 350);
    });
  }

  function clearBatch() {
    setFiles([]);
    setProcessed([]);
    setProgress(0);
    setStatus("Batch cleared.");
  }

  const successCount = processed.filter((item) => item.success).length;
  const failedCount = processed.filter((item) => !item.success).length;

  return (
    <div className="preview-box">
      <div className="analysis-box">
        <h1>Smart Batch Studio</h1>
        <p>
          Multiple images ko ek साथ process karo: background remove, smart
          repair, resize, format convert aur print-ready export.
        </p>

        <button className="upload-btn" onClick={openPicker}>
          Select Multiple Images
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFiles}
          style={{ display: "none" }}
        />

        <p>{status}</p>

        <p>
          <b>Total Files:</b> {files.length}
        </p>
      </div>

      <div className="analysis-box">
        <h2>Batch Operation</h2>

        <label>Operation</label>
        <select value={operation} onChange={(e) => setOperation(e.target.value)}>
          <option value="convert">Only Convert / Export</option>
          <option value="remove-bg">Background Remove + Export</option>
          <option value="smart-repair">Smart Repair + Export</option>
        </select>

        <label>Export Format</label>
        <select value={format} onChange={(e) => setFormat(e.target.value)}>
          {EXPORT_FORMATS.map((item) => (
            <option key={item} value={item}>
              {item === "cdr" ? "Corel ZIP" : item.toUpperCase()}
            </option>
          ))}
        </select>

        <label>DPI</label>
        <select value={dpi} onChange={(e) => setDpi(Number(e.target.value))}>
          <option value={72}>72 DPI</option>
          <option value={150}>150 DPI</option>
          <option value={300}>300 DPI</option>
          <option value={600}>600 DPI</option>
          <option value={1200}>1200 DPI</option>
        </select>

        <label>Quality: {quality}%</label>
        <input
          type="range"
          min="10"
          max="100"
          value={quality}
          onChange={(e) => setQuality(Number(e.target.value))}
        />

        <label>Background</label>
        <select
          value={backgroundMode}
          onChange={(e) => setBackgroundMode(e.target.value)}
        >
          <option value="transparent">Transparent</option>
          <option value="white">White</option>
          <option value="black">Black</option>
        </select>

        <label>Resize Preset</label>
        <select value={resizeMode} onChange={(e) => setResizeMode(e.target.value)}>
          <option value="original">Original Size</option>
          <option value="instagram-post">Instagram Post 1080×1080</option>
          <option value="instagram-story">Instagram Story 1080×1920</option>
          <option value="facebook-post">Facebook Post 1200×630</option>
          <option value="youtube-thumbnail">YouTube Thumbnail 1280×720</option>
          <option value="a4-300dpi">A4 300 DPI</option>
          <option value="a3-300dpi">A3 300 DPI</option>
          <option value="visiting-card-300dpi">Visiting Card 300 DPI</option>
          <option value="custom">Custom Size</option>
        </select>

        {resizeMode === "custom" && (
          <>
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
            />
          </>
        )}

        <button className="upload-btn" onClick={processBatch} disabled={loading}>
          {loading ? "Processing..." : "Start Batch Process"}
        </button>

        <button className="upload-btn" onClick={downloadAll}>
          Download All
        </button>

        <button className="upload-btn" onClick={clearBatch}>
          Clear Batch
        </button>
      </div>

      <div className="analysis-box">
        <h2>Batch Progress</h2>

        <div
          style={{
            width: "100%",
            height: "24px",
            border: "1px solid #d4af37",
            borderRadius: "20px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: "100%",
              background: "#d4af37",
              transition: "0.3s",
            }}
          />
        </div>

        <p>{progress}% complete</p>

        <p>
          Success: {successCount} | Failed: {failedCount}
        </p>
      </div>

      {files.length > 0 && (
        <div className="analysis-box">
          <h2>Selected Files</h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: "12px",
            }}
          >
            {files.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                style={{
                  border: "1px solid #d4af37",
                  borderRadius: "10px",
                  padding: "10px",
                }}
              >
                <p>{file.name}</p>
                <p>{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {processed.length > 0 && (
        <div className="analysis-box">
          <h2>Batch Report</h2>

          {processed.map((item, index) => (
            <div
              key={`${item.original}-${index}`}
              style={{
                border: item.success ? "1px solid #4caf50" : "1px solid #ff5252",
                borderRadius: "10px",
                padding: "10px",
                marginBottom: "8px",
              }}
            >
              <p>
                <b>{item.original}</b>
              </p>

              {item.success ? (
                <p>✅ Ready: {item.name}</p>
              ) : (
                <p>❌ Failed: {item.error}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default SmartBatchStudio;