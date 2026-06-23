import os
import requests
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

def token_ecartpay():
    url = "https://sandbox.ecartpay.com/api/authorizations/token"

    headers = {
        "accept": "application/json",
        "authorization": "Basic     cHViNmEzYWVlNTlkYWYyZGU4ODZlOWNkZDk1OnByaXY2YTNhZWU 1OWRhZjJkZTg4NmU5Y2RkOTY="
    }

    response = requests.post(url, headers=headers)
    if response.status_code != 200:
        raise HTTPException(status_code=401, detail="Error, usuaario no permitido")
    return response.json().get("token")

@router.post("", response_model=Response_pedido)
async def post_pedidos(pedidos: Create_pedido):
    total = 0.0
    items_detallados = []
    items_ecart = []
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

        items_ecart.append({
            "name": str(producto_db["nombre"]),
            "quantity": item.cantidad,
            "unit_price": float(producto_db,["precio_unitario"])
        })
    
    token_pasarela = token_ecartpay()

    payload_ecart = {
        "currency": "MXN",
        "email": pedidos.email,
        "first_name": pedidos.first_name,
        "last_name": pedidos.last_name,
        "phone": pedidos.phone,
        "items": items_ecart,
        "token": pedidos.token_tarjeta, 
        "notify_url": "https://sep7ima-cafeteria-f7z2.onrender.com/pagos/webhook"
    }

    headers_charges = {
        "accept": "application/json",
        "content-type": "application/json",
        "authorization": f"Bearer {token_pasarela}"
    }
    try:
        response_charge = requests.post("https://sandbox.ecartpay.com/api/charges", json=payload_ecart, headers=headers_charges)
        if response_charge.status_code not in [200, 201]:
            raise HTTPException(status_code=400, detail=f"Pago rechazado: {response_charge.json().get('message', 'Tarjeta declinada')}")
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail="Error de conexión con el banco")
    for item in pedidos.items:
        producto_db = await db["productos"].find_one({"_id": ObjectId(item.producto_id)})
        stock_final = producto_db.get("cantidad", 0) - item.cantidad
        sigue_disponible = True if stock_final > 0 else False
        
        await db["productos"].update_one(
            {"_id": ObjectId(item.producto_id)},
            {"$set": {"cantidad": stock_final, "disponible": sigue_disponible}}
        )
    ticket = {
        "fecha": datetime.utcnow(),
        "cliente": f"{pedidos.first_name} {pedidos.last_name}",
        "email": pedidos.email,
        "items": items_detallados,
        "total_pagado": total,
        "ID_transaccion": response_charge.json().get("id")
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

