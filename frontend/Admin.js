const API_URL = "https://sep7ima-cafeteria-f7z2.onrender.com";
let myChart = null;
let categoriasGlobales = []; 

// Variables para Paginación
let productosGlobales = []; 
let paginaActual = 1;       
const itemsPorPagina = 8; 

window.onload = async () => {
    const token = sessionStorage.getItem("token");

    if (!token) {
        document.getElementById("login-section").style.display = "flex";
        document.getElementById("admin-panel").style.display = "none";
        document.getElementById("admin-header").style.setProperty("display", "none", "important");
        return;
    }

    try {
        const res = await fetch(`${API_URL}/stats/estadistica`, {
            method: 'GET',
            headers: { "Authorization": `Bearer ${token}` }
        });

        if(res.ok) {
            mostrarPanel();
            await cargarCategorias(); 
            cargarInventario();
            cargarEstadisticas();
        } else {
            cerrarSesion();
        }
    }
    catch(error) {
        cerrarSesion();
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
            sessionStorage.setItem("token", data.access_token);
            errorMsg.style.display = "none";
            mostrarPanel();
            await cargarCategorias();
            cargarInventario();
            cargarEstadisticas();
        } else {
            errorMsg.style.display = "block";
        }
    } catch (error) {
        Toastify({
            text: "Error de red, conectando al servidor",
            duration: 3000,
            gravity: "top",
            position: "right",
            style: { background: "#D96C6C", color: "white", borderRadius: "8px" }
        }).showToast();
    }
}

function cerrarSesion() {
    sessionStorage.removeItem("token");
    document.getElementById("admin-panel").style.display = "none";
    document.getElementById("admin-header").style.setProperty("display", "none", "important");
    document.getElementById("login-section").style.display = "flex";
}

function mostrarPanel() {
    document.getElementById("login-section").style.display = "none";
    document.getElementById("admin-header").style.setProperty("display", "flex", "important");
    document.getElementById("admin-panel").style.display = "block";
}

// ==========================================
// SECCIÓN DE INVENTARIO Y PAGINACIÓN
// ==========================================

