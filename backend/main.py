from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from PIL import Image, ImageFilter, ImageEnhance, ImageStat
from io import BytesIO
import io
import os
import zipfile
import struct
import math
import random
import time
import smtplib
import ssl
from email.message import EmailMessage

app = FastAPI(title="Digital Pehlwan PrintAI Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



# =========================================================
# EMAIL OTP HELPERS
# =========================================================

OTP_STORE = {}
OTP_EXPIRY_SECONDS = 10 * 60


class EmailOtpRequest(BaseModel):
    email: str
    purpose: str = "Signup Email Verification"


class EmailOtpVerifyRequest(BaseModel):
    email: str
    otp: str
    purpose: str = "Signup Email Verification"


def _normalize_email(email: str) -> str:
    return str(email or "").strip().lower()


def _otp_key(email: str, purpose: str) -> str:
    return f"{_normalize_email(email)}::{str(purpose or '').strip().lower()}"


def _generate_otp() -> str:
    return str(random.randint(100000, 999999))


def _send_email_via_gmail_smtp(to_email: str, otp: str, purpose: str):
    """
    Gmail App Password se OTP email send karta hai.
    Render par port 465 kabhi-kabhi Network unreachable deta hai,
    isliye pehle 587 STARTTLS try karta hai, phir 465 SSL fallback.
    """
    sender_email = os.getenv("OTP_EMAIL_USER", "").strip()
    app_password = os.getenv("OTP_EMAIL_APP_PASSWORD", "").strip().replace(" ", "")
    from_name = os.getenv("OTP_EMAIL_FROM_NAME", "Digital Pehlwan PrintAI").strip()

    if not sender_email or not app_password:
        raise HTTPException(
            status_code=500,
            detail="OTP_EMAIL_USER ya OTP_EMAIL_APP_PASSWORD backend environment me missing hai.",
        )

    msg = EmailMessage()
    msg["Subject"] = f"Digital Pehlwan PrintAI - {purpose}"
    msg["From"] = f"{from_name} <{sender_email}>"
    msg["To"] = to_email
    msg.set_content(
        f"""Hello,

Your Digital Pehlwan PrintAI OTP is: {otp}

Purpose: {purpose}

This OTP is valid for 10 minutes. Please do not share this OTP with anyone.

Regards,
Digital Pehlwan PrintAI
"""
    )

    context = ssl.create_default_context()
    smtp_errors = []

    # First try port 587 STARTTLS. This works better on many cloud hosts than 465.
    try:
        with smtplib.SMTP("smtp.gmail.com", 587, timeout=30) as server:
            server.ehlo()
            server.starttls(context=context)
            server.ehlo()
            server.login(sender_email, app_password)
            server.send_message(msg)
            return
    except smtplib.SMTPAuthenticationError:
        raise HTTPException(
            status_code=500,
            detail="Gmail SMTP authentication failed. App Password galat hai ya Gmail permission issue hai.",
        )
    except Exception as e:
        smtp_errors.append(f"587 STARTTLS: {str(e)}")

    # Fallback: port 465 SSL.
    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=30, context=context) as server:
            server.login(sender_email, app_password)
            server.send_message(msg)
            return
    except smtplib.SMTPAuthenticationError:
        raise HTTPException(
            status_code=500,
            detail="Gmail SMTP authentication failed. App Password galat hai ya Gmail permission issue hai.",
        )
    except Exception as e:
        smtp_errors.append(f"465 SSL: {str(e)}")

    raise HTTPException(
        status_code=500,
        detail="Email send failed. SMTP connection issue: " + " | ".join(smtp_errors),
    )


@app.post("/auth/send-email-otp")
async def send_email_otp(payload: EmailOtpRequest):
    email = _normalize_email(payload.email)
    purpose = str(payload.purpose or "Signup Email Verification").strip()

    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Valid email required.")

    otp = _generate_otp()
    key = _otp_key(email, purpose)

    OTP_STORE[key] = {
        "otp": otp,
        "expires_at": time.time() + OTP_EXPIRY_SECONDS,
        "verified": False,
    }

    _send_email_via_gmail_smtp(email, otp, purpose)

    return {
        "status": "success",
        "message": "OTP sent to email.",
        "email": email,
        "purpose": purpose,
        "expires_in_seconds": OTP_EXPIRY_SECONDS,
    }


