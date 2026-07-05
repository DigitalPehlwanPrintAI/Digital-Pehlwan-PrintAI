import { useState, useEffect } from "react";

const API_BASE = "http://127.0.0.1:8000";

function SmartEditing({ selectedFile, image }) {
  const [editImage, setEditImage] = useState(null);
  const [editBlob, setEditBlob] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [bgColor, setBgColor] = useState("#ffffff");
  const [bgFile, setBgFile] = useState(null);
  const [bgPreview, setBgPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (image) setEditImage(image);
  }, [image]);

  function getFile() {
    if (selectedFile) return selectedFile;
    alert("Please upload image first");
    return null;
  }

  async function handleRemoveBackground() {
    const file = getFile();
    if (!file) return;

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${API_BASE}/smart-edit/remove-bg`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        alert("Remove Background Error: " + (await response.text()));
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

  function loadImageFromBlob(blob) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(blob);
    });
  }

  function loadImageFromFile(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  async function replaceWithColor() {
    if (!editBlob) {
      alert("Please remove background first");
      return;
    }

    setLoading(true);

    try {
      const foreground = await loadImageFromBlob(editBlob);

      const canvas = document.createElement("canvas");
      canvas.width = foreground.width;
      canvas.height = foreground.height;

      const ctx = canvas.getContext("2d");
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(foreground, 0, 0);

      canvas.toBlob((blob) => {
        setEditBlob(blob);
        setEditImage(URL.createObjectURL(blob));
        setLoading(false);
      }, "image/png");
    } catch (error) {
      alert("Color background replace error: " + error.message);
      setLoading(false);
    }
  }

  async function replaceWithBackgroundImage() {
    if (!editBlob) {
      alert("Please remove background first");
      return;
    }

    if (!bgFile) {
      alert("Please upload background image first");
      return;
    }

    setLoading(true);

    try {
      const foreground = await loadImageFromBlob(editBlob);
      const background = await loadImageFromFile(bgFile);

      /*
        IMPORTANT:
        Canvas ka size background image ke original size jaisa rahega.
        Isse uploaded background image crop/stretch nahi hogi.
      */
      const canvas = document.createElement("canvas");
      canvas.width = background.width;
      canvas.height = background.height;

      const ctx = canvas.getContext("2d");

      // Background image as it is
      ctx.drawImage(background, 0, 0, background.width, background.height);

      /*
        Foreground ko background ke andar fit karenge,
        but foreground ka ratio distort nahi hoga.
      */
      const maxForegroundWidth = background.width * 0.8;
      const maxForegroundHeight = background.height * 0.8;

      const scale = Math.min(
        maxForegroundWidth / foreground.width,
        maxForegroundHeight / foreground.height
      );

      const newForegroundWidth = foreground.width * scale;
      const newForegroundHeight = foreground.height * scale;

      const x = (background.width - newForegroundWidth) / 2;
      const y = (background.height - newForegroundHeight) / 2;

      ctx.drawImage(
        foreground,
        x,
        y,
        newForegroundWidth,
        newForegroundHeight
      );

      canvas.toBlob((blob) => {
        setEditBlob(blob);
        setEditImage(URL.createObjectURL(blob));
        setLoading(false);
      }, "image/png");
    } catch (error) {
      alert("Background image replace error: " + error.message);
      setLoading(false);
    }
  }

  function handleBackgroundUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    setBgFile(file);
    setBgPreview(URL.createObjectURL(file));
  }

  async function handleAnalyze() {
    const file = getFile();
    if (!file) return;

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${API_BASE}/smart-edit/analyze`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        alert("Analyze Error: " + (await response.text()));
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
        <p>Remove BG • Color BG • Image BG • Analyze • Download</p>

        {editImage && <img src={editImage} alt="Smart Editing Preview" />}

        {loading && <p>Processing... please wait</p>}

        <button className="upload-btn" onClick={handleRemoveBackground}>
          Remove Background
        </button>

        <hr />

        <h3>Replace Background with Color</h3>

        <label>Background Color</label>
        <input
          type="color"
          value={bgColor}
          onChange={(e) => setBgColor(e.target.value)}
        />

        <button className="upload-btn" onClick={replaceWithColor}>
          Apply Color Background
        </button>

        <hr />

        <h3>Replace Background with Image</h3>

        <input type="file" accept="image/*" onChange={handleBackgroundUpload} />

        {bgPreview && (
          <>
            <p>Background Preview</p>
            <img src={bgPreview} alt="Background Preview" />
          </>
        )}

        <button className="upload-btn" onClick={replaceWithBackgroundImage}>
          Apply Uploaded Background
        </button>

        <hr />

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