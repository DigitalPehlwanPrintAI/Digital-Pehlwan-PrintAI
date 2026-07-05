import { useEffect, useRef, useState } from "react";

const API_BASE = "http://127.0.0.1:8000";

function PickerStudio({ selectedFile, image }) {
  const canvasRef = useRef(null);
  const originalCanvasRef = useRef(null);

  const cropOriginalCanvasRef = useRef(null);
  const transparentCanvasRef = useRef(null);

  const isDrawingRef = useRef(false);
  const startPointRef = useRef(null);
  const selectionRectRef = useRef(null);

  const editDrawingRef = useRef(false);

  const [pickerMode, setPickerMode] = useState("object");
  const [editTool, setEditTool] = useState("eraser");

  const [status, setStatus] = useState("Upload image first");
  const [isReady, setIsReady] = useState(false);
  const [processing, setProcessing] = useState(false);

  const [selectedPreview, setSelectedPreview] = useState(null);
  const [selectedInfo, setSelectedInfo] = useState(null);

  const [brushSize, setBrushSize] = useState(35);
  const [pickedColor, setPickedColor] = useState(null);

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

      const originalCtx = originalCanvas.getContext("2d");
      originalCtx.drawImage(img, 0, 0, canvas.width, canvas.height);

      originalCanvasRef.current = originalCanvas;
      selectionRectRef.current = null;

      cropOriginalCanvasRef.current = null;
      transparentCanvasRef.current = null;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(originalCanvas, 0, 0);

      setIsReady(true);
      setProcessing(false);
      setSelectedPreview(null);
      setSelectedInfo(null);
      setPickedColor(null);
      setStatus("Image ready. Object/Text/Logo select karo.");
    };

    img.onerror = () => {
      alert("Image load nahi ho paayi");
    };

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

      if (pickerMode === "text") {
        ctx.strokeStyle = "#ffd700";
        ctx.fillStyle = "rgba(255,215,0,0.14)";
      } else if (pickerMode === "logo") {
        ctx.strokeStyle = "#00d4ff";
        ctx.fillStyle = "rgba(0,212,255,0.14)";
      } else {
        ctx.strokeStyle = "#ff3333";
        ctx.fillStyle = "rgba(255,0,0,0.12)";
      }

      ctx.lineWidth = 3;
      ctx.setLineDash([8, 6]);
      ctx.strokeRect(r.x, r.y, r.w, r.h);
      ctx.fillRect(r.x, r.y, r.w, r.h);

      ctx.restore();
    }
  }

  function handleMouseDown(e) {
    if (!isReady || processing) return;

    if (pickerMode === "color") {
      pickColor(e);
      return;
    }

    const p = getPoint(e);

    isDrawingRef.current = true;
    startPointRef.current = p;

    selectionRectRef.current = {
      x: p.x,
      y: p.y,
      w: 0,
      h: 0,
    };

    setSelectedPreview(null);
    setSelectedInfo(null);
    cropOriginalCanvasRef.current = null;
    transparentCanvasRef.current = null;

    renderMain(true);
  }

  function handleMouseMove(e) {
    if (!isReady || !isDrawingRef.current || pickerMode === "color") return;

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
    if (!isReady || !isDrawingRef.current) return;

    isDrawingRef.current = false;
    startPointRef.current = null;

    const r = selectionRectRef.current;

    if (!r || r.w < 5 || r.h < 5) {
      setStatus("Selection chhota hai. Thoda bada area select karo.");
      renderMain(false);
      return;
    }

    setStatus("Area selected. Crop Selected Area click karo.");
    renderMain(true);
  }

  function rgbToHex(r, g, b) {
    return (
      "#" +
      [r, g, b]
        .map((value) => value.toString(16).padStart(2, "0"))
        .join("")
        .toUpperCase()
    );
  }

  function pickColor(e) {
    const originalCanvas = originalCanvasRef.current;
    const ctx = originalCanvas.getContext("2d");
    const p = getPoint(e);

    const pixel = ctx.getImageData(
      Math.round(p.x),
      Math.round(p.y),
      1,
      1
    ).data;

    const color = {
      hex: rgbToHex(pixel[0], pixel[1], pixel[2]),
      rgb: `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`,
    };

    setPickedColor(color);
    setStatus(`Color picked: ${color.hex}`);
  }

  function createCropCanvas() {
    const r = selectionRectRef.current;
    const originalCanvas = originalCanvasRef.current;

    if (!r || r.w < 5 || r.h < 5) {
      alert("Pehle area select karo");
      return null;
    }

    const cropCanvas = document.createElement("canvas");
    cropCanvas.width = Math.round(r.w);
    cropCanvas.height = Math.round(r.h);

    const cropCtx = cropCanvas.getContext("2d");

    cropCtx.drawImage(
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

  function cropSelectedArea() {
    const cropCanvas = createCropCanvas();
    if (!cropCanvas) return;

    const cropOriginalCanvas = document.createElement("canvas");
    cropOriginalCanvas.width = cropCanvas.width;
    cropOriginalCanvas.height = cropCanvas.height;
    cropOriginalCanvas.getContext("2d").drawImage(cropCanvas, 0, 0);

    const editableCanvas = document.createElement("canvas");
    editableCanvas.width = cropCanvas.width;
    editableCanvas.height = cropCanvas.height;
    editableCanvas.getContext("2d").drawImage(cropCanvas, 0, 0);

    cropOriginalCanvasRef.current = cropOriginalCanvas;
    transparentCanvasRef.current = editableCanvas;

    const r = selectionRectRef.current;

    setSelectedInfo({
      type:
        pickerMode === "text"
          ? "Text"
          : pickerMode === "logo"
          ? "Logo"
          : "Object",
      width: Math.round(r.w),
      height: Math.round(r.h),
      x: Math.round(r.x),
      y: Math.round(r.y),
    });

    updateSelectedPreview();
    setStatus(
      "Crop ready. AI Remove BG try karo ya Manual Eraser se background clean karo."
    );
  }

  function updateSelectedPreview() {
    const tCanvas = transparentCanvasRef.current;

    if (!tCanvas) return;

    setSelectedPreview(tCanvas.toDataURL("image/png"));

    setTimeout(() => {
      drawTransparentPreviewCanvas();
    }, 30);
  }

  function canvasToBlob(canvas) {
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/png");
    });
  }

  async function aiRemoveBackgroundFromCrop() {
    const cropCanvas = transparentCanvasRef.current || createCropCanvas();
    if (!cropCanvas) return;

    try {
      setProcessing(true);
      setStatus("AI background remove processing...");

      const cropBlob = await canvasToBlob(cropCanvas);

      const formData = new FormData();
      formData.append("file", cropBlob, "selected-crop.png");

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
      const resultUrl = URL.createObjectURL(resultBlob);

      const img = new Image();

      img.onload = () => {
        const tCanvas = document.createElement("canvas");
        tCanvas.width = img.width;
        tCanvas.height = img.height;

        const tCtx = tCanvas.getContext("2d");
        tCtx.clearRect(0, 0, tCanvas.width, tCanvas.height);
        tCtx.drawImage(img, 0, 0);

        transparentCanvasRef.current = tCanvas;

        updateSelectedPreview();

        setProcessing(false);
        setStatus(
          "AI remove applied. Agar background galat bacha hai to Manual Eraser se clean karo, ya Reset to Crop karo."
        );
      };

      img.onerror = () => {
        alert("AI output load nahi hua");
        setProcessing(false);
        setStatus("AI output load failed");
      };

      img.src = resultUrl;
    } catch (error) {
      alert("AI Remove BG Error: " + error.message);
      setProcessing(false);
      setStatus("AI remove failed. Manual Eraser use karo.");
    }
  }

  function resetToOriginalCrop() {
    const cropOriginal = cropOriginalCanvasRef.current;

    if (!cropOriginal) {
      alert("Pehle Crop Selected Area karo");
      return;
    }

    const editableCanvas = document.createElement("canvas");
    editableCanvas.width = cropOriginal.width;
    editableCanvas.height = cropOriginal.height;
    editableCanvas.getContext("2d").drawImage(cropOriginal, 0, 0);

    transparentCanvasRef.current = editableCanvas;

    updateSelectedPreview();
    setStatus("Reset to original crop done. Ab manual eraser se clean karo.");
  }

  function handleEditDown(e) {
    if (!transparentCanvasRef.current) return;

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
    const displayCanvas = document.getElementById("transparent-preview-canvas");
    const tCanvas = transparentCanvasRef.current;
    const originalCrop = cropOriginalCanvasRef.current;

    if (!displayCanvas || !tCanvas || !originalCrop) return;

    const p = getPoint(e, displayCanvas);
    const ctx = tCanvas.getContext("2d");

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

      ctx.drawImage(originalCrop, 0, 0);
    }

    ctx.restore();

    drawTransparentPreviewCanvas();

    if (editTool === "eraser") {
      setStatus("Background erased. Galti ho to Restore Brush use karo.");
    } else {
      setStatus("Area restored. Ab download kar sakti ho.");
    }
  }

  function drawTransparentPreviewCanvas() {
    const displayCanvas = document.getElementById("transparent-preview-canvas");
    const tCanvas = transparentCanvasRef.current;

    if (!displayCanvas || !tCanvas) return;

    displayCanvas.width = tCanvas.width;
    displayCanvas.height = tCanvas.height;

    const ctx = displayCanvas.getContext("2d");
    ctx.clearRect(0, 0, displayCanvas.width, displayCanvas.height);
    ctx.drawImage(tCanvas, 0, 0);

    setSelectedPreview(tCanvas.toDataURL("image/png"));
  }

  function downloadTransparentPNG() {
    const tCanvas = transparentCanvasRef.current;

    if (!tCanvas) {
      alert("Pehle crop ya AI Remove BG karo");
      return;
    }

    tCanvas.toBlob((blob) => {
      if (!blob) {
        alert("Download file create nahi hui");
        return;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;

      link.download =
        pickerMode === "text"
          ? "picked-text-transparent.png"
          : pickerMode === "logo"
          ? "picked-logo-transparent.png"
          : "picked-object-transparent.png";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);
    }, "image/png");
  }

  function clearSelection() {
    selectionRectRef.current = null;
    cropOriginalCanvasRef.current = null;
    transparentCanvasRef.current = null;

    setSelectedPreview(null);
    setSelectedInfo(null);

    renderMain(false);
    setStatus("Selection cleared.");
  }

  function copyColor(value) {
    navigator.clipboard
      .writeText(value)
      .then(() => setStatus(`Copied: ${value}`))
      .catch(() => alert("Copy nahi ho paaya"));
  }

  return (
    <div className="analysis-box">
      <h2>Picker Studio</h2>
      <p>Object / Text / Logo को transparent PNG में निकालो.</p>

      {!isReady && <p>Please upload image first in main upload area.</p>}

      <label>Picker Mode</label>
      <select
        value={pickerMode}
        onChange={(e) => {
          setPickerMode(e.target.value);
          clearSelection();

          if (e.target.value === "color") {
            setStatus("Color Picker: image par click karo.");
          } else {
            setStatus("Area select karo.");
          }
        }}
      >
        <option value="object">Object Picker</option>
        <option value="text">Text Picker</option>
        <option value="logo">Logo Picker</option>
        <option value="color">Color Picker</option>
      </select>

      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <button
          className="upload-btn"
          onClick={cropSelectedArea}
          disabled={pickerMode === "color" || processing}
        >
          Crop Selected Area
        </button>

        <button
          className="upload-btn"
          onClick={aiRemoveBackgroundFromCrop}
          disabled={pickerMode === "color" || processing}
        >
          AI Remove BG
        </button>

        <button className="upload-btn" onClick={resetToOriginalCrop}>
          Reset to Crop
        </button>

        <button className="upload-btn" onClick={clearSelection}>
          Clear Selection
        </button>

        <button
          className="upload-btn"
          onClick={downloadTransparentPNG}
          disabled={!selectedPreview}
        >
          Download Transparent PNG
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
            cursor: pickerMode === "color" ? "copy" : "crosshair",
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      </div>

      {selectedPreview && (
        <div className="analysis-box">
          <h3>Transparent Preview / Manual Cleanup</h3>

          <label>Edit Tool</label>
          <select
            value={editTool}
            onChange={(e) => setEditTool(e.target.value)}
          >
            <option value="eraser">Manual Eraser - background हटाओ</option>
            <option value="restore">Restore Brush - गलती वापस लाओ</option>
          </select>

          <label>Brush Size: {brushSize}px</label>
          <input
            type="range"
            min="5"
            max="160"
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
          />

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
              id="transparent-preview-canvas"
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

          {selectedInfo && (
            <>
              <p>Type: {selectedInfo.type}</p>
              <p>Size: {selectedInfo.width}px × {selectedInfo.height}px</p>
            </>
          )}

          <p>
            <b>Best use:</b> AI खराब करे तो Reset to Crop दबाओ, फिर Manual
            Eraser से background हटाओ. गलती हो तो Restore Brush use करो.
          </p>
        </div>
      )}

      {pickerMode === "color" && (
        <div className="analysis-box">
          <h3>Color Picker Result</h3>

          {pickedColor ? (
            <>
              <div
                style={{
                  width: "80px",
                  height: "80px",
                  borderRadius: "10px",
                  border: "2px solid #d4af37",
                  background: pickedColor.hex,
                }}
              />

              <p>HEX: {pickedColor.hex}</p>
              <p>RGB: {pickedColor.rgb}</p>

              <button
                className="upload-btn"
                onClick={() => copyColor(pickedColor.hex)}
              >
                Copy HEX
              </button>

              <button
                className="upload-btn"
                onClick={() => copyColor(pickedColor.rgb)}
              >
                Copy RGB
              </button>
            </>
          ) : (
            <p>Image par click karo color pick karne ke liye.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default PickerStudio;