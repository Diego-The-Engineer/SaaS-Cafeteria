import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def iniciar_migracion():
    atlas_uri = ""
    try:
        # 1. Leer directamente el archivo ignorando librerías problemáticas
        with open('/app/.env', 'r') as f:
            for line in f:
                if line.startswith('MONGO_URI='):
                    atlas_uri = line.split('=', 1)[1].strip().strip('"').strip("'")
    except Exception:
        print("Error: No se pudo leer /app/.env")
        return

    if not atlas_uri:
        print("Error: MONGO_URI no encontrada en el archivo.")
        return

    print("1. Conectando a Atlas en la Nube...")
    try:
        # Timeout de 5 seg para evitar que se quede pensando infinitamente
        cliente_atlas = AsyncIOMotorClient(atlas_uri, serverSelectionTimeoutMS=5000)
        await cliente_atlas.admin.command('ping') 
        db_atlas = cliente_atlas["cafeteria"]
        print("¡Conectado a Atlas exitosamente!")
    except Exception as e:
        print(f"alló la conexión a Atlas. Verifica tu contraseña o el Network Access.")
        print(f"Detalle técnico: {e}")
        return

    print("2. Conectando a MongoDB Local...")
    # Dentro del contenedor, la base de datos real sí está en su propio localhost
    cliente_local = AsyncIOMotorClient("mongodb://127.0.0.1:27017")
    db_local = cliente_local["cafeteria"]

    colecciones = ["productos", "pedidos"]
    for col in colecciones:
        print(f"\nExtrayendo: '{col}'")
        documentos = await db_local[col].find({}).to_list(length=None)
        
        if documentos:
            print(f"{len(documentos)} documentos listos para migrar.")
            try:
                await db_atlas[col].insert_many(documentos)
                print("Migración exitosa a la nube.")
            except Exception as e:
                print(f"Nota: {e}")
        else:
            print("La colección está vacía localmente.")

    print("\n¡Migración de Base de Datos finalizada con éxito y sin AVX!")

if __name__ == "__main__":
    asyncio.run(iniciar_migracion())
