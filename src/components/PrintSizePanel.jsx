import { useState } from "react";

function PrintSizePanel({ onSizeChange }) {
  const [widthFeet, setWidthFeet] = useState(12);
  const [widthInch, setWidthInch] = useState(0);
  const [heightFeet, setHeightFeet] = useState(3);
  const [heightInch, setHeightInch] = useState(10);
  const [dpi, setDpi] = useState(300);
  const [fitMode, setFitMode] = useState("Contain");

  function calculatePixels() {
    const totalWidthInch = widthFeet * 12 + widthInch;
    const totalHeightInch = heightFeet * 12 + heightInch;

    const widthPx = Math.round(totalWidthInch * dpi);
    const heightPx = Math.round(totalHeightInch * dpi);

    onSizeChange({
      widthPx,
      heightPx,
      widthInch: totalWidthInch,
      heightInch: totalHeightInch,
      dpi,
      fitMode,
    });
  }

  return (
    <div className="print-size-panel">
      <h2>Print Size Setup</h2>

      <label>Width Feet</label>
      <input type="number" value={widthFeet} onChange={(e) => setWidthFeet(Number(e.target.value))} />

      <label>Width Inch</label>
      <input type="number" value={widthInch} onChange={(e) => setWidthInch(Number(e.target.value))} />

      <label>Height Feet</label>
      <input type="number" value={heightFeet} onChange={(e) => setHeightFeet(Number(e.target.value))} />

      <label>Height Inch</label>
      <input type="number" value={heightInch} onChange={(e) => setHeightInch(Number(e.target.value))} />

      <label>DPI</label>
      <select value={dpi} onChange={(e) => setDpi(Number(e.target.value))}>
        <option value="72">72 DPI</option>
        <option value="100">100 DPI</option>
        <option value="150">150 DPI</option>
        <option value="300">300 DPI</option>
      </select>

      <label>Fit Mode</label>
      <select value={fitMode} onChange={(e) => setFitMode(e.target.value)}>
        <option>Contain</option>
        <option>Cover</option>
        <option>Stretch</option>
      </select>

      <button onClick={calculatePixels}>Apply Size to Image</button>
    </div>
  );
}

export default PrintSizePanel;