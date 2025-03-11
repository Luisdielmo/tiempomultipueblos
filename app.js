// 🔐 Configuración de Airtable
const AIRTABLE_API_KEY = 'patpxayIzoDLxxdbk.9d837d4a744af0b50398dae5404a7c91cab7c37b1f1c90ab7294edf8d441f31c';
const BASE_ID = 'appkO3Axi0b1J1khK';
const TABLE_ID = 'tblvx6MXJ7HtzQZbK';
const AIRTABLE_URL = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`;

const headers = {
    "Authorization": `Bearer ${AIRTABLE_API_KEY}`,
    "Content-Type": "application/json"
};
// 🗑️ Eliminar un municipio de Airtable
function eliminarMunicipio(id) {
    console.log(`🗑️ Eliminando municipio con ID: ${id}`);

    fetch(`${AIRTABLE_URL}/${id}`, {
        method: "DELETE",
        headers
    })
    .then(response => {
        if (!response.ok) throw new Error("Error al eliminar en Airtable");
        console.log("✅ Municipio eliminado correctamente.");
        mostrarPredicciones(); // 🔄 Recargar la tabla después de eliminar
    })
    .catch(error => console.error("❌ Error eliminando municipio:", error));
}



// 📤 Agregar municipio a Airtable
function agregarMunicipioDesdeURL() {
    const url = document.getElementById('municipio-url').value.trim();
    const empresa = document.getElementById('empresa-select').value;
    const regex = /\/municipios\/([a-zA-Z0-9-]+)-id(\d+)/;
    const match = url.match(regex);

    if (match) {
        const municipio = match[1];
        let codigo = match[2].trim(); // ✅ Asegurar que "codigo" es texto y eliminar espacios

        if (!codigo) { // ❌ Si el código está vacío, mostrar error y no enviar nada
            console.error("❌ Error: El código del municipio está vacío.");
            alert("Error: El código del municipio no puede estar vacío.");
            return;
        }

        const enlace = `https://www.aemet.es/es/eltiempo/prediccion/municipios/${municipio}-id${codigo}`;

        console.log("📡 Enviando a Airtable:", { municipio, codigo, enlace, empresa });

        fetch(AIRTABLE_URL, {
            method: "POST",
            headers,
            body: JSON.stringify({
                records: [
                    {
                        fields: {
                            "municipio": municipio,
                            "codigo": codigo, // ✅ Enviar como texto limpio
                            "enlace": enlace,
                            "Empresa": empresa
                        }
                    }
                ]
            })
        })
        .then(response => response.json())
        .then(data => {
            console.log("📡 Respuesta completa de Airtable:", data);
            if (data.error) throw new Error(`Error en Airtable: ${JSON.stringify(data)}`);
            mostrarPredicciones();
        })
        .catch(error => console.error("❌ Error al agregar municipio:", error));
    } else {
        alert("URL no válida. Asegúrate de que tiene el formato correcto.");
    }
    document.getElementById('municipio-url').value = '';
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
        if (!data || !data.datos) throw new Error(`No se encontraron datos para ${codigo}`);

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

// 🌦️ Mostrar predicciones con filtro por Empresa y escala de colores para lluvia
async function mostrarPredicciones() {
    const thead = document.getElementById('weather-header-row');
    const tbody = document.getElementById('weather-tbody');
    tbody.innerHTML = '';

    const empresaSeleccionada = document.getElementById('empresa-select').value;

    const response = await fetch(AIRTABLE_URL, { headers });
    const data = await response.json();

    if (!data.records) {
        console.error("No se encontraron registros en Airtable.");
        return;
    }

    const municipios = data.records.map(record => ({
        id: record.id,
        municipio: record.fields.municipio,
        codigo: record.fields.codigo,
        enlace: record.fields.enlace,
        empresa: record.fields.Empresa || "Todos"
    }));

    const municipiosFiltrados = municipios.filter(({ empresa }) => {
        return empresaSeleccionada === "Todos" || empresa === empresaSeleccionada;
    });

    const predicciones = await Promise.all(municipiosFiltrados.map(async ({ municipio, codigo, enlace, id }) => {
        const data = await obtenerPredicciones(codigo);
        if (!data || !Array.isArray(data) || !data[0]?.prediccion?.dia) {
            console.warn(`⚠️ No hay datos de predicción para ${municipio} (${codigo}). Mostrando fila vacía.`);
            return { municipio, enlace, dias: [], id };
        }
        return { municipio, enlace, dias: data[0].prediccion.dia, id };
    }));

    const diasUnicos = predicciones
        .filter(Boolean)
        .flatMap(p => p.dias)
        .map(d => {
            const fecha = new Date(d.fecha);
            return `${fecha.toLocaleDateString('es-ES', { weekday: 'short' })} ${fecha.getDate()}`;
        })
        .filter((v, i, a) => a.indexOf(v) === i);

    thead.innerHTML = `<th>Municipio</th>` + diasUnicos.map(d => `<th>${d}</th>`).join('') + `<th>Eliminar</th>`;

    predicciones.forEach(({ municipio, enlace, dias, id }) => {
        const row = document.createElement('tr');
        let rowContent = `<td><a href="${enlace}" target="_blank">${municipio}</a></td>`;

        diasUnicos.forEach(diaRef => {
            const dia = dias.find(d => {
                const fecha = new Date(d.fecha);
                return `${fecha.toLocaleDateString('es-ES', { weekday: 'short' })} ${fecha.getDate()}` === diaRef;
            });

            if (!dia) {
                rowContent += `<td class="weather-cell">-</td>`;
                return;
            }

            const maxTemp = dia.temperatura?.maxima ? `${dia.temperatura.maxima}°C` : '';
            const minTemp = dia.temperatura?.minima ? `${dia.temperatura.minima}°C` : '';
            const estadoCielo = dia.estadoCielo?.[0]?.descripcion || '';
            const probPrecip = dia.probPrecipitacion?.[0]?.value ? parseInt(dia.probPrecipitacion[0].value) : 0;
            const viento = dia.vientoAndRachaMax?.velocidad?.[0] ? `${dia.vientoAndRachaMax.velocidad[0]} km/h` : '';

            // 🎨 Escala de colores para la probabilidad de lluvia
            let bgColor = '#FFFFFF'; // Blanco por defecto
            if (probPrecip <= 20) bgColor = '#A8E6A3';  // Verde claro
            else if (probPrecip <= 40) bgColor = '#F7E09C';  // Amarillo claro
            else if (probPrecip <= 60) bgColor = '#F4B183';  // Naranja suave
            else if (probPrecip <= 80) bgColor = '#E57373';  // Rojo anaranjado
            else bgColor = '#D9534F';  // Rojo intenso

            rowContent += `<td class="weather-cell" style="background-color: ${bgColor};">
                ${estadoCielo ? `🌥️ ${estadoCielo}<br>` : ''}
                ${maxTemp || minTemp ? `🌡️ ${minTemp} / ${maxTemp}<br>` : ''}
                ${probPrecip ? `💦 ${probPrecip}%<br>` : ''}
                ${viento ? `💨 ${viento}` : ''}
            </td>`;
        });

        rowContent += `<td><button class="delete-btn" onclick="eliminarMunicipio('${id}')">❌</button></td>`;

        row.innerHTML = rowContent;
        tbody.appendChild(row);
    });
}


document.getElementById('empresa-select').addEventListener('change', mostrarPredicciones);
document.addEventListener("DOMContentLoaded", mostrarPredicciones);
