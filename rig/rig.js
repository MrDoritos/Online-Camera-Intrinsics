import * as THREE from 'three';

const canvas = document.getElementById('canvas');
const scene = new THREE.Scene();

function get_size() {
    const size = main.getBoundingClientRect();
    
    return {width:size.width, height:size.height};
}

let size = get_size();

const camera = new THREE.PerspectiveCamera(72, size.width / size.height, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({canvas:canvas, alpha:true});
renderer.setSize(size.width, size.height);

const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const cube = new THREE.Mesh(geometry, material);

scene.add(cube);

camera.position.z = 3;

window.addEventListener('resize', () => {
    size = get_size();
    const w = size.width;
    const h = size.height;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
});

function animate() {
    requestAnimationFrame(animate);

    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;

    renderer.render(scene, camera);
}

animate();