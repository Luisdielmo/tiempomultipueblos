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
    const apiKey = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJsdWlzQGRpZWxtby5jb20iLCJqdGkiOiJjMzcwM2RhMy01ZjZhLTRiNWItODU4OS1hYmE3YWYxYmRlZDUiLCJpc3MiOiJBRU1FVCIsImlhdCI6MTczMjcxOTIxMSwidXNlcklkIjoiYzM3MDNkYTMtNWY2YS00YjViLTg1ODktYWJhN2FmMWJkZWQ1Iiwicm9sZSI6IiJ9.VgdhLRbZQc9BzO0sisvLboljXfiHTBtNk2sHDB5Akqo';
    const baseUrl = 'https://opendata.aemet.es/opendata/api/prediccion/especifica/municipio/horaria/';
    const url = `${baseUrl}${codigo}/?api_key=${apiKey}`;

    // Proxy para evitar problemas de CORS
    const proxyUrl = 'https://api.allorigins.win/get?url=';
    console.log(`Haciendo petición a: ${proxyUrl + encodeURIComponent(url)}`);

    const response = await fetch(proxyUrl + encodeURIComponent(url));
    const data = await response.json();

    console.log("Respuesta de la API (Paso 1):", data);

    // Verificamos si la respuesta contiene la URL con los datos reales
    if (!data.contents) {
      console.error("No se encontró la URL de los datos de predicción.");
      return null;
    }

    const dataUrl = JSON.parse(data.contents).datos;
    console.log(`URL de datos obtenida: ${dataUrl}`);

    // Hacemos la segunda petición para obtener los datos meteorológicos reales
    const weatherResponse = await fetch(dataUrl);
    const weatherData = await weatherResponse.json();

    console.log("Datos de predicción recibidos:", weatherData);
    return weatherData;

  } catch (error) {
    console.error('Error al obtener las predicciones:', error);
    return null;
  }
}



mostrarPredicciones();


