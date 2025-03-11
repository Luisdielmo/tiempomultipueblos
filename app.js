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
            enlace: record.fields.enlace,
            empresa: record.fields.Empresa || "Todos"
        }));
    } catch (error) {
        console.error("Error obteniendo municipios desde Airtable:", error);
        return [];
    }
}

// 📤 Agregar municipio a Airtable
async function agregarMunicipioDesdeURL() {
    const url = document.getElementById('municipio-url').value.trim();
    const empresa = document.getElementById('empresa-select').value; // ✅ Obtener empresa seleccionada
    const regex = /\/municipios\/([a-zA-Z0-9-]+)-id(\d+)/;
    const match = url.match(regex);

    if (match) {
        const municipio = match[1];
        const codigo = match[2];  // ✅ Mantener "codigo" como texto
        const enlace = `https://www.aemet.es/es/eltiempo/prediccion/municipios/${municipio}-id${codigo}`;

        console.log("📡 Enviando a Airtable:", { municipio, codigo, enlace, empresa });

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
                                "enlace": enlace,
                                "Empresa": empresa      // ✅ Guardar empresa en Airtable
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

            mostrarPredicciones(); // 🔄 Recargar la tabla con el nuevo registro
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

// 🌦️ Mostrar predicciones con filtro por Empresa
async function mostrarPredicciones() {
    const thead = document.getElementById('weather-header-row');
    const tbody = document.getElementById('weather-tbody');
    tbody.innerHTML = '';

    const empresaSeleccionada = document.getElementById('empresa-select').value; // ✅ Obtener empresa seleccionada

    const municipios = await obtenerMunicipios();

    // 🔍 Filtrar registros según la empresa seleccionada
    const municipiosFiltrados = municipios.filter(({ empresa }) => {
        return empresaSeleccionada === "Todos" || empresa === empresaSeleccionada;
    });

    municipiosFiltrados.forEach(({ municipio, enlace, id }) => {
        const row = document.createElement('tr');
        let rowContent = `<td><a href="${enlace}" target="_blank">${municipio}</a></td>`;
        rowContent += `<td><button onclick="eliminarMunicipio('${id}')">❌</button></td>`;
        row.innerHTML = rowContent;
        tbody.appendChild(row);
    });
}

// 🔄 Aplicar filtro cuando se cambie la selección en el combo
document.getElementById('empresa-select').addEventListener('change', mostrarPredicciones);

// 🔄 Cargar predicciones al iniciar
document.addEventListener("DOMContentLoaded", () => {
    mostrarPredicciones();
});
