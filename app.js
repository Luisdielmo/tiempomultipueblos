// Almacenamos los municipios seleccionados en localStorage
let municipiosGuardados = JSON.parse(localStorage.getItem("municipios")) || [];

// Función para agregar un municipio desde una URL de AEMET
function agregarMunicipioDesdeURL() {
  const url = document.getElementById('municipio-url').value.trim();
  
  // Validamos que la URL contenga el formato esperado
  const regex = /\/municipios\/([a-zA-Z0-9-]+)-id(\d+)/; // Regex para extraer el ID y nombre del municipio
  const match = url.match(regex);

  if (match) {
    const municipio = match[1]; // Nombre del municipio (e.g. "salamanca")
    const idMunicipio = match[2]; // ID del municipio (e.g. "37274")

    // Verificar si el municipio ya está en la lista
    if (!municipiosGuardados.some(m => m.codigo === idMunicipio)) {
      // Si no está en la lista, lo agregamos
      municipiosGuardados.push({ municipio, codigo: idMunicipio });
      localStorage.setItem("municipios", JSON.stringify(municipiosGuardados));
      mostrarMunicipios();  // Actualizamos la vista de municipios
      document.getElementById('municipio-url').value = ''; // Limpiar el campo de entrada
    } else {
      alert("Este municipio ya está en la lista.");
    }
  } else {
    alert("La URL no es válida. Asegúrate de que la URL tiene el formato correcto.");
  }
}

// Mostrar los municipios seleccionados en la interfaz
function mostrarMunicipios() {
  const container = document.getElementById('municipios-list');
  container.innerHTML = ''; // Limpiar la lista

  municipiosGuardados.forEach(({ municipio, codigo }) => {
    const div = document.createElement('div');
    div.innerHTML = `
      <span>${municipio}</span>
      <button onclick="eliminarMunicipio('${codigo}')">Eliminar</button>
    `;
    container.appendChild(div);
  });
}

// Eliminar un municipio de la lista
function eliminarMunicipio(codigo) {
  municipiosGuardados = municipiosGuardados.filter(m => m.codigo !== codigo);
  localStorage.setItem("municipios", JSON.stringify(municipiosGuardados));
  mostrarMunicipios(); // Actualizar la vista de municipios
}

// Mostrar los municipios al cargar la página
mostrarMunicipios();

// Función para obtener las predicciones de un municipio
async function obtenerPredicciones(codigo) {
  try {
    // API de AEMET para obtener las predicciones meteorológicas
    const apiKey = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJsdWlzQGRpZWxtby5jb20iLCJqdGkiOiJjMzcwM2RhMy01ZjZhLTRiNWItODU4OS1hYmE3YWYxYmRlZDUiLCJpc3MiOiJBRU1FVCIsImlhdCI6MTczMjcxOTIxMSwidXNlcklkIjoiYzM3MDNkYTMtNWY2YS00YjViLTg1ODktYWJhN2FmMWJkZWQ1Iiwicm9sZSI6IiJ9.VgdhLRbZQc9BzO0sisvLboljXfiHTBtNk2sHDB5Akqo';
    const baseUrl = 'https://opendata.aemet.es/opendata/api/prediccion/especifica/municipio/horaria/';
    const url = `${baseUrl}${codigo}/?api_key=${apiKey}`;

    // Usamos un proxy para evitar problemas de CORS
    const proxyUrl = 'https://api.allorigins.win/get?url=';  // Proxy para evitar problemas de CORS
    const response = await fetch(proxyUrl + encodeURIComponent(url));
    const data = await response.json();

    // Verificar si la respuesta contiene la URL de los datos
    if (!data.contents) {
      throw new Error('No se encontró la URL de los datos de predicción');
    }

    // Obtener los datos meteorológicos desde la URL proporcionada
    const dataUrl = JSON.parse(data.contents).datos;
    const weatherResponse = await fetch(dataUrl);
    const weatherData = await weatherResponse.json();

    return weatherData; // Datos reales de la predicción
  } catch (error) {
    console.error('Error al obtener las predicciones:', error);
    return null; // Si hay error, devuelve null
  }
}

// Función para mostrar las predicciones de cada municipio en la tabla
async function mostrarPredicciones() {
  const tbody = document.getElementById('weather-tbody');
  tbody.innerHTML = ''; // Limpiar la tabla antes de agregar nuevos datos

  for (let { municipio, codigo } of municipiosGuardados) {
    const data = await obtenerPredicciones(codigo); // Obtener las predicciones
    if (!data) continue;

    const predicciones = data.prediccion.dia[0].temperatura;  // Predicciones para el municipio

    // Crear la fila de la tabla para este municipio
    const row = document.createElement('tr');

    // Columna para el nombre del municipio
    const municipioCell = document.createElement('td');
    municipioCell.innerText = municipio;
    row.appendChild(municipioCell);

    // Agregar las predicciones de las 24 horas
    predicciones.forEach(prediccion => {
      const cell = document.createElement('td');
      cell.innerHTML = `
        <strong>${prediccion.periodo}:00</strong><br>
        Temp: ${prediccion.value}°C<br>
        Cielo: Despejado<br>
        Precip: 0 mm
      `;
      row.appendChild(cell);
    });

    // Agregar la fila a la tabla
    tbody.appendChild(row);
  }
}

mostrarPredicciones();


