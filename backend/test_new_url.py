#!/usr/bin/env python3
"""
Test script for the improved CarGurus scraper with new URL formats
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from scraper.cargurus_scraper import CarGurusScraper

def test_new_url_format():
    """Test the scraper with the new URL format"""
    
    # The URL that was failing
    test_url = "https://www.cargurus.com/Cars/inventorylisting/viewDetailsFilterViewInventoryListing.action?sourceContext=carGurusHomePageModel&zip=27401&entitySelectingHelper.selectedEntity=m1#listing=418183121/NONE/DEFAULT"
    
    print("🚗 Testing Improved CarGurus Scraper")
    print("=" * 50)
    print(f"URL: {test_url}")
    print()
    
    # Create scraper and test
    scraper = CarGurusScraper()
    
    # Test URL validation
    print("1. Testing URL validation...")
    is_valid = scraper._is_valid_cargurus_url(test_url)
    print(f"   URL valid: {is_valid}")
    
    # Test listing ID extraction
    print("\n2. Testing listing ID extraction...")
    listing_id = scraper._extract_listing_id(test_url)
    print(f"   Extracted listing ID: {listing_id}")
    
    if listing_id:
        print("   ✅ Successfully extracted listing ID!")
    else:
        print("   ❌ Failed to extract listing ID")
        return
    
    # Test full scraping
    print("\n3. Testing full scraping...")
    result = scraper.scrape_car(test_url)
    
    if result:
        print("✅ SUCCESS! Car data extracted:")
        print(f"   Full Title: {result.fullTitle}")
        print(f"   Make: {result.make}")
        print(f"   Model: {result.model}")
        print(f"   Year: {result.year}")
        print(f"   Price: ${result.price:,.2f}")
        print(f"   Images: {len(result.images)} found")
        print(f"   Features: {len(result.features)} found")
        print(f"   Stats: {len(result.stats)} found")
        
        print(f"\n📝 Description: {result.description[:150]}...")
        
        print(f"\n📊 Stats Information:")
        for i, stat in enumerate(result.stats[:10]):
            print(f"   {i+1}. {stat['header']}: {stat['value']}")
        
        if len(result.stats) > 10:
            print(f"   ... and {len(result.stats) - 10} more stats")
        
        print(f"\n🔧 First 5 Features:")
        for i, feature in enumerate(result.features[:5]):
            print(f"   {i+1}. {feature}")
        
        print(f"\n🖼️  First 3 Images:")
        for i, img in enumerate(result.images[:3]):
            print(f"   {i+1}. {img}")
            
    else:
        print("❌ Failed to scrape car data")

if __name__ == "__main__":
    test_new_url_format() 