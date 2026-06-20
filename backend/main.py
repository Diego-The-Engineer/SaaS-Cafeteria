import os
from datetime import datetime, timedelta
from typing import List, Optional, Annotated
from fastapi import Depends, HTTPException, status, FastAPI, Body
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

# Configuración CORS (Pase VIP para tu Frontend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- RUTAS DE PRUEBA ---
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

# --- PRODUCTOS ---
@app.post("/productos", response_model=Response_producto)
async def post_productos(current_user: Annotated[User, Depends(get_current_active_user)], producto: Model_producto):
    producto_dict = producto.model_dump()
    resultado = await db["productos"].insert_one(producto_dict)
    producto_dict["id"] = str(resultado.inserted_id)
    return producto_dict

@app.get("/sus_productos", response_model=List[Response_producto])
async def get_productos(disponible: Optional[bool] = None):
    filtro = {}
    if disponible is not None:
        filtro["disponible"] = disponible
    cursor = db["productos"].find(filtro)
    productos_db = await cursor.to_list(length=100)
    for prod in productos_db:
        prod["id"] = str(prod["_id"])
    return productos_db

# --- CRUD ADMIN (Faltaban estas) ---
@app.delete("/productos/{id}")
async def eliminar_producto_real(id: str, current_user: Annotated[User, Depends(get_current_active_user)]):
    oid = ObjectId(id.strip('"'))
    resultado = await db["productos"].delete_one({"_id": oid})
    if resultado.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return {"msg": "Producto eliminado correctamente"}

@app.put("/productos/{id}")
async def actualizar_producto_completo(
    id: str, 
    producto: dict = Body(...), 
    current_user: Annotated[User, Depends(get_current_active_user)] = None
):
    oid = ObjectId(id.strip('"'))
    resultado = await db["productos"].update_one(
        {"_id": oid},
        {"$set": producto}
    )
    if resultado.matched_count == 0:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return {"msg": "Producto actualizado"}

# --- PEDIDOS ---
@app.post("/pedidos", response_model=Response_pedido)
async def post_pedidos(pedidos: Create_pedido):
    total = 0.0
    items_detallados = []
    for item in pedidos.items:
        producto_db = await db["productos"].find_one({"_id": ObjectId(item.producto_id)})
        if not producto_db:
            raise HTTPException(status_code=404, detail="Error, producto no encontrado")
        stock = producto_db.get("cantidad", 0)
        stock_final = stock - item.cantidad
        if stock_final < 0:
            raise HTTPException(status_code=400, detail=f"Stock insuficiente para {producto_db['nombre']}")
        
        sigue_disponible = True if stock_final > 0 else False
        await db["productos"].update_one(
            {"_id": ObjectId(item.producto_id)},
            {"$set": {"cantidad": stock_final, "disponible": sigue_disponible}}
        )
        subtotal = float(producto_db["precio_unitario"]) * item.cantidad
        total += subtotal
        items_detallados.append({
            "producto_id": str(producto_db["_id"]),
            "nombre": str(producto_db["nombre"]),
            "cantidad": item.cantidad,
            "precio_unitario": float(producto_db["precio_unitario"]),
            "subtotal": subtotal
        })
    ticket = {
        "fecha": datetime.utcnow(),
        "items": items_detallados,
        "total_pagado": total
    }
    resultado = await db["pedidos"].insert_one(ticket)
    ticket["id"] = str(resultado.inserted_id)
    return ticket

@app.delete("/pedidos/{id}", response_model=Response_msg)
async def delete_pedido(current_user: Annotated[User, Depends(get_current_active_user)], id: str):
    oid = ObjectId(id.strip('"'))
    resultado = await db["pedidos"].delete_one({"_id": oid})
    if resultado.deleted_count > 0:
        return {"msg": "Pedido eliminado correctamente"}
    raise HTTPException(status_code=404, detail="Pedido no encontrado")

# --- AUTH ---
@app.post("/token")
async def login_for_access_token(form_data: Annotated[OAuth2PasswordRequestForm, Depends()]) -> Token:
    user = authenticate_user(fake_users_db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect username or password")
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(data={"sub": user.username}, expires_delta=access_token_expires)
    return Token(access_token=access_token, token_type="bearer")
