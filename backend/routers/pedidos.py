import os
import sys
import requests
from dotenv import load_dotenv
from datetime import datetime, timedelta
from typing import List, Optional, Annotated
from fastapi import Depends, HTTPException, status, FastAPI, Body, APIRouter
from fastapi.security import OAuth2PasswordRequestForm
from bson import ObjectId
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from models import Model_producto, Response_producto, Item_pedido, Create_pedido, Response_pedido, Response_msg, MetodoPago, Opcion, EstadoCliente
from database import db
from auth import User, get_current_active_user
router = APIRouter(
    prefix="/pedidos",
    tags=["Pedidos"]
)
load_dotenv()
token_secreto = os.getenv("TOKEN")

def token_ecartpay():
    url = "https://ecartpay.com/api/authorizations/token"
  
    headers = {
        "accept": "application/json",
        "authorization": f"Basic {token_secreto}" 
    }
    
    try:
        response = requests.post(url, headers=headers)
        
        if response.status_code != 200:
            error_real = response.text
            print(f"ERROR DE ECARTPAY: {error_real}") 
            raise HTTPException(status_code=400, detail=f"Fallo de autorización: {error_real}")
            
        data = response.json()
        return data.get("token")
        
    except requests.exceptions.RequestException as e:
        print(f"ERROR DE CONEXIÓN: {str(e)}")
        raise HTTPException(status_code=500, detail="No se pudo conectar con el banco.")
    
@router.post("/api/obtener_token")
async def obtener_token_ecart():
    token_generado = token_ecartpay()
    return {"token": token_generado }

@router.post("", response_model=Response_pedido)
async def post_pedidos(pedidos: Create_pedido):
    total = 0.0
    items_detallados = []
    items_ecart = []    

    for item in pedidos.items:
        producto_db = await db["productos"].find_one({"_id": ObjectId(item.producto_id)})
        if not producto_db:
            raise HTTPException(status_code=404, detail=f"Producto {item.producto_id} no encontrado")
            
        stock = producto_db.get("cantidad", 0)
        if (stock - item.cantidad) < 0:
            raise HTTPException(status_code=400, detail=f"Stock insuficiente para {producto_db['nombre']}")
        variante_db = next((v for v in producto_db.get("variantes", []) if v["tamaño"] == item.tamano), None)
        if variante_db and variante_db.get("disponible") is False:
            raise HTTPException(status_code=400, detail=f"Producto no disponible")
        subtotal = float(item.precio) * item.cantidad
        total += subtotal
        
        items_detallados.append({
            "producto_id": item.producto_id,
            "nombre": item.nombre,
            "cantidad": item.cantidad,
            "tamano": item.tamano,
            "precio": float(item.precio),
            "subtotal": subtotal
        })
        
        items_ecart.append({
            "name": item.nombre,
            "quantity": item.cantidad,
            "price": float(item.precio) 
        })
    transaccion_id = None
    if pedidos.metodo_pago == "Tarjeta":
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
            url_cobro_ecartpay = "https://ecartpay.com/api/orders"
            
            response_charge = requests.post(url_cobro_ecartpay, json=payload_ecart, headers=headers_charges)
            
            if response_charge.status_code not in [200, 201]:
                try:
                    error_msg = response_charge.json().get('message', 'Tarjeta declinada')
                except Exception:
                    error_msg = response_charge.text
                raise HTTPException(status_code=400, detail=f"Pago rechazado: {error_msg}")
            
            transaccion_id = response_charge.json().get("id", "sandbox_test_id")     
        except requests.exceptions.RequestException:
            raise HTTPException(status_code=500, detail="Error de conexión al procesar el pago")
                
    elif pedidos.metodo_pago not in ["Transferencia", "Efectivo"]:
        raise HTTPException(status_code=400, detail=f"Metodo no encontrado")
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
        "cliente_nombre": f"{pedidos.first_name} {pedidos.last_name}",
        "email": pedidos.email,
        "items": items_detallados,
        "total_pagado": total,
        "Metodo_pago": pedidos.metodo_pago,
        "Estado": "Pendiente"
    }
    
    if transaccion_id:
        ticket["transaccion_id"] = transaccion_id

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

@router.patch("/pedidos/{pedido_id}/entregar")
async def entregar_pedido(pedido_id: str, current_user: Annotated[User, Depends(get_current_active_user)] = None, payload: dict = Body(...),):
    pedido_db = await db["pedidos"].find_one({"_id": ObjectId(pedido_id)})
    if not pedido_db:
        raise HTTPException(status_code=404, detail="El pedido no existe")
    if pedido_db.get("estado") == "Entregado":
        raise HTTPException(status_code=400, detail="Este pedido ya fue entregado previamente")
    resultado = await db["pedidos"].update_one({"_id": ObjectId(pedido_id)}, {"$set": {"estado": "Entregado"}})

    if resultado.matched_count == 0:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    pipeline_ganancias = [
                {"$match": {"estado": "Entregado"}},
                {"$group": {"_id": None, "total": {"$sum": "$total_pagado" }}}
        ]
    cursor_ganancias = db["pedidos"].aggregate(pipeline_ganancias)
    ganancias_res = await cursor_ganancias.to_list(length=1)
    ganancia_total = ganancias_res[0]["total"] if ganancias_res else 0
    await db["stats"].update_one(
        {"tipo": "ingresos_globales"},
        {"$set": {"total_acumulado": ganancia_total, "ultima_actualizacion": datetime.utcnow()}},
        upsert=True 
    )
    return {"message": "Pedido entregado con éxito e ingresos registrados"}

@router.patch("/pedidos/{pedido_id}/cancelar")
async def cancelar_pedido(pedido_id: str, payload: dict = Body(...), current_user: Annotated[User, Depends(get_current_active_user)] = None):
    pedido_db = await db["pedidos"].find_one({"_id": ObjectId(pedido_id)})
    if not pedido_db:
        raise HTTPException(status_code=404, detail="El pedido no existe")
    if pedido_db.get("estado") == "Cancelado":
        raise HTTPException(status_code=400, detail="Este pedido ya fue cancelado previamente")
    if pedido_db.get("estado") == "Entregado":
        raise HTTPException(status_code=400, detail="No se puede volver a cancelar un producto ya enviado y cobrado")
    for item in pedido_db.get("items", []):
        producto_id = item["producto_id"]
        devolucion = item["cantidad"]

        await db["productos"].update_one(
            {"_id":  ObjectId(pedido_id)},
            {
                "$inc": {"cantidad": devolucion},
                "$set": {"disponible": True}
             }
        )
    resultado = await db["pedidos"].update_one({"_id": ObjectId(pedido_id)}, {"$set": {"estado": "Cancelado"}})

    if resultado.matched_count == 0:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    return {"message": "Pedido cancelado con éxito y stock devuelto al inventario"}

@router.get("/pendientes")
async def get_pedidos_pendientes(current_user: Annotated[User, Depends(get_current_active_user)] = None):
    cursor = db["pedidos"].find({"estado": "Pendiente"})
    
    pedidos_activos = []
    async for pedido in cursor:
        pedido["id"] = str(pedido["_id"])
        del pedido["_id"]
        pedidos_activos.append(pedido)
        
    return pedidos_activos