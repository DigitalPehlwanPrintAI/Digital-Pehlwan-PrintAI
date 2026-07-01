function ToolPanel() {
  return (
    <>
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
    </>
  );
}

export default ToolPanel;