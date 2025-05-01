import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Config:
    MONGO_URI: str = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    MONGO_DB_NAME: str = os.getenv("MONGO_DB_NAME", "lost_n_found")

    # Email Settings (Gmail SMTP)
    SMTP_SERVER: str = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    EMAIL_SENDER: str = os.getenv("EMAIL_SENDER", "")
    EMAIL_PASSWORD: str = os.getenv("EMAIL_PASSWORD", "")  # App Password from .env

    # Location API Settings
    LOCATION_API_BASE_URL: str = os.getenv("LOCATION_API_BASE_URL", "")
    LOCATION_API_KEY: str = os.getenv("LOCATION_API_KEY", "")
    APP_HOST: str = os.getenv("APP_HOST", "localhost")
    APP_PORT: int = int(os.getenv("APP_PORT", "5424"))
    SESSION_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("SESSION_TOKEN_EXPIRE_MINUTES", "1440"))
    ALLOWED_ORIGINS: list[str] = ["*"]
    NGINX_HOST: str = os.getenv("NGINX_HOST", "localhost")
    NGINX_SITES_AVAILABLE: str = "/etc/nginx/sites-available"
    NGINX_SITES_ENABLED: str = "/etc/nginx/sites-enabled"
    NGINX_LOG_DIR: str = "/var/log/nginx"
    NGINX_CONF_FILE: str = "/etc/nginx/nginx.conf"