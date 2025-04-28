function put_pixel(data, offset, data) {
    for (let i = 0; i < 4; i++) {
        data[offset + i] = data[i];
    }
}

function get_offset(x, y, w) {
    return Math.round(Math.round(y) * w + x) * 4;
}

function get_vec(x, y) {
    return {x:x, y:y};
}

function vec2(x,y) {
    return {x:x, y:y};
}

function vec3(x,y,z) {
    return {x:x, y:y, z:z};
}

function get_arrow(v1, v2, axis) {
    return {start:v1, end:v2, axis:axis};
}

function op_v2(v1, v2, op) {
    return vec2(
        op(v1.x, v2.x),
        op(v1.y, v2.y)
    );
}

function op_v3(v1, v2, op) {
    return vec3(
        op(v1.x, v2.x),
        op(v1.y, v2.y),
        op(v1.z, v2.z)
    );
}

function op_m2_v2(m, v, op) {
    return {
        x:(op(m[0].x, v.x) + op(m[0].y, v.x)),
        y:(op(m[1].x, v.y) + op(m[1].y, v.y))
    };
}

function op_span_v2(v, op) {
    return op(v.x, v.y);
}

function op_span_v3(v, op) {
    return op(op(v.x, v.y), v.z);
}

function op_sub(a, b) {
    return a - b;
}

function op_add(a, b) {
    return a + b;
}

function op_mul(a, b) {
    return a * b;
}

function op_div(a, b) {
    return a / b;
}

function sub_v(v1, v2) {
    return get_vec(v1.x - v2.x, v1.y - v2.y);
}

function sub_v2(v1, v2) {
    return op_v2(v1, v2, op_sub);
}

function sub_v3(v1, v2) {
    return op_v3(v1, v2, op_sub);
}

function add_v(v1, v2) {
    return get_vec(v1.x + v2.x, v1.y + v2.y);
}

function add_v2(v1, v2) {
    return op_v2(v1, v2, op_add);
}

function mul_v(v1, v2) {
    return get_vec(v1.x * v2.x, v1.y * v2.y);
}

function mul_v2(v1, v2) {
    return op_v2(v1, v2, op_mul);
}

function mul_v3(v1, v2) {
    return op_v3(v1, v2, op_mul);
}

function mul_v2_f(v, f) {
    return mul_v2(v, vec2(f,f));
}

function mul_m2_v2(m, v) {
    return op_m2_v2(m, v, op_mul);
}

function div_v2(v1, v2) {
    return op_v2(v1, v2, op_div);
}

function div_v2_f(v, f) {
    return div_v2(v, vec2(f,f));
}

function div_v3(v1, v2) {
    return op_v3(v1, v2, op_div);
}

function div_v3_f(v, f) {
    return div_v3(v, vec3(f,f,f));
}

function sum_v(v) {
    return v.x + v.y;
}

function sum_v2(v) {
    return op_span_v2(v, op_add);
}

function sum_v3(v) {
    return op_span_v3(v, op_add);
}

function abs_v2(v) {
    return vec2(Math.abs(v.x), Math.abs(v.y));
}

function product_v(v) {
    return v.x * v.y;
}

function product_v2(v) {
    return op_span_v2(v, op_mul);
}

function distance_nosqrt_v(v1, v2) {
    let diff = sub_v(v2, v1);
    diff = mul_v(diff, diff);
    return sum_v(diff);
}

function distance_v3(v1, v2) {
    let diff = sub_v3(v2, v1);
    return Math.sqrt(sum_v3(mul_v(diff, diff)));
}

function distance_v(v1, v2) {
    return Math.sqrt(distance_nosqrt_v(v1, v2));
}

function length_v2(v) {
    return distance_v(v, vec2(0,0));
}

function length_v3(v) {
    return distance_v3(v, vec3(0,0,0));
}

function norm_v(v) {
    return get_vec(v.x * .5 + .5, v.y * .5 + .5);
}

function greater_v3(v) {
    let greater = v.x;
    if (v.y > greater)
        greater = v.y;
    if (v.z > greater)
        greater = v.z;
    return greater;
}