async function cargarInventario() {
    const token = sessionStorage.getItem("token");
    try {
        const res = await fetch(`${API_URL}/productos/lista`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (res.status === 401) { cerrarSesion(); return; }

        productosGlobales = await res.json();
        renderizarTablaInventario(); 
        
    } catch (error) { console.error("Error al cargar inventario", error); }
}

function renderizarTablaInventario() {
    const tbody = document.getElementById("tabla-productos");
    tbody.innerHTML = "";

    if (productosGlobales.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">No hay productos en el inventario.</td></tr>';
        renderizarPaginacion();
        return;
    }

    const indexInicio = (paginaActual - 1) * itemsPorPagina;
    const indexFin = indexInicio + itemsPorPagina;
    const productosPagina = productosGlobales.slice(indexInicio, indexFin);

    productosPagina.forEach(p => {
        const stock = p.cantidad !== undefined ? p.cantidad : 0;

        let estadoHtml = '';
        if (!p.disponible) {
            estadoHtml = '<span class="badge" style="background:#6c757d;">Oculto</span>';
        } else if (stock >= 50) {
            estadoHtml = '<span class="badge" style="background:#198754;">Excelente</span>';
        } else if (stock < 50 && stock >= 20){
            estadoHtml = '<span class="badge" style="background:#0dcaf0; color:black;">Suficiente</span>';
        } else {
            estadoHtml = '<span class="badge" style="background:#dc3545;">Bajo Stock</span>';
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
                        <button class="btn btn-sm btn-outline-secondary" onclick="modificarStock('${p.id}', -1)"><i class="fas fa-minus"></i></button>
                        <span style="font-weight: bold; min-width: 25px; text-align: center;">${stock}</span>
                        <button class="btn btn-sm btn-outline-secondary" onclick="modificarStock('${p.id}', 1)"><i class="fas fa-plus"></i></button>
                    </div>
                </td>
                <td>${estadoHtml}</td>
                <td>${nombreCategoria}</td> 
                <td>
                    <button class="btn btn-sm ${p.disponible ? 'btn-outline-secondary' : 'btn-success'} mb-1" onclick="toggleDisponibilidad('${p.id}', ${p.disponible})">
                        ${p.disponible ? '<i class="fas fa-eye-slash"></i>' : '<i class="fas fa-eye"></i>'}
                    </button>
                    <button class="btn btn-sm btn-warning text-white mb-1" onclick="cargarYeditar('${p.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-danger mb-1" onclick="eliminarProducto('${p.id}')"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `;
    });

    renderizarPaginacion();
}

function renderizarPaginacion() {
    const totalPaginas = Math.ceil(productosGlobales.length / itemsPorPagina);
    const ulPaginacion = document.getElementById("paginacion-inventario");
    const infoPaginacion = document.getElementById("info-paginacion");
    
    ulPaginacion.innerHTML = "";
    
    if (totalPaginas <= 1) {
        infoPaginacion.innerText = `Mostrando ${productosGlobales.length} productos`;
        return; 
    }

    const indexInicio = (paginaActual - 1) * itemsPorPagina + 1;
    const indexFin = Math.min(indexInicio + itemsPorPagina - 1, productosGlobales.length);
    infoPaginacion.innerText = `Mostrando ${indexInicio} - ${indexFin} de ${productosGlobales.length} productos`;

    ulPaginacion.innerHTML += `
        <li class="page-item ${paginaActual === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="cambiarPagina(${paginaActual - 1}, event)">Anterior</a>
        </li>
    `;

    for (let i = 1; i <= totalPaginas; i++) {
        ulPaginacion.innerHTML += `
            <li class="page-item ${paginaActual === i ? 'active' : ''}">
                <a class="page-link" href="#" onclick="cambiarPagina(${i}, event)">${i}</a>
            </li>
        `;
    }

    ulPaginacion.innerHTML += `
        <li class="page-item ${paginaActual === totalPaginas ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="cambiarPagina(${paginaActual + 1}, event)">Siguiente</a>
        </li>
    `;
}

function cambiarPagina(nuevaPagina, event) {
    event.preventDefault(); 
    const totalPaginas = Math.ceil(productosGlobales.length / itemsPorPagina);
    
    if (nuevaPagina >= 1 && nuevaPagina <= totalPaginas) {
        paginaActual = nuevaPagina;
        renderizarTablaInventario(); 
    }
}

async function modificarStock(id, cantidadCambio) {
    const token = sessionStorage.getItem("token");
    const payload = { cantidad: cantidadCambio };

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
} 

async function eliminarProducto(id) {
    if(!confirm("¿Seguro que quieres eliminar este producto para siempre?")) return;
    const token = sessionStorage.getItem("token");
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
    const token = sessionStorage.getItem("token");
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

// ==========================================
// ESTADÍSTICAS Y GRÁFICAS
// ==========================================

async function cargarEstadisticas() {
    const token = sessionStorage.getItem("token");
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
                scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
            }
        });
    } catch(e) { console.error("Error cargando estadísticas", e); }
}

async function borrar_stats(){
    const confirmacion = confirm("ATENCION: ¿Estás completamente seguro de que quieres reiniciar TODAS las estadísticas y pedidos? Esta acción borrará el historial y no se puede deshacer.");
    if (!confirmacion) return; 

    try {
        const token = sessionStorage.getItem("token"); 
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
        Toastify({
            text: "Error: No se puede conectar al servidor ",
            duration: 3000,
            gravity: "top",
            position: "right",
            style: { background: "#D96C6C", color: "white", borderRadius: "8px" }
        }).showToast();
    }
}

// ==========================================
// PEDIDOS PENDIENTES
// ==========================================

async function cargarPedidosPendientes() {
    const tbody = document.getElementById('tabla-pedidos-body');
    try {
        const token = sessionStorage.getItem("token"); 
        const res = await fetch(`${API_URL}/pedidos/pendientes`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error("Error de conexión");
        const pedidos = await res.json();
        
        if (pedidos.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">No hay pedidos pendientes por el momento. ¡A limpiar la barra! </td></tr>`;
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
                    <td><strong>${horaStr}</strong><br><small class="text-muted">#${folio}</small></td>
                    <td><strong>${pedido.cliente_nombre}</strong><br><small class="text-muted">${pedido.telefono || ''}</small></td>
                    <td><ul style="list-style: none; padding: 0; margin: 0; font-size: 0.9em;">${listaProductos}</ul></td>
                    <td><strong>$${pedido.total_pagado.toFixed(2)}</strong><br>${alertaCobro}</td>
                    <td><span class="badge bg-warning text-dark">${pedido.estado.toUpperCase()}</span></td>
                    <td>
                        <div class="d-flex flex-column gap-2">
                            <button class="btn btn-sm btn-success" onclick="entregarPedido('${pedido.id}')">Entregar</button>
                            <button class="btn btn-sm btn-danger" onclick="cancelarPedido('${pedido.id}')">Cancelar</button>
                        </div>
                    </td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">Hubo un error al cargar los pedidos. Revisa tu conexión.</td></tr>`;
    }
}   

async function entregarPedido(pedidoId) {
    if (!confirm("¿Confirmas que este pedido ya fue entregado y cobrado?")) return;
    try {
        const token = sessionStorage.getItem("token"); 
        const res = await fetch(`${API_URL}/pedidos/${pedidoId}/entregar`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });
        if (!res.ok) throw new Error("Error al entregar el pedido");
        cargarPedidosPendientes(); 
    } catch (error) {
        alert(error.message);
    }
}

async function cancelarPedido(pedidoId) {
    if (!confirm("¿Estás seguro de cancelar este pedido? Los productos regresarán al inventario.")) return;
    try {
        const token = sessionStorage.getItem("token"); 
        const res = await fetch(`${API_URL}/pedidos/${pedidoId}/cancelar`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });
        if (!res.ok) throw new Error("Error al cancelar el pedido");
        cargarPedidosPendientes(); 
    } catch (error) {
        alert(error.message);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    cargarPedidosPendientes();
    setInterval(cargarPedidosPendientes, 15000); 
});

// ==========================================
// FORMULARIOS DE PRODUCTOS Y CATEGORÍAS
// ==========================================

async function cargarCategorias() {
    const token = sessionStorage.getItem("token"); 
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
        select.innerHTML = categoriasGlobales.map(cat => `<option value="${cat.categoria_id}">${cat.nombre}</option>`).join('');
    } catch (error) { console.error("Error", error); }
}

