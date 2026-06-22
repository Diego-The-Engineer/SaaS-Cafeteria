import os
from datetime import datetime, timedelta
from typing import List, Optional, Annotated
from fastapi import Depends, HTTPException, status, FastAPI, Body, APIRouter
from fastapi.security import OAuth2PasswordRequestForm
from bson import ObjectId
from models import Model_producto, Response_producto, Item_pedido, Create_pedido, Response_pedido, Response_msg
from database import db
from auth import User, get_current_active_user
router = APIRouter(
	prefix="/pedidos",
	tags=["Pedidos"]
)
@router.post("", response_model=Response_pedido)
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

@router.delete("/{id}", response_model=Response_msg)
async def delete_pedido(current_user: Annotated[User, Depends(get_current_active_user)], id: str):
    oid = ObjectId(id.strip('"'))
    resultado = await db["pedidos"].delete_one({"_id": oid})
    if resultado.deleted_count > 0:
        return {"msg": "Pedido eliminado correctamente"}
    raise HTTPException(status_code=404, detail="Pedido no encontrado")

