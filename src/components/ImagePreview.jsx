function ImagePreview({ image }) {
  if (!image) return null;

  return (
    <div className="preview-box">
      <h2>Image Preview</h2>
      <img src={image} alt="Uploaded Preview" />
    </div>
  );
}

export default ImagePreview;