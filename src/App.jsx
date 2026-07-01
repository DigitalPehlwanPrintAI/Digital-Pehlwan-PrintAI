import { useState } from "react";
import "./App.css";

function App() {
  const [image, setImage] = useState(null);
  const [imageInfo, setImageInfo] = useState(null);
  const [unit, setUnit] = useState("pixel");

  async function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const imageUrl = URL.createObjectURL(file);
    setImage(imageUrl);
    setImageInfo(null);

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("http://127.0.0.1:8000/process", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    setImageInfo(data);
  }

  function getSize() {
    if (!imageInfo) return null;

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
    <div className="app">
      <h1>Digital Pehlwan PrintAI</h1>
      <p>AI Image Size Checker</p>

      <label htmlFor="imageUpload" className="upload-btn">
        Upload Image
      </label>

      <input
        id="imageUpload"
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        hidden
      />

      {image && imageInfo && size && (
        <div className="preview-box">
          <img src={image} alt="Preview" />

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
        </div>
      )}
    </div>
  );
}

export default App;