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
            const maxTemp = dia.temperatura?.maxima || 'N/A';
            const minTemp = dia.temperatura?.minima || 'N/A';
            const estadoCielo = dia.estadoCielo?.[0]?.descripcion || 'N/A';
            const probPrecip = dia.probPrecipitacion?.[0]?.value ? `${dia.probPrecipitacion[0].value}%` : 'N/A';

            // 🛠️ **Corrección en la extracción del viento**
            let vientoDir = 'N/A';
            let vientoVel = 'N/A';
            let rachaMax = 'N/A';

            if (dia.vientoAndRachaMax) {
                // Extraer dirección y velocidad del viento
                if (Array.isArray(dia.vientoAndRachaMax)) {
                    vientoDir = dia.vientoAndRachaMax[0]?.direccion || 'N/A';
                    vientoVel = dia.vientoAndRachaMax[0]?.velocidad ? `${dia.vientoAndRachaMax[0].velocidad} km/h` : 'N/A';
                    rachaMax = dia.vientoAndRachaMax[0]?.rachaMax ? `${dia.vientoAndRachaMax[0].rachaMax} km/h` : 'N/A';
                } else {
                    vientoDir = dia.vientoAndRachaMax.direccion ? dia.vientoAndRachaMax.direccion[0] || 'N/A' : 'N/A';
                    vientoVel = dia.vientoAndRachaMax.velocidad ? `${dia.vientoAndRachaMax.velocidad[0]} km/h` : 'N/A';
                    rachaMax = dia.vientoAndRachaMax.value ? `${dia.vientoAndRachaMax.value} km/h` : 'N/A';
                }
            }

            rowContent += `<td class="weather-cell">
                🌥️ ${estadoCielo}<br>
                🌡️ <strong>${minTemp}°C / ${maxTemp}°C</strong><br>
                💦 <strong>${probPrecip}</strong> de lluvia<br>
                💨 <strong>${vientoDir} ${vientoVel}</strong> (racha: ${rachaMax})
            </td>`;
        });

        row.innerHTML = rowContent;
        tbody.appendChild(row);
    });
}



