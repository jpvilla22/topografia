import * as THREE from 'three';
import { Texture, CubeTexture, Material } from 'three';
import markerVertShader from './shaders/MarkerShader.vert';
import markerFragShader from './shaders/MarkerShader.frag';

export type TextureItem = {
  type: 'cubeMap' | 'map';
  files: string | string[];
  map: Texture | CubeTexture | null;
};

type TextureIndex = { [key: string]: TextureItem };

type MaterialIndex = { [key: string]: Material };

const materialsWithEnvMap = {
  steel: { map: 'greyRoom1' },
  stainlessSteel: { map: 'greyRoom1' },
  stainlessSteelInterior: { map: 'greyRoom1' },
  glass: { map: 'greyRoom1' },
  chrome: { map: 'greyRoom1' },
  steelStove: { map: 'greyRoom1' },
  chromeStove: { map: 'greyRoom1' },
};

export namespace MaterialLibrary {
  const textures: TextureIndex = {
    greyRoom1: {
      type: 'cubeMap',
      files: [
        'greyRoom1_front.jpg',
        'greyRoom1_back.jpg',
        'greyRoom1_top.jpg',
        'greyRoom1_bottom.jpg',
        'greyRoom1_left.jpg',
        'greyRoom1_right.jpg',
      ],
      map: null,
    },
    envMap1: {
      type: 'map',
      files: 'envMap1.jpg',
      map: null,
    },
  };

  export function createNavigationMarkerMaterial() {
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 1.0 },
        height: { value: 20.0 },
        color: { value: new THREE.Vector3(1, 1, 1) },
      },

      vertexShader: markerVertShader,
      fragmentShader: markerFragShader,
      transparent: true,
      side: THREE.DoubleSide,
    });

    return material;
  }

  export function getTexture(name: string) {
    if (textures.hasOwnProperty(name)) return textures[name].map;
  }

  export async function init() {
    return new Promise((resolve: Function, reject: Function) => {
      const manager = new THREE.LoadingManager();

      manager.onLoad = function () {};

      manager.onProgress = function (url, _itemsLoaded, _itemsTotal) {
        if (_itemsLoaded == _itemsTotal) {
          resolve();
        }
      };

      manager.onError = function (url) {
        console.error('TextureLibrary there was an error loading ' + url);
        // reject(err);
      };

      for (let [key, value] of Object.entries(textures)) {
        let ti = value as TextureItem;

        if (ti.type == 'cubeMap') {
          let cubemapLoader = new THREE.CubeTextureLoader(manager);
          cubemapLoader.setPath('maps/');

          cubemapLoader.load(
            ti.files as string[],
            (t) => {
              textures[key].map = t;
            },
            null,
            function (err) {
              console.error('CubeMapLoadeded error: ' + err);
            }
          );
        } else if ((value as TextureItem).type == 'map') {
          let loader = new THREE.TextureLoader(manager);

          loader.load(
            'maps/' + (ti.files as string[]),
            function (texture) {
              textures[key].map = texture;
              // texture.minFilter = THREE.LinearMipmapLinearFilter;
              // texture.name = file;
              // textures[file] = texture;
            },
            null,
            function (err) {
              console.error('TextureLibrary error: ' + err);
            }
          );
        }
      }
    });
  }

  export function updateSpecialMaterials(sceneNode: THREE.Object3D) {
    let materialsIndex: MaterialIndex = {};
    sceneNode.traverse((obj) => {
      if (obj.type == 'Mesh') {
        let mesh = obj as THREE.Mesh;
        addMaterialToIndex(materialsIndex, mesh.material);
      }
    });

    let matNames = Object.keys(materialsWithEnvMap);

    for (let [key, mat] of Object.entries(materialsIndex)) {
      if (matNames.indexOf(mat.name) > -1) {
        //let envMapProperties: any = materialsWithEnvMap[(mat.name as string)];
        console.log('adding envMap to material:' + mat.name);
        let m: THREE.MeshStandardMaterial = mat as THREE.MeshStandardMaterial;
        // m.color.g = 1;
        if (m.hasOwnProperty('envMap')) {
          m.envMap = textures['greyRoom1'].map;
          //m.roughness = 0.01;
          //m.metalness = 0.9
        }
      }
    }
  }

  function addMaterialToIndex(index: MaterialIndex, material: Material | Material[]) {
    if (Array.isArray(material)) {
      material.forEach((v, i) => {
        addMaterialToIndex(index, v);
      });
    } else {
      if (!index.hasOwnProperty(material.name) && material.name.length > 0) {
        index[material.name] = material;
      }
    }
  }
}
