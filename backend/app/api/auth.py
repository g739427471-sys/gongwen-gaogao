"""
用户认证 API 路由：注册、登录、用户信息。
"""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

from ..schemas import UserRegisterRequest, UserLoginRequest, TokenResponse, UserInfoResponse
from ..models import User
from ..database import get_db
from ..utils.auth import hash_password, verify_password, create_access_token, get_current_user_id

router = APIRouter(prefix="/api/auth", tags=["认证"])


@router.post("/register", response_model=TokenResponse)
def register(req: UserRegisterRequest, db: Session = Depends(get_db)):
    """用户注册"""
    # 检查用户名是否已存在
    if db.query(User).filter(User.username == req.username).first():
        raise HTTPException(status_code=400, detail="用户名已被注册")

    # 检查邮箱是否已存在
    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(status_code=400, detail="邮箱已被注册")

    user = User(
        username=req.username,
        email=req.email,
        hashed_password=hash_password(req.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id, user.username)
    return TokenResponse(
        access_token=token,
        username=user.username,
        user_id=user.id,
    )


@router.post("/login", response_model=TokenResponse)
def login(req: UserLoginRequest, db: Session = Depends(get_db)):
    """用户登录"""
    user = db.query(User).filter(User.username == req.username).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="用户名或密码错误")

    token = create_access_token(user.id, user.username)
    return TokenResponse(
        access_token=token,
        username=user.username,
        user_id=user.id,
    )


@router.get("/me", response_model=UserInfoResponse)
def get_me(user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    """获取当前用户信息"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")

    return UserInfoResponse(
        user_id=user.id,
        username=user.username,
        email=user.email,
    )
