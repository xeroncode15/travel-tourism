import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

const earthRadius = 1.48;

const continentShapes = [
  [[-168, 70], [-145, 71], [-128, 57], [-124, 48], [-117, 32], [-105, 23], [-97, 17], [-88, 16], [-82, 25], [-92, 33], [-101, 48], [-119, 56], [-139, 62]],
  [[-79, 10], [-65, 8], [-50, -2], [-39, -14], [-48, -32], [-60, -49], [-69, -55], [-76, -31], [-80, -8]],
  [[-12, 35], [4, 37], [18, 34], [34, 30], [49, 18], [43, 4], [39, -12], [30, -30], [17, -35], [7, -22], [-1, -3], [-9, 14]],
  [[-11, 36], [-8, 50], [6, 58], [14, 68], [31, 70], [42, 57], [58, 55], [72, 63], [87, 67], [103, 58], [122, 57], [141, 52], [157, 59], [174, 53], [159, 43], [139, 39], [125, 31], [119, 20], [108, 8], [101, 7], [97, 23], [89, 22], [83, 8], [78, 8], [72, 21], [62, 24], [52, 33], [40, 40], [28, 37], [18, 43], [7, 42], [-2, 35]],
  [[112, -11], [129, -10], [145, -16], [153, -27], [143, -39], [128, -43], [115, -34], [112, -21]]
];

const indiaShape = [
  [68.2, 23.5], [70, 22.7], [72.8, 21.8], [73.5, 20], [72.8, 18.1],
  [73.7, 16], [74.1, 14.2], [74.8, 12.4], [75.4, 10.7], [76.2, 9],
  [77.4, 8], [78.2, 9.7], [79.2, 11.3], [80.1, 13.2], [81.3, 15.2],
  [82.4, 17.1], [83.2, 18.9], [84.4, 20.2], [85.7, 21.6], [87.1, 22.3],
  [88.4, 22.4], [89.7, 22], [91.1, 22.1], [92.3, 23.2], [93.5, 24.1],
  [94.6, 25.5], [96.1, 27.3], [94.6, 28.6], [92.4, 27.8], [90.8, 27.4],
  [89.2, 27.1], [87.4, 26.8], [85.5, 27.1], [83.4, 27.8], [81.7, 29.3],
  [80.2, 30.5], [78.8, 31.7], [77.3, 33.2], [75.9, 34.5], [74.9, 33.2],
  [73.5, 31.8], [72.1, 30.4], [70.5, 28.8], [69.1, 27.1], [68.2, 25.5]
];

function mapPoint(longitude, latitude, width, height) {
  return {
    x: ((longitude + 180) / 360) * width,
    y: ((90 - latitude) / 180) * height
  };
}

function createEarthTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1536;
  canvas.height = 768;

  const context = canvas.getContext("2d");
  if (!context) return null;

  const ocean = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  ocean.addColorStop(0, "#102e50");
  ocean.addColorStop(0.52, "#0b2643");
  ocean.addColorStop(1, "#07182f");
  context.fillStyle = ocean;
  context.fillRect(0, 0, canvas.width, canvas.height);

  continentShapes.forEach((shape, index) => {
    context.beginPath();
    shape.forEach(([longitude, latitude], pointIndex) => {
      const { x, y } = mapPoint(longitude, latitude, canvas.width, canvas.height);
      if (pointIndex === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.closePath();
    context.fillStyle = index === 3 ? "#22516a" : "#1c485e";
    context.fill();
    context.strokeStyle = "rgba(146, 207, 204, .32)";
    context.lineWidth = 2;
    context.stroke();
  });

  context.beginPath();
  indiaShape.forEach(([longitude, latitude], pointIndex) => {
    const { x, y } = mapPoint(longitude, latitude, canvas.width, canvas.height);
    if (pointIndex === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.closePath();
  context.shadowColor = "rgba(255, 177, 82, .9)";
  context.shadowBlur = 34;
  const indiaFill = context.createLinearGradient(800, 280, 855, 390);
  indiaFill.addColorStop(0, "#ffdc8d");
  indiaFill.addColorStop(1, "#eb843c");
  context.fillStyle = indiaFill;
  context.fill();
  context.shadowBlur = 0;
  context.strokeStyle = "#ffe4a0";
  context.lineWidth = 3;
  context.stroke();

  context.strokeStyle = "rgba(165, 218, 227, .13)";
  context.lineWidth = 1;
  for (let latitude = -60; latitude <= 60; latitude += 30) {
    const y = ((90 - latitude) / 180) * canvas.height;
    context.beginPath();
    context.ellipse(canvas.width / 2, y, canvas.width * 0.49, canvas.width * 0.13, 0, 0, Math.PI * 2);
    context.stroke();
  }
  for (let longitude = -150; longitude <= 180; longitude += 30) {
    const x = ((longitude + 180) / 360) * canvas.width;
    context.beginPath();
    context.ellipse(x, canvas.height / 2, canvas.height * 0.18, canvas.height * 0.49, 0, 0, Math.PI * 2);
    context.stroke();
  }

  return new THREE.CanvasTexture(canvas);
}

function globePosition(latitude, longitude, radius) {
  const lat = THREE.MathUtils.degToRad(latitude);
  const lon = THREE.MathUtils.degToRad(longitude);
  return new THREE.Vector3(
    radius * Math.cos(lat) * Math.cos(lon),
    radius * Math.sin(lat),
    -radius * Math.cos(lat) * Math.sin(lon)
  );
}

function createStars(scene) {
  const positions = [];
  for (let index = 0; index < 520; index += 1) {
    positions.push(
      (Math.random() - 0.5) * 13,
      (Math.random() - 0.5) * 9,
      -2 - Math.random() * 8
    );
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: "#b9d9ed",
    size: 0.018,
    transparent: true,
    opacity: 0.65,
    sizeAttenuation: true
  });
  scene.add(new THREE.Points(geometry, material));
}

export default function IndiaGlobe() {
  const mountRef = useRef(null);
  const [webglUnavailable, setWebglUnavailable] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
    } catch {
      setWebglUnavailable(true);
      return undefined;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 80);
    camera.position.set(0, 0, 5.4);
    scene.add(new THREE.AmbientLight("#a5c4dd", 1));

    const keyLight = new THREE.DirectionalLight("#ffe0ae", 1.8);
    keyLight.position.set(-3, 3.5, 5);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight("#55b6da", 1.55);
    rimLight.position.set(4, -1.5, -2.5);
    scene.add(rimLight);

    const globe = new THREE.Group();
    scene.add(globe);
    globe.rotation.y = Math.PI;

    const texture = createEarthTexture();
    if (!texture) {
      setWebglUnavailable(true);
      renderer.dispose();
      mount.removeChild(renderer.domElement);
      return undefined;
    }
    texture.colorSpace = THREE.SRGBColorSpace;

    const planet = new THREE.Mesh(
      new THREE.SphereGeometry(earthRadius, 80, 56),
      new THREE.MeshPhongMaterial({
        map: texture,
        shininess: 12,
        specular: new THREE.Color("#4a7187"),
        emissive: new THREE.Color("#061b2b"),
        emissiveIntensity: 0.22
      })
    );
    globe.add(planet);

    const grid = new THREE.Mesh(
      new THREE.SphereGeometry(earthRadius * 1.002, 32, 24),
      new THREE.MeshBasicMaterial({
        color: "#9bd1e8",
        wireframe: true,
        transparent: true,
        opacity: 0.09
      })
    );
    globe.add(grid);

    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(earthRadius * 1.045, 48, 36),
      new THREE.MeshBasicMaterial({
        color: "#5eadd5",
        side: THREE.BackSide,
        transparent: true,
        opacity: 0.16
      })
    );
    globe.add(atmosphere);

    const markerPosition = globePosition(25, 85, earthRadius * 1.015);
    const indiaMarker = new THREE.Mesh(
      new THREE.SphereGeometry(0.043, 20, 20),
      new THREE.MeshBasicMaterial({ color: "#ffe6a4" })
    );
    indiaMarker.position.copy(markerPosition);
    globe.add(indiaMarker);

    const pulse = new THREE.Mesh(
      new THREE.RingGeometry(0.055, 0.075, 48),
      new THREE.MeshBasicMaterial({
        color: "#ffc46d",
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8
      })
    );
    pulse.position.copy(markerPosition.clone().multiplyScalar(1.025));
    pulse.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      markerPosition.clone().normalize()
    );
    globe.add(pulse);

    const orbitMaterial = new THREE.MeshBasicMaterial({
      color: "#f6bc68",
      transparent: true,
      opacity: 0.55
    });
    const orbitOne = new THREE.Mesh(new THREE.TorusGeometry(1.9, 0.006, 8, 180), orbitMaterial);
    orbitOne.rotation.set(0.78, 0.42, -0.15);
    globe.add(orbitOne);
    const orbitTwo = new THREE.Mesh(
      new THREE.TorusGeometry(1.82, 0.003, 8, 180),
      new THREE.MeshBasicMaterial({ color: "#b7d7e8", transparent: true, opacity: 0.28 })
    );
    orbitTwo.rotation.set(1.15, -0.55, 0.26);
    globe.add(orbitTwo);

    createStars(scene);

    const resize = () => {
      const width = mount.clientWidth;
      const height = mount.clientHeight;
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);
    resize();

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let animationFrame = 0;
    let previousFrameTime = 0;
    let motionTime = 0;
    const renderFrame = (time) => {
      motionTime += Math.min(time - previousFrameTime, 50);
      previousFrameTime = time;
      if (!reducedMotion) {
        globe.rotation.y = Math.PI + motionTime * 0.00001;
        globe.rotation.x = Math.sin(motionTime * 0.00016) * 0.035;
        pulse.scale.setScalar(1 + Math.sin(motionTime * 0.003) * 0.12);
      }
      renderer.render(scene, camera);
      if (!reducedMotion) animationFrame = window.requestAnimationFrame(renderFrame);
    };
    renderFrame(0);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      scene.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => {
            if (material.map) material.map.dispose();
            material.dispose();
          });
        }
      });
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div className={`globe-stage${webglUnavailable ? " globe-fallback" : ""}`} role="img" aria-label="Rotating 3D globe with India highlighted">
      <div className="globe-canvas" ref={mountRef} aria-hidden="true" />
      {webglUnavailable && <span className="globe-fallback-india" aria-hidden="true">IN</span>}
      <span className="globe-orbit-label orbit-label-north">01 / INDIA</span>
      <span className="globe-orbit-label orbit-label-south">A WORLD OF STORIES</span>
    </div>
  );
}
