const API_URL = "https://sep7ima-cafeteria-f7z2.onrender.com";
let myChart = null;
let categoriasGlobales = []; 
window.onload = async () => {
    const token = localStorage.getItem("token");
    if(token) {
        mostrarPanel();
        await cargarCategorias(); 
        cargarInventario();
        cargarEstadisticas();
    }
};

async function login() {
    const user = document.getElementById("username").value;
    const pass = document.getElementById("password").value;
    const errorMsg = document.getElementById("login-error");

    const formData = new URLSearchParams();
    formData.append("username", user);
    formData.append("password", pass);

    try {
        const res = await fetch(`${API_URL}/token`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: formData
        });

        if (res.ok) {
            const data = await res.json();
            localStorage.setItem("token", data.access_token);
            errorMsg.style.display = "none";
            mostrarPanel();
            await cargarCategorias();
            cargarInventario();
            cargarEstadisticas();
        } else {
            errorMsg.style.display = "block";
        }
    } catch (error) {
        alert("Error de red conectando al servidor");
    }
}

function cerrarSesion() {
    localStorage.removeItem("token");
    document.getElementById("admin-panel").style.display = "none";
    document.getElementById("admin-header").style.display = "none";
    document.getElementById("login-section").style.display = "flex";
}

async function entregarPedido(pedidoId) {
    if (!confirm("¿Confirmas que este pedido ya fue entregado y cobrado?")) return;

    try {

        const token = localStorage.getItem("token"); 
        
        const res = await fetch(`${API_URL}/pedidos/${pedidoId}/entregar`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.detail || "Error al entregar el pedido");
        }

        const data = await res.json();
        alert(data.message); 
        cargarPedidosPendientes(); 
        
    } catch (error) {
        console.error("Error:", error);
        alert(error.message);
    }
}

async function cancelarPedido(pedidoId) {
    if (!confirm("¿Estás seguro de cancelar este pedido? Los productos regresarán al inventario.")) return;

    try {
        const token = localStorage.getItem("token"); 
        
        const res = await fetch(`${API_URL}/pedidos/${pedidoId}/cancelar`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.detail || "Error al cancelar el pedido");
        }

        alert("Pedido cancelado. Inventario restaurado.");
        
        cargarPedidosPendientes(); 
        
    } catch (error) {
        console.error("Error:", error);
        alert(error.message);
    }
}

function mostrarPanel() {
    document.getElementById("login-section").style.display = "none";
    document.getElementById("admin-header").style.display = "flex";
    document.getElementById("admin-panel").style.display = "block";
}

function agregarFilaVariante(){
    const container = document.getElementById("variantes-container");
    const nuevaFila = document.createElement("div");
    nuevaFila.className = "variante-row";
    nuevaFila.style =  "display: flex; gap: 10px; margin-bottom: 10px;";
    nuevaFila.innerHTML = `
    <input type="text" class="var-tamano" placeholder="Tamaño (Ej. G)" style="flex: 1;">
<input type="number" class="var-precio" placeholder="Precio ($)" style="flex: 1;" step="0.01">
<button class="btn-outline-danger" onclick="eliminarFila(this)" style="padding: 0 15px; border-radius: 8px;">X</button>`;
    container.appendChild(nuevaFila);
}

function eliminarFila(boton){
    const fila = boton.parentElement;
    const totalFilas = document.querySelectorAll('.variante-row').length;

    if(totalFilas > 1) {
        fila.remove();
    }else{
        alert("El producto debe tener un tamaño al menos");
    }
}

async function cargarEstadisticas() {
    const token = localStorage.getItem("token");
    try {
        const res = await fetch(`${API_URL}/stats/estadistica`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if(!res.ok) return;
        const data = await res.json();

        document.getElementById("stat-ganancias").innerText = `$${data.ganancia_total.toFixed(2)}`;

        const ctx = document.getElementById('chartTopProductos').getContext('2d');

        if (myChart) { myChart.destroy(); }

        myChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.top_productos.map(p => p._id),
                datasets: [{
                    label: 'Unidades Vendidas',
                    data: data.top_productos.map(p => p.cantidad_total),
                    backgroundColor: '#a88631',
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false },
                    title: { display: true, text: 'Top 5 Productos Más Vendidos' }
                },
                scales: {
                    y: { beginAtZero: true, ticks: { precision: 0 } }
                }
            }
        });
    } catch(e) {
        console.error("Error cargando estadísticas", e);
    }
}

