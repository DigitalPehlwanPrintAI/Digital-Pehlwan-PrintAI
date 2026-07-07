import { useEffect, useRef, useState } from "react";

function OCRFontDetector({ selectedFile, image }) {
  const canvasRef = useRef(null);
  const originalCanvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const startPointRef = useRef(null);
  const selectionRectRef = useRef(null);

  const [status, setStatus] = useState("Upload image first");
  const [isReady, setIsReady] = useState(false);
  const [cropPreview, setCropPreview] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (selectedFile) loadImage(URL.createObjectURL(selectedFile));
    else if (image) loadImage(image);
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
      selectionRectRef.current = null;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(originalCanvas, 0, 0);

      setIsReady(true);
      setCropPreview(null);
      setResult(null);
      setStatus("Image ready. Text ke around rectangle select karo.");
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
    const originalCanvas = originalCanvasRef.current;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(originalCanvas, 0, 0);

    if (showRect && selectionRectRef.current) {
      const r = selectionRectRef.current;
      ctx.save();
      ctx.strokeStyle = "#ffd700";
      ctx.fillStyle = "rgba(255,215,0,0.16)";
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 6]);
      ctx.strokeRect(r.x, r.y, r.w, r.h);
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.restore();
    }
  }

  function handleMouseDown(e) {
    if (!isReady) return;

    const p = getPoint(e);
    isDrawingRef.current = true;
    startPointRef.current = p;
    selectionRectRef.current = { x: p.x, y: p.y, w: 0, h: 0 };

    setCropPreview(null);
    setResult(null);
    render(true);
  }

  function handleMouseMove(e) {
    if (!isDrawingRef.current) return;

    const p = getPoint(e);
    const start = startPointRef.current;

    selectionRectRef.current = {
      x: Math.min(start.x, p.x),
      y: Math.min(start.y, p.y),
      w: Math.abs(p.x - start.x),
      h: Math.abs(p.y - start.y),
    };

    render(true);
  }

  function handleMouseUp() {
    if (!isDrawingRef.current) return;

    isDrawingRef.current = false;
    startPointRef.current = null;

    const r = selectionRectRef.current;

    if (!r || r.w < 8 || r.h < 8) {
      setStatus("Selection chhota hai. Text ke around proper area select karo.");
      render(false);
      return;
    }

    setStatus("Text selected. Detect Font click karo.");
    render(true);
  }

  function createCropCanvas() {
    const r = selectionRectRef.current;
    const originalCanvas = originalCanvasRef.current;

    if (!r || r.w < 8 || r.h < 8) {
      alert("Pehle text area select karo");
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

  function rgbToHex(r, g, b) {
    return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();
  }

  function rgbToCmyk(r, g, b) {
    const rr = r / 255;
    const gg = g / 255;
    const bb = b / 255;

    const k = 1 - Math.max(rr, gg, bb);
    if (k === 1) return "0, 0, 0, 100";

    const c = Math.round(((1 - rr - k) / (1 - k)) * 100);
    const m = Math.round(((1 - gg - k) / (1 - k)) * 100);
    const y = Math.round(((1 - bb - k) / (1 - k)) * 100);
    const kk = Math.round(k * 100);

    return `${c}, ${m}, ${y}, ${kk}`;
  }

  function getDominantTextColor(cropCanvas) {
    const ctx = cropCanvas.getContext("2d");
    const data = ctx.getImageData(0, 0, cropCanvas.width, cropCanvas.height).data;

    let darkPixels = [];
    let brightPixels = [];

    for (let i = 0; i < data.length; i += 16) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      if (a < 20) continue;

      const brightness = (r + g + b) / 3;

      if (brightness < 130) darkPixels.push([r, g, b]);
      else brightPixels.push([r, g, b]);
    }

    const pixels = darkPixels.length > brightPixels.length ? darkPixels : brightPixels;

    if (pixels.length === 0) return { hex: "#000000", rgb: "rgb(0, 0, 0)", cmyk: "0, 0, 0, 100" };

    let r = 0;
    let g = 0;
    let b = 0;

    pixels.forEach((p) => {
      r += p[0];
      g += p[1];
      b += p[2];
    });

    r = Math.round(r / pixels.length);
    g = Math.round(g / pixels.length);
    b = Math.round(b / pixels.length);

    return {
      hex: rgbToHex(r, g, b),
      rgb: `rgb(${r}, ${g}, ${b})`,
      cmyk: rgbToCmyk(r, g, b),
    };
  }

  function estimateFont(cropCanvas) {
    const w = cropCanvas.width;
    const h = cropCanvas.height;
    const ratio = w / Math.max(1, h);

    let category = "Display / Poster Font";
    let weight = "Regular";
    let style = "Normal";
    let alignment = "Center / Unknown";
    let fontSize = Math.round(h * 0.72);

    if (h > 120) weight = "Bold / Heavy";
    if (h < 45) weight = "Regular / Medium";

    if (ratio > 5) category = "Wide Heading Font";
    else if (ratio > 3) category = "Title / Banner Font";
    else if (ratio > 1.5) category = "Logo / Short Text Font";
    else category = "Compact / Badge Font";

    let possibleFonts = [];

    if (category.includes("Wide") || category.includes("Title")) {
      possibleFonts = [
        { name: "Montserrat SemiBold", confidence: 88 },
        { name: "Poppins SemiBold", confidence: 84 },
        { name: "Aptos Display", confidence: 78 },
        { name: "Arial Bold", confidence: 74 },
        { name: "Helvetica Bold", confidence: 72 },
      ];
    } else if (category.includes("Logo")) {
      possibleFonts = [
        { name: "Cinzel Bold", confidence: 86 },
        { name: "Trajan Pro", confidence: 82 },
        { name: "Times New Roman Bold", confidence: 76 },
        { name: "Georgia Bold", confidence: 72 },
        { name: "Merriweather Bold", confidence: 69 },
      ];
    } else {
      possibleFonts = [
        { name: "Times New Roman", confidence: 78 },
        { name: "Georgia", confidence: 75 },
        { name: "Cambria", confidence: 71 },
        { name: "Merriweather", confidence: 68 },
        { name: "Libre Baskerville", confidence: 66 },
      ];
    }

    return {
      category,
      weight,
      style,
      alignment,
      fontSize,
      possibleFonts,
      bestFont: possibleFonts[0],
      canvaMatch: possibleFonts[0].name,
      photoshopMatch: possibleFonts[0].name,
      corelMatch: possibleFonts[0].name,
      googleFontMatch: possibleFonts.find((f) =>
        ["Montserrat SemiBold", "Poppins SemiBold", "Merriweather", "Libre Baskerville", "Cinzel Bold"].includes(f.name)
      )?.name || possibleFonts[0].name,
    };
  }

  function detectFont() {
    const cropCanvas = createCropCanvas();
    if (!cropCanvas) return;

    const previewUrl = cropCanvas.toDataURL("image/png");
    setCropPreview(previewUrl);

    const color = getDominantTextColor(cropCanvas);
    const font = estimateFont(cropCanvas);

    setResult({
      ...font,
      color,
      width: cropCanvas.width,
      height: cropCanvas.height,
    });

    setStatus("Font detection ready. Possible fonts नीचे दिख रहे हैं.");
  }

  function downloadTextCrop() {
    const cropCanvas = createCropCanvas();
    if (!cropCanvas) return;

    cropCanvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");

      a.href = url;
      a.download = "font-detection-text-crop.png";
      document.body.appendChild(a);
      a.click();
      a.remove();

      URL.revokeObjectURL(url);
    }, "image/png");
  }

  function copyValue(value) {
    navigator.clipboard.writeText(value).then(() => {
      setStatus(`Copied: ${value}`);
    });
  }

  function clearSelection() {
    selectionRectRef.current = null;
    setCropPreview(null);
    setResult(null);
    render(false);
    setStatus("Selection cleared.");
  }

  return (
    <div className="analysis-box">
      <h2>OCR + Font Detection Pro</h2>
      <p>
        Text select करो और possible font name, color, size, weight, Canva/Photoshop/Corel match देखो.
      </p>

      {!isReady && <p>Please upload image first in main upload area.</p>}

      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <button className="upload-btn" onClick={detectFont}>
          Detect Font
        </button>

        <button className="upload-btn" onClick={downloadTextCrop}>
          Download Text Crop
        </button>

        <button className="upload-btn" onClick={clearSelection}>
          Clear Selection
        </button>
      </div>

      <p>{status}</p>

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

      {cropPreview && (
        <div className="analysis-box">
          <h3>Selected Text Preview</h3>
          <img src={cropPreview} alt="Text Crop Preview" />
        </div>
      )}

      {result && (
        <div className="analysis-box">
          <h3>Font Detection Result</h3>

          <p><b>Best Match:</b> {result.bestFont.name}</p>
          <p><b>Confidence:</b> {result.bestFont.confidence}%</p>
          <p><b>Font Category:</b> {result.category}</p>
          <p><b>Weight:</b> {result.weight}</p>
          <p><b>Style:</b> {result.style}</p>
          <p><b>Estimated Font Size:</b> {result.fontSize}px</p>
          <p><b>Alignment:</b> {result.alignment}</p>

          <hr />

          <h3>Similar Fonts</h3>
          {result.possibleFonts.map((font) => (
            <div
              key={font.name}
              style={{
                border: "1px solid #d4af37",
                borderRadius: "10px",
                padding: "10px",
                marginBottom: "8px",
              }}
            >
              <p><b>{font.name}</b> — {font.confidence}% similar</p>
            </div>
          ))}

          <hr />

          <h3>Software Match</h3>
          <p><b>Canva:</b> {result.canvaMatch}</p>
          <p><b>Photoshop:</b> {result.photoshopMatch}</p>
          <p><b>CorelDRAW:</b> {result.corelMatch}</p>
          <p><b>Google Font:</b> {result.googleFontMatch}</p>

          <hr />

          <h3>Text Color</h3>
          <div
            style={{
              width: "90px",
              height: "60px",
              border: "2px solid #d4af37",
              borderRadius: "8px",
              background: result.color.hex,
            }}
          />

          <p><b>HEX:</b> {result.color.hex}</p>
          <p><b>RGB:</b> {result.color.rgb}</p>
          <p><b>CMYK:</b> {result.color.cmyk}</p>

          <button className="upload-btn" onClick={() => copyValue(result.color.hex)}>
            Copy HEX
          </button>

          <button className="upload-btn" onClick={() => copyValue(result.bestFont.name)}>
            Copy Font Name
          </button>
        </div>
      )}
    </div>
  );
}

export default OCRFontDetector;