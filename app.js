'use strict';

import * as THREE from 'https://cdn.skypack.dev/three@0.128.0';
import {
  GUI
} from 'https://cdn.skypack.dev/dat.gui'; // dat.GUI라는 UI 라이브러리를 가져온 것.

function main() {
  const canvas = document.querySelector('#canvas');
  const renderer = new THREE.WebGLRenderer({
    canvas
  });
  const gui = new GUI(); // dat.GUI 라이브러리에서 가져온 GUI 클래스의 새로운 인스턴스를 만들어서 할당해놓음.
  // camera
  const fov = 40;
  const aspect = 2;
  const near = 0.1;
  const far = 1000;
  const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  camera.position.set(0, 50, 0);

  // up(0, 0, 1)은 양의 z축이 위쪽에 해당함을 카메라에게 알려주는 거라고 함.  
  // 왜? 카메라를 y축으로 이동시킨 뒤 원점을 바라보게 회전시켰으므로, 우리가 화면 상에서 보는 렌더링은 양의 z축이 카메라 위쪽에 놓이기 때문.
  // 이런 식으로, lookAt()으로 카메라의 시선을 회전시키기 전에는 up()을 이용해서 어떤 방향이 카메라의 위쪽인지 알려줘야 함.
  camera.up.set(0, 0, 1);
  camera.lookAt(0, 0, 0); // lookAt 메소드는 카메라가 y축으로 50만큼 올라갔으니, 카메라의 시선이 원점(0, 0, 0)을 바라보도록 카메라를 회전시켜 줌.

  const scene = new THREE.Scene(); // 이번에는 scene의 배경색을 지정하지 않고 기본색(0x000000)으로 하고 있음.

  // light
  {
    const color = 0xFFFFFF;
    const intensity = 3;
    const light = new THREE.PointLight(color, intensity); // 조명에 대해서는 나중에 자세히 다룸. 한 점에 발산하는 광원 정도로 알아둘 것.
    scene.add(light);
  }

  const objects = []; // 매 프레임마다 회전값을 새로 계산하여 업데이트할 객체들을 담아둘 거임.

  // 동일한 로우폴리 구체 지오메트리를 사용하여 태양, 지구, 달 mesh들을 생성할거임.
  // 구체는 segments를 각 방향으로 6분할만 해서 약간 각진 모양으로 해줘야 자전할 때 돌아가는 모습이 더 잘보임.
  const radius = 1;
  const widthSegments = 6;
  const heightSegments = 6;
  const sphereGeometry = new THREE.SphereGeometry(radius, widthSegments, heightSegments);

  // 비어있는 씬 그래프 요소인 Object3D를 추가함.
  // 얘를 태양, 지구를 모두 포함하는 부모 노드로 만들어두고,
  // 태양, 지구, 이 부모노드를 모두 회전시키면, 태양은 자전을 하고, 지구도 자전을 하고,
  // 동시에 지구는 원점에서 떨어져 있으니 solarSystem이 회전함으로 인해서 마치 원점을 중심으로 공전하는 것처럼 보이게 될 거임.
  // 우리가 원하는 그림이 바로 이런거지
  const solarSystem = new THREE.Object3D();
  scene.add(solarSystem);
  objects.push(solarSystem);

  // create sun mesh
  // 원래 퐁-머티리얼을 생성할 때는 컬러값을 넣어주는데, emissive(방사성) 속성을 노란색으로 지정해 줌.
  // 얘는 뭐냐면, 빛을 반사하지 않는 퐁-머티리얼의 표면 색상을 뜻하며, 조명이 PointLight(광원)일 때,
  // 광원에 emssive 지정 색상을 더해서 렌더해 줌.
  // 빛을 '반사'하는 물체가 아닌, 빛을 '발광'하는 광원체에 대하여 PointLight와 함께 지정해주는 속성값인 듯... 
  const sunMaterial = new THREE.MeshPhongMaterial({
    emissive: 0xFFFF00
  });
  const sunMesh = new THREE.Mesh(sphereGeometry, sunMaterial);
  sunMesh.scale.set(5, 5, 5) // 태양 mesh의 크기를 5배로 키워 줌. pixi에서 sprite 크기를 조정하는 것과 문법이 동일하지? pixi와 유사한 문법이 꽤 많음.
  // scene.add(sunMesh);
  solarSystem.add(sunMesh);
  objects.push(sunMesh);

  const earthOrbit = new THREE.Object3D();
  earthOrbit.position.x = 10;
  solarSystem.add(earthOrbit);
  objects.push(earthOrbit);

  // create earth mesh
  // 지구 메쉬에 해당하는 퐁-머티리얼만 따로 만들어주되, 기본 파란색에 약간의 팡사성 파랑을 섞어 줌.
  const earthMaterial = new THREE.MeshPhongMaterial({
    color: 0x2233FF,
    emissive: 0x112244
  });
  const earthMesh = new THREE.Mesh(sphereGeometry, earthMaterial);
  // earthMesh.position.x = 10; 이제 earthMesh의 부모 노드인 earthOrbit이 대신 position.x = 10으로 거리를 두어주니 필요없겠지?
  // scene.add(earthMesh); 이렇게만 하면 지구가 자전만 할 뿐 태양 주위를 공전하지는 않음.
  // 지구를 바로 씬에 추가하는 게 아니라, 태양의 자식으로 추가한다면?

  // sunMesh.add(earthMesh);
  // 그런데 이렇게만 해줘도 문제가 생기는 게, 지구의 크기도 5배로 나오고, position.x로 설정한 거리값도 5배로 나와서
  // 카메라에 안담기는 상황이 벌어짐. 그래서 카메라 위치까지 더 앞으로 당겨놓은(50 -> 150) 상태임.
  // 왜 이렇게 될까? sunMesh.scale.set(5, 5, 5) 이거 떄문임.
  // 저거는 결국 sunMesh 노드의 지역공간 자체를 5배로 키워버리겠다는 의미.
  // 그래서 씬 그래프 상에서 자식 노드인 지구의 크기도 5배, 지구와의 거리도 5배 적용된 것.
  // 이걸 해결하기 위해서 위에 solarSystem 라는 씬 그래프 상의 새로운 부모 노드를 하나 더 만들어준 것임.
  // solarSystem.add(earthMesh); 얘는 이제 earthOrbit의 자식노드가 되어있는 상태니까 필요없지
  earthOrbit.add(earthMesh);
  objects.push(earthMesh);

  // create moon orbit and moon mesh
  const moonOrbit = new THREE.Object3D();
  moonOrbit.position.x = 2;
  earthOrbit.add(moonOrbit);

  const moonMaterial = new THREE.MeshPhongMaterial({
    color: 0x888888,
    emissive: 0x222222
  });
  const moonMesh = new THREE.Mesh(sphereGeometry, moonMaterial);
  moonMesh.scale.set(0.5, 0.5, 0.5); // moonMesh의 크기는 원래 크기의 0.5배로 지정해준 것.
  moonOrbit.add(moonMesh);
  objects.push(moonMesh);

  // objects에 담긴 씬 그래프 상의 각 노드들(mesh들, orbit들)의 지역 x, y, z축을 표시해보면 어떤 구조로 회전하는지 한눈에 보이므로
  // 이를 도와주는 AxesHelper라는 헬퍼 클래스를 이용해서 각 노드들의 축을 그려본 것.
  // objects.forEach((node) => {
  // const axes = new THREE.AxesHelper();
  // axes.material.depthTest = false; // x, y, z축이 구체 내부에 있더라도 보이게 하려면 false로 지정해줘야 함. 어느 방향에서 보더라도 전체 축을 볼 수 있게 함.
  // axes.renderOrder = 1; // renderOrder는 축의 렌더링 순서를 0 ~ 1로 놓고 봤을 때 1로, 즉 가장 마지막에 렌더하라고 한 것. 
  // node.add(axes); // 축을 각 objects에 담긴 요소에 추가해준 것.
  // });

  // 위에서 만든 AxisHelper와 GridHelper를 이용해서 각 노드에 대한 축과 그리드를 동시에 그려보는 클래스를 만듦.
  class AxisGridHelper {
    constructor(node, units = 10) {
      const axes = new THREE.AxesHelper();
      axes.material.depthTest = false;
      axes.renderOrder = 2; // 격자 렌더링한 뒤에 렌더링
      node.add(axes);

      // GridHelper는 x, z축으로 2d격자를 생성하고, 기본값이 10*10칸이므로 10, 10을 전달해준 것.
      const grid = new THREE.GridHelper(units, units);
      grid.material.depthTest = false;
      grid.renderOrder = 1;
      node.add(grid);

      this.grid = grid;
      this.axes = axes;
      this.visible = false;
    }

    get visible() {
      return this._visible;
    }

    set visible(v) {
      this._visible = v;
      this.grid.visible = v;
      this.axes.visible = v;
    }
  }

  // 또, dat.GUI라는 three.js와 함께 자주 사용되는 UI 라이브러리를 이용해서
  // 객체와 해당 객체의 이름을 넘겨받아 해당 속성의 타입을 기반으로 속성값을 ui로 조절할 수 있게 해줌.
  function makeAxisGrid(node, label, units) {
    const helper = new AxisGridHelper(node, units);
    gui.add(helper, 'visible').name(label);
  }

  makeAxisGrid(solarSystem, 'solarSystem', 25);
  makeAxisGrid(sunMesh, 'sunMesh');
  makeAxisGrid(earthOrbit, 'earthOrbit');
  makeAxisGrid(earthMesh, 'earthMesh');
  makeAxisGrid(moonOrbit, 'moonOrbit');
  makeAxisGrid(moonMesh, 'moonMesh');

  function resizeRendererToDisplaySize(renderer) {
    const canvas = renderer.domElement;
    const pixelRatio = window.devicePixelRatio;
    const width = canvas.clientWidth * pixelRatio | 0;
    const height = canvas.clientHeight * pixelRatio | 0;
    const needResize = canvas.width !== width || canvas.height !== height;

    if (needResize) {
      renderer.setSize(width, height, false);
    }

    return needResize;
  }

  function animate(t) {
    t *= 0.001;

    if (resizeRendererToDisplaySize(renderer)) {
      const canvas = renderer.domElement;
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix(); // 얘는 perspectiveCamera의 어떤 속성이든 그 속성값을 바꾸고 나서 효과를 적용시키려면 마지막에 항상 호출해줘야 함.
    }

    objects.forEach((obj) => {
      obj.rotation.y = t; // 위에서 자전하는 것만 볼 수 있으면 되니까 y축 방향으로만 회전시켜주면 됨.
    });

    renderer.render(scene, camera);

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}

main();