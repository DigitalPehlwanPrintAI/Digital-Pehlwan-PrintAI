import { useState } from "react";

function PrintSetup({ image, imageInfo }) {
  const [resizeWidth, setResizeWidth] = useState("");
  const [resizeHeight, setResizeHeight] = useState("");
  const [resizeUnit, setResizeUnit] = useState("feet");
  const [dpi, setDpi] = useState(300);
  const [fitMode, setFitMode] = useState("contain");
  const [result, setResult] = useState(null);

  function convertToPixels(value) {
    const num = Number(value);

    if (resizeUnit === "feet") return Math.round(num * 12 * dpi);
    if (resizeUnit === "inch") return Math.round(num * dpi);
    if (resizeUnit === "cm") return Math.round((num / 2.54) * dpi);
    if (resizeUnit === "pixel") return Math.round(num);

    return 0;
  }

  function applyResize() {
    if (!resizeWidth || !resizeHeight) {
      alert("Width aur Height dono enter karo");
      return;
    }

    setResult({
      widthPx: convertToPixels(resizeWidth),
      heightPx: convertToPixels(resizeHeight),
      width: resizeWidth,
      height: resizeHeight,
      unit: resizeUnit,
      dpi,
      fitMode,
    });
  }

  return (
    <div className="print-size-panel">
      <h2>Original Image Size</h2>

      <div className="analysis-box">
        <p>Pixel: {imageInfo.pixels.width} × {imageInfo.pixels.height} px</p>
        <p>
          DPI: {imageInfo.embedded_dpi.x} × {imageInfo.embedded_dpi.y}
          {imageInfo.embedded_dpi.found ? "" : " (Default)"}
        </p>
        <p>
          Inch: {imageInfo.original_size.inch.width} ×{" "}
          {imageInfo.original_size.inch.height} inch
        </p>
        <p>
          Feet: {imageInfo.original_size.feet.width} ×{" "}
          {imageInfo.original_size.feet.height} ft
        </p>
        <p>
          CM: {imageInfo.original_size.cm.width} ×{" "}
          {imageInfo.original_size.cm.height} cm
        </p>
        <p>Color Mode: {imageInfo.color_mode}</p>
        <p>Aspect Ratio: {imageInfo.aspect_ratio}</p>
      </div>

      <h2>Resize Image</h2>

      <label>Unit</label>
      <select value={resizeUnit} onChange={(e) => setResizeUnit(e.target.value)}>
        <option value="feet">Feet</option>
        <option value="inch">Inch</option>
        <option value="cm">CM</option>
        <option value="pixel">Pixel</option>
      </select>

      <label>Width</label>
      <input
        type="number"
        value={resizeWidth}
        onChange={(e) => setResizeWidth(e.target.value)}
      />

      <label>Height</label>
      <input
        type="number"
        value={resizeHeight}
        onChange={(e) => setResizeHeight(e.target.value)}
      />

      <label>DPI</label>
      <select value={dpi} onChange={(e) => setDpi(Number(e.target.value))}>
        <option value="72">72 DPI</option>
        <option value="100">100 DPI</option>
        <option value="150">150 DPI</option>
        <option value="300">300 DPI</option>
        <option value="600">600 DPI</option>
      </select>

      <label>Fit Mode</label>
      <select value={fitMode} onChange={(e) => setFitMode(e.target.value)}>
        <option value="contain">Contain</option>
        <option value="cover">Cover</option>
        <option value="fill">Fill</option>
      </select>

      <button onClick={applyResize}>Apply Resize</button>

      {result && (
        <div className="analysis-box">
          <h2>Resize Result</h2>
          <p>
            New Size: {result.width} × {result.height} {result.unit}
          </p>
          <p>
            Output Pixels: {result.widthPx} × {result.heightPx} px
          </p>

          <div
            style={{
              width: "90%",
              maxWidth: "700px",
              aspectRatio: `${result.widthPx} / ${result.heightPx}`,
              border: "2px solid white",
              margin: "20px auto",
              overflow: "hidden",
              background: "#fff",
            }}
          >
            <img
              src={image}
              alt="Resize Preview"
              style={{
                width: "100%",
                height: "100%",
                objectFit: result.fitMode,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default PrintSetup;