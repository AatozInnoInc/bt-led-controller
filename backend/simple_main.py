from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import uvicorn
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="BT LED Guitar Dashboard API",
    description="Backend API for BT LED Guitar Dashboard PWA - CarGurus scraping service",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5000",
        "http://localhost:3000",
        "https://bt-led-guitar-dashboard.web.app",
        "https://bt-led-guitar-dashboard.firebaseapp.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ScrapeRequest(BaseModel):
    url: str

class ScrapeResponse(BaseModel):
    success: bool
    data: Optional[dict] = None
    error: Optional[str] = None

@app.get("/")
async def root():
    return {"message": "BT LED Guitar Dashboard API is running", "version": "1.0.0"}

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "bt-led-guitar-dashboard-api",
        "version": "1.0.0"
    }

@app.post("/api/scrape")
async def scrape_car_details(request: ScrapeRequest):
    """
    Scrape car details from CarGurus.com
    """
    try:
        logger.info(f"Scraping URL: {request.url}")
        
        # Mock response for now
        mock_data = {
            "make": "Toyota",
            "model": "Camry",
            "year": 2022,
            "price": 28500.0,
            "description": "This is a mock car listing for testing purposes.",
            "features": ["Bluetooth Connectivity", "Backup Camera", "Lane Departure Warning"],
            "images": ["https://example.com/car1.jpg"],
            "originalUrl": request.url,
            "scrapedAt": "2024-01-01T12:00:00Z"
        }
        
        return ScrapeResponse(
            success=True,
            data=mock_data,
            error=None
        )
            
    except Exception as e:
        logger.error(f"Error scraping car details: {str(e)}")
        return ScrapeResponse(
            success=False,
            data=None,
            error=f"An error occurred: {str(e)}"
        )

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000) 