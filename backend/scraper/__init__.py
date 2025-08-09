"""
BT LED Guitar Dashboard Scraper Package

This package contains the scraping functionality for the BT LED Guitar Dashboard PWA.
"""

from .cargurus_scraper import CarGurusScraper
from .models import ScrapedCar, ScrapingResult

__all__ = ['CarGurusScraper', 'ScrapedCar', 'ScrapingResult']
__version__ = "1.0.0"
__author__ = "BT LED Guitar Dashboard Team" 