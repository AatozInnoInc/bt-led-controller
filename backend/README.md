# BT LED Guitar Dashboard Python Backend

This is the Python FastAPI backend for the BT LED Guitar Dashboard PWA. It provides web scraping capabilities for CarGurus.com with professional architecture patterns.

## 🏗️ Architecture

- **FastAPI**: Modern, fast web framework for building APIs
- **Pydantic**: Data validation using Python type annotations
- **BeautifulSoup**: HTML parsing and web scraping
- **Async/Await**: Non-blocking I/O operations
- **CORS**: Cross-origin resource sharing support
- **Logging**: Comprehensive logging system

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- pip (Python package manager)

### Installation

1. Clone the repository and navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Run the development server:
```bash
python main.py
```

4. The API will be available at `http://localhost:8000`

## 📊 API Endpoints

### Health Check
- **GET** `/api/health` - Check API status

### Car Scraping
- **POST** `/api/scrape` - Scrape car details from CarGurus.com

#### Request Body:
```json
{
    "url": "https://www.cargurus.com/Cars/l-toyota-camry"
}
```

#### Response:
```json
{
    "success": true,
    "data": {
        "make": "Toyota",
        "model": "Camry",
        "year": 2022,
        "price": 28500.0,
        "description": "This 2022 Toyota Camry...",
        "features": ["Bluetooth Connectivity", "Backup Camera"],
        "images": ["https://example.com/car1.jpg"],
        "originalUrl": "https://www.cargurus.com/Cars/l-toyota-camry",
        "scrapedAt": "2024-01-01T12:00:00Z"
    },
    "error": null
}
```

## 🛠️ Development

### Project Structure

```
backend/
├── main.py                 # FastAPI application
├── simple_main.py         # Simplified version for testing
├── requirements.txt       # Python dependencies
├── scraper/              # Scraping module
│   ├── __init__.py
│   ├── cargurus_scraper.py
│   └── models.py
└── README.md             # This file
```

### Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=scraper
```

### Code Formatting

```bash
# Format code with black
black .

# Sort imports
isort .
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the backend directory:

```env
LOG_LEVEL=INFO
MAX_RETRIES=3
TIMEOUT=30
```

### CORS Configuration

The API is configured to allow requests from:
- `http://localhost:5000`
- `http://localhost:3000`
- `https://bt-led-guitar-dashboard.web.app`
- `https://bt-led-guitar-dashboard.firebaseapp.com`

## 📈 Performance

- **Async Operations**: Non-blocking I/O for better performance
- **Connection Pooling**: Efficient HTTP connections
- **Retry Logic**: Exponential backoff for failed requests
- **Caching**: To be implemented for frequently accessed data

## 🔒 Security

- **Input Validation**: URL sanitization and validation
- **CORS Protection**: Configured for specific domains
- **Error Sanitization**: Safe error messages
- **Rate Limiting**: To be implemented

## 🚀 Deployment

### Render Deployment

1. Connect your repository to Render
2. Configure the build command: `pip install -r requirements.txt`
3. Set the start command: `python main.py`
4. Deploy!

### Local Development

```bash
# Run with auto-reload
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Run with specific log level
LOG_LEVEL=DEBUG python main.py
```

## 📊 Monitoring

- **Application Logs**: Comprehensive logging with different levels
- **Performance Metrics**: Response times and success rates
- **Error Tracking**: Detailed error logging
- **Health Checks**: `/api/health` endpoint

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Follow PEP 8 style guide
4. Add tests for new features
5. Update documentation
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Built with ❤️ using FastAPI and modern Python practices** 