import { useState } from "react";
import "./App.css";

function App() {
  const [image, setImage] = useState(null);
  const [imageSize, setImageSize] = useState(null);

  function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const imageUrl = URL.createObjectURL(file);
    setImage(imageUrl);

    const img = new Image();
    img.onload = function () {
      setImageSize({
        width: img.width,
        height: img.height,
      });
    };
    img.src = imageUrl;
  }

  return (
    <div className="app">
      <h1>Digital Pehlwan PrintAI</h1>
      <p>AI Image to Professional Print-Ready Artwork</p>

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

      {image && (
        <div className="preview-box">
          <img src={image} alt="Preview" />

          {imageSize && (
            <div className="analysis-box">
              <h2>Original Image Pixel Size</h2>
              <p>{imageSize.width} × {imageSize.height} px</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;