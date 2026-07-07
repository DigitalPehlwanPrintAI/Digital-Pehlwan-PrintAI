import { useEffect, useRef, useState } from "react";

const API_BASE = "http://127.0.0.1:8000";

function ObjectTextRemover({ selectedFile, image }) {
  const canvasRef = useRef(null);
  const baseCanvasRef = useRef(null);
  const maskCanvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef(null);

  const [mode, setMode] = useState("object");
  const [brushSize, setBrushSize] = useState(45);
  const [status, setStatus] = useState("Upload image first");
  const [isReady, setIsReady] = useState(false);
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

      const baseCanvas = document.createElement("canvas");
      baseCanvas.width = canvas.width;
      baseCanvas.height = canvas.height;

      const baseCtx = baseCanvas.getContext("2d");
      baseCtx.drawImage(img, 0, 0, canvas.width, canvas.height);

      baseCanvasRef.current = baseCanvas;

      const maskCanvas = document.createElement("canvas");
      maskCanvas.width = canvas.width;
      maskCanvas.height = canvas.height;
      maskCanvasRef.current = maskCanvas;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(baseCanvas, 0, 0);

      setIsReady(true);
      setStatus("Image ready. Object ya text par paint karo.");
    };

    img.onerror = () => {
      alert("Image load nahi ho paayi");
    };

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

  function paintMask(point) {
    const maskCanvas = maskCanvasRef.current;
    const maskCtx = maskCanvas.getContext("2d");

    maskCtx.save();
    maskCtx.fillStyle = "white";
    maskCtx.beginPath();
    maskCtx.arc(point.x, point.y, brushSize / 2, 0, Math.PI * 2);
    maskCtx.fill();
    maskCtx.restore();
  }

  function paintLine(from, to) {
    const distance = Math.hypot(to.x - from.x, to.y - from.y);
    const steps = Math.max(1, Math.ceil(distance / 3));

    for (let i = 0; i <= steps; i++) {
      const x = from.x + ((to.x - from.x) * i) / steps;
      const y = from.y + ((to.y - from.y) * i) / steps;
      paintMask({ x, y });
    }
  }

  function renderPreview() {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const baseCanvas = baseCanvasRef.current;
    const maskCanvas = maskCanvasRef.current;

    if (!canvas || !ctx || !baseCanvas || !maskCanvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(baseCanvas, 0, 0);

    const overlay = document.createElement("canvas");
    overlay.width = canvas.width;
    overlay.height = canvas.height;

    const overlayCtx = overlay.getContext("2d");

    overlayCtx.fillStyle =
      mode === "text"
        ? "rgba(255, 215, 0, 0.45)"
        : "rgba(255, 0, 0, 0.35)";

    overlayCtx.fillRect(0, 0, overlay.width, overlay.height);
    overlayCtx.globalCompositeOperation = "destination-in";
    overlayCtx.drawImage(maskCanvas, 0, 0);

    ctx.drawImage(overlay, 0, 0);
  }

  function handleMouseDown(e) {
    if (!isReady || processing) return;

    const point = getPoint(e);

    isDrawingRef.current = true;
    lastPointRef.current = point;

    paintMask(point);
    renderPreview();

    setStatus(
      mode === "text"
        ? "Text selected. Remove Painted Text click karo."
        : "Object selected. Remove Painted Object click karo."
    );
  }

  function handleMouseMove(e) {
    if (!isReady || !isDrawingRef.current || processing) return;

    const point = getPoint(e);

    paintLine(lastPointRef.current, point);
    lastPointRef.current = point;

    renderPreview();
  }

  function handleMouseUp() {
    isDrawingRef.current = false;
    lastPointRef.current = null;
  }

  function clearSelection() {
    const maskCanvas = maskCanvasRef.current;
    const maskCtx = maskCanvas.getContext("2d");

    maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
    renderPreview();

    setStatus("Selection cleared");
  }

  function resetImage() {
    if (selectedFile) {
      loadImage(URL.createObjectURL(selectedFile));
    } else if (image) {
      loadImage(image);
    }
  }

  function canvasToBlob(canvas) {
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/png");
    });
  }

  async function removePaintedArea() {
    const baseCanvas = baseCanvasRef.current;
    const maskCanvas = maskCanvasRef.current;

    if (!baseCanvas || !maskCanvas) {
      alert("Please upload image first");
      return;
    }

    try {
      setProcessing(true);
      setStatus(
        mode === "text"
          ? "Removing text... please wait"
          : "Removing object... please wait"
      );

      const imageBlob = await canvasToBlob(baseCanvas);
      const maskBlob = await canvasToBlob(maskCanvas);

      const formData = new FormData();
      formData.append("file", imageBlob, "image.png");
      formData.append("mask", maskBlob, "mask.png");

      const response = await fetch(`${API_BASE}/smart-edit/inpaint`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errText = await response.text();
        alert("Remove Error: " + errText);
        setProcessing(false);
        return;
      }

      const resultBlob = await response.blob();
      const resultUrl = URL.createObjectURL(resultBlob);

      const img = new Image();

      img.onload = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        const baseCanvas = baseCanvasRef.current;
        const baseCtx = baseCanvas.getContext("2d");

        baseCtx.clearRect(0, 0, baseCanvas.width, baseCanvas.height);
        baseCtx.drawImage(img, 0, 0, baseCanvas.width, baseCanvas.height);

        const maskCanvas = maskCanvasRef.current;
        const maskCtx = maskCanvas.getContext("2d");
        maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(baseCanvas, 0, 0);

        setProcessing(false);
        setStatus(
          mode === "text"
            ? "Text removed. जरूरत हो तो फिर paint करके refine करो."
            : "Object removed. जरूरत हो तो फिर paint करके refine करो."
        );
      };

      img.onerror = () => {
        alert("Result image load nahi hui");
        setProcessing(false);
      };

      img.src = resultUrl;
    } catch (error) {
      alert("Remove Error: " + error.message);
      setProcessing(false);
    }
  }

  function downloadResult() {
    const baseCanvas = baseCanvasRef.current;

    if (!baseCanvas) {
      alert("Please upload image first");
      return;
    }

    const url = baseCanvas.toDataURL("image/png");
    const link = document.createElement("a");

    link.href = url;
    link.download =
      mode === "text"
        ? "text-remover-output.png"
        : "object-remover-output.png";

    link.click();
  }

  return (
    <div className="analysis-box">
      <h2>Object Remover / Text Remover</h2>
      <p>
        Object, text, logo, watermark जैसे unwanted area पर paint करो और remove
        करो.
      </p>

      {!isReady && <p>Please upload image first in main upload area.</p>}

      <label>Remove Mode</label>
      <select value={mode} onChange={(e) => setMode(e.target.value)}>
        <option value="object">Object Remover</option>
        <option value="text">Text Remover</option>
      </select>

      <label>Brush Size: {brushSize}px</label>
      <input
        type="range"
        min="10"
        max="180"
        value={brushSize}
        onChange={(e) => setBrushSize(Number(e.target.value))}
      />

      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <button className="upload-btn" onClick={removePaintedArea}>
          {mode === "text" ? "Remove Painted Text" : "Remove Painted Object"}
        </button>

        <button className="upload-btn" onClick={clearSelection}>
          Clear Selection
        </button>

        <button className="upload-btn" onClick={resetImage}>
          Reset Image
        </button>

        <button className="upload-btn" onClick={downloadResult}>
          Download PNG
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
        <b>Object Remover:</b> object पर paint करो → Remove Painted Object.{" "}
        <br />
        <b>Text Remover:</b> text पर paint करो → Remove Painted Text. <br />
        <b>Tip:</b> object/text से थोड़ा extra area paint करो ताकि edges भी clean
        remove हों.
      </p>
    </div>
  );
}

export default ObjectTextRemover;