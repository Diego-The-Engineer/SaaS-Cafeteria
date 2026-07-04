const API_URL = "https://sep7ima-cafeteria-f7z2.onrender.com";
        let myChart = null;

        window.onload = () => {
            const token = localStorage.getItem("token");
            if(token) {
                mostrarPanel();
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

        function mostrarPanel() {
            document.getElementById("login-section").style.display = "none";
            document.getElementById("admin-header").style.display = "flex";
            document.getElementById("admin-panel").style.display = "block";
        }

        function agregarFilaVariante(){
            const container = document.getElementById("variantes-container");
            const nuevaFila = document.createElement("div");
            nuevaFila.className = "variante-row";
            nuevaFila.style =  "isplay: flex; gap: 10px; margin-bottom: 10px;";
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

                    tbody.innerHTML += `
                        <tr>
                            <td style="font-weight:bold;">${p.nombre}</td>
                            <td>$${p.precio_unitario}</td>
                            <td>
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <button class="btn-outline" style="padding: 2px 8px; font-size: 14px; border-radius: 4px;" onclick="modificarStock('${p.id}', -1)">-</button>
                                <span style="font-weight: bold; min-width: 25px; text-align: center;">${stock}</span>
                                <button class="btn-outline" style="padding: 2px 8px; font-size: 14px; border-radius: 4px;" onclick="modificarStock('${p.id}', 1)">+</button>
                            </div>
                            </td>
                            <td>${estadoHtml}</td>
                            <td>${p.categoria || '<span style="color: gray; font-style: italic;">Sin categoría</span>'} </td>
                            <td>
                                <button class="btn-accion btn-toggle" onclick="toggleDisponibilidad('${p.id}', ${p.disponible}, '${p.nombre}', ${p.precio_unitario}, ${stock})">
                                    ${p.disponible ? 'Ocultar' : 'Activar'}
                                </button>
                                <button class="btn-accion btn-delete" onclick="eliminarProducto('${p.id}')">Borrar</button>
                            </td>
                        </tr>
                    `;
                });
            } catch (error) { console.error("Error al cargar inventario", error); }
        }

        async function agregarProducto() {
    const nombre = document.getElementById("prod-nombre").value;
    const categoria = document.getElementById("prod-categoria").value;
    const stock = document.getElementById("prod-stock").value;
    const token = localStorage.getItem("token");
    const variantes = [];
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
    if(!nombre || !categoria || !formularioValido || stock === 0 || variantes.length === 0) {
        alert("Por favor llena todos los campos y revisa los precios.");
        return;
    }
    const payload = { 
        nombre: nombre, 
        stock: stock,
        categoria: categoria,
        variantes: variantes, 
        disponible: true 
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
}