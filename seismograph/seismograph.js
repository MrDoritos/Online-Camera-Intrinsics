import * as THREE from 'three';

const canvas = document.getElementById('canvas');
const scene = new THREE.Scene();

class OptionNumber {
    constructor(parent, id, text, min, max, step, start) {
        this.parent = parent;
        this.element = undefined;
        this.info = undefined;
        this.inputs = [];
        this.id = id;
        this.text = text;
        this.min = min;
        this.max = max;
        this.step = step;
        this.start = start;

        this.create();
    }

    create() {
        if (this.element)
            return;

        let elem = this.element = document.createElement('div');
        elem.id = this.id;
        elem.opts = this;
        
        let info_div = elem.appendChild(document.createElement('div'));
        let text_elem = info_div.appendChild(document.createElement('span'));
        text_elem.id = 'text';
        text_elem.innerText = this.text;

        let info_elem = info_div.appendChild(document.createElement('span'));
        info_elem.id = 'info';
        this.info = info_elem;

        let span_elem = elem.appendChild(document.createElement('span'));
        span_elem.id = 'input';

        let range_elem = span_elem.appendChild(document.createElement('input'));
        range_elem.id = 'range';
        range_elem.type = 'range';
    
        let number_elem = span_elem.appendChild(document.createElement('input'));
        number_elem.id = 'number';
        number_elem.type = 'number';

        range_elem.min = number_elem.min = this.min;
        range_elem.max = number_elem.max = this.max;
        range_elem.step = number_elem.step = this.step;
        range_elem.value = number_elem.value = this.start;

        this.inputs.push(range_elem, number_elem);

        for (const e of this.inputs)
            e.addEventListener('input', (src) => this.update(src));

        this.update({target: range_elem});

        this.parent.appendChild(elem);
    }

    update(src) {
        let target = src.target;
        let value = target.value;

        for (const e of this.inputs)
            if (e != target)
                e.value = value;

        if (this.onupdate) this.onupdate(this);
    }

    onupdate = undefined;

    get_value() {
        return this.inputs[0].value;
    }

    set_info(innerHTML) {
        this.info.innerHTML = innerHTML;
    }
}

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

let magnitude = new OptionNumber(control, 'magnitude', 'Magnitude', 0, 11, 0.1, 2);

magnitude.onupdate = (con) => {
    con.set_info(con.get_value());
};

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