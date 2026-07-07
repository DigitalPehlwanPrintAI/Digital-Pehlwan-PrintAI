import { useState } from "react";

function SmartPrintStudio() {
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [unit, setUnit] = useState("feet");
  const [dpi, setDpi] = useState(300);

  const [rgb, setRgb] = useState({ r: 255, g: 0, b: 0 });
  const [cmyk, setCmyk] = useState({ c: 0, m: 100, y: 100, k: 0 });

  const [bleedMm, setBleedMm] = useState(3);
  const [safeMarginMm, setSafeMarginMm] = useState(5);

  const [mediaRate, setMediaRate] = useState(20);
  const [laminationRate, setLaminationRate] = useState(0);
  const [cuttingRate, setCuttingRate] = useState(0);

  function toInch(value, selectedUnit) {
    const num = Number(value);
    if (!num) return 0;

    if (selectedUnit === "feet") return num * 12;
    if (selectedUnit === "inch") return num;
    if (selectedUnit === "cm") return num / 2.54;
    if (selectedUnit === "mm") return num / 25.4;

    return 0;
  }

  const widthInch = toInch(width, unit);
  const heightInch = toInch(height, unit);

  const widthPx = Math.round(widthInch * dpi);
  const heightPx = Math.round(heightInch * dpi);

  const widthFeet = widthInch / 12;
  const heightFeet = heightInch / 12;
  const areaSqFt = widthFeet * heightFeet;

  const bleedInch = bleedMm / 25.4;
  const safeInch = safeMarginMm / 25.4;

  const finalWidthWithBleed = widthInch + bleedInch * 2;
  const finalHeightWithBleed = heightInch + bleedInch * 2;

  const finalBleedPxW = Math.round(finalWidthWithBleed * dpi);
  const finalBleedPxH = Math.round(finalHeightWithBleed * dpi);

  const safeAreaWidth = Math.max(0, widthInch - safeInch * 2);
  const safeAreaHeight = Math.max(0, heightInch - safeInch * 2);

  const totalCost =
    areaSqFt * Number(mediaRate || 0) +
    areaSqFt * Number(laminationRate || 0) +
    Number(cuttingRate || 0);

  function rgbToCmyk(r, g, b) {
    const rr = Number(r) / 255;
    const gg = Number(g) / 255;
    const bb = Number(b) / 255;

    const k = 1 - Math.max(rr, gg, bb);

    if (k === 1) {
      return { c: 0, m: 0, y: 0, k: 100 };
    }

    const c = Math.round(((1 - rr - k) / (1 - k)) * 100);
    const m = Math.round(((1 - gg - k) / (1 - k)) * 100);
    const y = Math.round(((1 - bb - k) / (1 - k)) * 100);
    const kk = Math.round(k * 100);

    return { c, m, y, k: kk };
  }

  function cmykToRgb(c, m, y, k) {
    const cc = Number(c) / 100;
    const mm = Number(m) / 100;
    const yy = Number(y) / 100;
    const kk = Number(k) / 100;

    const r = Math.round(255 * (1 - cc) * (1 - kk));
    const g = Math.round(255 * (1 - mm) * (1 - kk));
    const b = Math.round(255 * (1 - yy) * (1 - kk));

    return { r, g, b };
  }

  function handleRgbChange(key, value) {
    const next = {
      ...rgb,
      [key]: Math.max(0, Math.min(255, Number(value))),
    };

    setRgb(next);
    setCmyk(rgbToCmyk(next.r, next.g, next.b));
  }

  function handleCmykChange(key, value) {
    const next = {
      ...cmyk,
      [key]: Math.max(0, Math.min(100, Number(value))),
    };

    setCmyk(next);
    setRgb(cmykToRgb(next.c, next.m, next.y, next.k));
  }

  function applyPreset(preset) {
    if (preset === "visiting-card") {
      setWidth(89);
      setHeight(51);
      setUnit("mm");
      setDpi(300);
    }

    if (preset === "a4") {
      setWidth(21);
      setHeight(29.7);
      setUnit("cm");
      setDpi(300);
    }

    if (preset === "a3") {
      setWidth(29.7);
      setHeight(42);
      setUnit("cm");
      setDpi(300);
    }

    if (preset === "banner-4x8") {
      setWidth(4);
      setHeight(8);
      setUnit("feet");
      setDpi(150);
    }

    if (preset === "flex-6x3") {
      setWidth(6);
      setHeight(3);
      setUnit("feet");
      setDpi(100);
    }

    if (preset === "standee") {
      setWidth(2);
      setHeight(6);
      setUnit("feet");
      setDpi(150);
    }
  }

  function copyReport() {
    const report = `
Smart Print Studio Report

Size:
${width || 0} x ${height || 0} ${unit}

DPI:
${dpi}

Pixels:
${widthPx} x ${heightPx}px

Size in Inch:
${widthInch.toFixed(2)} x ${heightInch.toFixed(2)} inch

Size in Feet:
${widthFeet.toFixed(2)} x ${heightFeet.toFixed(2)} ft

Bleed:
${bleedMm} mm

Final with Bleed:
${finalWidthWithBleed.toFixed(2)} x ${finalHeightWithBleed.toFixed(2)} inch
${finalBleedPxW} x ${finalBleedPxH}px

Safe Margin:
${safeMarginMm} mm

Safe Area:
${safeAreaWidth.toFixed(2)} x ${safeAreaHeight.toFixed(2)} inch

RGB:
${rgb.r}, ${rgb.g}, ${rgb.b}

CMYK:
${cmyk.c}, ${cmyk.m}, ${cmyk.y}, ${cmyk.k}

Approx Print Cost:
₹${totalCost.toFixed(2)}
`;

    navigator.clipboard.writeText(report);
    alert("Print report copied");
  }

  return (
    <div className="preview-box">
      <div className="analysis-box">
        <h1>Smart Print Studio</h1>
        <p>
          DPI Calculator • Print Size • CMYK Converter • Bleed • Crop Marks •
          Safe Margin • Print Cost Calculator
        </p>

        <h3>Quick Presets</h3>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button className="upload-btn" onClick={() => applyPreset("visiting-card")}>
            Visiting Card
          </button>

          <button className="upload-btn" onClick={() => applyPreset("a4")}>
            A4
          </button>

          <button className="upload-btn" onClick={() => applyPreset("a3")}>
            A3
          </button>

          <button className="upload-btn" onClick={() => applyPreset("banner-4x8")}>
            4×8 ft Banner
          </button>

          <button className="upload-btn" onClick={() => applyPreset("flex-6x3")}>
            6×3 ft Flex
          </button>

          <button className="upload-btn" onClick={() => applyPreset("standee")}>
            Standee
          </button>
        </div>
      </div>

      <div className="analysis-box">
        <h2>Print Size Calculator</h2>

        <label>Width</label>
        <input
          type="number"
          value={width}
          onChange={(e) => setWidth(e.target.value)}
          placeholder="Example: 4"
        />

        <label>Height</label>
        <input
          type="number"
          value={height}
          onChange={(e) => setHeight(e.target.value)}
          placeholder="Example: 8"
        />

        <label>Unit</label>
        <select value={unit} onChange={(e) => setUnit(e.target.value)}>
          <option value="feet">Feet</option>
          <option value="inch">Inch</option>
          <option value="cm">CM</option>
          <option value="mm">MM</option>
        </select>

        <label>DPI</label>
        <select value={dpi} onChange={(e) => setDpi(Number(e.target.value))}>
          <option value={72}>72 DPI - Hoarding / Screen</option>
          <option value={100}>100 DPI - Flex</option>
          <option value={150}>150 DPI - Banner / Standee</option>
          <option value={200}>200 DPI - Better Print</option>
          <option value={300}>300 DPI - High Quality Print</option>
          <option value={600}>600 DPI - Premium Print</option>
          <option value={1200}>1200 DPI - Ultra Detail</option>
        </select>

        <h3>Output Pixels</h3>
        <p>
          <b>{widthPx}</b> × <b>{heightPx}</b> px
        </p>

        <p>
          Size: {widthInch.toFixed(2)} × {heightInch.toFixed(2)} inch
        </p>

        <p>
          Size: {widthFeet.toFixed(2)} × {heightFeet.toFixed(2)} ft
        </p>

        <p>
          Area: {areaSqFt.toFixed(2)} sq.ft
        </p>
      </div>

      <div className="analysis-box">
        <h2>Bleed + Safe Margin</h2>

        <label>Bleed MM</label>
        <input
          type="number"
          value={bleedMm}
          onChange={(e) => setBleedMm(Number(e.target.value))}
        />

        <label>Safe Margin MM</label>
        <input
          type="number"
          value={safeMarginMm}
          onChange={(e) => setSafeMarginMm(Number(e.target.value))}
        />

        <h3>Final Size With Bleed</h3>
        <p>
          {finalWidthWithBleed.toFixed(2)} × {finalHeightWithBleed.toFixed(2)} inch
        </p>

        <p>
          {finalBleedPxW} × {finalBleedPxH} px
        </p>

        <h3>Safe Area</h3>
        <p>
          {safeAreaWidth.toFixed(2)} × {safeAreaHeight.toFixed(2)} inch
        </p>

        <p>
          Crop Marks: Auto Crop Mark Engine next step में file export के साथ connect होगा.
        </p>
      </div>

      <div className="analysis-box">
        <h2>RGB ↔ CMYK Converter</h2>

        <h3>RGB</h3>

        <label>R</label>
        <input
          type="number"
          value={rgb.r}
          onChange={(e) => handleRgbChange("r", e.target.value)}
        />

        <label>G</label>
        <input
          type="number"
          value={rgb.g}
          onChange={(e) => handleRgbChange("g", e.target.value)}
        />

        <label>B</label>
        <input
          type="number"
          value={rgb.b}
          onChange={(e) => handleRgbChange("b", e.target.value)}
        />

        <div
          style={{
            width: "120px",
            height: "70px",
            border: "2px solid #d4af37",
            borderRadius: "10px",
            background: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
            marginTop: "12px",
          }}
        />

        <h3>CMYK</h3>

        <label>C</label>
        <input
          type="number"
          value={cmyk.c}
          onChange={(e) => handleCmykChange("c", e.target.value)}
        />

        <label>M</label>
        <input
          type="number"
          value={cmyk.m}
          onChange={(e) => handleCmykChange("m", e.target.value)}
        />

        <label>Y</label>
        <input
          type="number"
          value={cmyk.y}
          onChange={(e) => handleCmykChange("y", e.target.value)}
        />

        <label>K</label>
        <input
          type="number"
          value={cmyk.k}
          onChange={(e) => handleCmykChange("k", e.target.value)}
        />

        <p>
          CMYK: {cmyk.c}, {cmyk.m}, {cmyk.y}, {cmyk.k}
        </p>
      </div>

      <div className="analysis-box">
        <h2>Print Cost Calculator</h2>

        <label>Media Rate / sq.ft ₹</label>
        <input
          type="number"
          value={mediaRate}
          onChange={(e) => setMediaRate(e.target.value)}
        />

        <label>Lamination Rate / sq.ft ₹</label>
        <input
          type="number"
          value={laminationRate}
          onChange={(e) => setLaminationRate(e.target.value)}
        />

        <label>Cutting / Fixed Charge ₹</label>
        <input
          type="number"
          value={cuttingRate}
          onChange={(e) => setCuttingRate(e.target.value)}
        />

        <h3>Total Cost</h3>
        <p>
          <b>₹{totalCost.toFixed(2)}</b>
        </p>

        <button className="upload-btn" onClick={copyReport}>
          Copy Print Report
        </button>
      </div>
    </div>
  );
}

export default SmartPrintStudio;