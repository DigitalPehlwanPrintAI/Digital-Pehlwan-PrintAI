import { useState, useEffect } from "react";

function SmartEditing({ selectedFile, image }) {
  const [editImage, setEditImage] = useState(null);
  const [editBlob, setEditBlob] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [bgColor, setBgColor] = useState("#ffffff");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (image) {
      setEditImage(image);
    }
  }, [image]);

  function getFile() {
    if (selectedFile) return selectedFile;
    alert("Please upload image first");
    return null;
  }

  async function handleRemoveBackground() {
    const file = getFile();
    if (!file) return;

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("http://127.0.0.1:8000/smart-edit/remove-bg", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errText = await response.text();
        alert("Remove Background Error: " + errText);
        return;
      }

      const blob = await response.blob();
      setEditBlob(blob);
      setEditImage(URL.createObjectURL(blob));
    } catch (error) {
      alert("Remove Background Error: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleReplaceBackground() {
    const file = editBlob
      ? new File([editBlob], "edited.png", { type: "image/png" })
      : getFile();

    if (!file) return;

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("color", bgColor);

      const response = await fetch("http://127.0.0.1:8000/smart-edit/replace-bg", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errText = await response.text();
        alert("Replace Background Error: " + errText);
        return;
      }

      const blob = await response.blob();
      setEditBlob(blob);
      setEditImage(URL.createObjectURL(blob));
    } catch (error) {
      alert("Replace Background Error: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAnalyze() {
    const file = getFile();
    if (!file) return;

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("http://127.0.0.1:8000/smart-edit/analyze", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errText = await response.text();
        alert("Analyze Error: " + errText);
        return;
      }

      const data = await response.json();
      setAnalysis(data);
    } catch (error) {
      alert("Analyze Error: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  function downloadImage() {
    if (!editBlob) {
      alert("Please edit image first");
      return;
    }

    const url = URL.createObjectURL(editBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "smart-editing-output.png";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="preview-box">
      <div className="analysis-box">
        <h2>Module 3: Smart Editing</h2>
        <p>Background Remove • Replace • Analyze • Download</p>

        {editImage && <img src={editImage} alt="Smart Editing Preview" />}

        {loading && <p>Processing... please wait</p>}

        <button className="upload-btn" onClick={handleRemoveBackground}>
          Remove Background
        </button>

        <label>Background Color</label>
        <input
          type="color"
          value={bgColor}
          onChange={(e) => setBgColor(e.target.value)}
        />

        <button className="upload-btn" onClick={handleReplaceBackground}>
          Replace Background
        </button>

        <button className="upload-btn" onClick={handleAnalyze}>
          Analyze Object / Text / Logo
        </button>

        <button className="upload-btn" onClick={downloadImage}>
          Download Edited PNG
        </button>
      </div>

      {analysis && (
        <div className="analysis-box">
          <h2>Smart Editing Analysis</h2>
          <p>Objects: {analysis.objects}</p>
          <p>Text Detected: {String(analysis.text_detected)}</p>
          <p>Logo Detected: {String(analysis.logos_detected)}</p>
          <p>Font: {analysis.font}</p>
          <p>
            Colors:{" "}
            {Array.isArray(analysis.colors)
              ? analysis.colors.join(", ")
              : analysis.colors}
          </p>
        </div>
      )}
    </div>
  );
}

export default SmartEditing;