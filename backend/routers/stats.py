import os, sys
from datetime import datetime, timedelta
from typing import List, Optional, Annotated
from fastapi import Depends, HTTPException, status, FastAPI, Body, APIRouter
from fastapi.security import OAuth2PasswordRequestForm
from bson import ObjectId
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from models import Model_producto, Response_producto, Item_pedido, Create_pedido, Response_pedido, Response_msg, Create_stats, Response_stats
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

@router.post("/estadistica", response_model= Response_stats)
async def post_stats(current_user: Annotated[User, Depends(get_current_active_user)], stat: Create_stats):
        stat_dict = stat.model_dump()
        resultado = await db["ganancias"].insert_one(stat_dict)
        return {"msg ": "Guardado en el historial"}
@router.delete("/estadistica")
async def borrar_estadistica(current_user: Annotated[User, Depends(get_current_active_user)]):
        eliminar_ganancias = await db["pedidos"].delete_many({})
        return {
                "mensaje": "Estadísticas y pedidos reiniciados desde cero con éxito", 
                "registros_eliminados": eliminar_ganancias.deleted_count
        }

@router.get("/ganancias")
async def get_ganancias(current_user: Annotated[User, Depends(get_current_active_user)], fecha: Optional[datetime] = None):
        filtro = {}
        if fecha is not None:
                inicio_dia = datetime(fecha.year, fecha.month, fecha.day, 0, 0, 0)
                fin_dia = inicio_dia + timedelta(days=1)
                
                filtro["fecha"] = {
                        "$gte": inicio_dia,
                        "$lt": fin_dia
                }
        cursor = db["ganancias"].find(filtro)
        ganancias_db = await cursor.to_list(length=100)
        for ganancia in ganancias_db:
                ganancia["id"] = str(ganancia["_id"])
                ganancia["ingresos"] = float(ganancia.get("ingresos"),0.0)
                ganancia["egresos"] = float(ganancia.get("egresos"),0.0)
        return ganancias_db
