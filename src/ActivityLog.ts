import * as THREE from 'three';

export class ActivityLog {
  private sessionId: string;
  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  sendDataToServer(data: any) {
    // Objeto JSON que deseas enviar
    /*
    const data = {
      flags: [{ position: [10.2, 3.0, 4.5], color: [1, 0, 0] }],
      terrainLines: [
        {
          color: [0, 1, 0],
          points: [
            [0.3, 0.6, 1.9],
            [3.5, 7.6, 11.9],
            [100, 50, 25],
            [110, 230, 88],
          ],
        },
      ],
    };
    */

    data.sessionId = this.sessionId;

    // URL del servidor
    const url = '/api/activity_log/';

    // Opciones de la solicitud
    const options = {
      method: 'POST', // Método HTTP (en este caso, POST)
      headers: {
        'Content-Type': 'application/json', // Tipo de contenido del cuerpo (JSON)
      },
      body: JSON.stringify(data), // Convertir el objeto JSON a una cadena
    };

    // Realizar la solicitud al servidor
    fetch(url, options)
      .then((response) => response.json()) // Analizar la respuesta como JSON
      .then((result) => {
        // Manejar la respuesta del servidor
        console.log(result);
      })
      .catch((error) => {
        // Manejar errores
        console.error('Error:', error);
      });
  }
}