async function agregarNuevaCategoria() {
    const nombreNuevaCat = prompt("Escribe el nombre de la nueva categoría:");
    if (!nombreNuevaCat || nombreNuevaCat.trim() === "") return;
    const token = sessionStorage.getItem("token");
    const payload = { nombre: nombreNuevaCat.trim(), image: null, disponible: true, orden: 0, color: null };
    try {
        const res = await fetch(`${API_URL}/categorias`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify(payload)
        });
        if(res.ok) { await cargarCategorias(); } 
    } catch (error) {}
}

async function editarCategoriaSeleccionada() {
    const select = document.getElementById("prod-categoria");
    const categoriaId = select.value;
    const categoriaNombreActual = select.options[select.selectedIndex]?.text;
    if (!categoriaId) return;
    const nuevoNombre = prompt("Edita el nombre:", categoriaNombreActual);
    if (!nuevoNombre || nuevoNombre.trim() === "" || nuevoNombre.trim() === categoriaNombreActual) return; 
    const token = sessionStorage.getItem("token");
    const payload = { nombre: nuevoNombre.trim(), image: null, disponible: true, orden: 0, color: null };
    try {
        const res = await fetch(`${API_URL}/categorias/lista/${categoriaId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify(payload)
        });
        if (res.ok) { await cargarCategorias(); cargarInventario(); } 
    } catch (error) {}
}

async function eliminarCategoriaSeleccionada() {
    const select = document.getElementById("prod-categoria");
    const categoriaId = select.value;
    if (!categoriaId) return;
    if (!confirm("¿Seguro que deseas eliminar esta categoría?")) return;
    const token = sessionStorage.getItem("token");
    try {
        const res = await fetch(`${API_URL}/categorias/lista/${categoriaId}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) { await cargarCategorias(); cargarInventario(); } 
    } catch (error) {}
}

function agregarFilaVariante(){
    const container = document.getElementById("variantes-container");
    const nuevaFila = document.createElement("div");
    nuevaFila.className = "variante-row d-flex gap-2 mb-2";
    nuevaFila.innerHTML = `
        <input type="text" class="form-control var-tamano" placeholder="Tamaño (Ej. G)">
        <input type="number" class="form-control var-precio" placeholder="Precio ($)" step="0.01">
        <button class="btn btn-outline-danger" type="button" onclick="eliminarFila(this)"><i class="fas fa-times"></i></button>`;
    container.appendChild(nuevaFila);
}

