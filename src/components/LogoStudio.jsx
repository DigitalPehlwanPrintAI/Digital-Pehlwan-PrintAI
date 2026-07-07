import { useEffect, useRef, useState } from "react";

const API_BASE = "https://digital-pehlwan-printai.onrender.com";

function LogoStudio({ selectedFile, image }) {
  const canvasRef = useRef(null);
  const originalCanvasRef = useRef(null);
  const logoCanvasRef = useRef(null);
  const logoOriginalRef = useRef(null);

  const isSelectingRef = useRef(false);
  const startPointRef = useRef(null);
  const selectionRectRef = useRef(null);

  const editDrawingRef = useRef(false);

  const [isReady, setIsReady] = useState(false);
  const [status, setStatus] = useState("Upload image first");
  const [processing, setProcessing] = useState(false);

  const [logoPreview, setLogoPreview] = useState(null);
  const [logoInfo, setLogoInfo] = useState(null);

  const [logoBgMode, setLogoBgMode] = useState("transparent");
  const [customBg, setCustomBg] = useState("#ffffff");

  const [editTool, setEditTool] = useState("eraser");
  const [brushSize, setBrushSize] = useState(35);

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

      originalCanvas
        .getContext("2d")
        .drawImage(img, 0, 0, canvas.width, canvas.height);

      originalCanvasRef.current = originalCanvas;
      selectionRectRef.current = null;

      logoCanvasRef.current = null;
      logoOriginalRef.current = null;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(originalCanvas, 0, 0);

      setIsReady(true);
      setProcessing(false);
      setLogoPreview(null);
      setLogoInfo(null);
      setStatus("Image ready. Logo ke around rectangle select karo.");
    };

    img.onerror = () => alert("Image load nahi ho paayi");
    img.src = url;
  }

  function getPoint(e, targetCanvas = canvasRef.current) {
    const rect = targetCanvas.getBoundingClientRect();

    return {
      x: ((e.clientX - rect.left) / rect.width) * targetCanvas.width,
      y: ((e.clientY - rect.top) / rect.height) * targetCanvas.height,
    };
  }

  function renderMain(showRect = true) {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const originalCanvas = originalCanvasRef.current;

    if (!canvas || !ctx || !originalCanvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(originalCanvas, 0, 0);

    if (showRect && selectionRectRef.current) {
      const r = selectionRectRef.current;

      ctx.save();
      ctx.strokeStyle = "#00d4ff";
      ctx.fillStyle = "rgba(0, 212, 255, 0.14)";
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 6]);
      ctx.strokeRect(r.x, r.y, r.w, r.h);
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.restore();
    }
  }

  function handleMouseDown(e) {
    if (!isReady || processing) return;

    const p = getPoint(e);

    isSelectingRef.current = true;
    startPointRef.current = p;

    selectionRectRef.current = {
      x: p.x,
      y: p.y,
      w: 0,
      h: 0,
    };

    setLogoPreview(null);
    setLogoInfo(null);
    logoCanvasRef.current = null;
    logoOriginalRef.current = null;

    renderMain(true);
  }

  function handleMouseMove(e) {
    if (!isReady || !isSelectingRef.current || processing) return;

    const p = getPoint(e);
    const start = startPointRef.current;

    selectionRectRef.current = {
      x: Math.min(start.x, p.x),
      y: Math.min(start.y, p.y),
      w: Math.abs(p.x - start.x),
      h: Math.abs(p.y - start.y),
    };

    renderMain(true);
  }

  function handleMouseUp() {
    if (!isReady || !isSelectingRef.current) return;

    isSelectingRef.current = false;
    startPointRef.current = null;

    const r = selectionRectRef.current;

    if (!r || r.w < 5 || r.h < 5) {
      setStatus("Selection chhota hai. Logo ke around bada area select karo.");
      renderMain(false);
      return;
    }

    setStatus("Logo area selected. Extract Logo click karo.");
    renderMain(true);
  }

  function createLogoCropCanvas() {
    const r = selectionRectRef.current;
    const originalCanvas = originalCanvasRef.current;

    if (!r || r.w < 5 || r.h < 5) {
      alert("Pehle logo select karo");
      return null;
    }

    const cropCanvas = document.createElement("canvas");
    cropCanvas.width = Math.round(r.w);
    cropCanvas.height = Math.round(r.h);

    cropCanvas.getContext("2d").drawImage(
      originalCanvas,
      r.x,
      r.y,
      r.w,
      r.h,
      0,
      0,
      cropCanvas.width,
      cropCanvas.height
    );

    return cropCanvas;
  }

  function cloneCanvas(sourceCanvas) {
    const c = document.createElement("canvas");
    c.width = sourceCanvas.width;
    c.height = sourceCanvas.height;
    c.getContext("2d").drawImage(sourceCanvas, 0, 0);
    return c;
  }

  function updateLogoPreview() {
    const logoCanvas = logoCanvasRef.current;
    if (!logoCanvas) return;

    setLogoPreview(logoCanvas.toDataURL("image/png"));

    setTimeout(() => {
      drawLogoEditCanvas();
    }, 30);
  }

  function extractLogo() {
    const cropCanvas = createLogoCropCanvas();
    if (!cropCanvas) return;

    logoOriginalRef.current = cloneCanvas(cropCanvas);
    logoCanvasRef.current = cloneCanvas(cropCanvas);

    const r = selectionRectRef.current;

    setLogoInfo({
      width: Math.round(r.w),
      height: Math.round(r.h),
      x: Math.round(r.x),
      y: Math.round(r.y),
    });

    updateLogoPreview();
    setStatus("Logo extracted. AI Remove BG ya Manual Cleanup use karo.");
  }

  function canvasToBlob(canvas) {
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/png");
    });
  }

  async function removeLogoBackgroundAI() {
    const logoCanvas = logoCanvasRef.current || createLogoCropCanvas();
    if (!logoCanvas) return;

    try {
      setProcessing(true);
      setStatus("Logo background AI remove ho raha hai...");

      const logoBlob = await canvasToBlob(logoCanvas);
      const formData = new FormData();
      formData.append("file", logoBlob, "logo.png");

      const response = await fetch(`${API_BASE}/smart-edit/remove-bg`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        alert("AI Remove BG Error: " + (await response.text()));
        setProcessing(false);
        setStatus("AI remove failed. Manual Eraser use karo.");
        return;
      }

      const resultBlob = await response.blob();
      const url = URL.createObjectURL(resultBlob);

      const img = new Image();

      img.onload = () => {
        const c = document.createElement("canvas");
        c.width = img.width;
        c.height = img.height;
        c.getContext("2d").drawImage(img, 0, 0);

        logoCanvasRef.current = c;
        updateLogoPreview();

        setProcessing(false);
        setStatus("Logo background removed. Agar extra bacha hai to manual cleanup karo.");
      };

      img.onerror = () => {
        alert("AI output load nahi hua");
        setProcessing(false);
      };

      img.src = url;
    } catch (error) {
      alert("AI Remove BG Error: " + error.message);
      setProcessing(false);
      setStatus("AI remove failed");
    }
  }

  async function removeSelectedLogoFromImage() {
    const r = selectionRectRef.current;
    const originalCanvas = originalCanvasRef.current;

    if (!r || r.w < 5 || r.h < 5) {
      alert("Pehle logo select karo");
      return;
    }

    try {
      setProcessing(true);
      setStatus("Logo remove ho raha hai...");

      const imageBlob = await canvasToBlob(originalCanvas);

      const maskCanvas = document.createElement("canvas");
      maskCanvas.width = originalCanvas.width;
      maskCanvas.height = originalCanvas.height;

      const maskCtx = maskCanvas.getContext("2d");
      maskCtx.fillStyle = "white";
      maskCtx.fillRect(r.x, r.y, r.w, r.h);

      const maskBlob = await canvasToBlob(maskCanvas);

      const formData = new FormData();
      formData.append("file", imageBlob, "image.png");
      formData.append("mask", maskBlob, "mask.png");

      const response = await fetch(`${API_BASE}/smart-edit/inpaint`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        alert("Logo Remove Error: " + (await response.text()));
        setProcessing(false);
        setStatus("Logo remove failed");
        return;
      }

      const resultBlob = await response.blob();
      const url = URL.createObjectURL(resultBlob);

      const img = new Image();

      img.onload = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        const updated = document.createElement("canvas");
        updated.width = originalCanvas.width;
        updated.height = originalCanvas.height;
        updated.getContext("2d").drawImage(img, 0, 0, updated.width, updated.height);

        originalCanvasRef.current = updated;

        selectionRectRef.current = null;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(updated, 0, 0);

        setProcessing(false);
        setStatus("Logo removed from image. Download Removed Image click karo.");
      };

      img.onerror = () => {
        alert("Result image load nahi hui");
        setProcessing(false);
      };

      img.src = url;
    } catch (error) {
      alert("Logo Remove Error: " + error.message);
      setProcessing(false);
      setStatus("Logo remove failed");
    }
  }

  function resetLogoCrop() {
    const originalLogo = logoOriginalRef.current;

    if (!originalLogo) {
      alert("Pehle Extract Logo karo");
      return;
    }

    logoCanvasRef.current = cloneCanvas(originalLogo);
    updateLogoPreview();
    setStatus("Logo reset to original crop.");
  }

  function applyLogoBackground() {
    const logoCanvas = logoCanvasRef.current;
    if (!logoCanvas) {
      alert("Pehle logo extract karo");
      return;
    }

    const newCanvas = document.createElement("canvas");
    newCanvas.width = logoCanvas.width;
    newCanvas.height = logoCanvas.height;

    const ctx = newCanvas.getContext("2d");

    if (logoBgMode === "white") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, newCanvas.width, newCanvas.height);
    }

    if (logoBgMode === "black") {
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, newCanvas.width, newCanvas.height);
    }

    if (logoBgMode === "custom") {
      ctx.fillStyle = customBg;
      ctx.fillRect(0, 0, newCanvas.width, newCanvas.height);
    }

    ctx.drawImage(logoCanvas, 0, 0);
    logoCanvasRef.current = newCanvas;

    updateLogoPreview();
    setStatus("Logo background applied.");
  }

  function handleEditDown(e) {
    if (!logoCanvasRef.current) return;
    editDrawingRef.current = true;
    editAtPoint(e);
  }

  function handleEditMove(e) {
    if (!editDrawingRef.current) return;
    editAtPoint(e);
  }

  function handleEditUp() {
    editDrawingRef.current = false;
  }

  function editAtPoint(e) {
    const displayCanvas = document.getElementById("logo-edit-canvas");
    const logoCanvas = logoCanvasRef.current;
    const originalLogo = logoOriginalRef.current;

    if (!displayCanvas || !logoCanvas || !originalLogo) return;

    const p = getPoint(e, displayCanvas);
    const ctx = logoCanvas.getContext("2d");

    ctx.save();

    if (editTool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.arc(p.x, p.y, brushSize / 2, 0, Math.PI * 2);
      ctx.fill();
    }

    if (editTool === "restore") {
      ctx.globalCompositeOperation = "source-over";
      ctx.beginPath();
      ctx.arc(p.x, p.y, brushSize / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(originalLogo, 0, 0);
    }

    ctx.restore();

    drawLogoEditCanvas();

    if (editTool === "eraser") {
      setStatus("Manual eraser applied.");
    } else {
      setStatus("Restore brush applied.");
    }
  }

  function drawLogoEditCanvas() {
    const displayCanvas = document.getElementById("logo-edit-canvas");
    const logoCanvas = logoCanvasRef.current;

    if (!displayCanvas || !logoCanvas) return;

    displayCanvas.width = logoCanvas.width;
    displayCanvas.height = logoCanvas.height;

    const ctx = displayCanvas.getContext("2d");
    ctx.clearRect(0, 0, displayCanvas.width, displayCanvas.height);
    ctx.drawImage(logoCanvas, 0, 0);

    setLogoPreview(logoCanvas.toDataURL("image/png"));
  }

  function downloadLogoPNG() {
    const logoCanvas = logoCanvasRef.current;

    if (!logoCanvas) {
      alert("Pehle logo extract karo");
      return;
    }

    logoCanvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");

      a.href = url;
      a.download = "printai-logo-transparent.png";
      document.body.appendChild(a);
      a.click();
      a.remove();

      URL.revokeObjectURL(url);
    }, "image/png");
  }

  function downloadRemovedImage() {
    const originalCanvas = originalCanvasRef.current;

    if (!originalCanvas) {
      alert("Image ready nahi hai");
      return;
    }

    originalCanvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");

      a.href = url;
      a.download = "logo-removed-image.png";
      document.body.appendChild(a);
      a.click();
      a.remove();

      URL.revokeObjectURL(url);
    }, "image/png");
  }

  function clearSelection() {
    selectionRectRef.current = null;
    logoCanvasRef.current = null;
    logoOriginalRef.current = null;
    setLogoPreview(null);
    setLogoInfo(null);
    renderMain(false);
    setStatus("Selection cleared.");
  }

  return (
    <div className="analysis-box">
      <h2>Logo Studio</h2>
      <p>
        Logo select karo, remove karo, extract karo, transparent PNG banao aur
        download karo.
      </p>

      {!isReady && <p>Please upload image first in main upload area.</p>}

      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <button className="upload-btn" onClick={extractLogo} disabled={processing}>
          Extract Logo
        </button>

        <button
          className="upload-btn"
          onClick={removeLogoBackgroundAI}
          disabled={processing}
        >
          Logo BG Remove
        </button>

        <button
          className="upload-btn"
          onClick={removeSelectedLogoFromImage}
          disabled={processing}
        >
          Remove Logo From Image
        </button>

        <button className="upload-btn" onClick={resetLogoCrop}>
          Reset Logo Crop
        </button>

        <button className="upload-btn" onClick={clearSelection}>
          Clear Selection
        </button>

        <button className="upload-btn" onClick={downloadLogoPNG}>
          Download Logo PNG
        </button>

        <button className="upload-btn" onClick={downloadRemovedImage}>
          Download Logo Removed Image
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

      {logoPreview && (
        <div className="analysis-box">
          <h3>Logo Preview / Manual Cleanup</h3>

          <label>Edit Tool</label>
          <select value={editTool} onChange={(e) => setEditTool(e.target.value)}>
            <option value="eraser">Manual Eraser</option>
            <option value="restore">Restore Brush</option>
          </select>

          <label>Brush Size: {brushSize}px</label>
          <input
            type="range"
            min="5"
            max="160"
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
          />

          <label>Logo Background</label>
          <select
            value={logoBgMode}
            onChange={(e) => setLogoBgMode(e.target.value)}
          >
            <option value="transparent">Transparent</option>
            <option value="white">White</option>
            <option value="black">Black</option>
            <option value="custom">Custom Color</option>
          </select>

          {logoBgMode === "custom" && (
            <input
              type="color"
              value={customBg}
              onChange={(e) => setCustomBg(e.target.value)}
            />
          )}

          <button className="upload-btn" onClick={applyLogoBackground}>
            Apply Logo Background
          </button>

          <div
            style={{
              background:
                "linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)",
              backgroundSize: "20px 20px",
              backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
              padding: "10px",
              borderRadius: "10px",
              border: "1px solid #d4af37",
              overflow: "auto",
            }}
          >
            <canvas
              id="logo-edit-canvas"
              style={{
                maxWidth: "100%",
                cursor: "crosshair",
              }}
              onMouseDown={handleEditDown}
              onMouseMove={handleEditMove}
              onMouseUp={handleEditUp}
              onMouseLeave={handleEditUp}
            />
          </div>

          {logoInfo && (
            <>
              <p>
                Logo Size: {logoInfo.width}px × {logoInfo.height}px
              </p>
              <p>
                Position: X {logoInfo.x}, Y {logoInfo.y}
              </p>
            </>
          )}

          <p>
            <b>Workflow:</b> Logo select → Extract Logo → Logo BG Remove →
            manual cleanup → Download Logo PNG.
          </p>
        </div>
      )}
    </div>
  );
}

export default LogoStudio;