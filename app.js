// 🔐 Configuración de Airtable
const AIRTABLE_API_KEY = 'patpxayIzoDLxxdbk.9d837d4a744af0b50398dae5404a7c91cab7c37b1f1c90ab7294edf8d441f31c';
const BASE_ID = 'appkO3Axi0b1J1khK';  // Base ID corregido
const TABLE_ID = 'tblvx6MXJ7HtzQZbK';  // ID de la tabla
const AIRTABLE_URL = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`;

const headers = {
    "Authorization": `Bearer ${AIRTABLE_API_KEY}`,
    "Content-Type": "application/json"
};

// 📥 Obtener municipios desde Airtable
async function obtenerMunicipios() {
    try {
        const response = await fetch(AIRTABLE_URL, { headers });
        const data = await response.json();

        console.log("Respuesta de Airtable en obtenerMunicipios:", data); // 🔍 Debugging

        if (!data.records) {
            throw new Error("No se encontraron registros en Airtable.");
        }

        return data.records.map(record => ({
            id: record.id,
            municipio: record.fields.municipio,  // ✅ Ahora coincide con Airtable
            codigo: record.fields.codigo,        // ✅ Ahora coincide con Airtable
            enlace: record.fields.enlace         // ✅ Ahora coincide con Airtable
        }));
    } catch (error) {
        console.error("Error obteniendo municipios desde Airtable:", error);
        return [];
    }
}


// 📤 Agregar municipio a Airtable
async function agregarMunicipioDesdeURL() {
    const url = document.getElementById('municipio-url').value.trim();
    const regex = /\/municipios\/([a-zA-Z0-9-]+)-id(\d+)/;
    const match = url.match(regex);

    if (match) {
        const municipio = match[1];
        const codigo = match[2];  // ✅ Convertimos "codigo" a número entero
        const enlace = `https://www.aemet.es/es/eltiempo/prediccion/municipios/${municipio}-id${codigo}`;

        console.log("Enviando a Airtable:", { municipio, codigo, enlace });

        try {
            const response = await fetch(AIRTABLE_URL, {
                method: "POST",
                headers,
                body: JSON.stringify({
                    records: [
                        {
                            fields: {
                                "municipio": municipio,  // 📌 Asegúrate de que los nombres coincidan con Airtable
                                "codigo": codigo,        // 📌 Se envía como número entero (no texto)
                                "enlace": enlace         // 📌 URL del municipio en AEMET
                            }
                        }
                    ]
                })
            });

            const data = await response.json();
            console.log("Respuesta completa de Airtable:", data);

            if (!response.ok) {
                throw new Error(`Error en Airtable: ${JSON.stringify(data)}`);
            }

            mostrarMunicipios(); // Recargar la lista
        } catch (error) {
            console.error("Error al agregar municipio:", error);
        }
    } else {
        alert("URL no válida. Asegúrate de que tiene el formato correcto.");
    }
    document.getElementById('municipio-url').value = '';
}


// 🗑️ Eliminar un municipio
async function eliminarMunicipio(id) {
    try {
        const response = await fetch(`${AIRTABLE_URL}/${id}`, {
            method: "DELETE",
            headers
        });

        if (!response.ok) throw new Error("Error al eliminar en Airtable");

        mostrarMunicipios(); // Recargar la lista
    } catch (error) {
        console.error("Error eliminando municipio:", error);
    }
}

// 🖥️ Mostrar municipios en la interfaz
async function mostrarMunicipios() {
    const container = document.getElementById('municipios-list');
    container.innerHTML = '';

    const municipios = await obtenerMunicipios();
    
    municipios.forEach(({ id, municipio, enlace }) => {
        const div = document.createElement('div');
        div.innerHTML = `<a href="${enlace}" target="_blank">${municipio}</a> 
            <button onclick="eliminarMunicipio('${id}')">Eliminar</button>`;
        container.appendChild(div);
    });

    mostrarPredicciones(); // Recargar predicciones con la nueva lista
}

