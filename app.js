// Almacenamos los municipios seleccionados en localStorage
let municipiosGuardados = JSON.parse(localStorage.getItem("municipios")) || [];

document.addEventListener("DOMContentLoaded", () => {
    localStorage.removeItem("municipios"); // Forzar actualización cada recarga
    mostrarMunicipios();
    mostrarPredicciones();
});

// Función para agregar un municipio desde una URL de AEMET
function agregarMunicipioDesdeURL() {
    const url = document.getElementById('municipio-url').value.trim();
    const regex = /\/municipios\/([a-zA-Z0-9-]+)-id(\d+)/;
    const match = url.match(regex);

    if (match) {
        const municipio = match[1];
        const idMunicipio = match[2];
        const enlace = `https://www.aemet.es/es/eltiempo/prediccion/municipios/${municipio}-id${idMunicipio}`;

        if (!municipiosGuardados.some(m => m.codigo === idMunicipio)) {
            municipiosGuardados.push({ municipio, codigo: idMunicipio, enlace });
            localStorage.setItem("municipios", JSON.stringify(municipiosGuardados));
            mostrarMunicipios();
            mostrarPredicciones();
        } else {
            alert("Este municipio ya está en la lista.");
        }
    } else {
        alert("URL no válida. Asegúrate de que tiene el formato correcto.");
    }
    document.getElementById('municipio-url').value = '';
}

// Función para mostrar los municipios seleccionados en la interfaz
function mostrarMunicipios() {
    const container = document.getElementById('municipios-list');
    container.innerHTML = '';
    municipiosGuardados.forEach(({ municipio, codigo, enlace }) => {
        const div = document.createElement('div');
        div.innerHTML = `<a href="${enlace}" target="_blank">${municipio}</a> <button onclick="eliminarMunicipio('${codigo}')">Eliminar</button>`;
        container.appendChild(div);
    });
}

// Función para eliminar un municipio
function eliminarMunicipio(codigo) {
    municipiosGuardados = municipiosGuardados.filter(m => m.codigo !== codigo);
    localStorage.setItem("municipios", JSON.stringify(municipiosGuardados));
    mostrarMunicipios();
    mostrarPredicciones();
}

// Función para obtener las predicciones diarias de un municipio
async function obtenerPredicciones(codigo) {
    try {
        const apiKey = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJsdWlzQGRpZWxtby5jb20iLCJqdGkiOiJjMzcwM2RhMy01ZjZhLTRiNWItODU4OS1hYmE3YWYxYmRlZDUiLCJpc3MiOiJBRU1FVCIsImlhdCI6MTczMjcxOTIxMSwidXNlcklkIjoiYzM3MDNkYTMtNWY2YS00YjViLTg1ODktYWJhN2FmMWJkZWQ1Iiwicm9sZSI6IiJ9.VgdhLRbZQc9BzO0sisvLboljXfiHTBtNk2sHDB5Akqo';
        const baseUrl = `https://opendata.aemet.es/opendata/api/prediccion/especifica/municipio/diaria/${codigo}/?api_key=${apiKey}`;
        
        console.log(`Solicitando predicciones para: ${codigo}`);
        
        // Primera petición a la API de AEMET
        const response = await fetch(baseUrl);
        const data = await response.json();
        
        if (!data || !data.datos) {
            console.error(`No se encontró la URL de datos para ${codigo}`);
            return null;
        }
        
        // Segunda petición para obtener los datos reales
        const weatherResponse = await fetch(data.datos);
        const weatherData = await weatherResponse.json();
        
        if (!Array.isArray(weatherData)) {
            console.error(`Formato inesperado de datos para ${codigo}`, weatherData);
            return null;
        }
        
        return weatherData;
    } catch (error) {
        console.error(`Error obteniendo predicciones para ${codigo}:`, error);
        return null;
    }
}

// Función para mostrar las predicciones en la tabla
async function mostrarPredicciones() {
    const thead = document.getElementById('weather-header-row');
    const tbody = document.getElementById('weather-tbody');
    tbody.innerHTML = '';

    const predicciones = await Promise.all(municipiosGuardados.map(async ({ municipio, codigo, enlace }) => {
        const data = await obtenerPredicciones(codigo);
        if (!data || !Array.isArray(data) || !data[0]?.prediccion?.dia) {
            console.warn(`No se encontraron datos válidos para ${municipio}`);
            return null;
        }
        return { municipio, enlace, dias: data[0].prediccion.dia };
    }));

    // Obtener fechas únicas y convertirlas en nombres de días de la semana
    const diasUnicos = predicciones.filter(Boolean)[0]?.dias.map(d => {
        const fecha = new Date(d.fecha);
        return `${fecha.toLocaleDateString('es-ES', { weekday: 'short' })} ${fecha.getDate()}`;
    }) || [];

    // Actualizar encabezado de la tabla con los días
    thead.innerHTML = `<th>Municipio</th>` + diasUnicos.map(d => `<th>${d}</th>`).join('');

    // Rellenar filas con la información meteorológica
    predicciones.filter(Boolean).forEach(({ municipio, enlace, dias }) => {
        const row = document.createElement('tr');
        let rowContent = `<td><a href="${enlace}" target="_blank">${municipio}</a></td>`;

        dias.forEach(dia => {
            let contenidoDia = '';

            // Dividimos la información en intervalos horarios
            const bloquesHorarios = [
                { rango: '00–06 h', temp: null, cielo: null },
                { rango: '06–12 h', temp: null, cielo: null },
                { rango: '12–18 h', temp: null, cielo: null },
                { rango: '18–24 h', temp: null, cielo: null }
            ];

            // Procesamos la información de temperatura y estado del cielo
            if (dia.temperatura) {
                dia.temperatura.forEach(temp => {
                    const hora = parseInt(temp.periodo);
                    if (hora >= 0 && hora < 6) bloquesHorarios[0].temp = temp.value;
                    else if (hora >= 6 && hora < 12) bloquesHorarios[1].temp = temp.value;
                    else if (hora >= 12 && hora < 18) bloquesHorarios[2].temp = temp.value;
                    else if (hora >= 18 && hora < 24) bloquesHorarios[3].temp = temp.value;
                });
            }

            if (dia.estadoCielo) {
                dia.estadoCielo.forEach(cielo => {
                    const hora = parseInt(cielo.periodo);
                    if (hora >= 0 && hora < 6) bloquesHorarios[0].cielo = cielo.descripcion;
                    else if (hora >= 6 && hora < 12) bloquesHorarios[1].cielo = cielo.descripcion;
                    else if (hora >= 12 && hora < 18) bloquesHorarios[2].cielo = cielo.descripcion;
                    else if (hora >= 18 && hora < 24) bloquesHorarios[3].cielo = cielo.descripcion;
                });
            }

            // Construimos la celda con los bloques horarios
            bloquesHorarios.forEach(bloque => {
                contenidoDia += `<strong>${bloque.rango}</strong><br>`;
                contenidoDia += bloque.cielo ? `${bloque.cielo}<br>` : 'N/A<br>';
                contenidoDia += bloque.temp ? `🌡️ ${bloque.temp}°C<br>` : '🌡️ N/A<br>';
                contenidoDia += '<br>'; // Espacio entre bloques
            });

            rowContent += `<td class="weather-cell">${contenidoDia}</td>`;
        });

        row.innerHTML = rowContent;
        tbody.appendChild(row);
    });
}



