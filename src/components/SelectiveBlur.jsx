import { useEffect, useRef, useState } from "react";

const API_BASE = "http://127.0.0.1:8000";

function SelectiveBlur({ selectedFile, image }) {
  const canvasRef = useRef(null);
  const originalCanvasRef = useRef(null);
  const resultCanvasRef = useRef(null);
  const maskCanvasRef = useRef(null);

  const isDrawingRef = useRef(false);
  const lastPointRef = useRef(null);
  const startPointRef = useRef(null);
  const selectionRectRef = useRef(null);

  const [tool, setTool] = useState("area");
  const [blurAmount, setBlurAmount] = useState(18);
  const [brushSize, setBrushSize] = useState(45);
  const [status, setStatus] = useState("Upload image first");
  const [isReady, setIsReady] = useState(false);
  const [hasResult, setHasResult] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (selectedFile) {
      loadImage(URL.createObjectURL(selectedFile));
    } else if (image) {
      loadImage(image);
    }
  }, [selectedFile, image]);

  function loadImage(url) {
    const img = new Image();

    img.onload = () => {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      const maxWidth = 1100;
      const scale = img.width > maxWidth ? maxWidth / img.width : 1;

      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      const originalCanvas = document.createElement("canvas");
      originalCanvas.width = canvas.width;
      originalCanvas.height = canvas.height;
      originalCanvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      originalCanvasRef.current = originalCanvas;

      const resultCanvas = document.createElement("canvas");
      resultCanvas.width = canvas.width;
      resultCanvas.height = canvas.height;
      resultCanvas.getContext("2d").drawImage(originalCanvas, 0, 0);
      resultCanvasRef.current = resultCanvas;

      const maskCanvas = document.createElement("canvas");
      maskCanvas.width = canvas.width;
      maskCanvas.height = canvas.height;
      maskCanvasRef.current = maskCanvas;

      selectionRectRef.current = null;
      setIsReady(true);
      setHasResult(false);
      setStatus("Image ready. Area select करो या Auto Background Blur use करो.");

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(resultCanvas, 0, 0);
    };

    img.onerror = () => alert("Image load nahi ho paayi");
    img.src = url;
  }

  function getPoint(e) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function render(showRect = true) {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const resultCanvas = resultCanvasRef.current;

    if (!canvas || !ctx || !resultCanvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(resultCanvas, 0, 0);

    if (showRect && selectionRectRef.current) {
      const r = selectionRectRef.current;
      ctx.save();
      ctx.strokeStyle = "#ffd700";
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 6]);
      ctx.strokeRect(r.x, r.y, r.w, r.h);
      ctx.restore();
    }
  }

  function makeBlurredCanvas(sourceCanvas) {
    const blurCanvas = document.createElement("canvas");
    blurCanvas.width = sourceCanvas.width;
    blurCanvas.height = sourceCanvas.height;

    const blurCtx = blurCanvas.getContext("2d");
    blurCtx.filter = `blur(${blurAmount}px)`;
    blurCtx.drawImage(sourceCanvas, 0, 0);

    return blurCanvas;
  }

  function applyMaskBlurToResult(maskCanvas) {
    const resultCanvas = resultCanvasRef.current;
    const resultCtx = resultCanvas.getContext("2d");

    const blurredCanvas = makeBlurredCanvas(resultCanvas);

    const maskedBlurCanvas = document.createElement("canvas");
    maskedBlurCanvas.width = resultCanvas.width;
    maskedBlurCanvas.height = resultCanvas.height;

    const maskedCtx = maskedBlurCanvas.getContext("2d");
    maskedCtx.drawImage(blurredCanvas, 0, 0);
    maskedCtx.globalCompositeOperation = "destination-in";
    maskedCtx.drawImage(maskCanvas, 0, 0);

    resultCtx.drawImage(maskedBlurCanvas, 0, 0);
  }

  function paintBrush(point, erase = false) {
    const maskCanvas = maskCanvasRef.current;
    const maskCtx = maskCanvas.getContext("2d");

    maskCtx.save();

    if (erase) {
      maskCtx.globalCompositeOperation = "destination-out";
    } else {
      maskCtx.globalCompositeOperation = "source-over";
      maskCtx.fillStyle = "white";
    }

    maskCtx.beginPath();
    maskCtx.arc(point.x, point.y, brushSize / 2, 0, Math.PI * 2);
    maskCtx.fill();
    maskCtx.restore();

    render(false);
  }

  function paintBrushLine(from, to, erase = false) {
    const distance = Math.hypot(to.x - from.x, to.y - from.y);
    const steps = Math.max(1, Math.ceil(distance / 3));

    for (let i = 0; i <= steps; i++) {
      const x = from.x + ((to.x - from.x) * i) / steps;
      const y = from.y + ((to.y - from.y) * i) / steps;
      paintBrush({ x, y }, erase);
    }
  }

  function handleMouseDown(e) {
    if (!isReady || processing) return;

    const point = getPoint(e);
    isDrawingRef.current = true;
    startPointRef.current = point;
    lastPointRef.current = point;

    if (tool === "brush") paintBrush(point, false);
    if (tool === "eraser") paintBrush(point, true);
  }

  function handleMouseMove(e) {
    if (!isReady || !isDrawingRef.current || processing) return;

    const point = getPoint(e);

    if (tool === "area" || tool === "protected-bg") {
      const start = startPointRef.current;

      selectionRectRef.current = {
        x: Math.min(start.x, point.x),
        y: Math.min(start.y, point.y),
        w: Math.abs(point.x - start.x),
        h: Math.abs(point.y - start.y),
      };

      render(true);
    }

    if (tool === "brush") {
      paintBrushLine(lastPointRef.current, point, false);
      lastPointRef.current = point;
    }

    if (tool === "eraser") {
      paintBrushLine(lastPointRef.current, point, true);
      lastPointRef.current = point;
    }
  }

  function handleMouseUp() {
    isDrawingRef.current = false;
    lastPointRef.current = null;
    startPointRef.current = null;
  }

  function applySelectedBlur() {
    if (!isReady) return;

    const maskCanvas = maskCanvasRef.current;
    const maskCtx = maskCanvas.getContext("2d");

    if (tool === "area") {
      const r = selectionRectRef.current;

      if (!r || r.w < 5 || r.h < 5) {
        alert("Pehle area select karo");
        return;
      }

      maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
      maskCtx.fillStyle = "white";
      maskCtx.fillRect(r.x, r.y, r.w, r.h);

      applyMaskBlurToResult(maskCanvas);

      maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
      selectionRectRef.current = null;

      setHasResult(true);
      setStatus("Selected area blur applied.");
      render(false);
      return;
    }

    if (tool === "brush" || tool === "eraser") {
      applyMaskBlurToResult(maskCanvas);
      maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);

      setHasResult(true);
      setStatus("Brush blur applied.");
      render(false);
      return;
    }

    alert("Selected Area Blur ya Brush Blur mode select karo");
  }

  function applyProtectedBackgroundBlur() {
    if (!isReady) return;

    const r = selectionRectRef.current;

    if (!r || r.w < 5 || r.h < 5) {
      alert("Subject/object ke around rectangle select karo");
      return;
    }

    const resultCanvas = resultCanvasRef.current;
    const resultCtx = resultCanvas.getContext("2d");
    const originalCanvas = originalCanvasRef.current;

    const blurredCanvas = makeBlurredCanvas(originalCanvas);

    resultCtx.clearRect(0, 0, resultCanvas.width, resultCanvas.height);
    resultCtx.drawImage(blurredCanvas, 0, 0);

    resultCtx.drawImage(
      originalCanvas,
      r.x,
      r.y,
      r.w,
      r.h,
      r.x,
      r.y,
      r.w,
      r.h
    );

    selectionRectRef.current = null;

    setHasResult(true);
    setStatus("Protected background blur applied. Selected subject/object clear है.");
    render(false);
  }

  async function getSourceFileForBackend() {
    if (selectedFile) return selectedFile;

    if (image) {
      const res = await fetch(image);
      const blob = await res.blob();
      return new File([blob], "image.png", { type: blob.type || "image/png" });
    }

    return null;
  }

  async function applyAIBackgroundBlur() {
    if (!isReady) return;

    setProcessing(true);
    setStatus("AI auto background blur processing...");

    try {
      const sourceFile = await getSourceFileForBackend();

      if (!sourceFile) {
        alert("Please upload image first");
        setProcessing(false);
        return;
      }

      const formData = new FormData();
      formData.append("file", sourceFile);

      const response = await fetch(`${API_BASE}/smart-edit/remove-bg`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        alert("AI background blur error: " + (await response.text()));
        setProcessing(false);
        return;
      }

      const foregroundBlob = await response.blob();
      const foregroundUrl = URL.createObjectURL(foregroundBlob);
      const foregroundImg = new Image();

      foregroundImg.onload = () => {
        const originalCanvas = originalCanvasRef.current;
        const resultCanvas = resultCanvasRef.current;
        const resultCtx = resultCanvas.getContext("2d");

        const blurredBg = makeBlurredCanvas(originalCanvas);

        resultCtx.clearRect(0, 0, resultCanvas.width, resultCanvas.height);
        resultCtx.drawImage(blurredBg, 0, 0);
        resultCtx.drawImage(foregroundImg, 0, 0, resultCanvas.width, resultCanvas.height);

        setHasResult(true);
        setProcessing(false);
        setStatus("AI auto background blur applied.");
        render(false);
      };

      foregroundImg.onerror = () => {
        alert("Foreground image load nahi hui");
        setProcessing(false);
      };

      foregroundImg.src = foregroundUrl;
    } catch (error) {
      alert("AI background blur error: " + error.message);
      setProcessing(false);
    }
  }

  function applyFullImageBlur() {
    if (!isReady) return;

    const resultCanvas = resultCanvasRef.current;
    const resultCtx = resultCanvas.getContext("2d");
    const blurredCanvas = makeBlurredCanvas(resultCanvas);

    resultCtx.clearRect(0, 0, resultCanvas.width, resultCanvas.height);
    resultCtx.drawImage(blurredCanvas, 0, 0);

    setHasResult(true);
    setStatus("Full image blur applied.");
    render(false);
  }

  function clearAllBlur() {
    if (!isReady) return;

    const originalCanvas = originalCanvasRef.current;
    const resultCanvas = resultCanvasRef.current;
    const resultCtx = resultCanvas.getContext("2d");
    const maskCanvas = maskCanvasRef.current;
    const maskCtx = maskCanvas.getContext("2d");

    resultCtx.clearRect(0, 0, resultCanvas.width, resultCanvas.height);
    resultCtx.drawImage(originalCanvas, 0, 0);

    maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
    selectionRectRef.current = null;

    setHasResult(false);
    setStatus("Blur cleared.");
    render(false);
  }

  function downloadBlurredImage() {
    if (!isReady || !hasResult) {
      alert("Pehle blur apply karo");
      return;
    }

    const resultCanvas = resultCanvasRef.current;
    const url = resultCanvas.toDataURL("image/png");

    const link = document.createElement("a");
    link.href = url;
    link.download = "blur-result.png";
    link.click();
  }

  return (
    <div className="analysis-box">
      <h2>Selective Blur Tool</h2>
      <p>Area Blur, Brush Blur, AI Auto Background Blur, Protected Background Blur.</p>

      {!isReady && <p>Please upload image first in main upload area.</p>}

      <label>Blur Mode</label>
      <select value={tool} onChange={(e) => setTool(e.target.value)}>
        <option value="area">Selected Area Blur</option>
        <option value="protected-bg">Protected Background Blur</option>
        <option value="brush">Brush Blur</option>
        <option value="eraser">Eraser</option>
      </select>

      <label>Blur Amount: {blurAmount}px</label>
      <input
        type="range"
        min="2"
        max="45"
        value={blurAmount}
        onChange={(e) => setBlurAmount(Number(e.target.value))}
      />

      <label>Brush Size: {brushSize}px</label>
      <input
        type="range"
        min="10"
        max="180"
        value={brushSize}
        onChange={(e) => setBrushSize(Number(e.target.value))}
      />

      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <button className="upload-btn" onClick={applySelectedBlur}>
          Apply Selected Blur
        </button>

        <button className="upload-btn" onClick={applyProtectedBackgroundBlur}>
          Apply Protected BG Blur
        </button>

        <button className="upload-btn" onClick={applyAIBackgroundBlur}>
          AI Auto Background Blur
        </button>

        <button className="upload-btn" onClick={applyFullImageBlur}>
          Full Image Blur
        </button>

        <button className="upload-btn" onClick={clearAllBlur}>
          Clear Blur
        </button>

        <button className="upload-btn" onClick={downloadBlurredImage}>
          Download Blur PNG
        </button>
      </div>

      <p>{processing ? "Processing..." : status}</p>

      <div style={{ marginTop: "15px", overflow: "auto" }}>
        <canvas
          ref={canvasRef}
          style={{
            maxWidth: "100%",
            border: "2px solid #d4af37",
            borderRadius: "10px",
            cursor: "crosshair",
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      </div>

      <p>
        <b>Selected Area Blur:</b> area select करो → Apply Selected Blur. <br />
        <b>Protected Background Blur:</b> subject/object पर rectangle select करो → Apply Protected BG Blur. <br />
        <b>AI Auto Background Blur:</b> automatic try करेगा, photo subjects पर best. <br />
        <b>Download:</b> Apply के बाद Download Blur PNG.
      </p>
    </div>
  );
}

export default SelectiveBlur;