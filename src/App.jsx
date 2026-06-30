import { useState } from "react";
import "./App.css";

function App() {
  const [image, setImage] = useState(null);

  function handleImageUpload(event) {
    const file = event.target.files[0];

    if (file) {
      setImage(URL.createObjectURL(file));
    }
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
        <>
          <div className="preview-box">
            <h2>Image Preview</h2>
            <img src={image} alt="Uploaded preview" />
          </div>

          <div className="tools-box">
            <h2>AI Print Tools</h2>

            <div className="tool-grid">
              <button>Remove Background</button>
              <button>HD Upscale</button>
              <button>CMYK Convert</button>
              <button>Vector Text Detect</button>
              <button>300 DPI Setup</button>
              <button>Print Size Check</button>
            </div>

            <button className="generate-btn">
              Generate Print Ready PDF
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default App;
