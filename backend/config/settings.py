import os
from pathlib import Path
from dotenv import load_dotenv
from pydantic import BaseModel, EmailStr

# Load .env from project root (if present)
BASE_DIR = Path(__file__).resolve().parent.parent
env_path = BASE_DIR / ".env"
if env_path.exists():
    load_dotenv(env_path)


class AppConfig:
    class _AppConfig(BaseModel):
        app_name: str | None = None
        secret_key: str | None = None
        access_token_expire_minutes: int | None = None
        otp_secret_key: str | None = None
        otp_expire_seconds: int | None = None
            # --- Resend Email API ---
        resend_api_key: str | None = None
        resend_from_email: str | None = None
        project_name: str | None = None
        PAYMENT_MODE: str = "razorpay"
        RAZORPAY_KEY_ID: str | None = None
        RAZORPAY_KEY_SECRET: str | None = None

    config = _AppConfig(
        app_name=os.getenv("APP_NAME"),
        secret_key=os.getenv("SECRET_KEY"),
        access_token_expire_minutes=int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES") or 30),
        otp_secret_key=os.getenv("OTP_SECRET_KEY"),
        otp_expire_seconds=int(os.getenv("OTP_EXPIRE_SECONDS") or 360),
        resend_api_key=os.getenv("RESEND_API_KEY"),
        resend_from_email=os.getenv("RESEND_FROM_EMAIL"),
        project_name=os.getenv("PROJECT_NAME", "SP Aroma"),
        PAYMENT_MODE=os.getenv("PAYMENT_MODE", "razorpay"),
        RAZORPAY_KEY_ID=os.getenv("RAZORPAY_KEY_ID"),
        RAZORPAY_KEY_SECRET=os.getenv("RAZORPAY_KEY_SECRET"),
    )


    @classmethod
    def get_config(cls) -> _AppConfig:
        return cls.config


class EmailServiceConfig:
    class _SMTPConfig(BaseModel):
        smtp_server: str | None = None
        smtp_port: int | None = None
        smtp_username: EmailStr | None = None
        smtp_password: str | None = None
        use_local_fallback: bool = False

    config = _SMTPConfig(
        smtp_server=os.getenv("SMTP_SERVER"),
        smtp_port=int(os.getenv("SMTP_PORT") or 587),
        smtp_username=os.getenv("SMTP_USERNAME"),
        smtp_password=os.getenv("SMTP_PASSWORD"),
        use_local_fallback=os.getenv("USE_LOCAL_FALLBACK", "False").lower() == "true",
    )

    @classmethod
    def get_config(cls) -> _SMTPConfig:
        return cls.config


# --- Database (only DATABASE_URL, NO SQLITE fallback) ---
# Set DATABASE_URL in .env or environment. Example:
# DATABASE_URL=postgresql://user:pass@host:5432/dbname?sslmode=require
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    # fail fast: require DATABASE_URL
    raise RuntimeError("DATABASE_URL not set. Please set it in your .env or environment before starting the app.")

# Optional supabase/neon keys (keep if you use them elsewhere)
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")


# Media/settings
# MEDIA_DIR = BASE_DIR / "media"
# MEDIA_DIR.mkdir(parents=True, exist_ok=True)


# Cloudinary
CLOUDINARY_CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME")
CLOUDINARY_API_KEY = os.getenv("CLOUDINARY_API_KEY")
CLOUDINARY_API_SECRET = os.getenv("CLOUDINARY_API_SECRET")


MAX_FILE_SIZE = 5
products_list_limit = 12


PAYMENT_MODE: str = os.getenv("PAYMENT_MODE", "razorpay")
# values: "mock" | "razorpay"

RAZORPAY_KEY_ID: str | None = os.getenv("RAZORPAY_KEY_ID")
RAZORPAY_KEY_SECRET: str | None = os.getenv("RAZORPAY_KEY_SECRET")