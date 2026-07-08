import ImportExportStudio from "./components/ImportExportStudio";
import SplashScreen from "./components/SplashScreen.jsx";
import { useState } from "react";
import "./App.css";
import ImageInfo from "./components/ImageInfo.jsx";
import SmartEditing from "./SmartEditing.jsx";
import SmartPrintStudio from "./components/SmartPrintStudio.jsx";
import SmartBatchStudio from "./components/SmartBatchStudio.jsx";
import TopMenu from "./components/TopMenu.jsx";
import Auth from "./Auth.jsx";

function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    const savedUser = localStorage.getItem("printai_current_user");
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [tab, setTab] = useState("importexport");
  const [showSplash, setShowSplash] = useState(true);

  const [selectedFile, setSelectedFile] = useState(null);
  const [image, setImage] = useState(null);
  const [imageInfo, setImageInfo] = useState(null);
  const [unit, setUnit] = useState("pixel");

  const [resizeWidth, setResizeWidth] = useState("");
  const [resizeHeight, setResizeHeight] = useState("");
  const [resizeUnit, setResizeUnit] = useState("feet");
  const [resizeDpi, setResizeDpi] = useState(100);
  const [purpose, setPurpose] = useState("banner");

  const [originalQualityReport, setOriginalQualityReport] = useState(null);

  const [resizedImage, setResizedImage] = useState(null);
  const [resizedBlob, setResizedBlob] = useState(null);
  const [resizedSize, setResizedSize] = useState(null);
  const [resizedQualityReport, setResizedQualityReport] = useState(null);

  const [improveStrength, setImproveStrength] = useState("medium");
  const [improvedImage, setImprovedImage] = useState(null);
  const [improvedBlob, setImprovedBlob] = useState(null);
  const [improvedQualityReport, setImprovedQualityReport] = useState(null);

  const [finalDpi, setFinalDpi] = useState(300);
  const [finalFormat, setFinalFormat] = useState("pdf");

  const [repairSharpness, setRepairSharpness] = useState(1.3);
  const [repairContrast, setRepairContrast] = useState(1.1);
  const [repairNoise, setRepairNoise] = useState(1.0);
  const [repairUpscale, setRepairUpscale] = useState(2);
  const [repairedImage, setRepairedImage] = useState(null);
  const [repairedBlob, setRepairedBlob] = useState(null);
  const [repairExportDpi, setRepairExportDpi] = useState(300);
  const [repairExportFormat, setRepairExportFormat] = useState("jpg");
  const [repairMode, setRepairMode] = useState(null);

  async function analyzeImageQuality(file, targetWidthPx, targetHeightPx) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("target_width_px", targetWidthPx);
    formData.append("target_height_px", targetHeightPx);

    const response = await fetch("https://digital-pehlwan-printai.onrender.com/analyze-quality", {
      method: "POST",
      body: formData,
    });

    return await response.json();
  }

  function getValue(value) {
    return value === undefined || value === null ? "Not Available" : value;
  }

  async function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    setSelectedFile(file);

    const imageUrl = URL.createObjectURL(file);
    setImage(imageUrl);

    setImageInfo(null);
    setOriginalQualityReport(null);
    setResizedImage(null);
    setResizedBlob(null);
    setResizedSize(null);
    setResizedQualityReport(null);
    setImprovedImage(null);
    setImprovedBlob(null);
    setImprovedQualityReport(null);
    setRepairedImage(null);
    setRepairedBlob(null);
    setRepairMode(null);

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("https://digital-pehlwan-printai.onrender.com/process", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    setImageInfo(data);

    const originalReport = await analyzeImageQuality(
      file,
      data.pixels.width,
      data.pixels.height
    );

    setOriginalQualityReport(originalReport);
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
      purpose,
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

    setResizedQualityReport(null);
    setImprovedImage(null);
    setImprovedBlob(null);
    setImprovedQualityReport(null);

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("width_px", required.widthPx);
    formData.append("height_px", required.heightPx);
    formData.append("purpose", purpose);

    const response = await fetch("https://digital-pehlwan-printai.onrender.com/resize", {
      method: "POST",
      body: formData,
    });

    const blob = await response.blob();
    const resizedUrl = URL.createObjectURL(blob);

    setResizedImage(resizedUrl);
    setResizedBlob(blob);
    setResizedSize(required);

    const resizedFile = new File([blob], "resized-image.jpg", {
      type: "image/jpeg",
    });

    const report = await analyzeImageQuality(
      resizedFile,
      required.widthPx,
      required.heightPx
    );

    setResizedQualityReport(report);
  }

  async function handleAnalyzeResizedQuality() {
    if (!resizedBlob || !resizedSize) {
      alert("Please resize image first");
      return;
    }

    const resizedFile = new File([resizedBlob], "resized-image.jpg", {
      type: "image/jpeg",
    });

    const report = await analyzeImageQuality(
      resizedFile,
      resizedSize.widthPx,
      resizedSize.heightPx
    );

    setResizedQualityReport(report);
  }

  async function handleImproveQuality() {
    if (!resizedBlob || !resizedSize) {
      alert("Please resize image first");
      return;
    }

    const resizedFile = new File([resizedBlob], "resized-image.jpg", {
      type: "image/jpeg",
    });

    const formData = new FormData();
    formData.append("file", resizedFile);
    formData.append("strength", improveStrength);
    formData.append("export_dpi", finalDpi);

    const response = await fetch("https://digital-pehlwan-printai.onrender.com/improve-quality", {
      method: "POST",
      body: formData,
    });

    const blob = await response.blob();
    const improvedUrl = URL.createObjectURL(blob);

    setImprovedImage(improvedUrl);
    setImprovedBlob(blob);

    const improvedFile = new File([blob], "improved-image.jpg", {
      type: "image/jpeg",
    });

    const report = await analyzeImageQuality(
      improvedFile,
      resizedSize.widthPx,
      resizedSize.heightPx
    );

    setImprovedQualityReport(report);
  }

  function getExportExtension(format) {
    if (format === "jpeg") return "jpg";
    if (format === "cdr") return "zip";
    return format;
  }

  async function exportWithModuleOneEngine({ file, format, fileNamePrefix, widthPx = 0, heightPx = 0, dpiValue = finalDpi }) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("export_format", format);
    formData.append("quality", "98");
    formData.append("dpi", String(dpiValue));
    formData.append("color_mode", "RGB");
    formData.append("background_mode", format === "jpg" || format === "jpeg" || format === "pdf" ? "white" : "transparent");
    formData.append("custom_bg", "#ffffff");
    formData.append("resize_mode", widthPx > 0 && heightPx > 0 ? "custom" : "original");
    formData.append("custom_width", String(widthPx || 0));
    formData.append("custom_height", String(heightPx || 0));

    const response = await fetch("https://digital-pehlwan-printai.onrender.com/import-export/export-image", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.detail || "Export failed");
    }

    const blob = await response.blob();
    const extension = getExportExtension(format);
    const fileName =
      format === "cdr"
        ? `${fileNamePrefix}_corel_compatible_files.zip`
        : `${fileNamePrefix}_${dpiValue}dpi.${extension}`;

    downloadBlob(blob, fileName);
  }

  async function handleExportOriginalSizedFile(format) {
    if (!selectedFile) {
      alert("Please upload image first");
      return;
    }

    const required = calculateRequiredPixels();

    if (!required || required.widthPx <= 0 || required.heightPx <= 0) {
      alert("Please enter width and height first");
      return;
    }

    try {
      await exportWithModuleOneEngine({
        file: selectedFile,
        format,
        fileNamePrefix: `print-ready-${purpose}`,
        widthPx: required.widthPx,
        heightPx: required.heightPx,
        dpiValue: finalDpi,
      });
    } catch (error) {
      alert("Export Error: " + error.message);
    }
  }

  async function handleExportImprovedFile(format) {
    if (!improvedBlob) {
      alert("Please improve image first");
      return;
    }

    const improvedFile = new File([improvedBlob], "improved-image.png", {
      type: "image/png",
    });

    try {
      await exportWithModuleOneEngine({
        file: improvedFile,
        format,
        fileNamePrefix: `improved-${purpose}`,
        dpiValue: finalDpi,
      });
    } catch (error) {
      alert("Export Error: " + error.message);
    }
  }

  async function handleAutoRepair() {
    if (!selectedFile) {
      alert("Please upload image first");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("mode", "auto");

    const response = await fetch("https://digital-pehlwan-printai.onrender.com/smart-repair", {
      method: "POST",
      body: formData,
    });

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);

    setRepairedImage(url);
    setRepairedBlob(blob);
    setRepairMode("auto");
  }

  async function handleManualRepair() {
    if (!selectedFile) {
      alert("Please upload image first");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("mode", "manual");
    formData.append("sharpness", repairSharpness);
    formData.append("contrast", repairContrast);
    formData.append("noise_reduction", repairNoise);
    formData.append("upscale", repairUpscale);

    const response = await fetch("https://digital-pehlwan-printai.onrender.com/smart-repair", {
      method: "POST",
      body: formData,
    });

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);

    setRepairedImage(url);
    setRepairedBlob(blob);
    setRepairMode("manual");
  }

  async function handleExportRepairedFile(formatToDownload = repairExportFormat) {
    if (!repairedBlob) {
      alert("Please repair image first");
      return;
    }

    const repairedFile = new File([repairedBlob], "smart-repair.png", {
      type: "image/png",
    });

    try {
      await exportWithModuleOneEngine({
        file: repairedFile,
        format: formatToDownload,
        fileNamePrefix: repairMode === "manual" ? "manual-repair" : "auto-repair",
        dpiValue: repairExportDpi,
      });
    } catch (error) {
      alert("Export Error: " + error.message);
    }
  }

  function downloadBlob(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = fileName;
    link.click();

    URL.revokeObjectURL(url);
  }

  function getImprovementText() {
    if (!resizedQualityReport || !improvedQualityReport) return null;

    const before = resizedQualityReport.quality_score;
    const after = improvedQualityReport.quality_score;

    const points = after - before;
    const percent = before > 0 ? ((points / before) * 100).toFixed(2) : 0;

    return {
      points,
      percent,
      before,
      after,
    };
  }

  function handleLogout() {
    localStorage.removeItem("printai_current_user");
    setCurrentUser(null);
  }

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  if (!currentUser) {
    return <Auth onLogin={setCurrentUser} />;
  }

  const required = calculateRequiredPixels();
  const improvement = getImprovementText();

  return (
    <div className="app">
      <TopMenu />

      <div className="user-bar">
        <span>Welcome, {currentUser.name}</span>
        <button onClick={handleLogout} className="logout-btn">
          Logout
        </button>
      </div>

      <div className="tab-box">
        <button
          className={tab === "importexport" ? "tab-btn active-tab" : "tab-btn"}
          onClick={() => setTab("importexport")}
        >
          Smart Studio
        </button>

        <button
          className={tab === "analysis" ? "tab-btn active-tab" : "tab-btn"}
          onClick={() => setTab("analysis")}
        >
          Smart Analysis
        </button>

        <button
          className={tab === "repair" ? "tab-btn active-tab" : "tab-btn"}
          onClick={() => setTab("repair")}
        >
          Smart Repair
        </button>

        <button
          className={tab === "edit" ? "tab-btn active-tab" : "tab-btn"}
          onClick={() => setTab("edit")}
        >
          Smart Editing
        </button>

        <button
          className={tab === "print" ? "tab-btn active-tab" : "tab-btn"}
          onClick={() => setTab("print")}
        >
          Smart Print Studio
        </button>

        <button
          className={tab === "batch" ? "tab-btn active-tab" : "tab-btn"}
          onClick={() => setTab("batch")}
        >
          Smart Batch Studio
        </button>
      </div>

      {!["importexport", "print", "batch"].includes(tab) && (
        <>
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
        </>
      )}

      {tab === "importexport" && <ImportExportStudio />}

      {!["importexport", "print", "batch"].includes(tab) && !image && (
        <div className="analysis-box">
          <h2>Upload image to start</h2>
          <p>Please upload JPG, PNG or JPEG image for analysis and repair.</p>
        </div>
      )}

      {image && imageInfo && tab === "analysis" && (
        <div className="preview-box">
          <div className="analysis-box">
            <h2>Module 1: Smart Analysis</h2>
            <h3>Original Uploaded Image</h3>

            <img src={image} alt="Original Preview" />

            {originalQualityReport && (
              <>
                <h3>Original Image Quality</h3>

                <p>Quality Score: {originalQualityReport.quality_score}/100</p>
                <p>Quality: {originalQualityReport.quality_label}</p>
                <p>Blur Risk: {originalQualityReport.blur_risk}</p>
                <p>Sharpness Value: {originalQualityReport.sharpness_value}</p>
                <p>Noise Score: {getValue(originalQualityReport.noise_score)}</p>
                <p>
                  Text Readability:{" "}
                  {getValue(originalQualityReport.text_readability)}/100
                </p>
                <p>
                  Logo Quality: {getValue(originalQualityReport.logo_quality)}
                  /100
                </p>
                <p>Recommendation: {originalQualityReport.recommendation}</p>
              </>
            )}
          </div>

          <ImageInfo imageInfo={imageInfo} unit={unit} setUnit={setUnit} />

          <div className="analysis-box">
            <h2>Resize + Print Setup</h2>

            <label>Output Width</label>
            <input
              type="number"
              value={resizeWidth}
              onChange={(e) => setResizeWidth(e.target.value)}
              placeholder="Example: 4"
            />

            <label>Output Height</label>
            <input
              type="number"
              value={resizeHeight}
              onChange={(e) => setResizeHeight(e.target.value)}
              placeholder="Example: 8"
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

            <label>DPI / Working Quality</label>
            <select
              value={resizeDpi}
              onChange={(e) => setResizeDpi(Number(e.target.value))}
            >
              <option value="72">72 DPI - Screen / Hoarding</option>
              <option value="100">100 DPI - Flex / Banner</option>
              <option value="150">150 DPI - Poster / Standee</option>
              <option value="200">200 DPI - Better Print</option>
              <option value="300">300 DPI - High Quality Print</option>
              <option value="600">600 DPI - Ultra High Quality</option>
            </select>

            <label>Output Purpose</label>
            <select value={purpose} onChange={(e) => setPurpose(e.target.value)}>
              <option value="social">Social Media</option>
              <option value="banner">Flex / Banner Print</option>
              <option value="hoarding">Hoarding</option>
              <option value="standee">Standee</option>
              <option value="poster">Poster Print</option>
              <option value="visiting_card">Visiting Card</option>
              <option value="certificate">Certificate</option>
              <option value="magazine_cover">Magazine Cover</option>
              <option value="high">High Quality Print</option>
            </select>

            {required && (
              <>
                <h3>Resize Calculation</h3>

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

                <h2>Resized Output</h2>

                <p>
                  Final Size: {resizedSize.widthPx} × {resizedSize.heightPx} px
                </p>

                <img src={resizedImage} alt="Resized Output" />

                <button
                  onClick={handleAnalyzeResizedQuality}
                  className="upload-btn"
                >
                  Analyze Resized Quality
                </button>

                {resizedQualityReport && (
                  <div className="analysis-box">
                    <h2>Resized Print Quality Report</h2>

                    <p>
                      Quality Score: {resizedQualityReport.quality_score}/100
                    </p>
                    <p>Quality: {resizedQualityReport.quality_label}</p>
                    <p>Blur Risk: {resizedQualityReport.blur_risk}</p>
                    <p>
                      Sharpness Value: {resizedQualityReport.sharpness_value}
                    </p>
                    <p>
                      Noise Score: {getValue(resizedQualityReport.noise_score)}
                    </p>
                    <p>
                      Text Readability:{" "}
                      {getValue(resizedQualityReport.text_readability)}/100
                    </p>
                    <p>
                      Logo Quality: {getValue(resizedQualityReport.logo_quality)}
                      /100
                    </p>
                    <p>Scale Required: {resizedQualityReport.scale_percent}%</p>
                    <p>
                      AI Upscale Required:{" "}
                      {resizedQualityReport.ai_upscale_required ? "Yes" : "No"}
                    </p>
                    <p>Recommendation: {resizedQualityReport.recommendation}</p>
                  </div>
                )}

                <hr />

                <h2>Improve Resized Quality</h2>

                <label>Improve Strength</label>
                <select
                  value={improveStrength}
                  onChange={(e) => setImproveStrength(e.target.value)}
                >
                  <option value="low">Low Improve</option>
                  <option value="medium">Medium Improve</option>
                  <option value="high">High Improve</option>
                </select>

                <label>Final DPI After Improve</label>
                <select
                  value={finalDpi}
                  onChange={(e) => setFinalDpi(Number(e.target.value))}
                >
                  <option value="72">72 DPI</option>
                  <option value="100">100 DPI</option>
                  <option value="150">150 DPI</option>
                  <option value="200">200 DPI</option>
                  <option value="300">300 DPI</option>
                  <option value="600">600 DPI</option>
                </select>

                <button onClick={handleImproveQuality} className="upload-btn">
                  Improve Quality
                </button>

                {improvedImage && improvedQualityReport && (
                  <>
                    <hr />

                    <h2>Improved Output</h2>

                    <img src={improvedImage} alt="Improved Output" />

                    <h2>Improved Quality Report</h2>

                    <p>
                      Quality Score: {improvedQualityReport.quality_score}/100
                    </p>
                    <p>Quality: {improvedQualityReport.quality_label}</p>
                    <p>Blur Risk: {improvedQualityReport.blur_risk}</p>
                    <p>
                      Sharpness Value: {improvedQualityReport.sharpness_value}
                    </p>
                    <p>
                      Noise Score: {getValue(improvedQualityReport.noise_score)}
                    </p>
                    <p>
                      Text Readability:{" "}
                      {getValue(improvedQualityReport.text_readability)}/100
                    </p>
                    <p>
                      Logo Quality:{" "}
                      {getValue(improvedQualityReport.logo_quality)}/100
                    </p>
                    <p>
                      AI Upscale Required:{" "}
                      {improvedQualityReport.ai_upscale_required ? "Yes" : "No"}
                    </p>
                    <p>
                      Recommendation: {improvedQualityReport.recommendation}
                    </p>

                    {improvement && (
                      <div className="analysis-box">
                        <h2>Improvement Summary</h2>

                        <p>Before Improve: {improvement.before}/100</p>
                        <p>After Improve: {improvement.after}/100</p>
                        <p>
                          Improved By: {improvement.points} points (
                          {improvement.percent}%)
                        </p>
                      </div>
                    )}

                    <h2>Download Improved File</h2>

                    <label>Download Format</label>
                    <select
                      value={finalFormat}
                      onChange={(e) => setFinalFormat(e.target.value)}
                    >
                      <option value="pdf">PDF</option>
                      <option value="png">PNG</option>
                      <option value="jpg">JPG</option>
                      <option value="jpeg">JPEG</option>
                      <option value="webp">WEBP</option>
                      <option value="tiff">TIFF</option>
                      <option value="bmp">BMP</option>
                      <option value="svg">SVG</option>
                      <option value="eps">EPS</option>
                      <option value="psd">PSD</option>
                      <option value="cdr">Corel ZIP</option>
                    </select>

                    <button
                      className="upload-btn"
                      onClick={() => handleExportImprovedFile(finalFormat)}
                    >
                      Download Improved {finalFormat.toUpperCase()}
                    </button>

                    <button
                      className="upload-btn"
                      onClick={() => handleExportOriginalSizedFile(finalFormat)}
                    >
                      Download Print Ready {finalFormat.toUpperCase()}
                    </button>

                    <p>PSD Export: Working as flattened PSD.</p>
                    <p>Corel ZIP: Working as SVG + PDF + EPS + TIFF + PNG package.</p>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {image && imageInfo && tab === "repair" && (
        <div className="preview-box">
          <div className="analysis-box">
            <h2>Module 2: Smart Repair Pro</h2>
            <p>
              Is module me image ko automatic aur manual dono tareeke se repair
              kar sakte hain.
            </p>

            <img src={image} alt="Original for Repair" />

            <button className="upload-btn" onClick={handleAutoRepair}>
              Auto Fix - One Click Best Improvement
            </button>

            <hr />

            <h2>Manual Pro Repair</h2>

            <label>Manual Sharpness: {repairSharpness}</label>
            <input
              type="range"
              min="1"
              max="2"
              step="0.1"
              value={repairSharpness}
              onChange={(e) => setRepairSharpness(e.target.value)}
            />

            <label>Manual Contrast: {repairContrast}</label>
            <input
              type="range"
              min="1"
              max="2"
              step="0.1"
              value={repairContrast}
              onChange={(e) => setRepairContrast(e.target.value)}
            />

            <label>Noise Reduction: {repairNoise}</label>
            <input
              type="range"
              min="1"
              max="2"
              step="0.1"
              value={repairNoise}
              onChange={(e) => setRepairNoise(e.target.value)}
            />

            <label>Upscale</label>
            <select
              value={repairUpscale}
              onChange={(e) => setRepairUpscale(e.target.value)}
            >
              <option value="1">1x</option>
              <option value="2">2x</option>
              <option value="3">3x</option>
              <option value="4">4x</option>
            </select>

            <button className="upload-btn" onClick={handleManualRepair}>
              Apply Manual Repair
            </button>
          </div>

          {repairedImage && (
            <div className="analysis-box">
              <h2>
                {repairMode === "manual"
                  ? "Manual Repair Output"
                  : "Auto Fix Output"}
              </h2>

              <img src={repairedImage} alt="Smart Repair Output" />

              <label>Final DPI</label>
              <select
                value={repairExportDpi}
                onChange={(e) => setRepairExportDpi(Number(e.target.value))}
              >
                <option value="72">72 DPI</option>
                <option value="100">100 DPI</option>
                <option value="150">150 DPI</option>
                <option value="200">200 DPI</option>
                <option value="300">300 DPI</option>
                <option value="600">600 DPI</option>
              </select>

              <h3>Download {repairMode === "manual" ? "Manual Repair" : "Auto Fix"}</h3>

              <button
                className="upload-btn"
                onClick={() => handleExportRepairedFile("jpg")}
              >
                Download JPG
              </button>

              <button
                className="upload-btn"
                onClick={() => handleExportRepairedFile("png")}
              >
                Download PNG
              </button>

              <button
                className="upload-btn"
                onClick={() => handleExportRepairedFile("pdf")}
              >
                Download PDF
              </button>

              <label>Custom Download Format</label>
              <select
                value={repairExportFormat}
                onChange={(e) => setRepairExportFormat(e.target.value)}
              >
                <option value="jpg">JPG</option>
                <option value="jpeg">JPEG</option>
                <option value="png">PNG</option>
                <option value="pdf">PDF</option>
                <option value="webp">WEBP</option>
                <option value="tiff">TIFF</option>
                <option value="bmp">BMP</option>
                <option value="svg">SVG</option>
                <option value="eps">EPS</option>
                <option value="psd">PSD</option>
                <option value="cdr">Corel ZIP</option>
              </select>

              <button
                className="upload-btn"
                onClick={() => handleExportRepairedFile(repairExportFormat)}
              >
                Download Selected Format
              </button>

              <p>PSD Export: Working as flattened PSD.</p>
              <p>Corel ZIP: Working as SVG + PDF + EPS + TIFF + PNG package.</p>
            </div>
          )}
        </div>
      )}

      {tab === "edit" && (
        <SmartEditing selectedFile={selectedFile} image={image} />
      )}

      {tab === "print" && <SmartPrintStudio />}

      {tab === "batch" && <SmartBatchStudio />}

      <div className="analysis-box center">
        <p><b>Digital Pehlwan PrintAI</b> • Version 0.9 Beta</p>
        <p>© 2026 Digital Pehlwan • Founder: Monika Hingle • The Brand Builders</p>
      </div>

    </div>
  );
}

export default App;