function normalize_v3(v) {
    //let greater = greater_v3(v);
    //return div_v3_f(v, greater);
    return div_v3_f(v, length_v3(v));
}

function normalize_v2(v) {
    return div_v2_f(v, length_v2(v));
}

function screen_wh(v, w, h) {
    var n = norm_v(v);
    return get_vec(n.x * w, n.y * h);
}

function screen_v(v1, v2) {
    return screen_wh(v1, v2.x, v2.y);
}

function copy_v(dest, src) {
    dest.x = src.x;
    dest.y = src.y;
    return dest;
}

function dupe_v2(v) {
    return vec2(v.x, v.y);
}

function matrix2(v1, v2) {
    return [
        dupe_v2(v1),
        dupe_v2(v2)
    ];
}

function rotation_m2(radians) {
    let c = Math.cos(radians);
    let s = Math.sin(radians);
    return [
        {x:c,y:-s},
        {x:s,y:c}
    ];
}

function rotate_v2(vector, radians) {
    let m = rotation_m2(radians);
    //return op_m2_v2(m, vector, op_mul);
    return vec2(
        vector.x * m[0].x + vector.y * m[0].y,
        vector.x * m[1].x + vector.y * m[1].y
    );
}

function pick_closer(v1, v2, point) {
    if (distance_nosqrt_v(v1, point) < distance_nosqrt_v(v2, point))
        return v1;
    return v2;
}

function emplace_pixel(data, pixel, x, y, width, height) {
    let offset = get_offset(x, y, width);
    for (let i = 0; i < 4; i++)
        data[offset + i] = pixel[i];
}

class Arrows {
    arrows = [];
    axis_types = {
        'x': 'red',
        '-x': 'red',
        'y': 'lime',
        '-y': 'lime',
        'z': 'blue',
        '-z': 'blue'
    };
    arrow_tolerance = 1;

    get_tolerance(size) {
        return this.arrow_tolerance / Math.sqrt((size.x * size.y));
        //return normalize_v3(vec3(size.x, size.y, this.arrow_tolerance)).z;
        //return this.arrow_tolerance;
    }

    find_arrow_by_mousepos_first(mpos, tolerance) {
        let ret = undefined;
        let vec = undefined;
        let val = undefined;

        this.arrows.forEach(arrow => {
            let a = distance_nosqrt_v(arrow.start, mpos);
            let b = distance_nosqrt_v(arrow.end, mpos);

            if (a <= tolerance || b <= tolerance) {
                ret = arrow;
                vec = a < b ? arrow.start : arrow.end;
                val = a < b ? a : b;
            }
        });

        if (ret)
            return {arrow:ret, vector:vec};
    }

    find_arrow_by_mousepos_closest(mpos, tolerance) {
        let closest = undefined;
        let closest_vec = undefined;
        let closest_val = undefined;

        this.arrows.forEach(arrow => {
            let a = distance_nosqrt_v(arrow.start, mpos);
            let b = distance_nosqrt_v(arrow.end, mpos);

            let closer_vec = a < b ? arrow.start : arrow.end;
            let closer_val = a < b ? a : b; 

            if (!closest || closer_val < closest_val) {
                closest = arrow;
                closest_vec = closer_vec;
                closest_val = closer_val;
            }
        });

        if (closest && closest_val <= tolerance)
            return {arrow:closest, vector:closest_vec, distance:closest_val};
    }

    find_free_placement(tolerance) {
        let start = vec2(-0.5, 0.5);
        let end = vec2(0.5, -0.5);

        for (let x = start.x; x < end.x; x += tolerance) {
            for (let y = start.y; y >= end.y; y -= tolerance) {
                if (!this.find_arrow_by_mousepos_first(vec2(x, y), tolerance))
                    return vec2(x,y);
            }
        }
    }

    get_canvas_pos(arrow, size) {
        let s = screen_v(arrow.start, size);
        let e = screen_v(arrow.end, size);

        return {x:s.x, y:s.y, z:e.x, w:e.y};
    }

