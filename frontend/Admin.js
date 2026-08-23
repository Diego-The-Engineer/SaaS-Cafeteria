const API_URL = "https://sep7ima-cafeteria-f7z2.onrender.com";
let myChart = null;
let categoriasGlobales = []; 
let productosGlobales = [];
let paginaActual = 1;       
const itemsPorPagina = 8;
window.onload = async () => {
    const token = sessionStorage.getItem("token");

    if (!token) {
        document.getElementById("login-section").style.display = "flex";
        document.getElementById("admin-panel").style.display = "none";
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
    document.getElementById("admin-header").style.display = "none";
    document.getElementById("login-section").style.display = "flex";
}

async function entregarPedido(pedidoId) {
    if (!confirm("¿Confirmas que este pedido ya fue entregado y cobrado?")) return;

    try {
        const token = sessionStorage.getItem("token"); 
        
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
        Toastify({
            text: "Aviso: " + data.message,
            duration: 3000,
            gravity: "top",
            position: "right",
            style: { background: "#D96C6C", color: "white", borderRadius: "8px" }
        }).showToast();
        cargarPedidosPendientes(); 
        
    } catch (error) {
        console.error("Error:", error);
        Toastify({
            text: "Aviso: " + error.message,
            duration: 3000,
            gravity: "top",
            position: "right",
            style: { background: "#D96C6C", color: "white", borderRadius: "8px" }
        }).showToast();
    }
}

async function cancelarPedido(pedidoId) {
    if (!confirm("¿Estás seguro de cancelar este pedido? Los productos regresarán al inventario.")) return;

    try {
        const token = sessionStorage.getItem("token"); 
        
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
        Toastify({
            text: "Aviso: Pedido cancelado. Inventario restaurado",
            duration: 3000,
            gravity: "top",
            position: "right",
            style: { background: "#D96C6C", color: "white", borderRadius: "8px" }
        }).showToast();
        
        cargarPedidosPendientes(); 
        
    } catch (error) {
        console.error("Error:", error);
        Toastify({
            text: "Aviso: " + error.message,
            duration: 3000,
            gravity: "top",
            position: "right",
            style: { background: "#D96C6C", color: "white", borderRadius: "8px" }
        }).showToast();
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
        Toastify({
            text: "Aviso: El producto debe tener un tamaño al menos",
            duration: 3000,
            gravity: "top",
            position: "right",
            style: { background: "#D96C6C", color: "white", borderRadius: "8px" }
        }).showToast();
    }
}

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
        return; 
    }

    try {
        const token = sessionStorage.getItem("token"); 

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
        Toastify({
            text: "Error: No se puede conectar al servidor ",
            duration: 3000,
            gravity: "top",
            position: "right",
            style: { background: "#D96C6C", color: "white", borderRadius: "8px" }
        }).showToast();
    }
}


// --- NUEVAS FUNCIONES DE CATEGORÍAS ---

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
    
    const token = sessionStorage.getItem("token");
    const payload = { nombre: nombreNuevaCat.trim(), image: null, disponible: true, orden: 0, color: null };

    try {
        const res = await fetch(`${API_URL}/categorias`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify(payload)
        });

        if(res.ok) {
            Toastify({
            text: "Categoria creada",
            duration: 3000,
            gravity: "top",
            position: "right",
            style: { background: "#add96c", color: "white", borderRadius: "8px" }
        }).showToast();
            await cargarCategorias(); 
        } else {
            Toastify({
            text: "Aviso: Error al guardar" ,
            duration: 3000,
            gravity: "top",
            position: "right",
            style: { background: "#D96C6C", color: "white", borderRadius: "8px" }
        }).showToast(); 
        }
    } catch (error) { 
        Toastify({
            text: "Aviso: Error en la red",
            duration: 3000,
            gravity: "top",
            position: "right",
            style: { background: "#D96C6C", color: "white", borderRadius: "8px" }
        }).showToast();
    }
}

