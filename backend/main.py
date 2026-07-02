from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from PIL import Image
from io import BytesIO

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
            "inch": {"width": round(width_inch, 2), "height": round(height_inch, 2)},
            "feet": {"width": round(width_inch / 12, 2), "height": round(height_inch / 12, 2)},
            "cm": {"width": round(width_inch * 2.54, 2), "height": round(height_inch * 2.54, 2)},
        },
    }

@app.post("/resize")
async def resize_image(
    file: UploadFile = File(...),
    width_px: int = Form(...),
    height_px: int = Form(...),
):
    image = Image.open(BytesIO(await file.read())).convert("RGB")
    resized = image.resize((width_px, height_px))

    output = BytesIO()
    resized.save(output, format="JPEG", quality=95)
    output.seek(0)

    return Response(content=output.getvalue(), media_type="image/jpeg")