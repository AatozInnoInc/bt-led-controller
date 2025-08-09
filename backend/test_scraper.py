#!/usr/bin/env python3
"""
Test script for the new CarGurus JSON API scraper
"""

from scraper.cargurus_scraper import CarGurusScraper

def test_scraper():
    """Test the new JSON API scraper"""
    
    # Test URL
    url = "https://www.cargurus.com/Cars/inventorylisting/vdp.action?listingId=418813253&sourceContext=carGurusHomePageModel&zip=27401&entitySelectingHelper.selectedEntity=m1#listing=418813253/NONE/DDEFAULT"
    
    print("🚗 Testing CarGurus JSON API Scraper")
    print("=" * 50)
    
    # Create scraper and scrape
    scraper = CarGurusScraper()
    result = scraper.scrape_car(url)
    
    if result:
        print("✅ SUCCESS! Car data extracted:")
        print(f"   Make: {result.make}")
        print(f"   Model: {result.model}")
        print(f"   Year: {result.year}")
        print(f"   Price: ${result.price:,.2f}")
        print(f"   Images: {len(result.images)} found")
        print(f"   Features: {len(result.features)} found")
        
        print(f"\n📝 Description: {result.description[:150]}...")
        
        print(f"\n🔧 First 5 Features:")
        for i, feature in enumerate(result.features[:5]):
            print(f"   {i+1}. {feature}")
        
        print(f"\n🖼️  First 3 Images:")
        for i, img in enumerate(result.images[:3]):
            print(f"   {i+1}. {img}")
            
        print(f"\n🎉 AMAZING! We now have ALL {len(result.images)} images and {len(result.features)} features!")
        
    else:
        print("❌ Failed to scrape car data")

if __name__ == "__main__":
    test_scraper() 