import requests
import logging
import json
import re
from typing import Optional, List
from urllib.parse import urlparse
from .models import ScrapedCar
import time

logger = logging.getLogger(__name__)

class CarGurusScraper:
    """
    Professional CarGurus.com scraper using the JSON API endpoint.
    
    This scraper uses CarGurus' internal JSON API to extract complete car data
    including all images, specifications, and detailed information.
    """
    
    def __init__(self):
        self.session = requests.Session()
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/javascript, */*; q=0.01',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Referer': 'https://www.cargurus.com/',
        }
        self.session.headers.update(self.headers)
        self.max_retries = 3
        self.timeout = 30
    
    def scrape_car(self, url: str) -> Optional[ScrapedCar]:
        """
        Main scraping method using CarGurus JSON API.
        
        Args:
            url: CarGurus.com URL to scrape
            
        Returns:
            ScrapedCar object if successful, None otherwise
        """
        start_time = time.time()
        
        try:
            logger.info(f"Starting scrape for URL: {url}")
            
            # Validate URL
            if not self._is_valid_cargurus_url(url):
                logger.error(f"Invalid CarGurus URL: {url}")
                return None
            
            # Extract listing ID from URL
            listing_id = self._extract_listing_id(url)
            if not listing_id:
                logger.error(f"Could not extract listing ID from URL: {url}")
                logger.info(f"URL analysis - Domain: {urlparse(url).netloc}, Path: {urlparse(url).path}")
                return None
            
            logger.info(f"Extracted listing ID: {listing_id}")
            
            # Fetch JSON data from CarGurus API
            json_data = self._fetch_json_data(listing_id)
            if not json_data:
                logger.error(f"Failed to fetch JSON data for listing ID: {listing_id}")
                return None
            
            # Extract car data from JSON
            car_data = self._extract_car_data_from_json(json_data, url)
            
            if car_data:
                processingTime = time.time() - start_time
                logger.info(f"Successfully scraped car in {processingTime:.2f}s: {car_data.make} {car_data.model} {car_data.year}")
                return car_data
            else:
                logger.warning(f"Failed to extract car data from JSON for listing ID: {listing_id}")
                return None
                
        except Exception as e:
            logger.error(f"Error scraping {url}: {str(e)}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return None
    
    def _is_valid_cargurus_url(self, url: str) -> bool:
        """Validate that the URL is a valid CarGurus.com URL"""
        try:
            parsed = urlparse(url)
            # Check if it's a CarGurus domain
            if parsed.netloc not in ('www.cargurus.com', 'cargurus.com'):
                return False
            
            # Check if it's a car-related page (more flexible)
            car_indicators = [
                '/Cars/',
                '/inventorylisting/',
                '/listing',
                'cargurus.com'
            ]
            
            url_lower = url.lower()
            return any(indicator.lower() in url_lower for indicator in car_indicators)
            
        except Exception:
            return False
    
    def _extract_listing_id(self, url: str) -> Optional[str]:
        """Extract listing ID from CarGurus URL using multiple patterns"""
        try:
            # Pattern 1: listingId parameter (e.g., ?listingId=123456789)
            if 'listingId=' in url:
                start = url.find('listingId=') + len('listingId=')
                end = url.find('&', start)
                if end == -1:
                    end = url.find('#', start)
                if end == -1:
                    end = len(url)
                listing_id = url[start:end]
                if listing_id.isdigit():
                    return listing_id
            
            # Pattern 2: /listing=ID/ format (e.g., #listing=123456789/NONE/DEFAULT)
            if '/listing=' in url:
                start = url.find('/listing=') + len('/listing=')
                end = url.find('/', start)
                if end == -1:
                    end = len(url)
                listing_part = url[start:end]
                # Extract just the ID part before any slashes
                listing_id = listing_part.split('/')[0]
                if listing_id.isdigit():
                    return listing_id
            
            # Pattern 3: #listing=ID format (e.g., #listing=123456789/NONE/DEFAULT)
            if '#listing=' in url:
                start = url.find('#listing=') + len('#listing=')
                end = url.find('/', start)
                if end == -1:
                    end = len(url)
                listing_part = url[start:end]
                # Extract just the ID part before any slashes
                listing_id = listing_part.split('/')[0]
                if listing_id.isdigit():
                    return listing_id
            
            # Pattern 4: Extract from URL path (e.g., /Cars/l-123456789)
            # Look for patterns like /l-123456789 or similar
            import re
            path_patterns = [
                r'/l-(\d+)',  # /l-123456789
                r'/listing/(\d+)',  # /listing/123456789
                r'/inventorylisting/(\d+)',  # /inventorylisting/123456789
            ]
            
            for pattern in path_patterns:
                match = re.search(pattern, url)
                if match:
                    listing_id = match.group(1)
                    if listing_id.isdigit():
                        return listing_id
            
            # Pattern 5: Extract from query parameters (various formats)
            query_patterns = [
                r'[?&]id=(\d+)',
                r'[?&]listing=(\d+)',
                r'[?&]inventoryId=(\d+)',
            ]
            
            for pattern in query_patterns:
                match = re.search(pattern, url)
                if match:
                    listing_id = match.group(1)
                    if listing_id.isdigit():
                        return listing_id
            
            # Pattern 6: Look for any sequence of 6+ digits that might be a listing ID
            digit_pattern = r'(\d{6,})'
            matches = re.findall(digit_pattern, url)
            for match in matches:
                # Check if this looks like a listing ID (not a zip code, year, etc.)
                if len(match) >= 6 and not self._is_likely_not_listing_id(match, url):
                    return match
            
            logger.warning(f"Could not extract listing ID from URL: {url}")
            return None
            
        except Exception as e:
            logger.error(f"Error extracting listing ID from {url}: {str(e)}")
            return None
    
    def _is_likely_not_listing_id(self, candidate: str, url: str) -> bool:
        """Check if a candidate ID is likely not a listing ID"""
        # Years are not listing IDs
        if len(candidate) == 4 and 1900 <= int(candidate) <= 2030:
            return True
        
        # Zip codes are not listing IDs
        if len(candidate) == 5 and url.find('zip=' + candidate) != -1:
            return True
        
        # Phone numbers are not listing IDs
        if len(candidate) == 10 and candidate.startswith(('1', '2', '3', '4', '5', '6', '7', '8', '9')):
            return True
        
        return False
    
    def _fetch_json_data(self, listing_id: str) -> Optional[dict]:
        """
        Fetch JSON data from CarGurus API.
        
        Args:
            listing_id: The listing ID to fetch
            
        Returns:
            JSON data as dict, or None if failed
        """
        import time
        
        # Construct the API URL
        api_url = f"https://www.cargurus.com/Cars/detailListingJson.action"
        params = {
            'inventoryListing': listing_id,
            'inclusionType': 'DEFAULT',
            'pid': 'null',
            'sourceContext': 'carGurusHomePageModel',
            'isDAVE': 'true'
        }
        
        for attempt in range(self.max_retries):
            try:
                response = self.session.get(api_url, params=params, timeout=self.timeout)
                if response.status_code == 200:
                    try:
                        json_data = response.json()
                        if 'listing' in json_data:
                            logger.info(f"Successfully fetched JSON data for listing {listing_id}")
                            return json_data
                        else:
                            logger.warning(f"Invalid JSON response structure for listing {listing_id}")
                    except json.JSONDecodeError as e:
                        logger.warning(f"Failed to parse JSON for listing {listing_id}: {str(e)}")
                else:
                    logger.warning(f"HTTP {response.status_code} for listing {listing_id} (attempt {attempt + 1})")
                    
            except requests.Timeout:
                logger.warning(f"Timeout for listing {listing_id} (attempt {attempt + 1})")
            except Exception as e:
                logger.error(f"Error fetching listing {listing_id} (attempt {attempt + 1}): {str(e)}")
            
            if attempt < self.max_retries - 1:
                time.sleep(2 ** attempt)  # Exponential backoff
        
        return None
    
    def _extract_car_data_from_json(self, json_data: dict, url: str) -> Optional[ScrapedCar]:
        """
        Extract car data from CarGurus JSON response.
        
        Args:
            json_data: The JSON response from CarGurus API
            url: Original URL
            
        Returns:
            ScrapedCar object if successful, None otherwise
        """
        try:
            listing = json_data.get('listing', {})
            
            # Extract car information from autoEntityInfo for more accurate data
            auto_entity_info = listing.get('autoEntityInfo', {})
            
            # Extract year, make, model, and trim from autoEntityInfo
            year = auto_entity_info.get('year', listing.get('year', 0))
            make = auto_entity_info.get('make', listing.get('makeName', 'Unknown'))
            model = auto_entity_info.get('model', listing.get('modelName', 'Unknown'))
            
            # Try to get trim from multiple sources
            trim = auto_entity_info.get('trim', '')
            if not trim or trim.strip() == '':
                # Try to extract from listingTitleOnly first (most complete)
                listing_title = listing.get('listingTitleOnly', '')
                if listing_title:
                    # Extract the part after the model name
                    model_name = listing.get('modelName', '')
                    if model_name and model_name in listing_title:
                        # Find the part after the model name
                        parts = listing_title.split(model_name, 1)
                        if len(parts) > 1:
                            potential_trim = parts[1].strip()
                            if potential_trim:
                                trim = potential_trim
            if not trim or trim.strip() == '':
                # Fallback to trimName from listing
                trim = listing.get('trimName', '')
            
            # Construct the full title: Year Make Model Trim
            if trim and trim.strip():
                fullTitle = f"{year} {make} {model} {trim}".strip()
            else:
                fullTitle = f"{year} {make} {model}".strip()
            
            price = listing.get('price', 0.0)
            description = listing.get('description', 'No description available.')
            
            # Extract features from options and description
            features = self._extract_features_from_json(listing)
            
            # Extract stats information
            stats = self._extract_stats_from_json(listing)
            
            # Extract all images
            images = self._extract_images_from_json(listing)
            
            # Validate that we have at least basic information
            if not make or not model or year == 0:
                logger.warning(f"Insufficient car data extracted from JSON")
                return None
            
            logger.info(f"Extracted car title: {fullTitle}")
            
            return ScrapedCar(
                make=make,
                model=model,
                year=year,
                price=price,
                description=description,
                features=features,
                stats=stats,
                images=images,
                originalUrl=url,
                fullTitle=fullTitle  # Add the constructed title
            )
            
        except Exception as e:
            logger.error(f"Error extracting car data from JSON: {str(e)}")
            return None
    
    def _extract_features_from_json(self, listing: dict) -> List[str]:
        """Extract features from JSON data"""
        features = []
        
        # Add options from the listing
        options = listing.get('options', [])
        features.extend(options)
        
        # Extract features from description
        description = listing.get('description', '')
        if description:
            # Split description by common separators and extract features
            desc_parts = description.split('[!@@Additional Info@@!]')
            if len(desc_parts) > 1:
                additional_info = desc_parts[1]
                # Split by commas and clean up
                additional_features = [feature.strip() for feature in additional_info.split(',') if feature.strip()]
                features.extend(additional_features)
        
        # Add some basic specs if available
        if listing.get('localizedTransmission'):
            features.append(f"Transmission: {listing['localizedTransmission']}")
        if listing.get('localizedDriveTrain'):
            features.append(f"Drivetrain: {listing['localizedDriveTrain']}")
        if listing.get('localizedEngineDisplayName'):
            features.append(f"Engine: {listing['localizedEngineDisplayName']}")
        if listing.get('mileageString'):
            features.append(f"Mileage: {listing['mileageString']}")
        
        if not features:
            features.append("Features not available")
        
        return features
    
    def _extract_stats_from_json(self, listing: dict) -> List[dict]:
        """Extract stats information from listingDetailStatsSectionDto"""
        stats = []
        
        try:
            # Extract stats from listingDetailStatsSectionDto
            stats_section = listing.get('listingDetailStatsSectionDto', [])
            
            if not isinstance(stats_section, list):
                logger.warning("listingDetailStatsSectionDto is not a list")
                return stats
            
            for category in stats_section:
                if not isinstance(category, dict):
                    continue
                
                category_name = category.get('categoryName', '')
                items = category.get('items', [])
                options_list = category.get('optionsList', [])
                
                # Add category header if it has items
                if items and category_name:
                    stats.append({
                        'header': f"📋 {category_name}",
                        'value': f"{len(items)} items"
                    })
                
                # Add individual items
                if items:  # Check if items is not None
                    for item in items:
                        if isinstance(item, dict):
                            label = item.get('label', '')
                            display_value = item.get('displayValue', '')
                            if label and display_value:
                                stats.append({
                                    'header': label,
                                    'value': display_value
                                })
                
                # Add options if they exist
                if options_list and category_name and options_list is not None:
                    option_names = [opt.get('name', '') for opt in options_list if isinstance(opt, dict) and opt.get('name')]
                    if option_names:
                        stats.append({
                            'header': f"🔧 {category_name} Options",
                            'value': f"{len(option_names)} options"
                        })
                        # Add individual options
                        for option_name in option_names:
                            stats.append({
                                'header': "  • " + option_name,
                                'value': "✓"
                            })
            
            logger.info(f"Extracted {len(stats)} stats from listing")
            
        except Exception as e:
            logger.warning(f"Error extracting stats: {str(e)}")
            # Return empty list if there's an error
            stats = []
        
        return stats
    
    def _extract_images_from_json(self, listing: dict) -> List[str]:
        """Extract all images from JSON data"""
        images = []
        
        pictures = listing.get('pictures', [])
        for picture in pictures:
            # Use the main URL (1024x768) for best quality
            url = picture.get('url')
            if url and url not in images:
                images.append(url)
        
        # If no images found, add placeholder
        if not images:
            images.append("https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&h=600&fit=crop")
        
        return images 