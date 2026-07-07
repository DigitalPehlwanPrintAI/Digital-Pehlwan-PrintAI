import { useEffect, useRef, useState } from "react";

const API_BASE = "https://digital-pehlwan-printai.onrender.com";

function ObjectTextRemover({ selectedFile, image }) {
  const canvasRef = useRef(null);
  const baseCanvasRef = useRef(null);
  const maskCanvasRef = useRef(null);

  const isDrawingRef = useRef(false);
  const startPointRef = useRef(null);
  const selectionRectRef = useRef(null);
  const lassoPointsRef = useRef([]);

  const [mode, setMode] = useState("object");
  const [selectionTool, setSelectionTool] = useState("rectangle");
  const [selectionPadding, setSelectionPadding] = useState(12);
  const [status, setStatus] = useState("Upload image first");
  const [isReady, setIsReady] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [hasSelection, setHasSelection] = useState(false);

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

      selectionRectRef.current = null;
      lassoPointsRef.current = [];

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(baseCanvas, 0, 0);

      setIsReady(true);
      setProcessing(false);
      setHasSelection(false);
      setStatus("Image ready. Rectangle ya Lasso se object/text select karo.");
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

  function renderPreview() {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const baseCanvas = baseCanvasRef.current;

    if (!canvas || !ctx || !baseCanvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(baseCanvas, 0, 0);

    if (selectionRectRef.current) {
      const r = selectionRectRef.current;

      ctx.save();
      ctx.strokeStyle = mode === "text" ? "#ffd700" : "#ff3333";
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 6]);
      ctx.strokeRect(r.x, r.y, r.w, r.h);

      ctx.fillStyle =
        mode === "text"
          ? "rgba(255, 215, 0, 0.12)"
          : "rgba(255, 0, 0, 0.12)";
      ctx.fillRect(r.x, r.y, r.w, r.h);

      ctx.restore();
    }

    if (lassoPointsRef.current.length > 1) {
      const points = lassoPointsRef.current;

      ctx.save();
      ctx.strokeStyle = mode === "text" ? "#ffd700" : "#ff3333";
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 4]);

      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);

      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }

      if (!isDrawingRef.current && points.length > 2) {
        ctx.closePath();
      }

      ctx.stroke();

      if (!isDrawingRef.current && points.length > 2) {
        ctx.fillStyle =
          mode === "text"
            ? "rgba(255, 215, 0, 0.12)"
            : "rgba(255, 0, 0, 0.12)";
        ctx.fill();
      }

      ctx.restore();
    }
  }

  function clearMask() {
    const maskCanvas = maskCanvasRef.current;
    const maskCtx = maskCanvas.getContext("2d");
    maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
  }

  function createMaskFromSelection() {
    const maskCanvas = maskCanvasRef.current;
    const maskCtx = maskCanvas.getContext("2d");

    clearMask();

    maskCtx.save();
    maskCtx.fillStyle = "white";

    const pad = Number(selectionPadding);

    if (selectionTool === "rectangle") {
      const r = selectionRectRef.current;

      if (!r || r.w < 5 || r.h < 5) {
        maskCtx.restore();
        return false;
      }

      const x = Math.max(0, r.x - pad);
      const y = Math.max(0, r.y - pad);
      const w = Math.min(maskCanvas.width - x, r.w + pad * 2);
      const h = Math.min(maskCanvas.height - y, r.h + pad * 2);

      maskCtx.fillRect(x, y, w, h);
      maskCtx.restore();
      return true;
    }

    if (selectionTool === "lasso") {
      const points = lassoPointsRef.current;

      if (!points || points.length < 3) {
        maskCtx.restore();
        return false;
      }

      maskCtx.beginPath();
      maskCtx.moveTo(points[0].x, points[0].y);

      for (let i = 1; i < points.length; i++) {
        maskCtx.lineTo(points[i].x, points[i].y);
      }

      maskCtx.closePath();
      maskCtx.fill();

      if (pad > 0) {
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = maskCanvas.width;
        tempCanvas.height = maskCanvas.height;

        const tempCtx = tempCanvas.getContext("2d");
        tempCtx.drawImage(maskCanvas, 0, 0);

        maskCtx.filter = `blur(${Math.max(1, pad / 2)}px)`;
        maskCtx.drawImage(tempCanvas, 0, 0);
        maskCtx.filter = "none";

        const imageData = maskCtx.getImageData(
          0,
          0,
          maskCanvas.width,
          maskCanvas.height
        );

        for (let i = 0; i < imageData.data.length; i += 4) {
          const alpha = imageData.data[i + 3];
          if (alpha > 5) {
            imageData.data[i] = 255;
            imageData.data[i + 1] = 255;
            imageData.data[i + 2] = 255;
            imageData.data[i + 3] = 255;
          } else {
            imageData.data[i + 3] = 0;
          }
        }

        maskCtx.putImageData(imageData, 0, 0);
      }

      maskCtx.restore();
      return true;
    }

    maskCtx.restore();
    return false;
  }

  function handleMouseDown(e) {
    if (!isReady || processing) return;

    const point = getPoint(e);
    isDrawingRef.current = true;
    startPointRef.current = point;

    if (selectionTool === "rectangle") {
      selectionRectRef.current = {
        x: point.x,
        y: point.y,
        w: 0,
        h: 0,
      };
      lassoPointsRef.current = [];
    }

    if (selectionTool === "lasso") {
      selectionRectRef.current = null;
      lassoPointsRef.current = [point];
    }

    setHasSelection(false);
    renderPreview();
  }

  function handleMouseMove(e) {
    if (!isReady || !isDrawingRef.current || processing) return;

    const point = getPoint(e);
    const start = startPointRef.current;

    if (selectionTool === "rectangle") {
      selectionRectRef.current = {
        x: Math.min(start.x, point.x),
        y: Math.min(start.y, point.y),
        w: Math.abs(point.x - start.x),
        h: Math.abs(point.y - start.y),
      };
    }

    if (selectionTool === "lasso") {
      lassoPointsRef.current.push(point);
    }

    renderPreview();
  }

  function handleMouseUp() {
    if (!isReady || processing) return;

    isDrawingRef.current = false;
    startPointRef.current = null;

    if (selectionTool === "rectangle") {
      const r = selectionRectRef.current;

      if (r && r.w > 5 && r.h > 5) {
        setHasSelection(true);
        setStatus(
          mode === "text"
            ? "Text selected. Remove Selected Text click karo."
            : "Object selected. Remove Selected Object click karo."
        );
      }
    }

    if (selectionTool === "lasso") {
      if (lassoPointsRef.current.length > 5) {
        setHasSelection(true);
        setStatus(
          mode === "text"
            ? "Text lasso selected. Remove Selected Text click karo."
            : "Object lasso selected. Remove Selected Object click karo."
        );
      }
    }

    renderPreview();
  }

  function canvasToBlob(canvas) {
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/png");
    });
  }

  async function removeSelectedArea() {
    const baseCanvas = baseCanvasRef.current;
    const maskCanvas = maskCanvasRef.current;

    if (!baseCanvas || !maskCanvas) {
      alert("Please upload image first");
      return;
    }

    const maskCreated = createMaskFromSelection();

    if (!maskCreated) {
      alert("Pehle object/text select karo");
      return;
    }

    try {
      setProcessing(true);

      setStatus(
        mode === "text"
          ? "Removing selected text... please wait"
          : "Removing selected object... please wait"
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
        setStatus("Remove failed");
        return;
      }

      const resultBlob = await response.blob();
      const resultUrl = URL.createObjectURL(resultBlob);

      const img = new Image();

      img.onload = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        const updatedBaseCanvas = baseCanvasRef.current;
        const updatedBaseCtx = updatedBaseCanvas.getContext("2d");

        updatedBaseCtx.clearRect(
          0,
          0,
          updatedBaseCanvas.width,
          updatedBaseCanvas.height
        );

        updatedBaseCtx.drawImage(
          img,
          0,
          0,
          updatedBaseCanvas.width,
          updatedBaseCanvas.height
        );

        clearMask();
        selectionRectRef.current = null;
        lassoPointsRef.current = [];

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(updatedBaseCanvas, 0, 0);

        setHasSelection(false);
        setProcessing(false);

        setStatus(
          mode === "text"
            ? "Selected text removed. जरूरत हो तो फिर select करके refine करो."
            : "Selected object removed. जरूरत हो तो फिर select करके refine करो."
        );
      };

      img.onerror = () => {
        alert("Result image load nahi hui");
        setProcessing(false);
        setStatus("Result load failed");
      };

      img.src = resultUrl;
    } catch (error) {
      alert("Remove Error: " + error.message);
      setProcessing(false);
      setStatus("Remove failed");
    }
  }

  function clearSelection() {
    clearMask();
    selectionRectRef.current = null;
    lassoPointsRef.current = [];
    setHasSelection(false);
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
        Rectangle ya Lasso se object/text select karo. Brush paint nahi hai.
      </p>

      {!isReady && <p>Please upload image first in main upload area.</p>}

      <label>Remove Mode</label>
      <select value={mode} onChange={(e) => setMode(e.target.value)}>
        <option value="object">Object Remover</option>
        <option value="text">Text Remover</option>
      </select>

      <label>Selection Tool</label>
      <select
        value={selectionTool}
        onChange={(e) => {
          setSelectionTool(e.target.value);
          clearSelection();
        }}
      >
        <option value="rectangle">Rectangle Select</option>
        <option value="lasso">Lasso Select</option>
      </select>

      <label>Selection Padding: {selectionPadding}px</label>
      <input
        type="range"
        min="0"
        max="50"
        value={selectionPadding}
        onChange={(e) => setSelectionPadding(Number(e.target.value))}
      />

      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <button
          className="upload-btn"
          onClick={removeSelectedArea}
          disabled={!hasSelection || processing}
        >
          {mode === "text" ? "Remove Selected Text" : "Remove Selected Object"}
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
        <b>Rectangle Select:</b> object/text के around box बनाओ → Remove Selected.
        <br />
        <b>Lasso Select:</b> object/text के around mouse से free shape बनाओ → Remove Selected.
        <br />
        <b>Selection Padding:</b> अगर edges बच रहे हैं तो padding बढ़ाओ.
        <br />
        <b>Important:</b> पीछे blur नहीं होगा. Backend image के आसपास के pixels से fill करेगा.
      </p>
    </div>
  );
}

export default ObjectTextRemover;