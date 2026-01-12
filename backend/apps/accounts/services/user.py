# apps/accounts/services/user.py

from fastapi import HTTPException
from starlette import status

from sqlalchemy.orm import Session

from config.database import SessionLocal
from apps.accounts.models import User
from apps.accounts.services.password import PasswordManager
from apps.core.date_time import DateTime


class UserManager:

    # --------------------------------------------------------
    # CREATE USER
    # --------------------------------------------------------
    @classmethod
    def create_user(
        cls,
        email: str,
        password: str,
        first_name: str | None = None,
        last_name: str | None = None,
        is_verified_email: bool = False,
        is_active: bool = False,
        is_superuser: bool = False,
        role: str = "user",
        updated_at: DateTime = None,
        last_login: DateTime = None,
    ) -> User:

        db: Session = SessionLocal()

        try:
            user = User(
                email=email,
                password=PasswordManager.hash_password(password),
                first_name=first_name,
                last_name=last_name,
                is_verified_email=is_verified_email,
                is_active=is_active,
                is_superuser=is_superuser,
                role=role,
                updated_at=updated_at,
                last_login=last_login,
            )

            db.add(user)
            db.commit()
            db.refresh(user)
            return user

        finally:
            db.close()

    # --------------------------------------------------------
    # GET USER (BY ID OR EMAIL)
    # --------------------------------------------------------
    @staticmethod
    def get_user(user_id: int | None = None, email: str | None = None) -> User | None:
        db: Session = SessionLocal()

        try:
            query = db.query(User)

            if user_id:
                return query.filter(User.id == user_id).first()

            if email:
                return query.filter(User.email == email).first()

            return None

        finally:
            db.close()

    # --------------------------------------------------------
    # GET USER OR RAISE 404
    # --------------------------------------------------------
    @staticmethod
    def get_user_or_404(user_id: int | None = None, email: str | None = None) -> User:
        db: Session = SessionLocal()

        try:
            if user_id:
                user = db.query(User).filter(User.id == user_id).first()
            elif email:
                user = db.query(User).filter(User.email == email).first()
            else:
                raise HTTPException(404, "User not found.")

            if not user:
                raise HTTPException(404, "User not found.")

            return user

        finally:
            db.close()

    # --------------------------------------------------------
    # UPDATE USER
    # --------------------------------------------------------
    @classmethod
    def update_user(
        cls,
        user_id: int,
        email: str | None = None,
        password: str | None = None,
        first_name: str | None = None,
        last_name: str | None = None,
        is_verified_email: bool | None = None,
        is_active: bool | None = None,
        is_superuser: bool | None = None,
        role: str | None = None,
        last_login: DateTime | None = None,
    ) -> User:

        db: Session = SessionLocal()

        try:
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                raise HTTPException(404, "User not found.")

            if first_name is not None:
                user.first_name = first_name
            if last_name is not None:
                user.last_name = last_name
            if email is not None:
                user.email = email
            if password is not None:
                user.password = PasswordManager.hash_password(password)
            if is_verified_email is not None:
                user.is_verified_email = is_verified_email
            if is_active is not None:
                user.is_active = is_active
            if is_superuser is not None:
                user.is_superuser = is_superuser
            if role is not None:
                user.role = role
            if last_login is not None:
                user.last_login = last_login

            user.updated_at = DateTime.now()

            db.commit()
            db.refresh(user)
            return user

        finally:
            db.close()

    # --------------------------------------------------------
    # UPDATE LAST LOGIN
    # --------------------------------------------------------
    @classmethod
    def update_last_login(cls, user_id: int):
        db: Session = SessionLocal()

        try:
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                return

            user.last_login = DateTime.now()

            db.commit()

        finally:
            db.close()

    # --------------------------------------------------------
    # CONVERT USER TO DICT
    # --------------------------------------------------------
    @staticmethod
    def to_dict(user: User):
        return {
            "user_id": user.id,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "is_verified_email": user.is_verified_email,
            "date_joined": DateTime.string(user.date_joined),
            "updated_at": DateTime.string(user.updated_at),
            "last_login": DateTime.string(user.last_login),
        }

    # --------------------------------------------------------
    # NEW USER DIRECT INSERT
    # --------------------------------------------------------
    @classmethod
    def new_user(cls, **user_data):
        db: Session = SessionLocal()

        try:
            user = User(**user_data)
            db.add(user)
            db.commit()
            db.refresh(user)
            return user
        finally:
            db.close()

    # --------------------------------------------------------
    # STATUS CHECKS
    # --------------------------------------------------------
    @staticmethod
    def is_active(user: User):
        if not user.is_active:
            raise HTTPException(
                status.HTTP_403_FORBIDDEN, "Inactive user."
            )

    @staticmethod
    def is_verified_email(user: User):
        if not user.is_verified_email:
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                "Please verify your email address to continue.",
            )

    # --------------------------------------------------------
    # ADMIN USER MANAGEMENT
    # --------------------------------------------------------
    @staticmethod
    def get_all_users(skip: int = 0, limit: int = 100):
        """Get all users with pagination"""
        db: Session = SessionLocal()
        try:
            return db.query(User).offset(skip).limit(limit).all()
        finally:
            db.close()

    @staticmethod
    def count_users():
        """Count total users"""
        db: Session = SessionLocal()
        try:
            return db.query(User).count()
        finally:
            db.close()

    @staticmethod
    def count_active_users():
        """Count active users"""
        db: Session = SessionLocal()
        try:
            return db.query(User).filter(User.is_active == True).count()
        finally:
            db.close()

    @staticmethod
    def count_verified_users():
        """Count verified users"""
        db: Session = SessionLocal()
        try:
            return db.query(User).filter(User.is_verified_email == True).count()
        finally:
            db.close()

    @staticmethod
    def get_user_by_id(user_id: int):
        """Get user by ID"""
        db: Session = SessionLocal()
        try:
            return db.query(User).filter(User.id == user_id).first()
        finally:
            db.close()

    @staticmethod
    def save_user(user: User):
        """Save/update user"""
        db: Session = SessionLocal()
        try:
            db.merge(user)
            db.commit()
        finally:
            db.close()

    @staticmethod
    def delete_user(user_id: int) -> bool:
        """Delete user by ID"""
        db: Session = SessionLocal()
        try:
            user = db.query(User).filter(User.id == user_id).first()
            if user:
                db.delete(user)
                db.commit()
                return True
            return False
        finally:
            db.close()
