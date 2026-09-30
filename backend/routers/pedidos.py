import os
import sys
from datetime import datetime
from typing import List, Optional, Annotated
from fastapi import Depends, HTTPException, status, FastAPI, Body, APIRouter
from bson import ObjectId
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from models import Model_producto, Response_producto, Item_pedido, Create_pedido, Response_pedido, Response_msg, MetodoPago, Opcion, EstadoCliente
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

    costo_envio = 0.0
    if pedidos.direccion and pedidos.direccion.calle:
        if pedidos.total > total:
            costo_envio = round(pedidos.total - total, 2)
            
    total_con_envio = round(total + costo_envio, 2)

    if pedidos.metodo_pago not in ["Transferencia", "Efectivo"]:
        raise HTTPException(status_code=400, detail="Método de pago no válido")

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
        "cliente_nombre": f"{pedidos.first_name} {pedidos.last_name}".strip(),
        "telefono": pedidos.phone, 
        "direccion": pedidos.direccion.model_dump() if pedidos.direccion and pedidos.direccion.calle != "" else None,
        "items": items_detallados,
        "costo_envio": costo_envio,          
        "total_pagado": total_con_envio,     
        "monto_recibido": getattr(pedidos, "monto_recibido", None), 
        "cambio": getattr(pedidos, "cambio", None),                 
        "Metodo_pago": pedidos.metodo_pago,
        "Estado": "Pendiente"
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

@router.patch("/{pedido_id}/entregar")
async def entregar_pedido(pedido_id: str, current_user: Annotated[User, Depends(get_current_active_user)] = None, payload: dict = Body(default=None),):
    pedido_db = await db["pedidos"].find_one({"_id": ObjectId(pedido_id)})
    if not pedido_db:
        raise HTTPException(status_code=404, detail="El pedido no existe")
    if pedido_db.get("Estado") == "Entregado":
        raise HTTPException(status_code=400, detail="Este pedido ya fue entregado previamente")
    resultado = await db["pedidos"].update_one({"_id": ObjectId(pedido_id)}, {"$set": {"Estado": "Entregado"}})

    if resultado.matched_count == 0:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    pipeline_ganancias = [
        {"$match": {"Estado": "Entregado"}},
        {"$group": {
            "_id": None, 
            "total_real": {"$sum": {"$ifNull": ["$total_pagado", "$total"]}}
        }}
    ]
    cursor_ganancias = db["pedidos"].aggregate(pipeline_ganancias)
    ganancias_res = await cursor_ganancias.to_list(length=1)
    
    ganancia_total = ganancias_res[0]["total_real"] if ganancias_res else 0
    
    await db["stats"].update_one(
        {"tipo": "ingresos_globales"},
        {"$set": {"total_acumulado": ganancia_total, "ultima_actualizacion": datetime.utcnow()}},
        upsert=True 
    )
    return {"message": "Pedido entregado con éxito e ingresos registrados"}

@router.patch("/{pedido_id}/cancelar")
async def cancelar_pedido(
    pedido_id: str, 
    payload: dict = Body(default=None), 
    current_user: Annotated[User, Depends(get_current_active_user)] = None
):
    pedido_db = await db["pedidos"].find_one({"_id": ObjectId(pedido_id)})
    if not pedido_db:
        raise HTTPException(status_code=404, detail="El pedido no existe")
        
    if pedido_db.get("Estado") == "Cancelado":
        raise HTTPException(status_code=400, detail="Este pedido ya fue cancelado previamente")
    if pedido_db.get("Estado") == "Entregado":
        raise HTTPException(status_code=400, detail="No se puede volver a cancelar un producto ya enviado y cobrado")

    for item in pedido_db.get("items", []):
        producto_id = item["producto_id"]
        devolucion = item["cantidad"]
        
        await db["productos"].update_one(
            {"_id":  ObjectId(producto_id)},
            {
                "$inc": {"cantidad": devolucion},
                "$set": {"disponible": True}
             }
        )

    resultado = await db["pedidos"].update_one(
        {"_id": ObjectId(pedido_id)}, 
        {"$set": {"Estado": "Cancelado"}}
    )

    if resultado.matched_count == 0:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    return {"message": "Pedido cancelado con éxito y stock devuelto"}

@router.patch("/{pedido_id}/enviar")
async def enviar_pedido(pedido_id: str, payload: dict = Body(default=None), current_user: Annotated[User, Depends(get_current_active_user)] = None):
    pedido_db = await db["pedidos"].find_one({"_id": ObjectId(pedido_id)})
    if not pedido_db:
        raise HTTPException(status_code=404, detail="El pedido no existe")
    if pedido_db.get("Estado") == "Cancelado":
        raise HTTPException(status_code=400, detail="Este pedido ya fue cancelado previamente")
    if pedido_db.get("Estado") == "Entregado":
        raise HTTPException(status_code=400, detail="No se puede volver a cancelar un producto ya enviado y cobrado")
    if pedido_db.get("Estado") == "Enviando":
            raise HTTPException(status_code=400, detail="No se puede volver a enviar un producto ya enviado y cobrado")

    resultado = await db["pedidos"].update_one({"_id": ObjectId(pedido_id)}, {"$set": {"Estado": "Enviando"}})

    if resultado.matched_count == 0:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    return {"message": "Pedido cancelado con éxito y stock devuelto al inventario"}

@router.patch("/{pedido_id}/preparar")
async def preparar_pedido(pedido_id: str, payload: dict = Body(default=None), current_user: Annotated[User, Depends(get_current_active_user)] = None):
    pedido_db = await db["pedidos"].find_one({"_id": ObjectId(pedido_id)})
    if not pedido_db:
        raise HTTPException(status_code=404, detail="El pedido no existe")
    if pedido_db.get("Estado") == "Cancelado":
        raise HTTPException(status_code=400, detail="Este pedido ya fue cancelado previamente")
    if pedido_db.get("Estado") == "Entregado":
        raise HTTPException(status_code=400, detail="No se puede volver a cancelar un producto ya enviado y cobrado")
    if pedido_db.get("Estado") == "Enviando":
            raise HTTPException(status_code=400, detail="No se puede volver a enviar un producto ya enviado y cobrado")

    resultado = await db["pedidos"].update_one({"_id": ObjectId(pedido_id)}, {"$set": {"Estado": "Preparando"}})

    if resultado.matched_count == 0:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    return {"message": "Pedido cancelado con éxito y stock devuelto al inventario"}

@router.get("/pendientes")
async def get_pedidos_pendientes(current_user: Annotated[User, Depends(get_current_active_user)] = None):
    cursor = db["pedidos"].find().sort([("fecha", -1)]).limit(100)
    
    pedidos_activos = []
    async for pedido in cursor:
        pedido["id"] = str(pedido["_id"])
        del pedido["_id"]
        pedidos_activos.append(pedido)
        
    return pedidos_activos