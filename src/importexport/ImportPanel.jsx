import { useRef, useState } from "react";

const SUPPORTED_FORMATS = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/bmp",
  "image/gif",
  "image/tiff",
  "image/svg+xml",
  "application/pdf",
  "application/postscript",
  "application/illustrator",
  "application/octet-stream",
];

const SUPPORTED_EXTENSIONS = [
  "jpg",
  "jpeg",
  "png",
  "webp",
  "bmp",
  "gif",
  "tif",
  "tiff",
  "svg",
  "pdf",
  "psd",
  "ai",
  "eps",
  "heic",
  "avif",
];

function ImportPanel() {
  const fileInputRef = useRef(null);

  const [files, setFiles] = useState([]);
  const [activeFile, setActiveFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [status, setStatus] = useState("Import files to start.");

  function getExtension(fileName) {
    return fileName.split(".").pop().toLowerCase();
  }

  function isSupportedFile(file) {
    const ext = getExtension(file.name);
    return SUPPORTED_EXTENSIONS.includes(ext);
  }

  function formatBytes(bytes) {
    if (!bytes) return "0 B";

    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const value = bytes / Math.pow(1024, i);

    return `${value.toFixed(2)} ${sizes[i]}`;
  }

  function getFileCategory(file) {
    const ext = getExtension(file.name);

    if (["jpg", "jpeg", "png", "webp", "bmp", "gif", "tif", "tiff", "heic", "avif"].includes(ext)) {
      return "Image";
    }

    if (ext === "pdf") return "PDF";
    if (ext === "svg") return "SVG Vector";
    if (ext === "psd") return "Photoshop PSD";
    if (ext === "ai") return "Adobe Illustrator";
    if (ext === "eps") return "EPS Vector";

    return "Unknown";
  }

  function getImportSupportNote(file) {
    const ext = getExtension(file.name);

    if (["jpg", "jpeg", "png", "webp", "bmp", "gif", "tif", "tiff"].includes(ext)) {
      return "Full preview supported";
    }

    if (ext === "svg") {
      return "SVG preview supported";
    }

    if (ext === "pdf") {
      return "PDF import listed. Preview/export engine next step में add होगा.";
    }

    if (["psd", "ai", "eps", "heic", "avif"].includes(ext)) {
      return "Advanced import listed. Parser/converter next phase में add होगा.";
    }

    return "Limited support";
  }

  function createFileRecord(file) {
    const url = URL.createObjectURL(file);
    const ext = getExtension(file.name);

    return {
      id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
      file,
      name: file.name,
      type: file.type || "unknown",
      extension: ext,
      category: getFileCategory(file),
      size: file.size,
      sizeText: formatBytes(file.size),
      previewUrl: url,
      supportNote: getImportSupportNote(file),
      importedAt: new Date().toLocaleString(),
      width: null,
      height: null,
    };
  }

  function loadImageDimensions(record) {
    return new Promise((resolve) => {
      if (!["jpg", "jpeg", "png", "webp", "bmp", "gif", "tif", "tiff", "svg"].includes(record.extension)) {
        resolve(record);
        return;
      }

      const img = new Image();

      img.onload = () => {
        resolve({
          ...record,
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
      };

      img.onerror = () => {
        resolve(record);
      };

      img.src = record.previewUrl;
    });
  }

  async function handleFiles(fileList) {
    const incomingFiles = Array.from(fileList);

    if (incomingFiles.length === 0) return;

    const supported = incomingFiles.filter(isSupportedFile);
    const rejected = incomingFiles.filter((file) => !isSupportedFile(file));

    if (supported.length === 0) {
      alert("Supported file upload karo: JPG, PNG, WEBP, SVG, PDF, PSD, AI, EPS, TIFF etc.");
      return;
    }

    const records = supported.map(createFileRecord);
    const recordsWithDimensions = await Promise.all(records.map(loadImageDimensions));

    setFiles((prev) => [...recordsWithDimensions, ...prev]);
    setActiveFile(recordsWithDimensions[0]);

    if (rejected.length > 0) {
      setStatus(`${supported.length} file imported. ${rejected.length} unsupported file skipped.`);
    } else {
      setStatus(`${supported.length} file imported successfully.`);
    }
  }

  function handleInputChange(e) {
    handleFiles(e.target.files);
    e.target.value = "";
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();

    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  }

  function removeFile(id) {
    setFiles((prev) => {
      const fileToRemove = prev.find((item) => item.id === id);

      if (fileToRemove?.previewUrl) {
        URL.revokeObjectURL(fileToRemove.previewUrl);
      }

      const updated = prev.filter((item) => item.id !== id);

      if (activeFile?.id === id) {
        setActiveFile(updated[0] || null);
      }

      return updated;
    });

    setStatus("File removed.");
  }

  function clearAllFiles() {
    files.forEach((item) => {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    });

    setFiles([]);
    setActiveFile(null);
    setStatus("All imported files cleared.");
  }

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  function renderPreview() {
    if (!activeFile) {
      return (
        <div className="analysis-box">
          <h3>No file selected</h3>
          <p>Import panel se file upload karo.</p>
        </div>
      );
    }

    const imagePreviewExtensions = ["jpg", "jpeg", "png", "webp", "bmp", "gif", "tif", "tiff", "svg"];

    if (imagePreviewExtensions.includes(activeFile.extension)) {
      return (
        <div className="analysis-box">
          <h3>File Preview</h3>
          <img src={activeFile.previewUrl} alt={activeFile.name} />

          <p><b>Name:</b> {activeFile.name}</p>
          <p><b>Type:</b> {activeFile.category}</p>
          <p><b>Format:</b> {activeFile.extension.toUpperCase()}</p>
          <p><b>Size:</b> {activeFile.sizeText}</p>

          {activeFile.width && activeFile.height && (
            <p>
              <b>Dimensions:</b> {activeFile.width}px × {activeFile.height}px
            </p>
          )}

          <p><b>Support:</b> {activeFile.supportNote}</p>
        </div>
      );
    }

    return (
      <div className="analysis-box">
        <h3>File Preview</h3>

        <div
          style={{
            padding: "30px",
            border: "2px dashed #d4af37",
            borderRadius: "12px",
            textAlign: "center",
          }}
        >
          <h2>{activeFile.extension.toUpperCase()}</h2>
          <p>{activeFile.category}</p>
        </div>

        <p><b>Name:</b> {activeFile.name}</p>
        <p><b>Type:</b> {activeFile.category}</p>
        <p><b>Format:</b> {activeFile.extension.toUpperCase()}</p>
        <p><b>Size:</b> {activeFile.sizeText}</p>
        <p><b>Support:</b> {activeFile.supportNote}</p>
      </div>
    );
  }

  return (
    <div className="preview-box">
      <div className="analysis-box">
        <h2>Import Panel</h2>
        <p>
          JPG, PNG, WEBP, BMP, TIFF, GIF, SVG, PDF, PSD, AI, EPS, HEIC, AVIF files import karo.
        </p>

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{
            border: dragActive ? "3px solid #d4af37" : "2px dashed #d4af37",
            borderRadius: "14px",
            padding: "30px",
            textAlign: "center",
            marginBottom: "20px",
            background: dragActive ? "rgba(212, 175, 55, 0.12)" : "transparent",
          }}
        >
          <h3>Drag & Drop Files Here</h3>
          <p>या button से select करो</p>

          <button className="upload-btn" onClick={openFilePicker}>
            Import Files
          </button>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".jpg,.jpeg,.png,.webp,.bmp,.gif,.tif,.tiff,.svg,.pdf,.psd,.ai,.eps,.heic,.avif"
            onChange={handleInputChange}
            style={{ display: "none" }}
          />
        </div>

        <p>{status}</p>

        <h3>Supported Import Formats</h3>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {SUPPORTED_EXTENSIONS.map((ext) => (
            <span
              key={ext}
              style={{
                border: "1px solid #d4af37",
                borderRadius: "20px",
                padding: "6px 12px",
                fontSize: "14px",
              }}
            >
              {ext.toUpperCase()}
            </span>
          ))}
        </div>

        {files.length > 0 && (
          <>
            <hr />

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button className="upload-btn" onClick={clearAllFiles}>
                Clear All Imports
              </button>

              <button
                className="upload-btn"
                onClick={() => {
                  if (activeFile) {
                    alert(
                      `Selected file:\n${activeFile.name}\n${activeFile.category}\n${activeFile.sizeText}`
                    );
                  }
                }}
              >
                File Info
              </button>
            </div>
          </>
        )}
      </div>

      {renderPreview()}

      {files.length > 0 && (
        <div className="analysis-box">
          <h3>Imported Files</h3>

          {files.map((item) => (
            <div
              key={item.id}
              style={{
                border: activeFile?.id === item.id ? "2px solid #d4af37" : "1px solid #555",
                borderRadius: "10px",
                padding: "12px",
                marginBottom: "10px",
                cursor: "pointer",
              }}
              onClick={() => setActiveFile(item)}
            >
              <p><b>{item.name}</b></p>
              <p>
                {item.category} • {item.extension.toUpperCase()} • {item.sizeText}
              </p>

              {item.width && item.height && (
                <p>
                  {item.width}px × {item.height}px
                </p>
              )}

              <p>{item.supportNote}</p>

              <button
                className="upload-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(item.id);
                }}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ImportPanel;