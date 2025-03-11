// 🔐 Configuración de Airtable
const AIRTABLE_API_KEY = 'patpxayIzoDLxxdbk.9d837d4a744af0b50398dae5404a7c91cab7c37b1f1c90ab7294edf8d441f31c';
const BASE_ID = 'appkO3Axi0b1J1khK';
const TABLE_ID = 'tblvx6MXJ7HtzQZbK';
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

        if (!data.records) {
            throw new Error("No se encontraron registros en Airtable.");
        }

        return data.records.map(record => ({
            id: record.id,
            municipio: record.fields.municipio,
            codigo: record.fields.codigo,
            enlace: record.fields.enlace
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
        const codigo = parseInt(match[2], 10);
        const enlace = `https://www.aemet.es/es/eltiempo/prediccion/municipios/${municipio}-id${codigo}`;

        console.log("📡 Enviando a Airtable:", { municipio, codigo, enlace });

        try {
            const response = await fetch(AIRTABLE_URL, {
                method: "POST",
                headers,
                body: JSON.stringify({
                    records: [
                        {
                            fields: {
                                "municipio": municipio,
                                "codigo": codigo,
                                "enlace": enlace
                            }
                        }
                    ]
                })
            });

            const data = await response.json();
            console.log("📡 Respuesta completa de Airtable:", data);

            if (!response.ok) {
                throw new Error(`Error en Airtable: ${JSON.stringify(data)}`);
            }

            mostrarPredicciones();
        } catch (error) {
            console.error("❌ Error al agregar municipio:", error);
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

        mostrarPredicciones();
    } catch (error) {
        console.error("Error eliminando municipio:", error);
    }
}

// 📡 Obtener predicciones de AEMET
async function obtenerPredicciones(codigo) {
    try {
        const apiKey = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJsdWlzQGRpZWxtby5jb20iLCJqdGkiOiJjMzcwM2RhMy01ZjZhLTRiNWItODU4OS1hYmE3YWYxYmRlZDUiLCJpc3MiOiJBRU1FVCIsImlhdCI6MTczMjcxOTIxMSwidXNlcklkIjoiYzM3MDNkYTMtNWY2YS00YjViLTg1ODktYWJhN2FmMWJkZWQ1Iiwicm9sZSI6IiJ9.VgdhLRbZQc9BzO0sisvLboljXfiHTBtNk2sHDB5Akqo';
        const baseUrl = `https://opendata.aemet.es/opendata/api/prediccion/especifica/municipio/diaria/${codigo}/?api_key=${apiKey}`;

        console.log(`📡 Solicitando predicciones para código: ${codigo}`);

        const response = await fetch(baseUrl);
        if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);

        const data = await response.json();
        if (!data || !data.datos) return null;

        const weatherResponse = await fetch(data.datos);
        if (!weatherResponse.ok) throw new Error(`Error HTTP en datos: ${weatherResponse.status}`);

        const weatherData = await weatherResponse.json();

        if (!Array.isArray(weatherData)) return null;

        return weatherData;
    } catch (error) {
        console.warn(`⚠️ Error obteniendo predicciones para ${codigo}:`, error);
        return null;
    }
}

// 🌦️ Mostrar predicciones en la tabla
async function mostrarPredicciones() {
    const thead = document.getElementById('weather-header-row');
    const tbody = document.getElementById('weather-tbody');
    tbody.innerHTML = '';

    const municipios = await obtenerMunicipios();

    const predicciones = await Promise.all(municipios.map(async ({ municipio, codigo, enlace, id }) => {
        const data = await obtenerPredicciones(codigo);
        if (!data || !Array.isArray(data) || !data[0]?.prediccion?.dia) return { municipio, enlace, dias: [], id };
        return { municipio, enlace, dias: data[0].prediccion.dia, id };
    }));

    const diasUnicos = predicciones.filter(Boolean)[0]?.dias.map(d => {
        const fecha = new Date(d.fecha);
        return `${fecha.toLocaleDateString('es-ES', { weekday: 'short' })} ${fecha.getDate()}`;
    }) || [];

    thead.innerHTML = `<th>Municipio</th>` + diasUnicos.map(d => `<th>${d}</th>`).join('') + `<th>Eliminar</th>`;

    predicciones.forEach(({ municipio, enlace, dias, id }) => {
        const row = document.createElement('tr');
        let rowContent = `<td><a href="${enlace}" target="_blank">${municipio}</a></td>`;

        dias.forEach(dia => {
            const maxTemp = dia.temperatura?.maxima ? `${dia.temperatura.maxima}°C` : '';
            const minTemp = dia.temperatura?.minima ? `${dia.temperatura.minima}°C` : '';
            const estadoCielo = dia.estadoCielo?.[0]?.descripcion || '';
            const probPrecip = dia.probPrecipitacion?.[0]?.value ? parseInt(dia.probPrecipitacion[0].value) : null;
            const viento = dia.vientoAndRachaMax?.velocidad?.[0] ? `${dia.vientoAndRachaMax.velocidad[0]} km/h` : '';
            const vientoDir = dia.vientoAndRachaMax?.direccion?.[0] || '';
            const rachaMax = dia.vientoAndRachaMax?.value ? `${dia.vientoAndRachaMax.value} km/h` : '';

            let bgColor = '';
            if (probPrecip !== null) {
                if (probPrecip <= 20) bgColor = 'green';
                else if (probPrecip <= 60) bgColor = 'yellow';
                else bgColor = 'red';
            }

            rowContent += `<td class="weather-cell" style="background-color: ${bgColor};">
                ${estadoCielo ? `🌥️ ${estadoCielo}<br>` : ''}
                ${maxTemp || minTemp ? `🌡️ ${minTemp} / ${maxTemp}<br>` : ''}
                ${probPrecip !== null ? `💦 ${probPrecip}%<br>` : ''}
                ${viento || vientoDir ? `💨 ${vientoDir} ${viento}` : ''} ${rachaMax ? `(racha: ${rachaMax})` : ''}
            </td>`;
        });

        rowContent += `<td><button onclick="eliminarMunicipio('${id}')">❌</button></td>`;

        row.innerHTML = rowContent;
        tbody.appendChild(row);
    });
}

document.addEventListener("DOMContentLoaded", () => {
    mostrarPredicciones();
});
