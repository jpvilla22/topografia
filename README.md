# Campo virtual de Topografía

## Experiencia RV

Usamos la librería `webpack` tanto para desarrollo interno como para correr el servidor que procesa y genera los archivos con los resultados finales

De todas formas que es posible correr la aplicación con archivos HTML y JS estáticos, sin necesidad de un servidor. El único costo es que no se van a poder generar los archivos finales para los estudiantes, pero el resto corre perfectamente normal.

Para correr webpack (con el servidor), ejecutar lo siguiente:

```
npm install
npm run dev
```

La aplicación se puede correr [https://localhost:8080]() (nótese el protocolo HTTPS). También se puede acceder desde una IP de red local (192.168.X.X). La dirección se imprime en pantalla al correr `npm run dev`

Para solamente generar los archivos estáticos se puede ejecutar lo siguiente:

```
npm run build
```

Los resultados se encuentran dentro del directorio `dist`.

## Info para devs

### Cómo crear un testbench

Webpack está configurado (por nosotros) para agregar cualquier testbench que se cree. Para agregar uno nuevo:

1. Crear una nueva carpeta dentro de `testbenches` con el nombre del template (e.g. newtestbench)
2. Crear un archivo nuevo dentro de dicha carpeta con el nombre `main.ts`
3. Crear un HTML dentro de `public` (en la raíz del proyecto) con el nombre del testbench (e.g. newtestbench.html).
4. Asegurarse de que el HTML importe el script del JS bundleado (e.g. newtestbench.bundle.js)
5. Correr (o volver a correr) `npm run dev` e ir a [http://localhost:8080/newtestbench.html]()
