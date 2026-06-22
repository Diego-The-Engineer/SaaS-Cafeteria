import os
from datetime import datetime, timedelta
from routers import productos, pedidos, authRouter, stats
from typing import List, Optional, Annotated
from fastapi import Depends, HTTPException, status, FastAPI, Body, APIRouter
from fastapi.security import OAuth2PasswordRequestForm
from bson import ObjectId
from models import Model_producto, Response_producto, Item_pedido, Create_pedido, Response_pedido, Response_msg
from database import db
from auth import (
    create_access_token,
    get_password_hash,
    authenticate_user,
    fake_users_db,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    Token,
    User,
    get_current_active_user
)
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Cafeteria")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
@app.get("/")
def root_func():
    return {"Message": "Bienvenido"}

@app.get("/test-db")
async def test_db():
    try:
        await db.command("ping")
        return {"status": "ok", "msg": "connection succesfully"}
    except Exception as e:
        return {"status": "error", "msg": "Error connection", "details": str(e)}

app.include_router(productos.router)
app.include_router(pedidos.router)
app.include_router(authRouter.router)
app.include_router(stats.router)
