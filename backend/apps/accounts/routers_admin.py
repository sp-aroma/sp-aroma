from fastapi import APIRouter, Depends, HTTPException, status
from apps.accounts.dependencies import require_superuser
from apps.accounts.services.user import UserManager, User
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter(prefix="/admin", tags=["Admin"])


class UserListResponse(BaseModel):
    users: List[dict]
    total: int


class UserUpdatePayload(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    is_active: Optional[bool] = None
    is_superuser: Optional[bool] = None


@router.get("/users", response_model=UserListResponse)
def list_all_users(
    skip: int = 0,
    limit: int = 100,
    admin: User = Depends(require_superuser)
):
    """Get list of all users with pagination"""
    users = UserManager.get_all_users(skip=skip, limit=limit)
    total = UserManager.count_users()
    
    user_list = []
    for user in users:
        user_list.append({
            "user_id": user.id,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "is_active": user.is_active,
            "is_superuser": user.is_superuser,
            "is_verified_email": user.is_verified_email,
            "date_joined": user.date_joined,
            "last_login": user.last_login,
        })
    
    return {"users": user_list, "total": total}


@router.get("/users/{user_id}")
def get_user_details(user_id: int, admin: User = Depends(require_superuser)):
    """Get detailed information about a specific user"""
    user = UserManager.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "user_id": user.id,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "is_active": user.is_active,
        "is_superuser": user.is_superuser,
        "is_verified_email": user.is_verified_email,
        "date_joined": user.date_joined,
        "last_login": user.last_login,
    }


@router.patch("/users/{user_id}")
def update_user(
    user_id: int,
    payload: UserUpdatePayload,
    admin: User = Depends(require_superuser)
):
    """Admin can update user information"""
    user = UserManager.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if payload.first_name is not None:
        user.first_name = payload.first_name
    if payload.last_name is not None:
        user.last_name = payload.last_name
    if payload.is_active is not None:
        user.is_active = payload.is_active
    if payload.is_superuser is not None:
        user.is_superuser = payload.is_superuser
    
    UserManager.save_user(user)
    
    return {"message": "User updated successfully"}


@router.delete("/users/{user_id}")
def delete_user(user_id: int, admin: User = Depends(require_superuser)):
    """Admin can delete a user"""
    success = UserManager.delete_user(user_id)
    if not success:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User deleted successfully"}


@router.get("/analytics")
def get_admin_analytics(admin: User = Depends(require_superuser)):
    """Get platform-wide analytics"""
    total_users = UserManager.count_users()
    active_users = UserManager.count_active_users()
    verified_users = UserManager.count_verified_users()
    
    return {
        "total_users": total_users,
        "active_users": active_users,
        "verified_users": verified_users,
        "inactive_users": total_users - active_users,
        "unverified_users": total_users - verified_users,
    }