@app.post("/auth/verify-email-otp")
async def verify_email_otp(payload: EmailOtpVerifyRequest):
    email = _normalize_email(payload.email)
    purpose = str(payload.purpose or "Signup Email Verification").strip()
    otp = str(payload.otp or "").strip()

    if not email or not otp:
        raise HTTPException(status_code=400, detail="Email and OTP required.")

    key = _otp_key(email, purpose)
    record = OTP_STORE.get(key)

    if not record:
        raise HTTPException(status_code=400, detail="OTP not found. Please send OTP again.")

    if time.time() > record["expires_at"]:
        OTP_STORE.pop(key, None)
        raise HTTPException(status_code=400, detail="OTP expired. Please send OTP again.")

    if record["otp"] != otp:
        raise HTTPException(status_code=400, detail="Invalid OTP. Please enter correct OTP.")

    record["verified"] = True

    return {
        "status": "success",
        "message": "OTP verified successfully.",
        "email": email,
        "purpose": purpose,
    }

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

CDR direct export possible nahi hai kyunki CorelDRAW .cdr proprietary format hai.

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


@app.get("/smart-edit/remove-bg-health")
async def remove_bg_health():
    """
    Lightweight health check for Smart Editing Background Remover.
    Is route me heavy AI model import nahi hota, isliye Render free server crash nahi karega.
    Actual background removal remove.bg API se hoga.
    """
    api_key_present = bool(os.getenv("REMOVE_BG_API_KEY"))

    return {
        "status": "ok",
        "backend": "running",
        "module": "Smart Editing Background Remover",
        "engine": "remove.bg API",
        "remove_bg_api_key": "present" if api_key_present else "missing",
        "message": (
            "Backend route is working and remove.bg API key is configured."
            if api_key_present
            else "Backend route is working but REMOVE_BG_API_KEY is missing in Render Environment."
        ),
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

        if export_format == "bmp":
            buffer = io.BytesIO()
            canvas.convert("RGB").save(buffer, format="BMP")
            buffer.seek(0)
            return Response(
                content=buffer.getvalue(),
                media_type="image/bmp",
                headers={"Content-Disposition": f'attachment; filename="{base_name}.bmp"'},
            )

        if export_format == "svg":
            svg_bytes = _make_svg_from_image(canvas.convert("RGBA"), dpi=safe_dpi)
            return Response(
                content=svg_bytes,
                media_type="image/svg+xml",
                headers={"Content-Disposition": f'attachment; filename="{base_name}_corel_compatible.svg"'},
            )

        if export_format == "eps":
            eps_bytes = _make_eps_from_image(canvas.convert("RGB"), dpi=safe_dpi)
            return Response(
                content=eps_bytes,
                media_type="application/postscript",
                headers={"Content-Disposition": f'attachment; filename="{base_name}_corel_compatible.eps"'},
            )

        if export_format == "psd":
            psd_bytes = _make_flattened_psd(canvas.convert("RGBA"))
            return Response(
                content=psd_bytes,
                media_type="application/octet-stream",
                headers={"Content-Disposition": f'attachment; filename="{base_name}_flattened.psd"'},
            )

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


# AI session cache for rembg
_REMBG_SESSION = None


def _get_rembg_session():
    """
    Background remover AI model ko ek baar load/cache karta hai.

    Render/local deployment ke liye important:
    - U2NET_HOME env variable use karo.
    - Default model isnet-general-use hai.
    - Agar isnet fail hota hai to u2net fallback try karega.
    """
    global _REMBG_SESSION

    if _REMBG_SESSION is None:
        from rembg import new_session

        u2net_home = os.getenv("U2NET_HOME", "/tmp/.u2net")
        os.makedirs(u2net_home, exist_ok=True)
        os.environ["U2NET_HOME"] = u2net_home

        model_name = os.getenv("REMBG_MODEL", "isnet-general-use")

        try:
            _REMBG_SESSION = new_session(model_name)
        except Exception:
            _REMBG_SESSION = new_session("u2net")

    return _REMBG_SESSION


def _cleanup_alpha_edges(image, feather=1):
    image = image.convert("RGBA")

    if feather and feather > 0:
        alpha = image.getchannel("A")
        alpha = alpha.filter(ImageFilter.GaussianBlur(radius=max(0, min(int(feather), 4))))
        image.putalpha(alpha)

    return image


def _simple_corner_background_remove(image, tolerance=55, feather=1):
    """
    Fast CPU-safe background removal.
    Plain/white/light background par kaam karega.
    Complex images ke liye AI Pro mode use karo.
    """
    image = image.convert("RGBA")
    width, height = image.size
    pixels = image.load()

    sample_points = [
        (0, 0),
        (max(0, width - 1), 0),
        (0, max(0, height - 1)),
        (max(0, width - 1), max(0, height - 1)),
        (width // 2, 0),
        (width // 2, max(0, height - 1)),
        (0, height // 2),
        (max(0, width - 1), height // 2),
    ]

    samples = []
    for x, y in sample_points:
        r, g, b, a = pixels[x, y]
        samples.append((r, g, b))

    bg_r = sorted([c[0] for c in samples])[len(samples) // 2]
    bg_g = sorted([c[1] for c in samples])[len(samples) // 2]
    bg_b = sorted([c[2] for c in samples])[len(samples) // 2]

    result = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    result_pixels = result.load()

    tolerance = max(5, min(int(tolerance), 140))
    soft_range = 38

    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            dist = math.sqrt((r - bg_r) ** 2 + (g - bg_g) ** 2 + (b - bg_b) ** 2)
            brightness = (r + g + b) / 3

            if dist <= tolerance or brightness >= 248:
                new_a = 0
            elif dist <= tolerance + soft_range:
                new_a = int(255 * ((dist - tolerance) / soft_range))
            else:
                new_a = a

            result_pixels[x, y] = (r, g, b, new_a)

    return _cleanup_alpha_edges(result, feather=feather)


def _remove_white_halo(image):
    """
    White background se nikle object ke edge par white halo kam karta hai.
    Conservative cleanup hai, object ko damage nahi karega.
    """
    image = image.convert("RGBA")
    data = image.load()
    width, height = image.size

    for y in range(height):
        for x in range(width):
            r, g, b, a = data[x, y]

            if 8 < a < 245:
                if r > 190 and g > 190 and b > 190:
                    alpha = a / 255.0
                    if alpha > 0:
                        r = int(max(0, min(255, (r - 255 * (1 - alpha)) / alpha)))
                        g = int(max(0, min(255, (g - 255 * (1 - alpha)) / alpha)))
                        b = int(max(0, min(255, (b - 255 * (1 - alpha)) / alpha)))
                        data[x, y] = (r, g, b, a)

    return image


def _prepare_image_for_removebg_api(input_bytes, filename="image.png"):
    """
    remove.bg API upload limit ke liye image ko safe banata hai.
    Important: Ye sirf API upload ke liye compression karta hai.
    Background remove output transparent PNG hi rahega.
    Baaki modules par iska koi effect nahi hoga.
    """
    max_upload_bytes = 20 * 1024 * 1024  # remove.bg 22MB limit se safe margin

    # Agar file already small hai to original bytes hi bhejo
    if len(input_bytes) <= max_upload_bytes:
        return input_bytes, os.path.basename(filename or "image.png")

    try:
        image = Image.open(io.BytesIO(input_bytes))
        image.load()
    except Exception:
        # Agar PIL open fail ho, original bytes bhejne do; API clear error de degi
        return input_bytes, os.path.basename(filename or "image.png")

    # Very large photos ko safe dimension me lao, taaki upload 22MB se neeche rahe
    image = image.convert("RGB")
    max_side = 2600
    width, height = image.size

    if max(width, height) > max_side:
        scale = max_side / float(max(width, height))
        new_width = max(1, int(width * scale))
        new_height = max(1, int(height * scale))
        image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)

    # JPEG quality gradually reduce karo until safe size
    for quality in [92, 88, 84, 80, 76, 72, 68, 64, 60]:
        buffer = io.BytesIO()
        image.save(
            buffer,
            format="JPEG",
            quality=quality,
            optimize=True,
            progressive=True,
        )
        output = buffer.getvalue()
        if len(output) <= max_upload_bytes:
            return output, "printai-remove-bg-upload.jpg"

    # Last fallback: dimension aur reduce karo
    max_side = 1800
    width, height = image.size
    if max(width, height) > max_side:
        scale = max_side / float(max(width, height))
        image = image.resize(
            (max(1, int(width * scale)), max(1, int(height * scale))),
            Image.Resampling.LANCZOS,
        )

    buffer = io.BytesIO()
    image.save(buffer, format="JPEG", quality=72, optimize=True, progressive=True)
    return buffer.getvalue(), "printai-remove-bg-upload.jpg"


def _remove_bg_with_removebg_api(input_bytes, filename="image.png"):
    """
    remove.bg cloud API integration.
    Render free server par local AI model crash/timeout issue avoid karta hai.
    Large image ko API limit ke andar compress karta hai.
    Output transparent PNG bytes return karta hai.
    """
    import urllib.request
    import urllib.error
    import uuid

    api_key = os.getenv("REMOVE_BG_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="REMOVE_BG_API_KEY Render Environment me missing hai.",
        )

    upload_bytes, upload_filename = _prepare_image_for_removebg_api(input_bytes, filename)

    boundary = "----PrintAIBoundary" + uuid.uuid4().hex
    safe_filename = os.path.basename(upload_filename or "image.jpg")

    def part(name, value):
        return (
            f"--{boundary}\r\n"
            f'Content-Disposition: form-data; name="{name}"\r\n\r\n'
            f"{value}\r\n"
        ).encode("utf-8")

    body = io.BytesIO()
    body.write(
        (
            f"--{boundary}\r\n"
            f'Content-Disposition: form-data; name="image_file"; filename="{safe_filename}"\r\n'
            f"Content-Type: application/octet-stream\r\n\r\n"
        ).encode("utf-8")
    )
    body.write(upload_bytes)
    body.write(b"\r\n")

    body.write(part("size", "auto"))
    body.write(part("format", "png"))
    body.write(f"--{boundary}--\r\n".encode("utf-8"))

    req = urllib.request.Request(
        "https://api.remove.bg/v1.0/removebg",
        data=body.getvalue(),
        method="POST",
        headers={
            "X-Api-Key": api_key,
            "Content-Type": f"multipart/form-data; boundary={boundary}",
        },
    )

    try:
        with urllib.request.urlopen(req, timeout=120) as response:
            output_bytes = response.read()
            if not output_bytes:
                raise HTTPException(status_code=500, detail="remove.bg API ne empty output diya.")
            return output_bytes
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8", errors="ignore")
        raise HTTPException(
            status_code=e.code,
            detail=f"remove.bg API error: {error_body or str(e)}",
        )
    except urllib.error.URLError as e:
        raise HTTPException(
            status_code=500,
            detail=f"remove.bg API connection error: {str(e)}",
        )


@app.post("/smart-edit/remove-bg")
async def remove_bg(
    file: UploadFile = File(...),
    mode: str = Form("ai-pro"),
    tolerance: int = Form(55),
    feather: int = Form(0),
):
    """
    Smart Editing Background Remove

    mode:
    - ai-pro / best / pro / ai = remove.bg cloud API, stable for Render
    - fast = local simple corner-color remover for plain white/light background

    बाकी modules को disturb नहीं करता. Output PNG transparent रहेगा.
    """
    try:
        input_bytes = await file.read()
        mode = (mode or "ai-pro").lower().strip()
        feather = max(0, min(int(feather), 3))
        tolerance = max(5, min(int(tolerance), 140))

        if not input_bytes:
            raise HTTPException(status_code=400, detail="Uploaded image empty hai.")

        # AI PRO MODE: remove.bg API
        if mode in ["ai", "ai-pro", "pro", "best"]:
            output_bytes = _remove_bg_with_removebg_api(input_bytes, file.filename)

            # Optional very light edge smooth only if user chooses feather > 0
            if feather > 0:
                result = Image.open(io.BytesIO(output_bytes)).convert("RGBA")
                result = _cleanup_alpha_edges(result, feather=feather)
                buffer = io.BytesIO()
                result.save(buffer, format="PNG", optimize=True)
                output_bytes = buffer.getvalue()

            return Response(
                content=output_bytes,
                media_type="image/png",
                headers={
                    "X-PrintAI-BG-Mode": "remove-bg-api",
                    "X-PrintAI-Status": "success",
                },
            )

        # FAST MODE: existing local simple remover, does not affect other modules
        image = Image.open(io.BytesIO(input_bytes)).convert("RGBA")
        result = _simple_corner_background_remove(
            image,
            tolerance=tolerance,
            feather=feather,
        )

        buffer = io.BytesIO()
        result.save(buffer, format="PNG", optimize=True)
        buffer.seek(0)

        return Response(
            content=buffer.getvalue(),
            media_type="image/png",
            headers={
                "X-PrintAI-BG-Mode": "fast",
                "X-PrintAI-Status": "success",
            },
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Remove background failed: {str(e)}"
        )


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