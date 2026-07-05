import { useState, useEffect } from "react";
import SelectiveBlur from "./components/SelectiveBlur.jsx";
import MagicEraser from "./components/MagicEraser.jsx";
import ObjectTextRemover from "./components/ObjectTextRemover.jsx";
import PickerStudio from "./components/PickerStudio.jsx";

const API_BASE = "http://127.0.0.1:8000";

function SmartEditing({ selectedFile, image }) {
  const [editImage, setEditImage] = useState(null);
  const [editBlob, setEditBlob] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);

  const [bgMode, setBgMode] = useState("color");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [gradientOne, setGradientOne] = useState("#ffffff");
  const [gradientTwo, setGradientTwo] = useState("#007bff");
  const [gradientDirection, setGradientDirection] = useState("horizontal");

  const [bgFile, setBgFile] = useState(null);
  const [bgPreview, setBgPreview] = useState(null);

  const [fitMode, setFitMode] = useState("fit");
  const [position, setPosition] = useState("center");
  const [zoom, setZoom] = useState(100);

  useEffect(() => {
    if (image) setEditImage(image);
  }, [image]);

  function getFile() {
    if (selectedFile) return selectedFile;
    alert("Please upload image first");
    return null;
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

  function getPositionXY(canvasW, canvasH, imgW, imgH) {
    let x = (canvasW - imgW) / 2;
    let y = (canvasH - imgH) / 2;

    if (position === "top") y = 0;
    if (position === "bottom") y = canvasH - imgH;
    if (position === "left") x = 0;
    if (position === "right") x = canvasW - imgW;
    if (position === "top-left") {
      x = 0;
      y = 0;
    }
    if (position === "top-right") {
      x = canvasW - imgW;
      y = 0;
    }
    if (position === "bottom-left") {
      x = 0;
      y = canvasH - imgH;
    }
    if (position === "bottom-right") {
      x = canvasW - imgW;
      y = canvasH - imgH;
    }

    return { x, y };
  }

  function drawGradient(ctx, width, height) {
    let gradient;

    if (gradientDirection === "vertical") {
      gradient = ctx.createLinearGradient(0, 0, 0, height);
    } else if (gradientDirection === "diagonal") {
      gradient = ctx.createLinearGradient(0, 0, width, height);
    } else {
      gradient = ctx.createLinearGradient(0, 0, width, 0);
    }

    gradient.addColorStop(0, gradientOne);
    gradient.addColorStop(1, gradientTwo);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  async function applyBackgroundStudio() {
    if (!editBlob) {
      alert("Please remove background first");
      return;
    }

    setLoading(true);

    try {
      const foreground = await loadImageFromBlob(editBlob);

      let canvasWidth = foreground.width;
      let canvasHeight = foreground.height;
      let background = null;

      if (bgMode === "image") {
        if (!bgFile) {
          alert("Please upload background image first");
          setLoading(false);
          return;
        }

        background = await loadImageFromFile(bgFile);
        canvasWidth = background.width;
        canvasHeight = background.height;
      }

      const canvas = document.createElement("canvas");
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      const ctx = canvas.getContext("2d");

      if (bgMode === "color") {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      }

      if (bgMode === "gradient") {
        drawGradient(ctx, canvasWidth, canvasHeight);
      }

      if (bgMode === "image" && background) {
        ctx.drawImage(background, 0, 0, canvasWidth, canvasHeight);
      }

      let fgW = foreground.width;
      let fgH = foreground.height;

      if (fitMode === "stretch") {
        fgW = canvasWidth;
        fgH = canvasHeight;
      } else {
        const fitScale = Math.min(
          canvasWidth / foreground.width,
          canvasHeight / foreground.height
        );

        const fillScale = Math.max(
          canvasWidth / foreground.width,
          canvasHeight / foreground.height
        );

        let scale = fitMode === "fill" ? fillScale : fitScale;
        scale = scale * (Number(zoom) / 100);

        fgW = foreground.width * scale;
        fgH = foreground.height * scale;
      }

      const { x, y } = getPositionXY(canvasWidth, canvasHeight, fgW, fgH);

      ctx.drawImage(foreground, x, y, fgW, fgH);

      canvas.toBlob((blob) => {
        setEditBlob(blob);
        setEditImage(URL.createObjectURL(blob));
        setLoading(false);
      }, "image/png");
    } catch (error) {
      alert("Background apply error: " + error.message);
      setLoading(false);
    }
  }

  function handleBackgroundUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    setBgFile(file);
    setBgPreview(URL.createObjectURL(file));
    setBgMode("image");
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
        <p>
          Remove Background • Background Studio • Selective Blur • Object/Text
          Remover • Picker Studio
        </p>

        {editImage && <img src={editImage} alt="Smart Editing Preview" />}

        {loading && <p>Processing... please wait</p>}

        <button className="upload-btn" onClick={handleRemoveBackground}>
          Remove Background
        </button>

        <hr />

        <h3>Background Studio</h3>

        <label>Background Mode</label>
        <select value={bgMode} onChange={(e) => setBgMode(e.target.value)}>
          <option value="color">Solid Color</option>
          <option value="gradient">Gradient</option>
          <option value="image">Upload Background Image</option>
        </select>

        {bgMode === "color" && (
          <>
            <label>Solid Background Color</label>
            <input
              type="color"
              value={bgColor}
              onChange={(e) => setBgColor(e.target.value)}
            />
          </>
        )}

        {bgMode === "gradient" && (
          <>
            <label>Gradient Color 1</label>
            <input
              type="color"
              value={gradientOne}
              onChange={(e) => setGradientOne(e.target.value)}
            />

            <label>Gradient Color 2</label>
            <input
              type="color"
              value={gradientTwo}
              onChange={(e) => setGradientTwo(e.target.value)}
            />

            <label>Gradient Direction</label>
            <select
              value={gradientDirection}
              onChange={(e) => setGradientDirection(e.target.value)}
            >
              <option value="horizontal">Horizontal</option>
              <option value="vertical">Vertical</option>
              <option value="diagonal">Diagonal</option>
            </select>
          </>
        )}

        {bgMode === "image" && (
          <>
            <label>Upload Background Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleBackgroundUpload}
            />

            {bgPreview && (
              <>
                <p>Background Preview</p>
                <img src={bgPreview} alt="Background Preview" />
              </>
            )}
          </>
        )}

        <hr />

        <h3>Foreground Fit / Position</h3>

        <label>Fit Mode</label>
        <select value={fitMode} onChange={(e) => setFitMode(e.target.value)}>
          <option value="fit">Fit - full image visible</option>
          <option value="fill">Fill - cover canvas</option>
          <option value="stretch">Stretch - full canvas</option>
        </select>

        <label>Position</label>
        <select value={position} onChange={(e) => setPosition(e.target.value)}>
          <option value="center">Center</option>
          <option value="top">Top</option>
          <option value="bottom">Bottom</option>
          <option value="left">Left</option>
          <option value="right">Right</option>
          <option value="top-left">Top Left</option>
          <option value="top-right">Top Right</option>
          <option value="bottom-left">Bottom Left</option>
          <option value="bottom-right">Bottom Right</option>
        </select>

        <label>Zoom: {zoom}%</label>
        <input
          type="range"
          min="20"
          max="200"
          value={zoom}
          onChange={(e) => setZoom(e.target.value)}
        />

        <button className="upload-btn" onClick={applyBackgroundStudio}>
          Apply Background Studio
        </button>

        <hr />

        <button className="upload-btn" onClick={handleAnalyze}>
          Analyze Object / Text / Logo
        </button>

        <button className="upload-btn" onClick={downloadImage}>
          Download Edited PNG
        </button>

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

      <div className="analysis-box">
        <PickerStudio selectedFile={selectedFile} image={image} />
      </div>

      <div className="analysis-box">
        <SelectiveBlur selectedFile={selectedFile} image={image} />
      </div>

      <div className="analysis-box">
        <MagicEraser selectedFile={selectedFile} image={image} />
      </div>

      <div className="analysis-box">
        <ObjectTextRemover selectedFile={selectedFile} image={image} />
      </div>
    </div>
  );
}

export default SmartEditing;