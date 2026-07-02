import { useState } from "react";
import "./App.css";

import ImageInfo from "./components/ImageInfo.jsx";

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [image, setImage] = useState(null);
  const [imageInfo, setImageInfo] = useState(null);
  const [unit, setUnit] = useState("pixel");

  const [resizeWidth, setResizeWidth] = useState("");
  const [resizeHeight, setResizeHeight] = useState("");
  const [resizeUnit, setResizeUnit] = useState("feet");
  const [resizeDpi, setResizeDpi] = useState(100);

  const [resizedImage, setResizedImage] = useState(null);
  const [resizedSize, setResizedSize] = useState(null);

  async function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    setSelectedFile(file);

    const imageUrl = URL.createObjectURL(file);
    setImage(imageUrl);
    setImageInfo(null);
    setResizedImage(null);
    setResizedSize(null);

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("http://127.0.0.1:8000/process", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    setImageInfo(data);
  }

  function convertToInch(value, selectedUnit) {
    const numberValue = Number(value);
    if (!numberValue) return 0;

    if (selectedUnit === "feet") return numberValue * 12;
    if (selectedUnit === "inch") return numberValue;
    if (selectedUnit === "cm") return numberValue / 2.54;
    if (selectedUnit === "pixel") return numberValue / resizeDpi;

    return 0;
  }

  function calculateRequiredPixels() {
    if (!resizeWidth || !resizeHeight) return null;

    const widthInch = convertToInch(resizeWidth, resizeUnit);
    const heightInch = convertToInch(resizeHeight, resizeUnit);

    return {
      widthPx: Math.round(widthInch * resizeDpi),
      heightPx: Math.round(heightInch * resizeDpi),
      widthFeet: (widthInch / 12).toFixed(2),
      heightFeet: (heightInch / 12).toFixed(2),
      widthInch: widthInch.toFixed(2),
      heightInch: heightInch.toFixed(2),
      widthCm: (widthInch * 2.54).toFixed(2),
      heightCm: (heightInch * 2.54).toFixed(2),
    };
  }

  async function handleRealResize() {
    if (!selectedFile) {
      alert("Please upload image first");
      return;
    }

    const required = calculateRequiredPixels();

    if (!required || required.widthPx <= 0 || required.heightPx <= 0) {
      alert("Please enter correct width and height");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("width_px", required.widthPx);
    formData.append("height_px", required.heightPx);

    const response = await fetch("http://127.0.0.1:8000/resize", {
      method: "POST",
      body: formData,
    });

    const blob = await response.blob();
    const resizedUrl = URL.createObjectURL(blob);

    setResizedImage(resizedUrl);
    setResizedSize(required);
  }

  const required = calculateRequiredPixels();

  return (
    <div className="app">
      <h1>Digital Pehlwan PrintAI</h1>
      <p>AI Image Size Checker + Real Resize</p>

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

      {image && imageInfo && (
        <div className="preview-box">
          <div className="analysis-box">
            <h2>Original Uploaded Image</h2>
            <img src={image} alt="Original Preview" />
          </div>

          <ImageInfo imageInfo={imageInfo} unit={unit} setUnit={setUnit} />

          <div className="analysis-box">
            <h2>Resize Image</h2>

            <label>Output Width</label>
            <input
              type="number"
              value={resizeWidth}
              onChange={(e) => setResizeWidth(e.target.value)}
              placeholder="Example: 15"
            />

            <label>Output Height</label>
            <input
              type="number"
              value={resizeHeight}
              onChange={(e) => setResizeHeight(e.target.value)}
              placeholder="Example: 2"
            />

            <label>Output Unit</label>
            <select
              value={resizeUnit}
              onChange={(e) => setResizeUnit(e.target.value)}
            >
              <option value="feet">Feet</option>
              <option value="inch">Inch</option>
              <option value="cm">CM</option>
              <option value="pixel">Pixel</option>
            </select>

            <label>DPI / Print Quality</label>
            <select
              value={resizeDpi}
              onChange={(e) => setResizeDpi(Number(e.target.value))}
            >
              <option value="72">72 Screen / Default</option>
              <option value="100">100 Flex / Banner</option>
              <option value="150">150 Poster</option>
              <option value="300">300 High Quality Print</option>
            </select>

            {required && (
              <>
                <h2>Resize Calculation</h2>

                <p>
                  Output Size: {required.widthFeet} × {required.heightFeet} ft
                </p>
                <p>
                  Output Size: {required.widthInch} × {required.heightInch} inch
                </p>
                <p>
                  Output Size: {required.widthCm} × {required.heightCm} cm
                </p>
                <p>
                  Final Pixels: {required.widthPx} × {required.heightPx} px
                </p>
              </>
            )}

            <button onClick={handleRealResize} className="upload-btn">
              Resize Now
            </button>

            {resizedImage && resizedSize && (
              <>
                <hr />

                <h2>Resized Image Output</h2>

                <p>
                  Final Size: {resizedSize.widthPx} × {resizedSize.heightPx} px
                </p>

                <img src={resizedImage} alt="Resized Output" />

                <a
                  href={resizedImage}
                  download="resized-image.jpg"
                  className="upload-btn"
                >
                  Download Resized Image
                </a>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;