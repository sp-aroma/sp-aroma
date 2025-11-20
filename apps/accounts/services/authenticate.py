from fastapi import HTTPException, status, Depends
from fastapi.security import OAuth2PasswordBearer

from apps.accounts.models import User
from apps.accounts.services.password import PasswordManager
from apps.accounts.services.token import TokenService
from apps.accounts.services.user import UserManager
from apps.core.date_time import DateTime
from apps.core.services.email_manager import EmailService


class AccountService:

    @classmethod
    async def current_user(cls, token: str = Depends(OAuth2PasswordBearer(tokenUrl="accounts/login"))) -> User:
        user = await TokenService.fetch_user(token)
        return user

    # ----------------
    # --- Register ---
    # ----------------

    @classmethod
    def register(cls, email: str, password: str):
        if UserManager.get_user(email=email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This email has already been taken."
            )

        new_user = UserManager.create_user(email=email, password=password)
        TokenService(new_user.id).request_is_register()
        EmailService.register_send_verification_email(new_user.email)

        return {
            'email': new_user.email,
            'message': 'Please check your email for an OTP code to confirm your email address.'
        }

    @classmethod
    def verify_registration(cls, email: str, otp: str):
        user = UserManager.get_user(email=email)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

        if user.is_verified_email:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="This email is already verified."
            )

        token = TokenService(user=user)
        if not token.validate_otp_token(otp):
            raise HTTPException(
                status_code=status.HTTP_406_NOT_ACCEPTABLE,
                detail="Invalid OTP code. Please double-check and try again."
            )

        UserManager.update_user(
            user.id,
            is_verified_email=True,
            is_active=True,
            last_login=DateTime.now()
        )

        token.reset_otp_token_type()

        return {
            'access_token': token.create_access_token(),
            'message': 'Your email address has been confirmed. Account activated successfully.'
        }

    # -------------
    # --- Login ---
    # -------------

    @classmethod
    def login(cls, email: str, password: str):
        user = cls.authenticate_user(email, password)
        token = TokenService(user)

        if not user:
            raise HTTPException(status_code=401, detail="Incorrect username or password.")

        if not user.is_active:
            raise HTTPException(status_code=403, detail="Inactive account.")

        if not user.is_verified_email:
            raise HTTPException(status_code=403, detail="Unverified email address.")

        UserManager.update_last_login(user.id)

        return {
            "access_token": token.create_access_token(),
            "token_type": "bearer",
            "is_superuser": bool(user.is_superuser)     # 👈 ADDED
        }

    @classmethod
    def authenticate_user(cls, email: str, password: str):
        user = UserManager.get_user(email=email)
        if not user:
            return False
        if not PasswordManager.verify_password(password, user.password):
            return False
        return user

    # The rest of the file remains unchanged...