    get_canvas_size(canvas) {
        return vec2(canvas.width, canvas.height);
    }

    draw(canvas) {
        let rect = canvas.getBoundingClientRect();

        let ctx = canvas.getContext('2d');
        ctx.width = canvas.width = rect.width;
        ctx.height = canvas.height = rect.height;

        let imgdata = ctx.getImageData(0,0,canvas.width,canvas.height);
        let w = canvas.width;
        let h = canvas.height;
        let size = vec2(w, h);
        let radius = this.arrow_tolerance * 2;
        
        //let arrow = new Arrow(new vec2(0.0, 0.0), new vec2(0.0, 0.5));
        //emplace_pixel(imgdata, {r:128, g:128, b:0}, 0.25, 0.75, w, h);
        
        ctx.clearRect(0,0,w,h);

        this.arrows.forEach(arrow => {
            let p = this.get_canvas_pos(arrow, size);
            let v1 = vec2(p.x, p.y);
            let v2 = vec2(p.z, p.w);

            ctx.strokeStyle = this.axis_types[arrow.axis];
            ctx.lineWidth = this.arrow_tolerance * 1;
            ctx.lineCap = "round";

            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.z, p.w);

            ctx.stroke();

            ctx.beginPath();

            let diff = sub_v2(v1, v2);
            diff = mul_v2_f(normalize_v2(diff), 10);

            let rads = Math.PI / 8;

            let tr1 = rotate_v2(diff, -rads);
            let tr2 = rotate_v2(diff, rads);

            let tip1 = add_v2(tr1, v2);
            let tip2 = add_v2(tr2, v2);

            ctx.moveTo(tip1.x, tip1.y);
            ctx.lineTo(p.z, p.w);
            ctx.lineTo(tip2.x, tip2.y);

            ctx.stroke();

            ctx.strokeStyle = "black";

            ctx.beginPath();

            ctx.arc(p.x, p.y, radius * 2, 0, Math.PI * 2);

            ctx.stroke();

            ctx.beginPath();

            ctx.arc(p.z, p.w, radius * 2, 0, Math.PI * 2);

            ctx.stroke();
        });
    }
}

class Parameters {
    held = false;
    selected_vector = undefined;
    current_image = undefined;
    arrows = new Arrows;

    Parameters() {

    }

    get_mouse_pos(event) {
        let rect = event.target.getBoundingClientRect();
        let x = event.clientX - rect.left;
        let y = event.clientY - rect.top;
        return {x, y};
    }
    
    get_mouse_rel(event) {
        let rect = event.target.getBoundingClientRect();
        let x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        let y = ((event.clientY - rect.top) / rect.height) * 2 - 1;
        return {x, y};
    }

    get_size(event) {
        let rect = event.target.getBoundingClientRect();
        return vec2(rect.width, rect.height);
    }
    
    mouse_up(event) {
        this.held = false;
        this.selected_vector = undefined;
    }

    mouse_down(event) {
        this.held = true;

        let pos = this.get_mouse_rel(event);
        let size = this.get_size(event);
        this.selected_vector = this.arrows.find_arrow_by_mousepos_closest(pos, this.arrows.get_tolerance(size));
    }

    mouse_move(event) {
        let vector = this.selected_vector;

        if (!vector)
            return;

        let pos = this.get_mouse_rel(event);

        copy_v(vector.vector, pos);
        this.arrows.draw(this.e_arrows_canvas());
    }

    axis_count_input(event) {
        let e = this.e_axis_count();

        let c = e.value * 2;
        let l = this.arrows.arrows.length;

        for (let i = c; i < l; i++)
            this.arrows.arrows.pop();

        for (let i = 0; i < c-l; i++) {
            let p = this.arrows.find_free_placement(0.05);

            this.arrows.arrows.push(get_arrow(p, add_v2(p, vec2(0.5, 0)), 'x'));
        }

        this.draw();
    }

    axis_type_input(event) {
        for (let i = 0; i < this.arrows.arrows.length; i++) {
            let arrow = this.arrows.arrows[i];
            if (i == event.getAttribute("name"))
                arrow.axis = event.value;
        }

        this.draw();
    }

