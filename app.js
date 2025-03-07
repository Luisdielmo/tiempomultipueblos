// app.js - Nueva versión optimizada

// Almacenamos los municipios seleccionados en localStorage
let municipiosGuardados = JSON.parse(localStorage.getItem("municipios")) || [];

document.addEventListener("DOMContentLoaded", () => {
    mostrarMunicipios();
    mostrarPredicciones();
});

// Función para agregar un municipio desde una URL de AEMET
function agregarMunicipioDesdeURL() {
    const url = document.getElementById('municipio-url').value.trim();
    const regex = /\/municipios\/([a-zA-Z0-9-]+)-id(\d+)/; // Regex para extraer el ID y nombre del municipio
    const match = url.match(regex);

    if (match) {
        const municipio = match[1];
        const idMunicipio = match[2];

        if (!municipiosGuardados.some(m => m.codigo === idMunicipio)) {
            municipiosGuardados.push({ municipio, codigo: idMunicipio });
            localStorage.setItem("municipios", JSON.stringify(municipiosGuardados));
            mostrarMunicipios();
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
    municipiosGuardados.forEach(({ municipio, codigo }) => {
        const div = document.createElement('div');
        div.innerHTML = `<span>${municipio}</span> <button onclick="eliminarMunicipio('${codigo}')">Eliminar</button>`;
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

// Función para obtener las predicciones de un municipio
async function obtenerPredicciones(codigo) {
    try {
        const apiKey = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJsdWlzQGRpZWxtby5jb20iLCJqdGkiOiJjMzcwM2RhMy01ZjZhLTRiNWItODU4OS1hYmE3YWYxYmRlZDUiLCJpc3MiOiJBRU1FVCIsImlhdCI6MTczMjcxOTIxMSwidXNlcklkIjoiYzM3MDNkYTMtNWY2YS00YjViLTg1ODktYWJhN2FmMWJkZWQ1Iiwicm9sZSI6IiJ9.VgdhLRbZQc9BzO0sisvLboljXfiHTBtNk2sHDB5Akqo';
        const baseUrl = `https://opendata.aemet.es/opendata/api/prediccion/especifica/municipio/horaria/${codigo}/?api_key=${apiKey}`;
        
        const response = await fetch(baseUrl);
        const data = await response.json();
        if (!data || !data.datos) throw new Error('No se encontró la URL de los datos.');
        
        const weatherResponse = await fetch(data.datos);
        const weatherData = await weatherResponse.json();
        return weatherData;
    } catch (error) {
        console.error(`Error obteniendo predicciones para ${codigo}:`, error);
        return null;
    }
}

// Función para mostrar las predicciones
async function mostrarPredicciones() {
    const tbody = document.getElementById('weather-tbody');
    tbody.innerHTML = '';
    
    const predicciones = await Promise.all(municipiosGuardados.map(async ({ municipio, codigo }) => {
        const data = await obtenerPredicciones(codigo);
        if (!data || !data.prediccion || !data.prediccion.dia) return null;
        return { municipio, temperatura: data.prediccion.dia[0]?.temperatura || [] };
    }));
    
    predicciones.filter(Boolean).forEach(({ municipio, temperatura }) => {
        const row = document.createElement('tr');
        row.innerHTML = `<td>${municipio}</td>` + temperatura.map(t => `<td>${t.value || 'N/A'}°C</td>`).join('');
        tbody.appendChild(row);
    });
}
