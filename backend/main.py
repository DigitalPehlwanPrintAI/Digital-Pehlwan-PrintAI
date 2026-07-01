from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from image_processor import process_image

app = FastAPI()

# CORS (frontend connect ke liye)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Test route
@app.get("/")
def home():
    return {
        "status": "running",
        "message": "Digital Pehlwan PrintAI Backend"
    }

# Image processing route
@app.post("/process")
async def process(file: UploadFile = File(...)):
    image = await file.read()
    result = process_image(image)
    return result