    image_load_input(event) {
        let e = this.e_image_load();

        if (!e || !e.files || !e.files.length)
            return;

        let form = e.files[0];

        let reader = new FileReader();
        let e_image = this.e_image_canvas();
        let _this = this;

        reader.onload = function(e) {
            let image = new Image();
            image.onload = function() {
                _this.current_image = {
                    width: image.width,
                    height: image.height,
                    image: image
                };

                _this.update_info();
            }

            image.crossOrigin = "anonymous";
            e_image.crossOrigin = "anonymous";

            image.src = e.target.result;
            e_image.src = e.target.result;
        }

        reader.readAsDataURL(form);
    }

    range_opacity_input(event) {
        let e = this.e_range_opacity();
        this.e_image_opacity().style.setProperty('opacity', `${e.value}%`);
    }

    update_info() {
        let e = this.e_parameter_info();
        let c = this.current_image;

        e.innerHTML = '<p style="text-align: center">Info</p>';
        e.innerHTML += `<p>width: ${c ? c.width : ''}</p>`;
        e.innerHTML += `<p>height: ${c ? c.height : ''}</p>`;
    }

    update_arrow_select() {
        let e = this.e_axis_types();
        
        e.innerHTML = `<p style="text-align:center">Axis</p>`;
        for (let i = 0; i < this.arrows.arrows.length; i++) {
            let arrow = this.arrows.arrows[i];
            let str = `<div><p id="item">${i+1}</p><select name="${i}" id="axis_select" oninput="prm.axis_type_input(this)">`;
            for (const [axis, color] of Object.entries(this.arrows.axis_types)) {
                str += `<option ${arrow.axis == axis ? 'selected' : ''} value="${axis}">${axis}</option>`;
            }
            str += '</select></div>';
            e.innerHTML += str;
        }
    }

    draw() {
        this.arrows.draw(this.e_arrows_canvas());
        this.update_arrow_select();
        this.update_info();
    }

    init() {
        //this.arrows.arrows = [
        //    get_arrow(vec2(0,0),vec2(0.5,0),'x'),
        //    get_arrow(vec2(0,0.1),vec2(0.5,0.1),'y')
        //];

        for (let i = 1; i < 4; i++) {
            this.e_axis_count().innerHTML +=
                `<option ${i == 1 ? 'selected' : ''} value="${i}">${i}</option>`
        }

        this.axis_count_input();

        this.draw();
    }

    e_parameter_images() {
        return document.getElementById('parameter_images');
    }

    e_parameter_info() {
        return document.getElementById('parameter_info');
    }

    e_image_canvas() {
        return document.getElementById('image_canvas');
    }

    e_arrows_canvas() {
        return document.getElementById('arrows_canvas');
    }

    e_body() {
        return document.getElementById('parameter_body');
    }

    e_axis_count() {
        return document.getElementById('axis_count');
    }

    e_axis_types() {
        return document.getElementById('axis_types');
    }

    e_image_load() {
        return document.getElementById('image_load');
    }

    e_range_opacity() {
        return document.getElementById('range_opacity');
    }

    e_image_opacity() {
        return document.getElementById('image_opacity');
    }
}

let prm = new Parameters();

let arrows_canvas = prm.e_arrows_canvas();
let body = prm.e_body();

prm.init();
body.addEventListener('load', function(event){prm.init();});

arrows_canvas.addEventListener('mouseup', function(event){prm.mouse_up(event);});
arrows_canvas.addEventListener('mousedown', function(event){prm.mouse_down(event);});
arrows_canvas.addEventListener('contextmenu', function(event){prm.mouse_down(event);});
arrows_canvas.addEventListener('mousemove', function(event){prm.mouse_move(event);});
arrows_canvas.addEventListener('change', function(event){prm.draw();});

prm.e_axis_count().addEventListener('input', function(event){prm.axis_count_input(event);});
prm.e_image_load().addEventListener('input', function(event){prm.image_load_input(event);});
prm.e_range_opacity().addEventListener('input', function(event){prm.range_opacity_input(event);});