function agregarFilaOpcion() {
    const contenedor = document.getElementById("contenedor-opciones");
    const fila = document.createElement("div");
    fila.className = "d-flex gap-2 mb-2 fila-opcion align-items-center"; 
    fila.innerHTML = `
        <input type="text" class="form-control form-control-sm op-nombre" placeholder="Ej. Leche de Almendras">
        <input type="number" class="form-control form-control-sm op-precio" placeholder="Precio Extra (vacío = $0)" step="0.5">
        <button type="button" class="btn btn-sm btn-outline-danger" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>
    `;
    contenedor.appendChild(fila);
}

function agregarFilaSabor() {
    const contenedor = document.getElementById("contenedor-sabores");
    const fila = document.createElement("div");
    fila.className = "d-flex gap-2 mb-2 fila-sabor align-items-center"; 
    fila.innerHTML = `
        <input type="text" class="form-control form-control-sm sab-nombre" placeholder="Ej. Avellana">
        <button type="button" class="btn btn-sm btn-outline-danger" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>
    `;
    contenedor.appendChild(fila);
}

function eliminarFila(boton){
    const fila = boton.parentElement;
    const totalFilas = document.querySelectorAll('.variante-row').length;
    if(totalFilas > 1) { fila.remove(); }
    else { alert("El producto debe tener un tamaño al menos"); }
}

function cancelarEdicion() {
    document.getElementById("prod-nombre").value = "";
    document.getElementById("prod-categoria").value = "";
    document.getElementById("prod-stock").value = "";
    document.getElementById("prod-desc").value = "";
    document.getElementById("prod-imagen").value = "";
    document.getElementById("contenedor-opciones").innerHTML = "";
    document.getElementById("contenedor-sabores").innerHTML = "";

    document.getElementById("variantes-container").innerHTML = `
        <div class="variante-row d-flex gap-2 mb-2">
            <input type="text" class="form-control var-tamano" placeholder="Tamaño (Ej. M)">
            <input type="number" class="form-control var-precio" placeholder="Precio ($)" step="0.01">
            <button class="btn btn-outline-danger" type="button" onclick="eliminarFila(this)"><i class="fas fa-times"></i></button>
        </div>
    `;
    const btnPrincipal = document.getElementById("btn-guardar-principal");
    btnPrincipal.innerText = "Guardar Producto";
    btnPrincipal.onclick = agregarProducto;
    document.getElementById("btn-cancelar").style.display = "none";
}

async function agregarProducto() {
    const nombre = document.getElementById("prod-nombre").value;
    const descripcion = document.getElementById("prod-desc").value;
    const categoriaId = document.getElementById("prod-categoria").value; 
    const stock = parseInt(document.getElementById("prod-stock").value) || 0;
    const imagenUrl = document.getElementById("prod-imagen").value; 

    const token = sessionStorage.getItem("token");
    const variantes = [], opciones = [], sabores = [];
    
    document.querySelectorAll(".fila-opcion").forEach(fila => {
        const nombreStr = fila.querySelector(".op-nombre").value.trim();
        const precioRaw = fila.querySelector(".op-precio").value;
        if (nombreStr !== "") opciones.push({ nombre: nombreStr, precio_extra: precioRaw ? parseFloat(precioRaw) : null, disponible: true });
    });

    document.querySelectorAll(".variante-row").forEach(fila => {
        const tamano = fila.querySelector(".var-tamano").value.trim();
        const precio = parseFloat(fila.querySelector(".var-precio").value);
        if (tamano && !isNaN(precio)) variantes.push({ tamaño: tamano, precio: precio });
    });

    document.querySelectorAll(".fila-sabor").forEach(fila => {
        const nombreSabor = fila.querySelector(".sab-nombre").value.trim();
        if (nombreSabor !== "") sabores.push({ nombre: nombreSabor, disponible: true });
    });

    if(!nombre || !categoriaId || variantes.length === 0) {
        alert("Llena el nombre, selecciona categoría y revisa los precios."); return;
    }

    const payload = { nombre, descripcion: descripcion || null, cantidad: stock, categoria_id: categoriaId, variantes, disponible: true, imagen: imagenUrl || null, opciones, sabores };

    try {
        const res = await fetch(`${API_URL}/productos/`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify(payload)
        });
        if(res.ok) { cancelarEdicion(); cargarInventario(); } 
        else { alert("Error al guardar"); }
    } catch (error) { alert("Error de conexión"); }
}

