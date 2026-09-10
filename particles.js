/* ═══════════════════════════════════════════════════════════
   BOREALTRACK — High-Fidelity 3D Globe & Satellite Zoom
   - Fixed Coordinate Math, CORS Texture, & Particle Layout -
   ═══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  let canvas, renderer, scene, camera;
  let earthGroup, cloudMesh, satPivot, satGroup, tromsoPatch, tromsoMarker;
  let particleSystem, particleData, particleGeo;

  let scrollProgress = 0;
  let targetProgress = 0;

  // Camera positioned to view the Earth at the top, and particles clearly below it
  let currentCamPos = new THREE.Vector3(0, 4, 48);
  let currentLookAt = new THREE.Vector3(0, 4, 0);

  // Exact Tromsø Coordinates
  const LATITUDE = 69.65;
  const LONGITUDE = 18.95;
  const EARTH_RADIUS = 12;

  /* ─── CANVAS-BASED REINDEER GENERATOR ─── */
  function createReindeerPoints() {
    const c = document.createElement('canvas');
    c.width = 400;
    c.height = 400;
    const cx = c.getContext('2d', { willReadFrequently: true });
    cx.fillStyle = 'black';
    cx.fillRect(0, 0, 400, 400);

    // Using a system font emoji ensures a perfect, dense silhouette mask
    cx.font = '280px sans-serif';
    cx.fillStyle = 'white';
    cx.textAlign = 'center';
    cx.textBaseline = 'middle';
    cx.fillText('🦌', 200, 220);

    const data = cx.getImageData(0, 0, 400, 400).data;
    const pts = [];

    for (let y = 0; y < 400; y += 4) {
      for (let x = 0; x < 400; x += 4) {
        const r = data[(y * 400 + x) * 4];
        if (r > 50) {
          pts.push([(x / 400), (y / 400)]);
        }
      }
    }
    return pts.sort(() => Math.random() - 0.5);
  }

  /* ─── CANVAS-BASED TEXT GENERATOR ─── */
  function createTextPoints(text) {
    const c = document.createElement('canvas');
    const cx = c.getContext('2d', { willReadFrequently: true });
    c.width = 1000;
    c.height = 200;
    cx.fillStyle = 'black';
    cx.fillRect(0, 0, 1000, 200);
    cx.font = 'bold 120px "Space Grotesk", sans-serif';
    cx.fillStyle = 'white';
    cx.textAlign = 'center';
    cx.textBaseline = 'middle';
    cx.fillText(text, 500, 100);

    const data = cx.getImageData(0, 0, 1000, 200).data;
    const pts = [];
    for (let y = 0; y < 200; y += 5) {
      for (let x = 0; x < 1000; x += 5) {
        if (data[(y * 1000 + x) * 4] > 128) {
          pts.push([(x / 1000), (y / 200)]);
        }
      }
    }
    return pts.sort(() => Math.random() - 0.5);
  }

  function init() {
    canvas = document.getElementById('particleCanvas');
    if (!canvas) return;

    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.copy(currentCamPos);

    /* ─── LIGHTING ─── */
    scene.add(new THREE.AmbientLight(0xffffff, 0.05));
    const sunLight = new THREE.DirectionalLight(0xffffff, 2.0);
    sunLight.position.set(50, 20, 30);
    scene.add(sunLight);
    const backLight = new THREE.DirectionalLight(0x38BDF8, 0.4);
    backLight.position.set(-50, -20, -30);
    scene.add(backLight);

    /* ─── ULTRA HIGH-FIDELITY EARTH ─── */
    earthGroup = new THREE.Group();
    // Move Earth to the TOP of the screen (Y = 16)
    earthGroup.position.set(0, 16, 0);
    scene.add(earthGroup);

    const textureLoader = new THREE.TextureLoader();
    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
    function loadHQTex(url) {
      const tex = textureLoader.load(url);
      tex.anisotropy = maxAnisotropy;
      return tex;
    }

    const earthGeo = new THREE.SphereGeometry(EARTH_RADIUS, 64, 64);
    const earthMat = new THREE.MeshStandardMaterial({
      map: loadHQTex('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg'),
      bumpMap: loadHQTex('https://unpkg.com/three-globe/example/img/earth-topology.png'),
      bumpScale: 0.1,
      roughnessMap: loadHQTex('https://unpkg.com/three-globe/example/img/earth-water.png'),
      metalness: 0.1,
      roughness: 0.7
    });
    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    earthGroup.add(earthMesh);

    const cloudMat = new THREE.MeshLambertMaterial({
      map: loadHQTex('https://unpkg.com/three-globe/example/img/earth-clouds10k.png'),
      transparent: true, opacity: 0.6, blending: THREE.NormalBlending, depthWrite: false
    });
    cloudMesh = new THREE.Mesh(new THREE.SphereGeometry(EARTH_RADIUS * 1.015, 64, 64), cloudMat);
    earthGroup.add(cloudMesh);

    const atmoMat = new THREE.MeshPhongMaterial({
      color: 0x38BDF8, transparent: true, opacity: 0.15, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false
    });
    earthGroup.add(new THREE.Mesh(new THREE.SphereGeometry(EARTH_RADIUS * 1.05, 64, 64), atmoMat));

    /* ─── EXACT TROMSØ COORDINATE MAPPING ─── */
    // Standard spherical coordinates matching the Blue Marble texture
    const phi = (90 - LATITUDE) * (Math.PI / 180);
    const theta = (LONGITUDE + 90) * (Math.PI / 180);
    const tX = -(EARTH_RADIUS * Math.sin(phi) * Math.cos(theta));
    const tZ = (EARTH_RADIUS * Math.sin(phi) * Math.sin(theta));
    const tY = (EARTH_RADIUS * Math.cos(phi));

    tromsoMarker = new THREE.Object3D();
    tromsoMarker.position.set(tX, tY, tZ);
    earthGroup.add(tromsoMarker);

    /* ─── REAL SATELLITE PATCH (CORS-Safe) ─── */
    const patchGeo = new THREE.PlaneGeometry(3.5, 3.5);
    const patchMat = new THREE.MeshBasicMaterial({
      // Swapped back to a highly reliable, CORS-safe snowy terrain map
      map: loadHQTex('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/terrain/backgrounddetailed6.jpg'),
      transparent: true,
      opacity: 0,
      depthTest: false
    });

    tromsoPatch = new THREE.Mesh(patchGeo, patchMat);
    tromsoPatch.position.set(tX, tY, tZ).normalize().multiplyScalar(EARTH_RADIUS + 0.05);
    tromsoPatch.lookAt(tromsoPatch.position.clone().multiplyScalar(2));
    earthGroup.add(tromsoPatch);

    /* ─── 3D SATELLITE ─── */
    satPivot = new THREE.Group();
    earthGroup.add(satPivot);
    satGroup = new THREE.Group();

    satGroup.add(new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.5, 0.8),
      new THREE.MeshPhysicalMaterial({ color: 0xffaa00, metalness: 0.8, roughness: 0.4 })
    ));

    const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.05, 0.2, 16), new THREE.MeshStandardMaterial({ color: 0xeeeeee, metalness: 1.0, roughness: 0.2 }));
    dish.position.set(0, 0, 0.5); dish.rotation.x = Math.PI / 2;
    satGroup.add(dish);

    const panelMat = new THREE.MeshPhysicalMaterial({ color: 0x012a4a, metalness: 0.9, roughness: 0.1 });
    const p1 = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.03, 0.8), panelMat); p1.position.x = 1.5; satGroup.add(p1);
    const p2 = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.03, 0.8), panelMat); p2.position.x = -1.5; satGroup.add(p2);

    satGroup.position.set(16, 0, 0);
    satPivot.add(satGroup);

    /* ─── CONSTELLATION PARTICLES ─── */
    createConstellation();
    addBackgroundStars();

    // Force Earth group to rotate slightly on startup so Norway is facing the camera perfectly
    earthGroup.rotation.y = -0.5;

    resize();
    window.addEventListener('resize', resize);
  }

  function createConstellation() {
    const reindeerPoints = createReindeerPoints();
    const textPoints = createTextPoints('SpaceHerder');
    const totalParticles = reindeerPoints.length + textPoints.length;

    particleData = [];
    const positions = new Float32Array(totalParticles * 3);
    const colors = new Float32Array(totalParticles * 3);

    const colorAmber = new THREE.Color(0xF59E0B);
    const colorIcy = new THREE.Color(0x38BDF8);

    for (let i = 0; i < totalParticles; i++) {
      let isReindeer = i < reindeerPoints.length;
      let pt2D = isReindeer ? reindeerPoints[i] : textPoints[i - reindeerPoints.length];
      let color = isReindeer ? colorAmber : colorIcy;

      // Pushed the Reindeer and Text higher up the screen so they are clearly visible
      let tx = isReindeer ? (pt2D[0] - 0.5) * 16 : (pt2D[0] - 0.5) * 28;
      let ty = isReindeer ? -(pt2D[1] - 0.5) * 16 + 2 : -(pt2D[1] - 0.5) * 8 - 8;
      let tz = 10;

      let targetConstellation = new THREE.Vector3(tx, ty, tz);
      let targetScatter = new THREE.Vector3(
        tx * (3 + Math.random() * 5),
        ty * (3 + Math.random() * 5),
        70 + Math.random() * 20
      );

      let current = new THREE.Vector3().copy(targetConstellation);

      particleData.push({
        current: current,
        targetC: targetConstellation,
        targetS: targetScatter,
        speed: 0.03 + Math.random() * 0.04
      });

      positions[i * 3] = current.x; positions[i * 3 + 1] = current.y; positions[i * 3 + 2] = current.z;
      colors[i * 3] = color.r; colors[i * 3 + 1] = color.g; colors[i * 3 + 2] = color.b;
    }

    particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    particleSystem = new THREE.Points(particleGeo, new THREE.PointsMaterial({
      size: 0.15, vertexColors: true, transparent: true, opacity: 1.0, blending: THREE.AdditiveBlending, depthWrite: false
    }));
    scene.add(particleSystem);
  }

  function addBackgroundStars() {
    const starGeo = new THREE.BufferGeometry();
    const starPoints = [];
    for (let i = 0; i < 500; i++) {
      const x = THREE.MathUtils.randFloatSpread(300);
      const y = THREE.MathUtils.randFloatSpread(300);
      const z = THREE.MathUtils.randFloatSpread(300);
      if (Math.abs(x) < 30 && Math.abs(y) < 30 && Math.abs(z) < 30) continue;
      starPoints.push(x, y, z);
    }
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPoints, 3));
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.15, transparent: true, opacity: 0.5 })));
  }

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    camera.aspect = rect.width / rect.height;
    camera.updateProjectionMatrix();
    renderer.setSize(rect.width, rect.height);
  }

  function animate() {
    requestAnimationFrame(animate);
    scrollProgress += (targetProgress - scrollProgress) * 0.08;

    cloudMesh.rotation.y += 0.0003;
    satPivot.rotation.y -= 0.002;
    satPivot.rotation.x = Math.sin(Date.now() * 0.0005) * 0.15;
    satGroup.lookAt(50, 20, 30);

    /* ─── DYNAMIC SATELLITE PATCH FADE ─── */
    if (scrollProgress > 0.4 && scrollProgress < 0.75) {
      cloudMesh.material.opacity = Math.max(0, 0.6 - ((scrollProgress - 0.4) * 3));
      tromsoPatch.material.opacity = Math.min(1, (scrollProgress - 0.4) * 3);
    } else if (scrollProgress >= 0.75) {
      cloudMesh.material.opacity = 0;
      tromsoPatch.material.opacity = 0;
    } else {
      cloudMesh.material.opacity = 0.6;
      tromsoPatch.material.opacity = 0;
    }

    /* ─── STABLE CONSTELLATION PARTICLES ─── */
    let positions = particleGeo.attributes.position.array;
    let particleOpacity = 1.0;

    if (scrollProgress > 0.1 && scrollProgress < 0.25) {
      particleOpacity = 1.0 - ((scrollProgress - 0.1) / 0.15);
    } else if (scrollProgress >= 0.25) {
      particleOpacity = 0.0;
    }
    particleSystem.material.opacity = particleOpacity;

    if (particleOpacity > 0) {
      for (let i = 0; i < particleData.length; i++) {
        let p = particleData[i];
        let target = scrollProgress < 0.1 ? p.targetC : p.targetS;
        p.current.lerp(target, p.speed);
        positions[i * 3] = p.current.x; positions[i * 3 + 1] = p.current.y; positions[i * 3 + 2] = p.current.z;
      }
      particleGeo.attributes.position.needsUpdate = true;
    }

    /* ─── DYNAMIC CAMERA TARGETING ─── */
    let targetCamPos = new THREE.Vector3();
    let targetLookAt = new THREE.Vector3();

    const earthWorld = new THREE.Vector3();
    earthGroup.getWorldPosition(earthWorld);

    const tromsoWorld = new THREE.Vector3();
    tromsoMarker.getWorldPosition(tromsoWorld);

    const satWorld = new THREE.Vector3();
    satGroup.getWorldPosition(satWorld);

    // 1. INTRO: Earth at the top, Particles clearly visible at the bottom
    if (scrollProgress < 0.15) {
      targetCamPos.set(0, 4, 48);
      targetLookAt.set(0, 4, 0);
    }
    // 2. EARTH ORBIT OVERVIEW
    else if (scrollProgress >= 0.15 && scrollProgress < 0.4) {
      const normal = tromsoWorld.clone().sub(earthWorld).normalize();
      targetCamPos.copy(earthWorld).add(normal.multiplyScalar(35));
      targetLookAt.copy(earthWorld);
    }
    // 3. THE IDEA: Zoom to Norway & Real Satellite Patch
    else if (scrollProgress >= 0.4 && scrollProgress < 0.7) {
      const normal = tromsoWorld.clone().sub(earthWorld).normalize();
      targetCamPos.copy(tromsoWorld).add(normal.multiplyScalar(3.5));
      targetCamPos.x += 1.5;
      targetCamPos.y -= 0.5;
      targetLookAt.copy(tromsoWorld);
    }
    // 4. TECHNOLOGY: Zoom to Satellite 
    else {
      const normal = satWorld.clone().sub(earthWorld).normalize();
      targetCamPos.copy(satWorld).add(normal.multiplyScalar(4.0));
      targetCamPos.y += 1.0;
      targetCamPos.x -= 1.0;
      targetLookAt.copy(satWorld);
    }

    currentCamPos.lerp(targetCamPos, 0.05);
    currentLookAt.lerp(targetLookAt, 0.05);
    camera.position.copy(currentCamPos);
    camera.lookAt(currentLookAt);

    renderer.render(scene, camera);
  }

  window.ParticleCanvas = {
    init: init,
    start: function () {
      if (typeof THREE === 'undefined') return;
      init();
      animate();
    },
    setMorph: function (progress) { targetProgress = Math.max(0, Math.min(1, progress)); },
    getMorphProgress: () => scrollProgress
  };
})();