async function editarCategoriaSeleccionada() {
    const select = document.getElementById("prod-categoria");
    const categoriaId = select.value;
    const categoriaNombreActual = select.options[select.selectedIndex]?.text;

    if (!categoriaId) { alert("Selecciona una categoría."); return; }

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

    const token = sessionStorage.getItem("token");

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


function cancelarEdicion() {
    document.getElementById("prod-nombre").value = "";
    document.getElementById("prod-categoria").value = "";
    document.getElementById("prod-stock").value = "";
    document.getElementById("prod-desc").value = "";
    
    const imgInput = document.getElementById("prod-imagen");
    if (imgInput) imgInput.value = "";

    const contOpciones = document.getElementById("contenedor-opciones");
    if (contOpciones) contOpciones.innerHTML = "";
    
    const contSabores = document.getElementById("contenedor-sabores");
    if (contSabores) contSabores.innerHTML = "";

    document.getElementById("variantes-container").innerHTML = `
        <div class="variante-row" style="display: flex; gap: 10px; margin-bottom: 10px;">
            <input type="text" class="var-tamano" placeholder="Tamaño (Ej. M)" style="flex: 1;">
            <input type="number" class="var-precio" placeholder="Precio ($)" style="flex: 1;" step="0.01">
            <button class="btn-outline-danger" onclick="eliminarFila(this)" style="padding: 0 15px; border-radius: 8px;">X</button>
        </div>
    `;
    const btnPrincipal = document.getElementById("btn-guardar-principal");
    if (btnPrincipal) {
        btnPrincipal.innerText = "Guardar Producto";
        btnPrincipal.onclick = agregarProducto;
        btnPrincipal.style.backgroundColor = ""; 
    }

    document.getElementById("btn-cancelar").style.display = "none";
}

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
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No hay productos en el inventario.</td></tr>';
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
            estadoHtml = '<span class="badge stock-hidden" style="background:gray; color:white;">Oculto</span>';
        } else if (stock >= 50) {
            estadoHtml = '<span class="badge stock-perfect" style="background:#e6f4ea; color:#1e8e3e; border:1px solid #1e8e3e;">EXCELENTE</span>';
        } else if (stock < 50 && stock >= 20){
            estadoHtml = '<span class="badge stock-ok" style="background:#e8f0fe; color:#1967d2; border:1px solid #1967d2;">SUFICIENTE</span>';
        } else {
            estadoHtml = '<span class="badge stock-low" style="background:#fce8e6; color:#d93025; border:1px solid #d93025;">BAJO STOCK</span>';
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
                        <button class="btn btn-sm btn-outline-secondary" onclick="modificarStock('${p.id}', -1)">-</button>
                        <span style="font-weight: bold; min-width: 25px; text-align: center;">${stock}</span>
                        <button class="btn btn-sm btn-outline-secondary" onclick="modificarStock('${p.id}', 1)">+</button>
                    </div>
                </td>
                <td>${estadoHtml}</td>
                <td>${nombreCategoria}</td> 
                <td>
                    <button class="btn btn-sm btn-outline-secondary btn-accion btn-toggle" onclick="toggleDisponibilidad('${p.id}', ${p.disponible})">
                        ${p.disponible ? 'Ocultar' : 'Activar'}
                    </button>
                    <button class="btn btn-sm btn-warning text-white btn-accion btn-editar" onclick="cargarYeditar('${p.id}')"> Editar</button>
                    <button class="btn btn-sm btn-danger btn-accion btn-delete" onclick="eliminarProducto('${p.id}')">Borrar</button>
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

function agregarFilaSabor() {
    const contenedor = document.getElementById("contenedor-sabores");
    const fila = document.createElement("div");
    fila.className = "d-flex gap-2 mb-2 fila-sabor align-items-center"; 
    fila.innerHTML = `
        <input type="text" class="form-control form-control-sm sab-nombre" placeholder="Ej. Avellana">
        <button type="button" class="btn btn-sm btn-outline-danger" onclick="this.parentElement.remove()" title="Eliminar sabor">X</button>
    `;
    contenedor.appendChild(fila);
}

function agregarFilaOpcion() {
    const contenedor = document.getElementById("contenedor-opciones");
    const fila = document.createElement("div");
    fila.className = "d-flex gap-2 mb-2 fila-opcion align-items-center"; 
    fila.innerHTML = `
        <input type="text" class="form-control form-control-sm op-nombre" placeholder="Ej. Leche de Almendras">
        <input type="number" class="form-control form-control-sm op-precio" placeholder="Precio Extra (Deja vacío si es gratis)" step="0.5">
        <button type="button" class="btn btn-sm btn-outline-danger" onclick="this.parentElement.remove()" title="Eliminar opción">
            
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
    const descripcion = descripcionIn ? descripcionIn.trim() : null;
    const imgInput = document.getElementById("prod-imagen");
    const imagenUrl = imgInput ? imgInput.value.trim() : null; 

    const token = sessionStorage.getItem("token");
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

    const sabores = [];
    const filasSabores = document.querySelectorAll(".fila-sabor");
    filasSabores.forEach(fila => {
        const nombreSabor = fila.querySelector(".sab-nombre").value.trim();
        if (nombreSabor !== "") {
            sabores.push({
                nombre: nombreSabor,
                disponible: true
            });
        }
    });

    if(!nombre || !categoriaId || !formularioValido || variantes.length === 0) {
        alert("Por favor llena todos los campos, selecciona una categoría y revisa los precios.");
        return;
    }

    const payload = { 
        nombre: nombre, 
        descripcion: descripcion !== " " ? descripcion: null,
        cantidad: stock,
        categoria_id: categoriaId, 
        variantes: variantes, 
        disponible: true,
        imagen: imagenUrl ? imagenUrl : null,
        opciones: opciones,
        sabores: sabores
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

async function editarProducto(id) {
    const nombre = document.getElementById("prod-nombre").value;
    const categoriaId = document.getElementById("prod-categoria").value;
    const stock = parseInt(document.getElementById("prod-stock").value) || 0;

    const descRaw = document.getElementById("prod-desc").value;
    const descripcion = descRaw ? descRaw.trim() : "";

    const imgInput = document.getElementById("prod-imagen");
    const imagenUrl = imgInput ? imgInput.value.trim() : null;

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

    const sabores = [];
    const filasSabores = document.querySelectorAll(".fila-sabor");
    filasSabores.forEach(fila => {
        const nombreSabor = fila.querySelector(".sab-nombre").value.trim();
        if (nombreSabor !== "") {
            sabores.push({
                nombre: nombreSabor,
                disponible: true
            });
        }
    });
    const variantes = [];
    const filas = document.querySelectorAll(".variante-row");
    let formularioValido = true;

    filas.forEach(fila => {
        const tamano = fila.querySelector(".var-tamano").value.trim();
        const precio = parseFloat(fila.querySelector(".var-precio").value);

        if (!tamano || isNaN(precio)) {
            formularioValido = false;
        } else {
            variantes.push({ tamaño: tamano, precio: precio, disponible: true });
        }
    });

    if (!nombre || !categoriaId || !formularioValido || variantes.length === 0) {
        alert("Por favor llena todos los campos, selecciona una categoría y revisa los precios.");
        return;
    }
    const payload = {
        nombre: nombre,
        descripcion: descripcion !== "" ? descripcion : null,
        cantidad: stock,
        categoria_id: categoriaId,
        variantes: variantes,
        disponible: true,
        imagen: imagenUrl ? imagenUrl : null,
        opciones: opciones,
        sabores: sabores
    };

    const token = sessionStorage.getItem("token");
    try {
        const res = await fetch(`${API_URL}/productos/${id}`, {
            method: "PUT",
            headers: { 
                "Content-Type": "application/json", 
                "Authorization": `Bearer ${token}` 
            },
            body: JSON.stringify(payload) 
        });

        if (res.ok) {
            alert("¡Producto actualizado exitosamente!");
            cancelarEdicion();
            cargarInventario();
        } else {
            const errorData = await res.json();
            alert(`Error al guardar en el servidor: ${errorData.detail || 'Desconocido'}`);
        }
    } catch (error) {
        alert("Error de conexión");
    }
}

async function cargarYeditar(id) {
    const token = sessionStorage.getItem("token");
    try {
        const res = await fetch (`${API_URL}/productos/${id}`, {
            headers: {
                "Authorization" : `Bearer ${token}`
            }
        });
        if (!res.ok) throw new Error("No se pudo cargar el producto");
        const p = await res.json();
        
        document.getElementById("prod-nombre").value = p.nombre;
        document.getElementById("prod-categoria").value = p.categoria_id;
        document.getElementById("prod-stock").value = p.cantidad || 0;
        document.getElementById("prod-desc").value = p.descripcion || "";
        document.getElementById("prod-imagen").value = p.imagen;
        const varContainer = document.getElementById("variantes-container");
        varContainer.innerHTML = ""; 
        if (p.variantes) {
            p.variantes.forEach(v => {
                varContainer.innerHTML += `
                    <div class="variante-row" style="display: flex; gap: 10px; margin-bottom: 10px;">
                        <input type="text" class="var-tamano" value="${v.tamaño}" style="flex: 1;">
                        <input type="number" class="var-precio" value="${v.precio}" style="flex: 1;" step="0.01">
                        <button class="btn-outline-danger" onclick="eliminarFila(this)" style="padding: 0 15px; border-radius: 8px;">X</button>
                    </div>
                `;
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
                        <button type="button" class="btn btn-sm btn-outline-danger" onclick="this.parentElement.remove()">X</button>
                    </div>
                `;
            });
        }
        const contSabores = document.getElementById("contenedor-sabores");
        if (contSabores) {
            contSabores.innerHTML = "";
            if (p.sabores) {
                p.sabores.forEach(sab => {
                    contSabores.innerHTML += `
                        <div class="d-flex gap-2 mb-2 fila-sabor align-items-center">
                            <input type="text" class="form-control form-control-sm sab-nombre" value="${sab.nombre}">
                            <button type="button" class="btn btn-sm btn-outline-danger" onclick="this.parentElement.remove()">X</button>
                        </div>
                    `;
                });
            }
        }
        const botonActualizar = document.getElementById("btn-guardar-principal");
        if (botonActualizar){
            botonActualizar.innerText = "Actualizar Producto";
            botonActualizar.onclick = function(){editarProducto(id)};
            botonActualizar.style.backgroundColor = "#f39c12";
        }
        const btnCancelar = document.getElementById("btn-cancelar");
        if (btnCancelar) btnCancelar.style.display = "inline-block";
        window.scrollTo({top: 0, behavior: 'smooth'});
    }
    catch(error){
        alert("Error de conexion al servidor");
    }
    finally {cargarInventario();}
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

async function modificarStock(id, cantidadCambio) {
    const token = sessionStorage.getItem("token");
    
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
} 
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
            tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted" style="padding: 20px;">No hay pedidos pendientes por el momento. ¡A limpiar la barra! </td></tr>`;
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