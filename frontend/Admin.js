const esLocal = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || window.location.hostname === "192.168.56.101");
const API_URL = esLocal ? "http://localhost:5500" : "https://sep7ima-cafeteria-f7z2.onrender.com";

let categoriasGlobales = []; 

// --- 1. INICIALIZACIÓN ---
window.onload = async () => {
    const token = localStorage.getItem("token");
    if(token) {
        await cargarCategorias(); 
        cargarInventario();       
    } else {
        window.location.href = "login.html"; 
    }
};

function cerrarSesion() {
    localStorage.removeItem("token");
    window.location.href = "login.html";
}

// --- 2. CRUD ---

async function cargarCategorias() {
    try {
        const res = await fetch(`${API_URL}/categorias/lista`);
        if (!res.ok) throw new Error("Fallo al cargar categorías");
        
        categoriasGlobales = await res.json();
        const select = document.getElementById("prod-categoria");
        
        if (!select) return; 

        if(categoriasGlobales.length === 0) {
            select.innerHTML = '<option value="">Crea una categoría primero</option>';
            return;
        }
        select.innerHTML = categoriasGlobales.map(cat => 
            `<option value="${cat.categoria_id}">${cat.nombre}</option>`
        ).join('');

    } catch (error) {
        console.error("Error cargando categorías", error);
    }
}

async function agregarNuevaCategoria() {
    const nombreNuevaCat = prompt("Escribe el nombre de la nueva categoría (Ej. Postres, Bebidas Frías):");
    
    if (!nombreNuevaCat || nombreNuevaCat.trim() === "") return;
    
    const token = localStorage.getItem("token");
    const payload = {
        nombre: nombreNuevaCat.trim(),
        image: null,
        disponible: true,
        orden: 0,
        color: null
    };

    try {
        const res = await fetch(`${API_URL}/categorias/`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json", 
                "Authorization": `Bearer ${token}` 
            },
            body: JSON.stringify(payload)
        });

        if(res.ok) {
            alert("Categoría creada correctamente.");
            await cargarCategorias(); 
        } else {
            alert("Error al guardar la categoría en el servidor.");
        }
    } catch (error) {
        alert("Error de conexión al crear categoría.");
    }
}