// 📡 Obtener predicciones de AEMET
async function obtenerPredicciones(codigo) {
    try {
        const apiKey = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJsdWlzQGRpZWxtby5jb20iLCJqdGkiOiJjMzcwM2RhMy01ZjZhLTRiNWItODU4OS1hYmE3YWYxYmRlZDUiLCJpc3MiOiJBRU1FVCIsImlhdCI6MTczMjcxOTIxMSwidXNlcklkIjoiYzM3MDNkYTMtNWY2YS00YjViLTg1ODktYWJhN2FmMWJkZWQ1Iiwicm9sZSI6IiJ9.VgdhLRbZQc9BzO0sisvLboljXfiHTBtNk2sHDB5Akqo';
        const baseUrl = `https://opendata.aemet.es/opendata/api/prediccion/especifica/municipio/diaria/${codigo}/?api_key=${apiKey}`;
        
        const response = await fetch(baseUrl);
        const data = await response.json();
        
        if (!data || !data.datos) throw new Error(`No se encontró la URL de datos para ${codigo}`);
        
        const weatherResponse = await fetch(data.datos);
        const weatherData = await weatherResponse.json();

        return weatherData;
    } catch (error) {
        console.error(`Error obteniendo predicciones para ${codigo}:`, error);
        return null;
    }
}

// 🌦️ Mostrar predicciones en la tabla
async function mostrarPredicciones() {
    const thead = document.getElementById('weather-header-row');
    const tbody = document.getElementById('weather-tbody');
    tbody.innerHTML = '';

    // 📡 Obtener municipios desde Airtable
    const municipios = await obtenerMunicipios();

    const predicciones = await Promise.all(municipios.map(async ({ municipio, codigo, enlace }) => {
        const data = await obtenerPredicciones(codigo);
        if (!data || !Array.isArray(data) || !data[0]?.prediccion?.dia) return null;
        return { municipio, enlace, dias: data[0].prediccion.dia };
    }));

    const diasUnicos = predicciones.filter(Boolean)[0]?.dias.map(d => {
        const fecha = new Date(d.fecha);
        return `${fecha.toLocaleDateString('es-ES', { weekday: 'short' })} ${fecha.getDate()}`;
    }) || [];

    thead.innerHTML = `<th>Municipio</th>` + diasUnicos.map(d => `<th>${d}</th>`).join('');

    predicciones.filter(Boolean).forEach(({ municipio, enlace, dias }) => {
        const row = document.createElement('tr');
        let rowContent = `<td><a href="${enlace}" target="_blank">${municipio}</a></td>`;

        dias.forEach(dia => {
            const maxTemp = dia.temperatura?.maxima ? `${dia.temperatura.maxima}°C` : 'N/A';
            const minTemp = dia.temperatura?.minima ? `${dia.temperatura.minima}°C` : 'N/A';
            const estadoCielo = dia.estadoCielo?.[0]?.descripcion || 'N/A';
            const probPrecip = dia.probPrecipitacion?.[0]?.value ? `${dia.probPrecipitacion[0].value}%` : 'N/A';
            const viento = dia.vientoAndRachaMax?.velocidad?.[0] ? `${dia.vientoAndRachaMax.velocidad[0]} km/h` : 'N/A';
            const vientoDir = dia.vientoAndRachaMax?.direccion?.[0] || 'N/A';
            const rachaMax = dia.vientoAndRachaMax?.value ? `${dia.vientoAndRachaMax.value} km/h` : 'N/A';

            rowContent += `<td class="weather-cell">
                🌥️ ${estadoCielo} <br>
                🌡️ ${minTemp} / ${maxTemp} <br>
                💦 ${probPrecip} <br>
                💨 ${vientoDir} ${viento} (racha: ${rachaMax})
            </td>`;
        });

        row.innerHTML = rowContent;
        tbody.appendChild(row);
    });
}



// Cargar municipios al iniciar la página
document.addEventListener("DOMContentLoaded", () => {
    mostrarMunicipios();  // 📡 Carga inicial desde Airtable
});
