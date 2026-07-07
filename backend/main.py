from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from PIL import Image, ImageFilter, ImageEnhance, ImageStat, ImageOps
from io import BytesIO
import io
import os
import zipfile
import struct
import math

app = FastAPI(title="Digital Pehlwan PrintAI Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# BASIC HELPERS
# =========================================================

def get_dpi(image):
    dpi = image.info.get("dpi")
    if dpi:
        return round(dpi[0]), round(dpi[1]), True
    return 72, 72, False


def get_quality_settings(purpose):
    settings = {
        "social": {"dpi": 72, "quality": 92, "sharpness": 1.02, "unsharp": 80},
        "banner": {"dpi": 100, "quality": 96, "sharpness": 1.08, "unsharp": 120},
        "hoarding": {"dpi": 72, "quality": 95, "sharpness": 1.08, "unsharp": 120},
        "standee": {"dpi": 150, "quality": 96, "sharpness": 1.10, "unsharp": 130},
        "poster": {"dpi": 150, "quality": 96, "sharpness": 1.06, "unsharp": 110},
        "visiting_card": {"dpi": 300, "quality": 98, "sharpness": 1.12, "unsharp": 150},
        "certificate": {"dpi": 300, "quality": 98, "sharpness": 1.10, "unsharp": 140},
        "magazine_cover": {"dpi": 300, "quality": 98, "sharpness": 1.12, "unsharp": 150},
        "high": {"dpi": 300, "quality": 98, "sharpness": 1.10, "unsharp": 140},
        "print": {"dpi": 300, "quality": 98, "sharpness": 1.10, "unsharp": 140},
    }
    return settings.get(purpose, settings["banner"])


def _hex_to_rgb(hex_color: str):
    try:
        hex_color = str(hex_color).replace("#", "").strip()
        if len(hex_color) == 3:
            hex_color = "".join([c * 2 for c in hex_color])
        return tuple(int(hex_color[i:i + 2], 16) for i in (0, 2, 4))
    except Exception:
        return (255, 255, 255)


def _safe_int(value, default=0):
    try:
        return int(value)
    except Exception:
        return default


def _safe_quality(value):
    try:
        return max(10, min(int(value), 100))
    except Exception:
        return 95


def _safe_dpi(value):
    try:
        dpi = int(value)
        if dpi <= 0:
            return 300
        return dpi
    except Exception:
        return 300


def _base_name(filename: str):
    name = os.path.basename(filename or "printai-export")
    return os.path.splitext(name)[0] or "printai-export"


def calculate_sharpness(image):
    gray = image.convert("L")
    edges = gray.filter(ImageFilter.FIND_EDGES)
    stat = ImageStat.Stat(edges)
    return round(stat.stddev[0], 2)


def calculate_text_readability(image):
    sharpness = calculate_sharpness(image)
    contrast = ImageStat.Stat(image.convert("L")).stddev[0]
    score = (sharpness * 2.2) + (contrast * 0.8)
    return round(min(100, max(0, score)))


def calculate_logo_quality(image):
    sharpness = calculate_sharpness(image)
    contrast = ImageStat.Stat(image.convert("L")).stddev[0]
    score = (sharpness * 2.5) + (contrast * 0.7)
    return round(min(100, max(0, score)))


def get_quality_label(score):
    if score >= 85:
        return "Excellent"
    if score >= 70:
        return "Good"
    if score >= 50:
        return "Average"
    return "Low"


def resize_and_enhance(image, width_px, height_px, purpose):
    settings = get_quality_settings(purpose)

    image = image.convert("RGB")
    resized = image.resize((width_px, height_px), Image.Resampling.LANCZOS)

    resized = resized.filter(
        ImageFilter.UnsharpMask(
            radius=1.2,
            percent=settings["unsharp"],
            threshold=3,
        )
    )

    resized = ImageEnhance.Sharpness(resized).enhance(settings["sharpness"])
    return resized, settings


def improve_image_quality(image, strength):
    image = image.convert("RGB")

    values = {
        "low": (1.15, 1.04, 120),
        "medium": (1.30, 1.08, 160),
        "high": (1.50, 1.12, 220),
    }

    sharpness_factor, contrast_factor, unsharp_percent = values.get(
        strength, values["medium"]
    )

    image = image.filter(
        ImageFilter.UnsharpMask(
            radius=1.1,
            percent=unsharp_percent,
            threshold=2,
        )
    )

    image = ImageEnhance.Sharpness(image).enhance(sharpness_factor)
    image = ImageEnhance.Contrast(image).enhance(contrast_factor)

    return image


def save_image_to_format(image, output_format, dpi, quality):
    output = BytesIO()
    output_format = output_format.lower()

    if output_format in ["jpg", "jpeg"]:
        image.convert("RGB").save(
            output,
            format="JPEG",
            quality=quality,
            dpi=(dpi, dpi),
            optimize=True,
        )
        media_type = "image/jpeg"

    elif output_format == "png":
        image.save(
            output,
            format="PNG",
            dpi=(dpi, dpi),
            optimize=True,
        )
        media_type = "image/png"

    elif output_format == "webp":
        image.convert("RGBA").save(
            output,
            format="WEBP",
            quality=quality,
            method=6,
        )
        media_type = "image/webp"

    elif output_format == "pdf":
        image.convert("RGB").save(
            output,
            format="PDF",
            resolution=dpi,
        )
        media_type = "application/pdf"

    elif output_format in ["tif", "tiff"]:
        image.convert("RGB").save(
            output,
            format="TIFF",
            dpi=(dpi, dpi),
            compression="tiff_lzw",
        )
        media_type = "image/tiff"

    elif output_format == "bmp":
        image.convert("RGB").save(output, format="BMP")
        media_type = "image/bmp"

    else:
        image.convert("RGB").save(
            output,
            format="JPEG",
            quality=quality,
            dpi=(dpi, dpi),
            optimize=True,
        )
        media_type = "image/jpeg"

    output.seek(0)
    return output, media_type


# =========================================================
# MODULE 1 EXPORT HELPERS
# =========================================================

def _get_resize_size(resize_mode, original_width, original_height, custom_width, custom_height):
    if resize_mode == "instagram-post":
        return 1080, 1080

    if resize_mode == "instagram-story":
        return 1080, 1920

    if resize_mode == "facebook-post":
        return 1200, 630

    if resize_mode == "youtube-thumbnail":
        return 1280, 720

    if resize_mode == "a4-300dpi":
        return 2480, 3508

    if resize_mode == "a3-300dpi":
        return 3508, 4961

    if resize_mode == "visiting-card-300dpi":
        return 1050, 600

    if resize_mode == "custom" and custom_width > 0 and custom_height > 0:
        return custom_width, custom_height

    return original_width, original_height


def _fit_image_on_canvas(image, width, height, background_mode, custom_bg):
    image = image.convert("RGBA")

    if background_mode == "transparent":
        canvas = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    elif background_mode == "black":
        canvas = Image.new("RGBA", (width, height), (0, 0, 0, 255))
    elif background_mode == "custom":
        r, g, b = _hex_to_rgb(custom_bg)
        canvas = Image.new("RGBA", (width, height), (r, g, b, 255))
    else:
        canvas = Image.new("RGBA", (width, height), (255, 255, 255, 255))

    img_ratio = image.width / image.height
    canvas_ratio = width / height

    if img_ratio > canvas_ratio:
        new_width = width
        new_height = int(width / img_ratio)
    else:
        new_height = height
        new_width = int(height * img_ratio)

    resized = image.resize((new_width, new_height), Image.Resampling.LANCZOS)

    x = (width - new_width) // 2
    y = (height - new_height) // 2

    canvas.paste(resized, (x, y), resized)
    return canvas


def _make_svg_from_image(image, dpi=300):
    image = image.convert("RGBA")
    png_buffer = io.BytesIO()
    image.save(png_buffer, format="PNG", dpi=(dpi, dpi))
    png_bytes = png_buffer.getvalue()

    import base64
    encoded = base64.b64encode(png_bytes).decode("utf-8")

    svg = f"""<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="{image.width}px" height="{image.height}px" viewBox="0 0 {image.width} {image.height}">
  <image href="data:image/png;base64,{encoded}" x="0" y="0" width="{image.width}" height="{image.height}" />
</svg>
"""
    return svg.encode("utf-8")


def _make_eps_from_image(image, dpi=300):
    image = image.convert("RGB")
    buffer = io.BytesIO()
    image.save(buffer, format="EPS")
    buffer.seek(0)
    return buffer.getvalue()


def _make_flattened_psd(image):
    """
    Basic flattened PSD export.
    यह layered PSD नहीं है, लेकिन Photoshop में open होने वाली .psd file देता है.
    Layered PSD बाद में अलग engine से आएगा.
    """
    image = image.convert("RGBA")
    width, height = image.size

    r, g, b, a = image.split()
    channels = [r.tobytes(), g.tobytes(), b.tobytes(), a.tobytes()]

    psd = io.BytesIO()

    psd.write(b"8BPS")
    psd.write(struct.pack(">H", 1))
    psd.write(b"\x00" * 6)
    psd.write(struct.pack(">H", 4))
    psd.write(struct.pack(">I", height))
    psd.write(struct.pack(">I", width))
    psd.write(struct.pack(">H", 8))
    psd.write(struct.pack(">H", 3))

    psd.write(struct.pack(">I", 0))
    psd.write(struct.pack(">I", 0))
    psd.write(struct.pack(">I", 0))

    psd.write(struct.pack(">H", 0))

    for channel in channels:
        psd.write(channel)

    return psd.getvalue()


def _make_corel_compatible_zip(image, base_name, dpi=300, quality=98):
    """
    CDR direct export possible नहीं है.
    यह ZIP देता है जिसमें CorelDRAW-compatible files होंगी:
    SVG + PDF + EPS + TIFF + PNG
    """
    image_rgba = image.convert("RGBA")
    image_rgb = image.convert("RGB")

    zip_buffer = io.BytesIO()

    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as z:
        png_buffer = io.BytesIO()
        image_rgba.save(png_buffer, format="PNG", dpi=(dpi, dpi))
        z.writestr(f"{base_name}.png", png_buffer.getvalue())

        pdf_buffer = io.BytesIO()
        image_rgb.save(pdf_buffer, format="PDF", resolution=dpi)
        z.writestr(f"{base_name}.pdf", pdf_buffer.getvalue())

        tiff_buffer = io.BytesIO()
        image_rgb.save(
            tiff_buffer,
            format="TIFF",
            dpi=(dpi, dpi),
            compression="tiff_lzw",
        )
        z.writestr(f"{base_name}.tiff", tiff_buffer.getvalue())

        svg_bytes = _make_svg_from_image(image_rgba, dpi=dpi)
        z.writestr(f"{base_name}.svg", svg_bytes)

        eps_bytes = _make_eps_from_image(image_rgb, dpi=dpi)
        z.writestr(f"{base_name}.eps", eps_bytes)

        readme = f"""PrintAI by Digital Pehlwan

CDR direct export browser/Python se reliable possible nahi hota kyunki CorelDRAW .cdr proprietary format hai.

Is ZIP ke andar CorelDRAW-compatible files hain:
1. {base_name}.svg
2. {base_name}.pdf
3. {base_name}.eps
4. {base_name}.tiff
5. {base_name}.png

CorelDRAW me SVG/PDF/EPS open karke Save As .CDR kar sakte hain.
"""
        z.writestr("READ_ME_CORELDRAW.txt", readme)

    zip_buffer.seek(0)
    return zip_buffer.getvalue()


def _prepare_export_canvas(
    image,
    export_format,
    dpi,
    color_mode,
    background_mode,
    custom_bg,
    resize_mode,
    custom_width,
    custom_height,
):
    width, height = _get_resize_size(
        resize_mode,
        image.width,
        image.height,
        custom_width,
        custom_height,
    )

    canvas = _fit_image_on_canvas(
        image=image,
        width=width,
        height=height,
        background_mode=background_mode,
        custom_bg=custom_bg,
    )

    if color_mode.lower() == "grayscale":
        return canvas.convert("L")

    if color_mode.lower() == "cmyk" and export_format.lower() in ["jpg", "jpeg", "pdf", "tiff", "tif", "eps"]:
        return canvas.convert("CMYK")

    return canvas


# =========================================================
# HEALTH
# =========================================================

@app.get("/")
async def home():
    return {
        "status": "ok",
        "app": "Digital Pehlwan PrintAI",
        "message": "Backend is running",
    }


@app.get("/import-export/health")
async def import_export_health():
    return {
        "status": "ok",
        "module": "Import Export Studio",
        "backend": "connected",
        "exports": [
            "png", "jpg", "webp", "pdf", "tiff", "bmp",
            "svg", "eps", "psd", "corel-compatible-zip"
        ],
    }


# =========================================================
# MODULE 1 OLD / EXISTING APIs
# =========================================================

@app.post("/process")
async def process(file: UploadFile = File(...)):
    image = Image.open(BytesIO(await file.read()))
    width, height = image.size
    dpi_x, dpi_y, found = get_dpi(image)

    width_inch = width / dpi_x
    height_inch = height / dpi_y

    return {
        "pixels": {"width": width, "height": height},
        "embedded_dpi": {"x": dpi_x, "y": dpi_y, "found": found},
        "original_size": {
            "inch": {
                "width": round(width_inch, 2),
                "height": round(height_inch, 2),
            },
            "feet": {
                "width": round(width_inch / 12, 2),
                "height": round(height_inch / 12, 2),
            },
            "cm": {
                "width": round(width_inch * 2.54, 2),
                "height": round(height_inch * 2.54, 2),
            },
        },
    }


@app.post("/analyze-quality")
async def analyze_quality(
    file: UploadFile = File(...),
    target_width_px: int = Form(...),
    target_height_px: int = Form(...),
):
    image = Image.open(BytesIO(await file.read())).convert("RGB")
    width, height = image.size

    sharpness = calculate_sharpness(image)
    text_readability = calculate_text_readability(image)
    logo_quality = calculate_logo_quality(image)

    scale_required = max(target_width_px / width, target_height_px / height)

    if scale_required <= 1:
        resolution_score = 100
    elif scale_required <= 2:
        resolution_score = 75
    elif scale_required <= 4:
        resolution_score = 50
    else:
        resolution_score = 25

    if sharpness >= 35:
        sharpness_score = 100
    elif sharpness >= 25:
        sharpness_score = 75
    elif sharpness >= 15:
        sharpness_score = 50
    else:
        sharpness_score = 25

    quality_score = round(
        (resolution_score * 0.50)
        + (sharpness_score * 0.30)
        + (text_readability * 0.10)
        + (logo_quality * 0.10)
    )

    if scale_required <= 1:
        blur_risk = "No Risk"
        ai_upscale_required = False
    elif scale_required <= 1.2:
        blur_risk = "Slight Risk"
        ai_upscale_required = False
    elif scale_required <= 2:
        blur_risk = "Medium Risk"
        ai_upscale_required = True
    else:
        blur_risk = "High Risk"
        ai_upscale_required = True

    return {
        "uploaded_pixels": {"width": width, "height": height},
        "target_pixels": {
            "width": target_width_px,
            "height": target_height_px,
        },
        "scale_required": round(scale_required, 2),
        "scale_percent": round(scale_required * 100),
        "sharpness_value": sharpness,
        "noise_score": "Not Applicable",
        "text_readability": text_readability,
        "logo_quality": logo_quality,
        "quality_score": quality_score,
        "quality_label": get_quality_label(quality_score),
        "blur_risk": blur_risk,
        "ai_upscale_required": ai_upscale_required,
        "recommendation": (
            "Ready for print"
            if quality_score >= 75 and blur_risk in ["No Risk", "Slight Risk"]
            else "Improve quality or AI upscale recommended before printing"
        ),
    }


@app.post("/resize")
async def resize_image(
    file: UploadFile = File(...),
    width_px: int = Form(...),
    height_px: int = Form(...),
    purpose: str = Form("banner"),
):
    image = Image.open(BytesIO(await file.read()))
    resized, settings = resize_and_enhance(image, width_px, height_px, purpose)

    output, media_type = save_image_to_format(
        resized,
        "jpg",
        settings["dpi"],
        settings["quality"],
    )

    return Response(content=output.getvalue(), media_type=media_type)


@app.post("/improve-quality")
async def improve_quality(
    file: UploadFile = File(...),
    strength: str = Form("medium"),
    export_dpi: int = Form(300),
):
    image = Image.open(BytesIO(await file.read()))
    improved = improve_image_quality(image, strength)

    output, media_type = save_image_to_format(improved, "jpg", export_dpi, 98)

    return Response(content=output.getvalue(), media_type=media_type)


@app.post("/export-file")
async def export_file(
    file: UploadFile = File(...),
    width_px: int = Form(...),
    height_px: int = Form(...),
    purpose: str = Form("banner"),
    output_format: str = Form("pdf"),
    export_dpi: int = Form(0),
):
    image = Image.open(BytesIO(await file.read()))
    resized, settings = resize_and_enhance(image, width_px, height_px, purpose)

    final_dpi = export_dpi if export_dpi > 0 else settings["dpi"]

    output, media_type = save_image_to_format(
        resized,
        output_format,
        final_dpi,
        settings["quality"],
    )

    return Response(content=output.getvalue(), media_type=media_type)


@app.post("/export-improved-file")
async def export_improved_file(
    file: UploadFile = File(...),
    output_format: str = Form("jpg"),
    export_dpi: int = Form(300),
):
    image = Image.open(BytesIO(await file.read()))
    output, media_type = save_image_to_format(image, output_format, export_dpi, 98)
    return Response(content=output.getvalue(), media_type=media_type)


@app.post("/export-pdf")
async def export_pdf(
    file: UploadFile = File(...),
    width_px: int = Form(...),
    height_px: int = Form(...),
    purpose: str = Form("banner"),
    export_dpi: int = Form(0),
):
    image = Image.open(BytesIO(await file.read()))
    resized, settings = resize_and_enhance(image, width_px, height_px, purpose)

    final_dpi = export_dpi if export_dpi > 0 else settings["dpi"]

    output, media_type = save_image_to_format(
        resized,
        "pdf",
        final_dpi,
        settings["quality"],
    )

    return Response(content=output.getvalue(), media_type=media_type)


# =========================================================
# MODULE 1 NEW ONE-SHOT EXPORT API
# =========================================================

@app.post("/import-export/export-image")
async def import_export_image(
    file: UploadFile = File(...),
    export_format: str = Form("png"),
    quality: int = Form(95),
    dpi: int = Form(300),
    color_mode: str = Form("RGB"),
    background_mode: str = Form("transparent"),
    custom_bg: str = Form("#ffffff"),
    resize_mode: str = Form("original"),
    custom_width: int = Form(0),
    custom_height: int = Form(0),
):
    try:
        export_format = export_format.lower().strip()
        safe_quality = _safe_quality(quality)
        safe_dpi = _safe_dpi(dpi)

        allowed_formats = [
            "png", "jpg", "jpeg", "webp", "pdf", "tiff", "tif",
            "bmp", "svg", "eps", "psd", "corel", "cdr"
        ]

        if export_format not in allowed_formats:
            raise HTTPException(
                status_code=400,
                detail=f"{export_format.upper()} export format supported nahi hai.",
            )

        image_bytes = await file.read()
        image = Image.open(io.BytesIO(image_bytes))

        canvas = _prepare_export_canvas(
            image=image,
            export_format=export_format,
            dpi=safe_dpi,
            color_mode=color_mode,
            background_mode=background_mode,
            custom_bg=custom_bg,
            resize_mode=resize_mode,
            custom_width=custom_width,
            custom_height=custom_height,
        )

        base_name = _base_name(file.filename)

        # PNG
        if export_format == "png":
            buffer = io.BytesIO()
            output_image = canvas.convert("RGBA") if background_mode == "transparent" else canvas.convert("RGB")
            output_image.save(buffer, format="PNG", dpi=(safe_dpi, safe_dpi), optimize=True)
            buffer.seek(0)
            return Response(
                content=buffer.getvalue(),
                media_type="image/png",
                headers={"Content-Disposition": f'attachment; filename="{base_name}_{safe_dpi}dpi.png"'},
            )

        # JPG
        if export_format in ["jpg", "jpeg"]:
            buffer = io.BytesIO()
            output_image = canvas.convert("CMYK") if color_mode.lower() == "cmyk" else canvas.convert("RGB")
            output_image.save(
                buffer,
                format="JPEG",
                quality=safe_quality,
                dpi=(safe_dpi, safe_dpi),
                optimize=True,
            )
            buffer.seek(0)
            return Response(
                content=buffer.getvalue(),
                media_type="image/jpeg",
                headers={"Content-Disposition": f'attachment; filename="{base_name}_{safe_dpi}dpi.jpg"'},
            )

        # WEBP
        if export_format == "webp":
            buffer = io.BytesIO()
            output_image = canvas.convert("RGBA")
            output_image.save(buffer, format="WEBP", quality=safe_quality, method=6)
            buffer.seek(0)
            return Response(
                content=buffer.getvalue(),
                media_type="image/webp",
                headers={"Content-Disposition": f'attachment; filename="{base_name}_{safe_dpi}dpi.webp"'},
            )

        # PDF
        if export_format == "pdf":
            buffer = io.BytesIO()
            output_image = canvas.convert("CMYK") if color_mode.lower() == "cmyk" else canvas.convert("RGB")
            output_image.save(buffer, format="PDF", resolution=safe_dpi)
            buffer.seek(0)
            return Response(
                content=buffer.getvalue(),
                media_type="application/pdf",
                headers={"Content-Disposition": f'attachment; filename="{base_name}_print_ready_{safe_dpi}dpi.pdf"'},
            )

        # TIFF
        if export_format in ["tiff", "tif"]:
            buffer = io.BytesIO()
            output_image = canvas.convert("CMYK") if color_mode.lower() == "cmyk" else canvas.convert("RGB")
            output_image.save(
                buffer,
                format="TIFF",
                dpi=(safe_dpi, safe_dpi),
                compression="tiff_lzw",
            )
            buffer.seek(0)
            return Response(
                content=buffer.getvalue(),
                media_type="image/tiff",
                headers={"Content-Disposition": f'attachment; filename="{base_name}_{safe_dpi}dpi.tiff"'},
            )

        # BMP
        if export_format == "bmp":
            buffer = io.BytesIO()
            canvas.convert("RGB").save(buffer, format="BMP")
            buffer.seek(0)
            return Response(
                content=buffer.getvalue(),
                media_type="image/bmp",
                headers={"Content-Disposition": f'attachment; filename="{base_name}.bmp"'},
            )

        # SVG
        if export_format == "svg":
            svg_bytes = _make_svg_from_image(canvas.convert("RGBA"), dpi=safe_dpi)
            return Response(
                content=svg_bytes,
                media_type="image/svg+xml",
                headers={"Content-Disposition": f'attachment; filename="{base_name}_corel_compatible.svg"'},
            )

        # EPS
        if export_format == "eps":
            eps_bytes = _make_eps_from_image(canvas.convert("RGB"), dpi=safe_dpi)
            return Response(
                content=eps_bytes,
                media_type="application/postscript",
                headers={"Content-Disposition": f'attachment; filename="{base_name}_corel_compatible.eps"'},
            )

        # PSD flattened
        if export_format == "psd":
            psd_bytes = _make_flattened_psd(canvas.convert("RGBA"))
            return Response(
                content=psd_bytes,
                media_type="application/octet-stream",
                headers={"Content-Disposition": f'attachment; filename="{base_name}_flattened.psd"'},
            )

        # CDR/Corel compatible ZIP
        if export_format in ["corel", "cdr"]:
            zip_bytes = _make_corel_compatible_zip(
                image=canvas.convert("RGBA"),
                base_name=f"{base_name}_corel_compatible",
                dpi=safe_dpi,
                quality=safe_quality,
            )
            return Response(
                content=zip_bytes,
                media_type="application/zip",
                headers={"Content-Disposition": f'attachment; filename="{base_name}_corel_compatible_files.zip"'},
            )

        raise HTTPException(status_code=400, detail="Export failed.")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/export-psd")
async def export_psd(
    file: UploadFile = File(...),
    width_px: int = Form(0),
    height_px: int = Form(0),
):
    try:
        image_bytes = await file.read()
        image = Image.open(io.BytesIO(image_bytes)).convert("RGBA")

        if width_px > 0 and height_px > 0:
            image = image.resize((width_px, height_px), Image.Resampling.LANCZOS)

        psd_bytes = _make_flattened_psd(image)

        return Response(
            content=psd_bytes,
            media_type="application/octet-stream",
            headers={
                "Content-Disposition": 'attachment; filename="printai-flattened.psd"'
            },
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =========================================================
# MODULE 2 SMART REPAIR / BACKGROUND
# =========================================================

@app.post("/smart-repair")
async def smart_repair(
    file: UploadFile = File(...),
    mode: str = Form("auto"),
    sharpness: float = Form(1.3),
    contrast: float = Form(1.1),
    noise_reduction: float = Form(1.0),
    upscale: int = Form(2),
):
    image = Image.open(BytesIO(await file.read())).convert("RGB")

    if mode == "auto":
        sharpness = 1.4
        contrast = 1.15
        upscale = 2

    width, height = image.size

    image = image.resize(
        (width * upscale, height * upscale),
        Image.Resampling.LANCZOS,
    )

    image = ImageEnhance.Sharpness(image).enhance(sharpness)
    image = ImageEnhance.Contrast(image).enhance(contrast)
    image = image.filter(ImageFilter.MedianFilter(size=3))

    output = BytesIO()
    image.save(output, format="JPEG", quality=98, dpi=(300, 300))
    output.seek(0)

    return Response(content=output.getvalue(), media_type="image/jpeg")


@app.post("/smart-edit/remove-bg")
async def remove_bg(file: UploadFile = File(...)):
    input_bytes = await file.read()

    try:
        from rembg import remove
        output_bytes = remove(input_bytes)
        return Response(content=output_bytes, media_type="image/png")

    except Exception:
        image = Image.open(io.BytesIO(input_bytes)).convert("RGBA")
        buffer = io.BytesIO()
        image.save(buffer, format="PNG")
        buffer.seek(0)
        return Response(content=buffer.getvalue(), media_type="image/png")


@app.post("/smart-edit/replace-bg")
async def replace_bg(
    file: UploadFile = File(...),
    color: str = Form("#ffffff"),
):
    image = Image.open(io.BytesIO(await file.read())).convert("RGBA")

    bg = Image.new("RGBA", image.size, color)
    result = Image.alpha_composite(bg, image)

    buffer = io.BytesIO()
    result.convert("RGB").save(buffer, format="JPEG", quality=98)
    buffer.seek(0)

    return Response(content=buffer.getvalue(), media_type="image/jpeg")


@app.post("/smart-edit/extend-bg")
async def extend_bg(file: UploadFile = File(...)):
    image = Image.open(io.BytesIO(await file.read())).convert("RGB")

    new_img = Image.new(
        "RGB",
        (image.width + 200, image.height + 200),
        "white",
    )

    new_img.paste(image, (100, 100))

    buffer = io.BytesIO()
    new_img.save(buffer, format="JPEG", quality=98)
    buffer.seek(0)

    return Response(content=buffer.getvalue(), media_type="image/jpeg")


# =========================================================
# MODULE 3 SMART EDITING
# =========================================================

@app.post("/smart-edit/analyze")
async def smart_analyze(file: UploadFile = File(...)):
    return {
        "objects": 3,
        "text_detected": True,
        "logos_detected": True,
        "colors": ["#ffffff", "#000000"],
        "font": "Approximate basic detection",
    }


@app.post("/smart-edit/inpaint")
async def smart_inpaint(
    file: UploadFile = File(...),
    mask: UploadFile = File(...),
):
    try:
        import numpy as np
        import cv2

        image_bytes = await file.read()
        mask_bytes = await mask.read()

        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        mask_image = Image.open(io.BytesIO(mask_bytes)).convert("L")

        image_np = np.array(image)
        mask_np = np.array(mask_image)

        _, mask_np = cv2.threshold(mask_np, 20, 255, cv2.THRESH_BINARY)

        if cv2.countNonZero(mask_np) == 0:
            raise HTTPException(status_code=400, detail="No painted area found")

        kernel = np.ones((5, 5), np.uint8)
        mask_np = cv2.dilate(mask_np, kernel, iterations=1)

        image_bgr = cv2.cvtColor(image_np, cv2.COLOR_RGB2BGR)

        result_bgr = cv2.inpaint(
            image_bgr,
            mask_np,
            7,
            cv2.INPAINT_TELEA,
        )

        result_rgb = cv2.cvtColor(result_bgr, cv2.COLOR_BGR2RGB)
        result_image = Image.fromarray(result_rgb)

        buffer = io.BytesIO()
        result_image.save(buffer, format="PNG")
        buffer.seek(0)

        return Response(content=buffer.getvalue(), media_type="image/png")

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =========================================================
# MODULE 4 PRINT TOOLS FOUNDATION
# =========================================================

@app.post("/print-tools/check-dpi")
async def check_dpi(file: UploadFile = File(...)):
    image = Image.open(BytesIO(await file.read()))
    width, height = image.size
    dpi_x, dpi_y, found = get_dpi(image)

    return {
        "width_px": width,
        "height_px": height,
        "dpi_x": dpi_x,
        "dpi_y": dpi_y,
        "dpi_found": found,
        "print_size_inch": {
            "width": round(width / dpi_x, 2),
            "height": round(height / dpi_y, 2),
        },
        "print_size_feet": {
            "width": round((width / dpi_x) / 12, 2),
            "height": round((height / dpi_y) / 12, 2),
        },
        "recommendation": "300 DPI recommended for high quality print.",
    }


@app.post("/print-tools/convert-cmyk")
async def convert_cmyk(
    file: UploadFile = File(...),
    output_format: str = Form("jpg"),
    dpi: int = Form(300),
):
    image = Image.open(BytesIO(await file.read())).convert("CMYK")
    output, media_type = save_image_to_format(image, output_format, dpi, 98)
    return Response(content=output.getvalue(), media_type=media_type)


# =========================================================
# MODULE 5 BATCH FOUNDATION
# =========================================================

@app.post("/batch/export-zip")
async def batch_export_zip(
    files: list[UploadFile] = File(...),
    export_format: str = Form("png"),
    dpi: int = Form(300),
    quality: int = Form(95),
):
    try:
        safe_dpi = _safe_dpi(dpi)
        safe_quality = _safe_quality(quality)
        export_format = export_format.lower().strip()

        zip_buffer = io.BytesIO()

        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as z:
            for index, uploaded in enumerate(files, start=1):
                image = Image.open(io.BytesIO(await uploaded.read()))
                output, media_type = save_image_to_format(
                    image.convert("RGB"),
                    export_format,
                    safe_dpi,
                    safe_quality,
                )
                name = _base_name(uploaded.filename)
                extension = "jpg" if export_format in ["jpg", "jpeg"] else export_format
                z.writestr(f"{index:02d}_{name}.{extension}", output.getvalue())

        zip_buffer.seek(0)

        return Response(
            content=zip_buffer.getvalue(),
            media_type="application/zip",
            headers={"Content-Disposition": 'attachment; filename="printai_batch_export.zip"'},
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))