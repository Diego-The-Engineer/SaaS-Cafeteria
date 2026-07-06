import os, sys
from datetime import datetime, timedelta
from typing import List, Optional, Annotated
from fastapi import Depends, HTTPException, status, FastAPI, Body, APIRouter
from fastapi.security import OAuth2PasswordRequestForm
from bson import ObjectId
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from models import Model_producto, Response_producto, Item_pedido, Create_pedido, Response_pedido, Response_msg, Categoria
from database import db
from auth import User, get_current_active_user

router = APIRouter(
	prefix="/categorias",
	tags=["Categorias"]
)

@router.get("/lista")
async def get_categorias(
    current_user: Annotated[User, Depends(get_current_active_user)] = None 
):
    cursor = db["categorias"].find({})
    categorias = []
    async for cat in cursor:
        cat["categoria_id"] = str(cat["_id"])
        del cat["_id"]
        if "categoria_id" not in cat:
            cat["categoria_id"] = "sin_categoria"
        categorias.append(cat)
    return categorias

@router.post("/")
async def post_categorias(
    categoria: Categoria,
    current_user: Annotated[User, Depends(get_current_active_user)] = None 
):
    newCat = categoria.dict()
    res = await db["categorias"].insert_one(newCat)
    return {"categoria_id": str(res.inserted_id), "msg": "Categoría creada con éxito"}

@router.delete("/lista/{categoria_id}")
async def delete_categorias(
    categoria_id: str,
    current_user: Annotated[User, Depends(get_current_active_user)] = None 
):
    oid = ObjectId(categoria_id.strip('"'))
    res = await db["categorias"].delete_one({"_id": oid})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Categoria no encontrada")
    return {"msg": "Categoria eliminada correctamente"}

@router.put("/lista/{categoria_id}")
async def actualizar_categorias(
    categoria_id: str,
    categoria_data: Categoria,
    current_user: Annotated[User, Depends(get_current_active_user)] = None 
):
    oid = ObjectId(categoria_id.strip('"'))
    datos_act = categoria_data.dict()
    res = await db["categorias"].update_one(
            {"_id": oid},
            {"$set": datos_act}
    )
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Categoria no encontrada")
    return {"msg": "Categoria editada correctamente"}