import os
from datetime import datetime, timedelta
from typing import List, Optional, Annotated
from fastapi import Depends, HTTPException, status, FastAPI
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
origins = [
    "http://localhost:8010",
    "http://127.0.0.1:5500",
    "http://localhost:5500"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


HASH_ADMIN = get_password_hash("adminCafe123")
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

@app.post("/pedidos", response_model=Response_pedido)
async def post_pedidos(pedidos: Create_pedido):
	total = 0.0
	items_detallados = []
	
	for item in pedidos.items:
		producto_db = await db["productos"].find_one({"_id": ObjectId(item.producto_id)})
		if not producto_db:
			raise HTTPException(status_code=404, detail=f"Error, producto no encontrado")
		subtotal = float(producto_db["precio_unitario"]) * item.cantidad
		total += subtotal
		items_detallados.append({
			"producto_id": str (producto_db["_id"]),
			"nombre": str (producto_db["nombre"]),
			"cantidad": item.cantidad,
			"precio_unitario": float (producto_db["precio_unitario"]),
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
	collection = db["productos"]
	oid = ObjectId(id.strip('"'))
	pedidos = await db["productos"].find_one({"_id": oid})
	if pedidos is not None:
		filtro = {"_id": oid}
		resultado = await collection.delete_one(filtro)
		return {"msg": "Elemento eliminado correctamente"}
	else:
		raise HTTPException(status_code=404, detail="Producto no encontrado") 

@app.patch("/pedidos/{id}/items/{producto_id}")
async def remove_item_from_pedido(id: str, producto_id: str):
    oid = ObjectId(id.strip('"'))
    resultado = await db["pedidos"].update_one(
        {"_id": oid},
        {"$pull": {"items": {"producto_id": producto_id}}}
    )
    if resultado.modified_count == 0:
        raise HTTPException(status_code=404, detail="Pedido no encontrado o el producto no estaba en el pedido")
    pedido_actualizado = await db["pedidos"].find_one({"_id": oid})
    nuevo_total = sum(item["subtotal"] for item in pedido_actualizado["items"])
    await db["pedidos"].update_one(
        {"_id": oid},
        {"$set": {"total_pagado": nuevo_total}}
    )
    return {
        "msg": "Producto eliminado y total actualizado correctamente", 
        "nuevo_total": nuevo_total
    }
@app.post("/token")
async def login_for_access_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
) -> Token:
    user = authenticate_user(fake_users_db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return Token(access_token=access_token, token_type="bearer")

