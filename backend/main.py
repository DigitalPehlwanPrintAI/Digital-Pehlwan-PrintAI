from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from PIL import Image, ImageFilter, ImageEnhance, ImageStat
from io import BytesIO
import io

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    }
    return settings.get(purpose, settings["banner"])

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

    elif output_format == "pdf":
        image.convert("RGB").save(
            output,
            format="PDF",
            resolution=dpi,
        )
        media_type = "application/pdf"

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

@app.post("/smart-edit/analyze")
async def smart_analyze(file: UploadFile = File(...)):
    return {
        "objects": 3,
        "text_detected": True,
        "logos_detected": True,
        "colors": ["#ffffff", "#000000"],
        "font": "Detected basic",
    }
from fastapi import UploadFile, File, HTTPException
from fastapi.responses import Response

@app.post("/smart-edit/inpaint")
async def smart_inpaint(
    file: UploadFile = File(...),
    mask: UploadFile = File(...)
):
    try:
        import io
        import numpy as np
        import cv2
        from PIL import Image

        image_bytes = await file.read()
        mask_bytes = await mask.read()

        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        mask_image = Image.open(io.BytesIO(mask_bytes)).convert("L")

        image_np = np.array(image)
        mask_np = np.array(mask_image)

        # Mask ko binary banao
        _, mask_np = cv2.threshold(mask_np, 20, 255, cv2.THRESH_BINARY)

        if cv2.countNonZero(mask_np) == 0:
            raise HTTPException(status_code=400, detail="No painted area found")

        # Mask ko thoda expand karo taaki object/text edges bhi remove ho
        kernel = np.ones((5, 5), np.uint8)
        mask_np = cv2.dilate(mask_np, kernel, iterations=1)

        image_bgr = cv2.cvtColor(image_np, cv2.COLOR_RGB2BGR)

        # Object/Text remove using OpenCV inpainting
        result_bgr = cv2.inpaint(
            image_bgr,
            mask_np,
            7,
            cv2.INPAINT_TELEA
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