async function borrar_stats(){
    const confirmacion = confirm("ATENCION: ¿Estás completamente seguro de que quieres reiniciar TODAS las estadísticas y pedidos? Esta acción borrará el historial y no se puede deshacer.");

    if (!confirmacion) {
        console.log("Operación de borrado cancelada por el usuario.");
        return; 
    }

    try {
        const token = localStorage.getItem("token"); 

        if (!token) {
            alert("Error de sesión: No tienes permisos para hacer esto.");
            return;
        }

        const respuesta = await fetch(`${API_URL}/stats/estadistica`, {
            method: "DELETE", 
            headers: {
                "Authorization": `Bearer ${token}`, 
                "Content-Type": "application/json"
            }
        });

        const datos = await respuesta.json();

        if (respuesta.ok) {
            alert(`${datos.mensaje}\nRegistros limpiados: ${datos.registros_eliminados}`);
            window.location.reload(); 
        } else {
            alert(`Error al borrar: ${datos.detail || 'No se pudo completar la acción'}`);
        }

    } catch (error) {
        console.error("Fallo de conexión:", error);
        alert("Error: No se pudo conectar con el servidor.");
    }
}


// --- NUEVAS FUNCIONES DE CATEGORÍAS ---

async function cargarCategorias() {
    const token = localStorage.getItem("token"); 
    try {
        const res = await fetch(`${API_URL}/categorias/lista`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (!res.ok) return;
        
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
    const nombreNuevaCat = prompt("Escribe el nombre de la nueva categoría:");
    if (!nombreNuevaCat || nombreNuevaCat.trim() === "") return;
    
    const token = localStorage.getItem("token");
    const payload = { nombre: nombreNuevaCat.trim(), image: null, disponible: true, orden: 0, color: null };

    try {
        const res = await fetch(`${API_URL}/categorias`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify(payload)
        });

        if(res.ok) {
            alert("Categoría creada.");
            await cargarCategorias(); 
        } else { alert("Error al guardar."); }
    } catch (error) { alert("Error de red."); }
}

async function editarCategoriaSeleccionada() {
    const select = document.getElementById("prod-categoria");
    const categoriaId = select.value;
    const categoriaNombreActual = select.options[select.selectedIndex]?.text;

    if (!categoriaId) { alert("Selecciona una categoría."); return; }

    const nuevoNombre = prompt("Edita el nombre:", categoriaNombreActual);
    if (!nuevoNombre || nuevoNombre.trim() === "" || nuevoNombre.trim() === categoriaNombreActual) return; 

    const token = localStorage.getItem("token");
    const payload = { nombre: nuevoNombre.trim(), image: null, disponible: true, orden: 0, color: null };

    try {
        const res = await fetch(`${API_URL}/categorias/lista/${categoriaId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            alert("Categoría actualizada.");
            await cargarCategorias(); 
            cargarInventario(); 
        } else { alert("Error al actualizar."); }
    } catch (error) { alert("Error de red."); }
}

async function eliminarCategoriaSeleccionada() {
    const select = document.getElementById("prod-categoria");
    const categoriaId = select.value;

    if (!categoriaId) { alert("Selecciona una categoría."); return; }
    if (!confirm("¿Seguro que deseas eliminar esta categoría?")) return;

    const token = localStorage.getItem("token");

    try {
        const res = await fetch(`${API_URL}/categorias/lista/${categoriaId}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (res.ok) {
            alert("Categoría eliminada.");
            await cargarCategorias(); 
            cargarInventario();
        } else { alert("Error al eliminar."); }
    } catch (error) { alert("Error de red."); }
}


async function cargarInventario() {
    const token = localStorage.getItem("token");
    try {
        const res = await fetch(`${API_URL}/productos/lista`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (res.status === 401) { cerrarSesion(); return; }

        const productos = await res.json();
        const tbody = document.getElementById("tabla-productos");
        tbody.innerHTML = "";

        productos.forEach(p => {
            const stock = p.cantidad !== undefined ? p.cantidad : 0;

            let estadoHtml = '';
            if (!p.disponible) {
                estadoHtml = '<span class="badge stock-hidden">Oculto</span>';
            } else if (stock >= 50) {
                estadoHtml = '<span class="badge stock-perfect">Excelente</span>';
            } else if (stock < 50 && stock >= 20){
                estadoHtml = '<span class="badge stock-ok">Suficiente</span>';
            } else {
                estadoHtml = '<span class="badge stock-low">Bajo Stock</span>';
            }
            
            let preciosFormateados = '<span style="color: gray; font-size: 12px;">Sin precios</span>';
            if(p.variantes && p.variantes.length > 0){
                preciosFormateados = p.variantes.map(v => `<b>${v.tamaño}</b>: $${v.precio.toFixed(2)}`).join(' | '); 
            }
            
            const nombreCategoria = categoriasGlobales.find(c => c.categoria_id === p.categoria_id)?.nombre || '<span style="color: gray; font-style: italic;">Sin categoría</span>';
            
            tbody.innerHTML += `
                <tr>
                    <td style="font-weight:bold;">${p.nombre}</td>
                    <td>${preciosFormateados}</td>
                    <td>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <button class="btn-outline" style="padding: 2px 8px; font-size: 14px; border-radius: 4px;" onclick="modificarStock('${p.id}', -1)">-</button>
                            <span style="font-weight: bold; min-width: 25px; text-align: center;">${stock}</span>
                            <button class="btn-outline" style="padding: 2px 8px; font-size: 14px; border-radius: 4px;" onclick="modificarStock('${p.id}', 1)">+</button>
                        </div>
                    </td>
                    <td>${estadoHtml}</td>
                    <td>${nombreCategoria}</td> <!-- ACTUALIZADO -->
                    <td>
                        <button class="btn-accion btn-toggle" onclick="toggleDisponibilidad('${p.id}', ${p.disponible})">
                            ${p.disponible ? 'Ocultar' : 'Activar'}
                        </button>
                        <button class="btn-accion btn-delete" onclick="eliminarProducto('${p.id}')">Borrar</button>
                    </td>
                </tr>
            `;
        });
    } catch (error) { console.error("Error al cargar inventario", error); }
}

function agregarFilaOpcion() {
    const contenedor = document.getElementById("contenedor-opciones");
    const fila = document.createElement("div");
    fila.className = "d-flex gap-2 mb-2 fila-opcion align-items-center"; 
    fila.innerHTML = `
        <input type="text" class="form-control form-control-sm op-nombre" placeholder="Ej. Leche de Almendras">
        <input type="number" class="form-control form-control-sm op-precio" placeholder="Precio Extra (Deja vacío si es gratis)" step="0.5">
        <button type="button" class="btn btn-sm btn-outline-danger" onclick="this.parentElement.remove()" title="Eliminar opción">
            X
        </button>
    `;
    
    contenedor.appendChild(fila);
}

function extraerOpcionesDelFormulario() {
    const opciones = [];
    const filas = document.querySelectorAll(".fila-opcion"); 

    filas.forEach(fila => {
        const nombreStr = fila.querySelector(".op-nombre").value.trim();
        const precioRaw = fila.querySelector(".op-precio").value;
        if (nombreStr !== "") {
            opciones.push({
                nombre: nombreStr,
                precio_extra: precioRaw !== "" ? parseFloat(precioRaw) : null,
                disponible: true
            });
        }
    });

    return opciones;
}

async function agregarProducto() {
    const nombre = document.getElementById("prod-nombre").value;
    const descripcionIn = document.getElementById("prod-desc").value;
    const categoriaId = document.getElementById("prod-categoria").value; 
    const stock = parseInt(document.getElementById("prod-stock").value) || 0;
    const descripcion = descripcionIn ? descripcionIn.value.trim() : "";
    const imgInput = document.getElementById("prod-imagen");
    const imagenUrl = imgInput ? imgInput.value.trim() : null; 

    const token = localStorage.getItem("token");
    const variantes = [];
    const opciones = [];
    const filasOpciones = document.querySelectorAll(".fila-opcion");
    filasOpciones.forEach(fila => {
    const nombreStr = fila.querySelector(".op-nombre").value.trim();
    const precioRaw = fila.querySelector(".op-precio").value;

    if (nombreStr !== "") {
        opciones.push({
            nombre: nombreStr,
            precio_extra: precioRaw !== "" ? parseFloat(precioRaw) : null,
            disponible: true
            });
        }
    });
    const filas = document.querySelectorAll(".variante-row");
    let formularioValido = true;

    filas.forEach(fila => {
        const tamano = fila.querySelector(".var-tamano").value.trim();
        const precio = parseFloat(fila.querySelector(".var-precio").value);

        if (!tamano || isNaN(precio)) {
            formularioValido = false;
        } else {
            variantes.push({ tamaño: tamano, precio: precio });
        }
    });

    if(!nombre || !categoriaId || !formularioValido || variantes.length === 0) {
        alert("Por favor llena todos los campos, selecciona una categoría y revisa los precios.");
        return;
    }

    const payload = { 
        nombre: nombre, 
        descripcion: descripcion ? descripcion: null,
        cantidad: stock,
        categoria_id: categoriaId, 
        variantes: variantes, 
        disponible: true,
        imagen: imagenUrl ? imagenUrl : null,
        opciones: opciones 
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
            document.getElementById("prod-nombre").value = "";
            document.getElementById("prod-categoria").value = "";
            document.getElementById("prod-stock").value = "";
            document.getElementById("prod-desc").value = "";
            document.getElementById("contenedor-opciones").innerHTML = "";
            if (imgInput) imgInput.value = "";
            
            document.getElementById("variantes-container").innerHTML = `
                <div class="variante-row" style="display: flex; gap: 10px; margin-bottom: 10px;">
                    <input type="text" class="var-tamano" placeholder="Tamaño (Ej. M)" style="flex: 1;">
                    <input type="number" class="var-precio" placeholder="Precio ($)" style="flex: 1;" step="0.01">
                    <button class="btn-outline-danger" onclick="eliminarFila(this)" style="padding: 0 15px; border-radius: 8px;">X</button>
                </div>
            `;
            cargarInventario(); 
        } else { 
            alert("Error al guardar en el servidor"); 
        }
    } catch (error) { 
        alert("Error de conexión"); 
    }
}

async function eliminarProducto(id) {
    if(!confirm("¿Seguro que quieres eliminar este producto para siempre?")) return;
    const token = localStorage.getItem("token");
    try {
        const res = await fetch(`${API_URL}/productos/${id}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });
        if(res.ok) {
            cargarInventario();
        } else { alert("Error al eliminar el producto."); }
    } catch(e) { alert("Error de red"); }
}

async function toggleDisponibilidad(id, estadoActual, nombre, precio, stock) {
    const token = localStorage.getItem("token");
    const payload = {
        nombre: nombre,
        precio_unitario: precio,
        cantidad: stock,
        disponible: !estadoActual
    };

    try {
        const res = await fetch(`${API_URL}/productos/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });
        if(res.ok) {
            cargarInventario();
        } else { alert("Error al cambiar la disponibilidad."); }
    } catch(e) { alert("Error de red"); }
}

async function modificarStock(id, cantidadCambio) {
    const token = localStorage.getItem("token");
    
    const payload = {
        cantidad: cantidadCambio
    };

    try {
        const res = await fetch(`${API_URL}/productos/${id}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            cargarInventario(); 
        } else {
            const errorData = await res.json();
            alert(`Error al actualizar el stock: ${errorData.detail || 'Desconocido'}`);
        }
    } catch (e) {
        alert("Error de red conectando al servidor.");
    }

    async function cargarPedidosPendientes() {
    const tbody = document.getElementById('tabla-pedidos-body');
    
    try {
        const token = localStorage.getItem("token"); 
        const res = await fetch(`${API_URL}/pedidos/pendientes`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error("Error de conexión");
        const pedidos = await res.json();
        if (pedidos.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted" style="padding: 20px;">No hay pedidos pendientes por el momento. ¡A limpiar la barra! 🧹</td></tr>`;
            return;
        }

        let html = '';
        pedidos.forEach(pedido => {
            const fecha = new Date(pedido.fecha);
            const horaStr = fecha.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const folio = pedido.id.slice(-4).toUpperCase(); 
            const listaProductos = pedido.items.map(item => 
                `<li><strong>${item.cantidad}x</strong> ${item.nombre} <small class="text-muted">(${item.tamano})</small></li>`
            ).join('');
            const alertaCobro = pedido.metodo_pago === 'Efectivo' 
                ? '<small class="text-danger fw-bold"><i class="fas fa-hand-holding-usd"></i> Cobrar Efectivo</small>'
                : `<small class="text-success"><i class="fas fa-check-circle"></i> ${pedido.metodo_pago}</small>`;

            html += `
                <tr>
                    <td>
                        <strong>${horaStr}</strong><br>
                        <small style="color: #888;">#${folio}</small>
                    </td>
                    <td>
                        <strong>${pedido.cliente_nombre}</strong><br>
                        <small style="color: #666;">${pedido.telefono || ''}</small>
                    </td>
                    <td>
                        <ul style="list-style: none; padding: 0; margin: 0; font-size: 0.9em;">
                            ${listaProductos}
                        </ul>
                    </td>
                    <td>
                        <strong>$${pedido.total_pagado.toFixed(2)}</strong><br>
                        ${alertaCobro}
                    </td>
                    <td>
                        <span class="badge" style="background-color: #ffe4b5; color: #b8860b; padding: 8px 12px; border-radius: 20px;">
                            ${pedido.estado.toUpperCase()}
                        </span>
                    </td>
                    <td>
                        <div class="d-flex flex-column gap-2">
                            <button class="btn btn-sm" style="background-color: #4CAF50; color: white; border-radius: 8px; width: 100px;" onclick="entregarPedido('${pedido.id}')">
                                Entregar
                            </button>
                            <button class="btn btn-sm" style="background-color: #a52a2a; color: white; border-radius: 8px; width: 100px;" onclick="cancelarPedido('${pedido.id}')">
                                Cancelar
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;

    } catch (error) {
        console.error("Error al cargar pedidos:", error);
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger" style="padding: 20px;">Hubo un error al cargar los pedidos. Revisa tu conexión.</td></tr>`;
            }
        }   
document.addEventListener("DOMContentLoaded", () => {
    cargarPedidosPendientes();
    setInterval(cargarPedidosPendientes, 15000); 
    });
}