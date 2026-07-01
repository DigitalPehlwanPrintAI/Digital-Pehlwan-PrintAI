from PIL import Image
import io


def get_embedded_dpi(img):
    dpi = img.info.get("dpi")

    if dpi is None:
        return 72, 72, False

    if isinstance(dpi, tuple):
        dpi_x = round(dpi[0]) if dpi[0] else 72
        dpi_y = round(dpi[1]) if dpi[1] else 72
        return dpi_x, dpi_y, True

    dpi_value = round(dpi)
    return dpi_value, dpi_value, True


def process_image(image_bytes):
    img = Image.open(io.BytesIO(image_bytes))

    width_px, height_px = img.size
    dpi_x, dpi_y, dpi_found = get_embedded_dpi(img)

    width_inch = width_px / dpi_x
    height_inch = height_px / dpi_y

    return {
        "pixels": {
            "width": width_px,
            "height": height_px
        },
        "embedded_dpi": {
            "x": dpi_x,
            "y": dpi_y,
            "found": dpi_found
        },
        "original_size": {
            "inch": {
                "width": round(width_inch, 2),
                "height": round(height_inch, 2)
            },
            "feet": {
                "width": round(width_inch / 12, 2),
                "height": round(height_inch / 12, 2)
            },
            "cm": {
                "width": round(width_inch * 2.54, 2),
                "height": round(height_inch * 2.54, 2)
            }
        },
        "color_mode": img.mode,
        "aspect_ratio": round(width_px / height_px, 4)
    }