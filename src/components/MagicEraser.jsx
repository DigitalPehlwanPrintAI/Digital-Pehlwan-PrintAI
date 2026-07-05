import { useEffect, useRef, useState } from "react";

function MagicEraser({ selectedFile, image }) {
  const canvasRef = useRef(null);
  const baseCanvasRef = useRef(null);
  const maskCanvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef(null);

  const [brushSize, setBrushSize] = useState(45);
  const [status, setStatus] = useState("Upload image first");
  const [isReady, setIsReady] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      loadImage(url);
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

      renderCanvas();

      setIsReady(true);
      setStatus("Image ready. जिस object/text/logo को remove करना है उस पर paint करो.");
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

  function paintCircle(point) {
    const maskCanvas = maskCanvasRef.current;
    const maskCtx = maskCanvas.getContext("2d");

    maskCtx.save();
    maskCtx.fillStyle = "rgba(255,255,255,1)";
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
      paintCircle({ x, y });
    }
  }

  function renderCanvas() {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const baseCanvas = baseCanvasRef.current;
    const maskCanvas = maskCanvasRef.current;

    if (!canvas || !ctx || !baseCanvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(baseCanvas, 0, 0);

    if (maskCanvas) {
      const overlayCanvas = document.createElement("canvas");
      overlayCanvas.width = canvas.width;
      overlayCanvas.height = canvas.height;

      const overlayCtx = overlayCanvas.getContext("2d");
      overlayCtx.fillStyle = "rgba(255,0,0,0.35)";
      overlayCtx.fillRect(0, 0, overlayCanvas.width, overlayCanvas.height);

      overlayCtx.globalCompositeOperation = "destination-in";
      overlayCtx.drawImage(maskCanvas, 0, 0);

      ctx.drawImage(overlayCanvas, 0, 0);
    }
  }

  function handleMouseDown(e) {
    if (!isReady || processing) return;

    const point = getPoint(e);
    isDrawingRef.current = true;
    lastPointRef.current = point;

    paintCircle(point);
    renderCanvas();
    setStatus("Selection painted. अब Remove Painted Object click करो.");
  }

  function handleMouseMove(e) {
    if (!isReady || !isDrawingRef.current || processing) return;

    const point = getPoint(e);

    if (lastPointRef.current) {
      paintLine(lastPointRef.current, point);
    }

    lastPointRef.current = point;
    renderCanvas();
  }

  function handleMouseUp() {
    isDrawingRef.current = false;
    lastPointRef.current = null;
  }

  function clearSelection() {
    const maskCanvas = maskCanvasRef.current;
    const maskCtx = maskCanvas.getContext("2d");

    maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
    renderCanvas();

    setStatus("Selection cleared");
  }

  function resetImage() {
    if (!selectedFile && !image) return;

    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      loadImage(url);
    } else if (image) {
      loadImage(image);
    }

    setStatus("Image reset");
  }

  function getAverageAroundPixel(data, maskData, width, height, px, py, radius) {
    let r = 0;
    let g = 0;
    let b = 0;
    let count = 0;

    for (let y = py - radius; y <= py + radius; y++) {
      for (let x = px - radius; x <= px + radius; x++) {
        if (x < 0 || y < 0 || x >= width || y >= height) continue;

        const mi = (y * width + x) * 4;
        const isMasked = maskData[mi + 3] > 20;

        if (!isMasked) {
          const i = (y * width + x) * 4;
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          count++;
        }
      }
    }

    if (count === 0) return null;

    return {
      r: Math.round(r / count),
      g: Math.round(g / count),
      b: Math.round(b / count),
    };
  }

  function applyMagicErase() {
    const baseCanvas = baseCanvasRef.current;
    const maskCanvas = maskCanvasRef.current;

    if (!baseCanvas || !maskCanvas) {
      alert("Please upload image first");
      return;
    }

    setProcessing(true);
    setStatus("Removing object... please wait");

    setTimeout(() => {
      const baseCtx = baseCanvas.getContext("2d");
      const maskCtx = maskCanvas.getContext("2d");

      const width = baseCanvas.width;
      const height = baseCanvas.height;

      const imageData = baseCtx.getImageData(0, 0, width, height);
      const data = imageData.data;

      const maskImageData = maskCtx.getImageData(0, 0, width, height);
      const maskData = maskImageData.data;

      let hasSelection = false;

      for (let i = 0; i < maskData.length; i += 4) {
        if (maskData[i + 3] > 20) {
          hasSelection = true;
          break;
        }
      }

      if (!hasSelection) {
        alert("Pehle object par paint karo");
        setProcessing(false);
        setStatus("No selection found");
        return;
      }

      const copy = new Uint8ClampedArray(data);

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const mi = (y * width + x) * 4;
          const isMasked = maskData[mi + 3] > 20;

          if (isMasked) {
            let avg =
              getAverageAroundPixel(copy, maskData, width, height, x, y, 12) ||
              getAverageAroundPixel(copy, maskData, width, height, x, y, 25) ||
              getAverageAroundPixel(copy, maskData, width, height, x, y, 45);

            if (avg) {
              data[mi] = avg.r;
              data[mi + 1] = avg.g;
              data[mi + 2] = avg.b;
              data[mi + 3] = 255;
            }
          }
        }
      }

      baseCtx.putImageData(imageData, 0, 0);

      baseCtx.save();
      baseCtx.filter = "blur(2px)";
      baseCtx.drawImage(baseCanvas, 0, 0);
      baseCtx.restore();

      maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);

      renderCanvas();

      setProcessing(false);
      setStatus("Object removed. जरूरत हो तो फिर paint करके refine करो.");
    }, 100);
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
    link.download = "magic-eraser-output.png";
    link.click();
  }

  return (
    <div className="analysis-box">
      <h2>Magic Eraser / Object Remover</h2>
      <p>
        जिस object, text, logo या unwanted portion को remove करना है, उस पर brush
        से paint करो.
      </p>

      {!isReady && <p>Please upload image first in main upload area.</p>}

      <label>Brush Size: {brushSize}px</label>
      <input
        type="range"
        min="10"
        max="180"
        value={brushSize}
        onChange={(e) => setBrushSize(Number(e.target.value))}
      />

      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <button className="upload-btn" onClick={applyMagicErase}>
          Remove Painted Object
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
    </div>
  );
}

export default MagicEraser;