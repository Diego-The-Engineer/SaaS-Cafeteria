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
        prefix="/stats",
        tags=["Stats"]
)

@router.get("/estadistica")
async def get_stats(current_user: Annotated[User, Depends(get_current_active_user)]):
        pipeline_ganancias = [
                {"$group": {"_id": None, "total": {"$sum": "$total_pagado" }}}
        ]
        cursor_ganancias = db["pedidos"].aggregate(pipeline_ganancias)
        ganancias_res = await cursor_ganancias.to_list(length=1)
        ganancia_total = ganancias_res[0]["total"] if ganancias_res else 0

        pipeline_productos = [
                {"$unwind": "$items"}, 
                {"$group": {
                        "_id": "$items.nombre", 
                        "cantidad_total": {"$sum": "$items.cantidad"},
                        "ingresos_producto": {"$sum": "$items.subtotal"}
                }},
                {"$sort": {"cantidad_total": -1}}, 
                {"$limit": 5} 
        ]
        cursor_productos = db["pedidos"].aggregate(pipeline_productos)
        top_productos = await cursor_productos.to_list(length=5)

        return {
                "ganancia_total": round(ganancia_total, 2),
                "top_productos": top_productos
        }
