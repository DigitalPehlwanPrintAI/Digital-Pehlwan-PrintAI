function ImageUploader({ onImageUpload }) {
  return (
    <>
      <label htmlFor="imageUpload" className="upload-btn">
        Upload Image
      </label>

      <input
        id="imageUpload"
        type="file"
        accept="image/*"
        onChange={onImageUpload}
        hidden
      />
    </>
  );
}

export default ImageUploader;
