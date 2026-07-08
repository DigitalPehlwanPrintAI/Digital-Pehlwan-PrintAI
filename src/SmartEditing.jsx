import { useState, useEffect } from "react";
import SelectiveBlur from "./components/SelectiveBlur.jsx";
import MagicEraser from "./components/MagicEraser.jsx";
import ObjectTextRemover from "./components/ObjectTextRemover.jsx";
import PickerStudio from "./components/PickerStudio.jsx";
import OCRFontDetector from "./components/OCRFontDetector.jsx";
import LogoStudio from "./components/LogoStudio.jsx";

const API_BASE =
  import.meta.env.VITE_API_BASE || "https://digital-pehlwan-printai.onrender.com";

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

  const [bgDesign, setBgDesign] = useState("none");
  const [bgFile, setBgFile] = useState(null);
  const [bgPreview, setBgPreview] = useState(null);

  const [fitMode, setFitMode] = useState("fit");
  const [position, setPosition] = useState("center");
  const [zoom, setZoom] = useState(100);

  const [bgFitMode, setBgFitMode] = useState("cover");
  const [bgPosition, setBgPosition] = useState("center");

  const [removeMode, setRemoveMode] = useState("ai-pro");
  const [removeTolerance, setRemoveTolerance] = useState(55);
  const [edgeFeather, setEdgeFeather] = useState(0);
  const [removeStatus, setRemoveStatus] = useState("");

  const [backendHealth, setBackendHealth] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (image) {
      setEditImage(image);
      setEditBlob(null);
      setAnalysis(null);
      setRemoveStatus("");
      setErrorMessage("");
    }
  }, [image]);

  function getFile() {
    if (selectedFile) return selectedFile;
    alert("Please upload image first");
    return null;
  }

  async function getResponseError(response) {
    try {
      const text = await response.text();

      try {
        const json = JSON.parse(text);

        if (json.detail) {
          if (typeof json.detail === "string") return json.detail;
          return JSON.stringify(json.detail);
        }

        return JSON.stringify(json);
      } catch {
        return text || `HTTP Error ${response.status}`;
      }
    } catch {
      return `HTTP Error ${response.status}`;
    }
  }

  async function checkBackgroundRemoverHealth() {
    setBackendHealth("Checking background remover...");
    setErrorMessage("");

    try {
      const response = await fetch(`${API_BASE}/smart-edit/remove-bg-health`);

      if (!response.ok) {
        const err = await getResponseError(response);
        setBackendHealth("Background remover health check failed");
        setErrorMessage(err);
        return;
      }

      const data = await response.json();

      if (data.status === "ok") {
        setBackendHealth(
          `Background remover ready | Model: ${data.rembg_model || "ai-pro"}`
        );
      } else {
        setBackendHealth("Background remover dependency issue");
        setErrorMessage(data.error || data.message || "Unknown health error");
      }
    } catch (error) {
      setBackendHealth("Backend health check error");
      setErrorMessage(error.message);
    }
  }

  function loadImageFromBlob(blob) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(blob);

      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Image load failed from blob"));
      };

      img.src = url;
    });
  }

  function loadImageFromFile(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Image load failed from file"));
      };

      img.src = url;
    });
  }

  async function removeBgAndGetBlob() {
    const file = getFile();
    if (!file) return null;

    setRemoveStatus("");
    setErrorMessage("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("mode", removeMode);
    formData.append("tolerance", String(removeTolerance));
    formData.append("feather", String(edgeFeather));

    const response = await fetch(`${API_BASE}/smart-edit/remove-bg`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorText = await getResponseError(response);
      setRemoveStatus("Background remove failed");
      setErrorMessage(errorText);
      alert("Remove Background Error: " + errorText);
      return null;
    }

    const contentType = response.headers.get("content-type") || "";

    if (!contentType.includes("image")) {
      const errorText = await getResponseError(response);
      setRemoveStatus("Invalid response from backend");
      setErrorMessage(errorText);
      alert("Invalid backend response: " + errorText);
      return null;
    }

    const backendMode = response.headers.get("X-PrintAI-BG-Mode") || removeMode;
    const backendStatus = response.headers.get("X-PrintAI-Status") || "success";

    setRemoveStatus(`Background remove: ${backendMode} | ${backendStatus}`);

    const serverBlob = await response.blob();

    if (!serverBlob || serverBlob.size === 0) {
      setRemoveStatus("Background remove failed");
      setErrorMessage("Empty image received from backend");
      alert("Remove Background Error: Empty image received from backend");
      return null;
    }

    const outputUrl = URL.createObjectURL(serverBlob);

    setEditBlob(serverBlob);
    setEditImage(outputUrl);

    return serverBlob;
  }

  async function handleRemoveBackground() {
    setLoading(true);
    setErrorMessage("");

    try {
      const result = await removeBgAndGetBlob();

      if (!result) {
        setErrorMessage((prev) => prev || "Background remove failed. Please try another image.");
      }
    } catch (error) {
      setRemoveStatus("Background remove failed");
      setErrorMessage(error.message);
      alert("Remove Background Error: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  function getPositionXY(canvasW, canvasH, imgW, imgH, selectedPosition) {
    let x = (canvasW - imgW) / 2;
    let y = (canvasH - imgH) / 2;

    if (selectedPosition === "top") y = 0;
    if (selectedPosition === "bottom") y = canvasH - imgH;
    if (selectedPosition === "left") x = 0;
    if (selectedPosition === "right") x = canvasW - imgW;

    if (selectedPosition === "top-left") {
      x = 0;
      y = 0;
    }

    if (selectedPosition === "top-right") {
      x = canvasW - imgW;
      y = 0;
    }

    if (selectedPosition === "bottom-left") {
      x = 0;
      y = canvasH - imgH;
    }

    if (selectedPosition === "bottom-right") {
      x = canvasW - imgW;
      y = canvasH - imgH;
    }

    return { x, y };
  }

  function drawImageWithFit(ctx, img, canvasW, canvasH, mode, selectedPosition) {
    let drawW = img.width;
    let drawH = img.height;

    if (mode === "stretch") {
      drawW = canvasW;
      drawH = canvasH;
    } else {
      const fitScale = Math.min(canvasW / img.width, canvasH / img.height);
      const fillScale = Math.max(canvasW / img.width, canvasH / img.height);
      const scale = mode === "cover" || mode === "fill" ? fillScale : fitScale;

      drawW = img.width * scale;
      drawH = img.height * scale;
    }

    const { x, y } = getPositionXY(
      canvasW,
      canvasH,
      drawW,
      drawH,
      selectedPosition
    );

    ctx.drawImage(img, x, y, drawW, drawH);
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

  function drawDesign(ctx, width, height) {
    if (bgDesign === "none") return;

    ctx.save();

    if (bgDesign === "dots") {
      ctx.fillStyle = "rgba(0,0,0,0.12)";

      for (let x = 20; x < width; x += 40) {
        for (let y = 20; y < height; y += 40) {
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    if (bgDesign === "grid") {
      ctx.strokeStyle = "rgba(0,0,0,0.12)";
      ctx.lineWidth = 1;

      for (let x = 0; x < width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      for (let y = 0; y < height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    }

    if (bgDesign === "diagonal") {
      ctx.strokeStyle = "rgba(0,0,0,0.14)";
      ctx.lineWidth = 3;

      for (let i = -height; i < width; i += 45) {
        ctx.beginPath();
        ctx.moveTo(i, height);
        ctx.lineTo(i + height, 0);
        ctx.stroke();
      }
    }

    if (bgDesign === "soft-circles") {
      for (let i = 0; i < 12; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const r = Math.min(width, height) * (0.08 + Math.random() * 0.12);
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);

        g.addColorStop(0, "rgba(255,255,255,0.35)");
        g.addColorStop(1, "rgba(255,255,255,0)");

        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  async function applyBackgroundStudio() {
    setLoading(true);
    setErrorMessage("");

    try {
      const foregroundBlob = editBlob || (await removeBgAndGetBlob());

      if (!foregroundBlob) {
        setLoading(false);
        return;
      }

      const foreground = await loadImageFromBlob(foregroundBlob);

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

      const ctx = canvas.getContext("2d", { alpha: true });
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      if (bgMode === "color") {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      }

      if (bgMode === "gradient") {
        drawGradient(ctx, canvasWidth, canvasHeight);
      }

      if (bgMode === "image" && background) {
        drawImageWithFit(
          ctx,
          background,
          canvasWidth,
          canvasHeight,
          bgFitMode,
          bgPosition
        );
      }

      drawDesign(ctx, canvasWidth, canvasHeight);

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

      const { x, y } = getPositionXY(canvasWidth, canvasHeight, fgW, fgH, position);
      ctx.drawImage(foreground, x, y, fgW, fgH);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            alert("Background apply failed");
            setErrorMessage("Background apply failed");
            setLoading(false);
            return;
          }

          setEditBlob(blob);
          setEditImage(URL.createObjectURL(blob));
          setLoading(false);
        },
        "image/png",
        1
      );
    } catch (error) {
      alert("Background apply error: " + error.message);
      setErrorMessage(error.message);
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
    setErrorMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${API_BASE}/smart-edit/analyze`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const err = await getResponseError(response);
        setErrorMessage(err);
        alert("Analyze Error: " + err);
        return;
      }

      const data = await response.json();
      setAnalysis(data);
    } catch (error) {
      setErrorMessage(error.message);
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
          Remove Background • Background Studio • Picker Studio • Logo Studio •
          OCR + Font Detection • Selective Blur • Magic Eraser • Object/Text
          Remover
        </p>

        {editImage && <img src={editImage} alt="Smart Editing Preview" />}

        {loading && <p>Processing... please wait</p>}
        {removeStatus && <p>{removeStatus}</p>}
        {backendHealth && <p>{backendHealth}</p>}

        {errorMessage && (
          <div
            style={{
              background: "#fff3f3",
              color: "#b00020",
              border: "1px solid #ffb4b4",
              padding: "10px",
              borderRadius: "8px",
              marginTop: "10px",
              whiteSpace: "pre-wrap",
            }}
          >
            {errorMessage}
          </div>
        )}

        <h3>Background Remove Engine</h3>

        <button
          className="upload-btn"
          onClick={checkBackgroundRemoverHealth}
          disabled={loading}
        >
          Check Background Remover Health
        </button>

        <label>Remove Mode</label>
        <select value={removeMode} onChange={(e) => setRemoveMode(e.target.value)}>
          <option value="ai-pro">AI Pro Remove - best quality</option>
          <option value="fast">Fast Remove - plain white/light background</option>
        </select>

        <label>Background Tolerance: {removeTolerance}</label>
        <input
          type="range"
          min="5"
          max="140"
          value={removeTolerance}
          onChange={(e) => setRemoveTolerance(Number(e.target.value))}
        />

        <label>Edge Smooth / Feather: {edgeFeather}</label>
        <input
          type="range"
          min="0"
          max="4"
          value={edgeFeather}
          onChange={(e) => setEdgeFeather(Number(e.target.value))}
        />

        <button className="upload-btn" onClick={handleRemoveBackground} disabled={loading}>
          {loading ? "Removing Background..." : "Remove Background"}
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
            <label>Upload Your Own Background Image</label>
            <input type="file" accept="image/*" onChange={handleBackgroundUpload} />

            {bgPreview && (
              <>
                <p>Background Preview</p>
                <img src={bgPreview} alt="Background Preview" />
              </>
            )}

            <label>Background Image Fit</label>
            <select value={bgFitMode} onChange={(e) => setBgFitMode(e.target.value)}>
              <option value="cover">Cover - fill full background</option>
              <option value="fit">Fit - full background visible</option>
              <option value="stretch">Stretch - force full canvas</option>
            </select>

            <label>Background Image Position</label>
            <select value={bgPosition} onChange={(e) => setBgPosition(e.target.value)}>
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
          </>
        )}

        <label>Background Design</label>
        <select value={bgDesign} onChange={(e) => setBgDesign(e.target.value)}>
          <option value="none">No Design</option>
          <option value="dots">Dots Pattern</option>
          <option value="grid">Grid Pattern</option>
          <option value="diagonal">Diagonal Lines</option>
          <option value="soft-circles">Soft Circles</option>
        </select>

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

        <button className="upload-btn" onClick={applyBackgroundStudio} disabled={loading}>
          Apply Background Studio
        </button>

        <button className="upload-btn" onClick={downloadImage}>
          Download Edited PNG
        </button>

        <hr />

        <button className="upload-btn" onClick={handleAnalyze}>
          Analyze Object / Text / Logo
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
        <LogoStudio selectedFile={selectedFile} image={image} />
      </div>

      <div className="analysis-box">
        <OCRFontDetector selectedFile={selectedFile} image={image} />
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