async function editarCategoriaSeleccionada() {
    const select = document.getElementById("prod-categoria");
    const categoriaId = select.value;
    const categoriaNombreActual = select.options[select.selectedIndex]?.text;

    if (!categoriaId) {
        alert("Selecciona una categoría primero.");
        return;
    }

    const nuevoNombre = prompt("Edita el nombre de la categoría:", categoriaNombreActual);
    
    if (!nuevoNombre || nuevoNombre.trim() === "" || nuevoNombre.trim() === categoriaNombreActual) {
        return; 
    }

    const token = localStorage.getItem("token");
    const payload = {
        nombre: nuevoNombre.trim(),
        image: null,
        disponible: true,
        orden: 0,
        color: null
    };

    try {
        const res = await fetch(`${API_URL}/categorias/lista/${categoriaId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            alert("Categoría actualizada con éxito.");
            await cargarCategorias(); 
            cargarInventario();   
        } else {
            alert("Error al actualizar la categoría en el servidor.");
        }
    } catch (error) {
        alert("Error de red conectando al servidor.");
    }
}

async function eliminarCategoriaSeleccionada() {
    const select = document.getElementById("prod-categoria");
    const categoriaId = select.value;
    const categoriaNombre = select.options[select.selectedIndex]?.text;

    if (!categoriaId) {
        alert("Selecciona una categoría primero.");
        return;
    }

    const confirmacion = confirm(`¿Estás seguro de que deseas eliminar la categoría "${categoriaNombre}"?\n\nOjo: Los productos que tengan esta categoría se mostrarán como "Sin categoría".`);
    
    if (!confirmacion) return;

    const token = localStorage.getItem("token");

    try {
        const res = await fetch(`${API_URL}/categorias/lista/${categoriaId}`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (res.ok) {
            alert("Categoría eliminada con éxito.");
            await cargarCategorias(); 
            cargarInventario(); 
        } else {
            alert("Error al eliminar la categoría en el servidor.");
        }
    } catch (error) {
        alert("Error de red conectando al servidor.");
    }
}

// --- 3. SISTEMA DE PRODUCTOS (INVENTARIO) ---

function agregarFilaVariante() {
    const contenedor = document.getElementById("variantes-container");
    if(!contenedor) return;
    
    const div = document.createElement("div");
    div.className = "variante-row";
    div.style.display = "flex";
    div.style.gap = "10px";
    div.style.marginBottom = "10px";
    
    div.innerHTML = `
        <input type="text" placeholder="Tamaño (Ej. M, G)" class="var-tamano" style="flex: 1; padding: 8px; border: 1px solid #ccc; border-radius: 5px;">
        <input type="number" placeholder="Precio ($)" class="var-precio" style="flex: 1; padding: 8px; border: 1px solid #ccc; border-radius: 5px;">
        <button type="button" onclick="this.parentElement.remove()" style="background: var(--danger); color: white; border: none; border-radius: 5px; padding: 0 10px; cursor: pointer;">X</button>
    `;
    contenedor.appendChild(div);
}

async function agregarProducto() {
    const nombre = document.getElementById("prod-nombre").value;
    const categoriaId = document.getElementById("prod-categoria").value;
    const stockInicial = parseInt(document.getElementById("prod-stock").value) || 0; 
    const imgInput = document.getElementById("prod-imagen");
    const imagenUrl = imgInput ? imgInput.value.trim() : null; 
    
    const token = localStorage.getItem("token");
    
    const variantes = [];
    const filas = document.querySelectorAll(".variante-row");
    let formularioValido = true;

    filas.forEach(fila => {
        const tamano = fila.querySelector(".var-tamano").value.trim();
        const precio = parseFloat(fila.querySelector(".var-precio").value);
        if (!tamano || isNaN(precio)) formularioValido = false;
        else variantes.push({ tamaño: tamano, precio: precio });
    });

    if(!nombre || !categoriaId || !formularioValido || variantes.length === 0) {
        alert("Por favor llena todos los campos, selecciona una categoría y agrega al menos un tamaño con precio válido.");
        return;
    }
    
    const payload = { 
        nombre: nombre, 
        cantidad: stockInicial,
        categoria_id: categoriaId,
        variantes: variantes, 
        disponible: true,
        imagen: imagenUrl ? imagenUrl : null 
    };

    try {
        const res = await fetch(`${API_URL}/productos/`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json", 
                "Authorization": `Bearer ${token}` 
            },
            body: JSON.stringify(payload)
        });

        if(res.ok) {
            alert("Producto agregado al menú exitosamente.");
            document.getElementById("prod-nombre").value = "";
            document.getElementById("prod-stock").value = "0";
            if (imgInput) imgInput.value = "";
            document.getElementById("variantes-container").innerHTML = ""; 
            agregarFilaVariante(); 
            
            cargarInventario(); 
        } else { 
            alert("Error al guardar el producto en el servidor."); 
        }
    } catch (error) { 
        alert("Error de conexión al servidor."); 
    }
}

async function cargarInventario() {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
        const res = await fetch(`${API_URL}/productos/lista`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (!res.ok) throw new Error("Fallo al obtener inventario");
        const productos = await res.json();
        const tbody = document.getElementById("inventario-body"); 
        if(!tbody) return;

        tbody.innerHTML = "";

        productos.forEach(p => {
            const nombreCategoria = categoriasGlobales.find(c => c.categoria_id === p.categoria_id)?.nombre 
                || '<span style="color: gray; font-style: italic;">Sin categoría</span>';
            const variantesInfo = p.variantes && p.variantes.length > 0
                ? p.variantes.map(v => `${v.tamaño}: $${v.precio}`).join("<br>")
                : "Sin variantes";
            const estadoImagen = p.imagen 
                ? `<span style="color: var(--success); font-size: 12px;">✅ Sí</span>` 
                : `<span style="color: gray; font-size: 12px;">❌ No</span>`;

            tbody.innerHTML += `
                <tr>
                    <td><strong>${p.nombre}</strong></td>
                    <td>${nombreCategoria}</td>
                    <td>${p.cantidad !== undefined ? p.cantidad : 0}</td>
                    <td>${variantesInfo}</td>
                    <td>${estadoImagen}</td>
                    <td>
                        <button onclick="eliminarProducto('${p.id || p._id}')" class="btn-outline" style="border-color: var(--danger); color: var(--danger); padding: 4px 8px; font-size: 12px;">
                            Borrar
                        </button>
                    </td>
                </tr>
            `;
        });
    } catch (error) {
        console.error("Error cargando inventario:", error);
    }
}

async function eliminarProducto(id) {
    const confirmacion = confirm("¿Estás seguro de que deseas eliminar este producto del menú?");
    if (!confirmacion) return;

    const token = localStorage.getItem("token");

    try {
        const res = await fetch(`${API_URL}/productos/${id}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (res.ok) {
            cargarInventario();
        } else {
            alert("Error al eliminar el producto.");
        }
    } catch (error) {
        alert("Error de conexión con el servidor.");
    }
}