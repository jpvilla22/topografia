const htmlTemplate: string = `
<ul id="topbar" class="nav nav-pills">
  <li class="nav-item">
    <a key="main" class="nav-link active" href="#" data-toggle="tooltip" title="Home" data-placement="top"
      >General</a>
  </li>
  <li class="nav-item">
    <a key="terrain" class="nav-link" href="#" data-toggle="tooltip" title="Fields" data-placement="top"
      >Terreno</a>
  </li>
  <li class="nav-item">
    <a key="illumination" class="nav-link" href="#" data-toggle="tooltip" title="Particles" data-placement="top"
      >Iluminación</a>
  </li>
  <li class="nav-item">
    <a key="settings" class="nav-link" href="#" data-toggle="tooltip" title="Tab 4" data-placement="top"
      >Ajustes</a>
  </li>
  

  
</ul>

<div class="card" id="tab1">  
  <div class="card-body">
    <div class="row">
      <h6 class="mt">Modo</h6>
      <div class="col" id="modesBar"></div>

      <h6 class="mt-3">Colores</h6>
      <div class="col" id="colors"></div>
      <h6 class="mt-3">Acciones</h6>
    </div>
  </div>
</div>

<div class="card" id="tab2">  
  <div class="card-body"></div>
</div>

<div class="card" id="tab3">  
  <div class="card-body"></div>
</div>

<div class="card" id="tab4">  
  <div class="card-body"></div>
</div>

<div id="footer"></div>
`;

export { htmlTemplate };
