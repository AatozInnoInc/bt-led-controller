from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, HttpUrl
from typing import Optional, List, Dict, Any
import httpx
import asyncio
import logging
from datetime import datetime
import json
import re
from scraper.cargurus_scraper import CarGurusScraper
from scraper.models import CarListing

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

# Initialize scraper
scraper = CarGurusScraper()

class ScrapeRequest(BaseModel):
    url: HttpUrl

class ScrapeResponse(BaseModel):
    success: bool
    data: Optional[CarListing] = None
    error: Optional[str] = None

@app.get("/")
async def root():
    return {"message": "BT LED Guitar Dashboard API is running", "version": "1.0.0"}

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "bt-led-guitar-dashboard-api",
        "version": "1.0.0"
    }

@app.post("/api/scrape", response_model=ScrapeResponse)
async def scrape_car_details(request: ScrapeRequest):
    """
    Scrape car details from CarGurus.com
    """
    try:
        logger.info(f"Scraping URL: {request.url}")
        
        # Scrape the car details
        car_data = await scraper.scrape_car_details(str(request.url))
        
        if car_data:
            return ScrapeResponse(
                success=True,
                data=car_data,
                error=None
            )
        else:
            return ScrapeResponse(
                success=False,
                data=None,
                error="Failed to scrape car details"
            )
            
    except Exception as e:
        logger.error(f"Error scraping car details: {str(e)}")
        return ScrapeResponse(
            success=False,
            data=None,
            error=f"An error occurred: {str(e)}"
        )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global exception handler: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": "Internal server error",
            "message": str(exc)
        }
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 