async function cargarYeditar(id) {
    const token = sessionStorage.getItem("token");
    try {
        const res = await fetch (`${API_URL}/productos/${id}`, { headers: { "Authorization" : `Bearer ${token}` } });
        if (!res.ok) throw new Error("No se pudo cargar el producto");
        const p = await res.json();
        
        document.getElementById("prod-nombre").value = p.nombre;
        document.getElementById("prod-categoria").value = p.categoria_id;
        document.getElementById("prod-stock").value = p.cantidad || 0;
        document.getElementById("prod-desc").value = p.descripcion || "";
        document.getElementById("prod-imagen").value = p.imagen || "";
        
        const varContainer = document.getElementById("variantes-container");
        varContainer.innerHTML = ""; 
        if (p.variantes) {
            p.variantes.forEach(v => {
                varContainer.innerHTML += `
                    <div class="variante-row d-flex gap-2 mb-2">
                        <input type="text" class="form-control var-tamano" value="${v.tamaño}">
                        <input type="number" class="form-control var-precio" value="${v.precio}" step="0.01">
                        <button class="btn btn-outline-danger" type="button" onclick="eliminarFila(this)"><i class="fas fa-times"></i></button>
                    </div>`;
            });
        }
        
        const contOpciones = document.getElementById("contenedor-opciones");
        contOpciones.innerHTML = "";
        if (p.opciones) {
            p.opciones.forEach(opc => {
                contOpciones.innerHTML += `
                    <div class="d-flex gap-2 mb-2 fila-opcion align-items-center">
                        <input type="text" class="form-control form-control-sm op-nombre" value="${opc.nombre}">
                        <input type="number" class="form-control form-control-sm op-precio" value="${opc.precio_extra || ''}" step="0.5">
                        <button type="button" class="btn btn-sm btn-outline-danger" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>
                    </div>`;
            });
        }
        
        const contSabores = document.getElementById("contenedor-sabores");
        contSabores.innerHTML = "";
        if (p.sabores) {
            p.sabores.forEach(sab => {
                contSabores.innerHTML += `
                    <div class="d-flex gap-2 mb-2 fila-sabor align-items-center">
                        <input type="text" class="form-control form-control-sm sab-nombre" value="${sab.nombre}">
                        <button type="button" class="btn btn-sm btn-outline-danger" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>
                    </div>`;
            });
        }
        
        const btnPrincipal = document.getElementById("btn-guardar-principal");
        btnPrincipal.innerText = "Actualizar Producto";
        btnPrincipal.onclick = function(){editarProducto(id)};
        document.getElementById("btn-cancelar").style.display = "inline-block";
        window.scrollTo({top: 0, behavior: 'smooth'});
    } catch(error) { alert("Error de conexion al servidor"); }
}

async function editarProducto(id) {
    const nombre = document.getElementById("prod-nombre").value;
    const categoriaId = document.getElementById("prod-categoria").value;
    const stock = parseInt(document.getElementById("prod-stock").value) || 0;
    const descripcion = document.getElementById("prod-desc").value.trim();
    const imagenUrl = document.getElementById("prod-imagen").value.trim();
    const token = sessionStorage.getItem("token");

    const variantes = [], opciones = [], sabores = [];
    document.querySelectorAll(".fila-opcion").forEach(fila => {
        const nombreStr = fila.querySelector(".op-nombre").value.trim();
        const precioRaw = fila.querySelector(".op-precio").value;
        if (nombreStr !== "") opciones.push({ nombre: nombreStr, precio_extra: precioRaw ? parseFloat(precioRaw) : null, disponible: true });
    });

    document.querySelectorAll(".variante-row").forEach(fila => {
        const tamano = fila.querySelector(".var-tamano").value.trim();
        const precio = parseFloat(fila.querySelector(".var-precio").value);
        if (tamano && !isNaN(precio)) variantes.push({ tamaño: tamano, precio: precio, disponible: true });
    });

    document.querySelectorAll(".fila-sabor").forEach(fila => {
        const nombreSabor = fila.querySelector(".sab-nombre").value.trim();
        if (nombreSabor !== "") sabores.push({ nombre: nombreSabor, disponible: true });
    });

    if (!nombre || !categoriaId || variantes.length === 0) { alert("Faltan datos clave."); return; }

    const payload = { nombre, descripcion: descripcion || null, cantidad: stock, categoria_id: categoriaId, variantes, disponible: true, imagen: imagenUrl || null, opciones, sabores };

    try {
        const res = await fetch(`${API_URL}/productos/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify(payload) 
        });
        if (res.ok) { alert("¡Actualizado!"); cancelarEdicion(); cargarInventario(); } 
    } catch (error) { alert("Error de conexión"); }
}