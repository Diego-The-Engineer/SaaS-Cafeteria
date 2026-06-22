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
	prefix="/productos",
	tags=["Productos"]
)

@router.post("", response_model=Response_producto)
async def post_productos(current_user: Annotated[User, Depends(get_current_active_user)], producto: Model_producto):
    producto_dict = producto.model_dump()
    resultado = await db["productos"].insert_one(producto_dict)
    producto_dict["id"] = str(resultado.inserted_id)
    return producto_dict

@router.get("/lista", response_model=List[Response_producto])
async def get_productos(disponible: Optional[bool] = None):
    filtro = {}
    if disponible is not None:
        filtro["disponible"] = disponible
    cursor = db["productos"].find(filtro)
    productos_db = await cursor.to_list(length=100)
    for prod in productos_db:
        prod["id"] = str(prod["_id"])
    return productos_db

@router.delete("/{id}")
async def eliminar_producto_real(id: str, current_user: Annotated[User, Depends(get_current_active_user)]):
    oid = ObjectId(id.strip('"'))
    resultado = await db["productos"].delete_one({"_id": oid})
    if resultado.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return {"msg": "Producto eliminado correctamente"}

@router.put("/{id}")
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


