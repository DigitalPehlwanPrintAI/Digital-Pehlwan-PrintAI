function ImageInfo({ imageInfo, unit, setUnit }) {
  if (!imageInfo) return null;

  function getSize() {
    if (unit === "pixel") {
      return {
        width: imageInfo.pixels.width,
        height: imageInfo.pixels.height,
        label: "px",
      };
    }

    if (unit === "inch") {
      return {
        width: imageInfo.original_size.inch.width,
        height: imageInfo.original_size.inch.height,
        label: "inch",
      };
    }

    if (unit === "feet") {
      return {
        width: imageInfo.original_size.feet.width,
        height: imageInfo.original_size.feet.height,
        label: "ft",
      };
    }

    if (unit === "cm") {
      return {
        width: imageInfo.original_size.cm.width,
        height: imageInfo.original_size.cm.height,
        label: "cm",
      };
    }

    return null;
  }

  const size = getSize();

  return (
    <div className="analysis-box">
      <h2>Image Size</h2>

      <label>Select Unit</label>
      <select value={unit} onChange={(e) => setUnit(e.target.value)}>
        <option value="pixel">Pixel</option>
        <option value="inch">Inch</option>
        <option value="feet">Feet</option>
        <option value="cm">CM</option>
      </select>

      <p>
        Width: {size.width} {size.label}
      </p>

      <p>
        Height: {size.height} {size.label}
      </p>

      <hr />

      <p>
        Pixel Size: {imageInfo.pixels.width} × {imageInfo.pixels.height} px
      </p>

      <p>
        DPI: {imageInfo.embedded_dpi.x} × {imageInfo.embedded_dpi.y}
        {imageInfo.embedded_dpi.found ? "" : " (Default 72)"}
      </p>

      {!imageInfo.embedded_dpi.found && (
        <p>
          Note: Is image me DPI saved nahi hai, isliye physical size 72 DPI
          estimate par dikh raha hai.
        </p>
      )}
    </div>
  );
}

export default ImageInfo;