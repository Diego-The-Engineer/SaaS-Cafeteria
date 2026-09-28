import os
from datetime import datetime, timedelta
from routers import productos, pedidos, authRouter, stats, categorias
from typing import List, Optional, Annotated
from fastapi import Depends, HTTPException, status, FastAPI, Body, APIRouter, Request
from fastapi.security import OAuth2PasswordRequestForm
from bson import ObjectId
from models import Model_producto, Response_producto, Item_pedido, Create_pedido, Response_pedido, Response_msg, Create_stats, Response_stats, Categoria
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
    allow_credentials=False,
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
app.include_router(categorias.router)

from fastapi import Request

@app.post("/pagos/webhook")
async def recibir_webhook_ecartpay(request: Request, hash: str = None):
    try:
        payload = await request.json()
        print("=======================================")
        print(f"Hash de seguridad: {hash}")
        print("Datos del pago:", payload)
        print("=======================================")
        
        return {"status": "success", "message": "Webhook recibido correctamente"}
        
    except Exception as e:
        print("Error leyendo el webhook:", e)
        return {"status": "error", "message": str(e)}
