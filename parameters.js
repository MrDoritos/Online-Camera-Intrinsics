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

function str_v2(v, digits=3) {
    return `${v.x.toFixed(digits)}, ${v.y.toFixed(digits)}`;
}

function str_v3(v, digits=3) {
    return `${v.x.toFixed(digits)}, ${v.y.toFixed(digits)}, ${v.z.toFixed(digits)}`;
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
    return Math.sqrt(sum_v3(mul_v3(diff, diff)));
}

function distance_v(v1, v2) {
    return Math.sqrt(distance_nosqrt_v(v1, v2));
}

function distance_v2(v1, v2) {
    let diff = sub_v2(v2, v1);
    return Math.sqrt(sum_v2(mul_v2(diff, diff)));
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

function greater_v2(v) {
    let greater = v.x;
    if (v.y > greater)
        greater = v.y;
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

function determinant_m2(m) {
    return (m[0].x * m[1].y) - (m[1].x * m[0].y);
}

function inverse_m2(m) {

}

function cross_v3(v1, v2) {
    return vec3(
        (v1.y * v2.z) - (v1.z * v2.y),
        (v1.z * v2.x) - (v1.x * v2.z),
        (v1.x * v2.y) - (v1.y * v2.x)
    );
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
    intersections = [];
    camera_rotation_matrix = [];
    principal_point = vec2(0,0);
    focal_length = 1;
    opacity = 50;
    magnifier_scale = .1;
    axis_types = {
        'x': 'red',
        '-x': 'red',
        'y': 'lime',
        '-y': 'lime',
        'z': 'dodgerblue',
        '-z': 'dodgerblue'
    };
    arrow_tolerance = 1;

    get_tolerance(size) {
        return this.arrow_tolerance / Math.sqrt((size.x * size.y * 3));
        //return normalize_v3(vec3(size.x, size.y, this.arrow_tolerance)).z;
        //return this.arrow_tolerance;
    }

    find_arrow_by_mousepos_first(mpos, tolerance) {
        let ret = undefined;
        let vec = undefined;
        let val = undefined;

        if (distance_nosqrt_v(this.principal_point, mpos) <= tolerance)
            return {arrow:undefined, vector:this.principal_point, distance:tolerance};

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

        if (distance_nosqrt_v(this.principal_point, mpos) <= tolerance)
            return {arrow:undefined, vector:this.principal_point, distance:tolerance};

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

    get_arrow_magnitude(arrow) {
        return normalize_v2(sub_v2(arrow.end, arrow.start));
    }

    iden_v2(v) {
        return [
            {x:v.x, y:1},
            {x:v.y, y:1}
        ];
    }

    find_intersection(a1, a2) {
        let mag1 = this.get_arrow_magnitude(a1);
        let mag2 = this.get_arrow_magnitude(a2);

        let v1 = a1.start;
        let v2 = a1.end;
        let v3 = a2.start;
        let v4 = a2.end;

        let m1 = matrix2(v1, v2);
        let m2 = matrix2(v3, v4);

        let mx1 = this.iden_v2(vec2(v1.x, v2.x));
        let mx2 = this.iden_v2(vec2(v3.x, v4.x));

        let my1 = this.iden_v2(vec2(v1.y, v2.y));
        let my2 = this.iden_v2(vec2(v3.y, v4.y));

        let pxn1 = determinant_m2(m1);
        let pxn2 = determinant_m2(mx1);
        let pxn3 = determinant_m2(m2);
        let pxn4 = determinant_m2(mx2);

        let pxd1 = determinant_m2(mx1);
        let pxd2 = determinant_m2(my1);
        let pxd3 = determinant_m2(mx2);
        let pxd4 = determinant_m2(my2);

        let pyn1 = determinant_m2(m1);
        let pyn2 = determinant_m2(my1);
        let pyn3 = determinant_m2(m2);
        let pyn4 = determinant_m2(my2);

        let pyd1 = determinant_m2(mx1);
        let pyd2 = determinant_m2(my1);
        let pyd3 = determinant_m2(mx2);
        let pyd4 = determinant_m2(my2);

        let pxn = determinant_m2([vec2(pxn1, pxn2), vec2(pxn3, pxn4)]);
        let pxd = determinant_m2([vec2(pxd1, pxd2), vec2(pxd3, pxd4)]);

        let pyn = determinant_m2([vec2(pyn1, pyn2), vec2(pyn3, pyn4)]);
        let pyd = determinant_m2([vec2(pyd1, pyd2), vec2(pyd3, pyd4)]);

        let px = pxn / pxd;
        let py = pyn / pyd;

        return vec2(px, py);
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
        this.solve();

        let rect = canvas.getBoundingClientRect();

        let ctx = canvas.getContext('2d');
        ctx.width = canvas.width = rect.width;
        ctx.height = canvas.height = rect.height;

        let imgdata = ctx.getImageData(0,0,canvas.width,canvas.height);
        let w = canvas.width;
        let h = canvas.height;
        let size = vec2(w, h);
        let radius = this.arrow_tolerance * 2;

        let axis_dis_pos = vec2(0,0);
        let axis_dis_scr = screen_v(axis_dis_pos, size);
        
        //let arrow = new Arrow(new vec2(0.0, 0.0), new vec2(0.0, 0.5));
        //emplace_pixel(imgdata, {r:128, g:128, b:0}, 0.25, 0.75, w, h);
        
        ctx.clearRect(0,0,w,h);

        this.arrows.forEach(arrow => {
            let p = this.get_canvas_pos(arrow, size);
            let v1 = vec2(p.x, p.y);
            let v2 = vec2(p.z, p.w);

            let diff = sub_v2(v1, v2);
            let norm = normalize_v2(diff);
            let div = mul_v2_f(norm, 10 * this.arrow_tolerance);
            let cen = add_v2(mul_v2_f(norm, this.arrow_tolerance), v2);

            ctx.strokeStyle = this.axis_types[arrow.axis];
            //ctx.lineCap = "round";

            ctx.lineWidth = this.arrow_tolerance * 0.5;

            //#region To vanishing point

            ctx.beginPath();
            let len = greater_v2(size);
            //let half = size.y * .5;
            //let x = v1.x - (((v1.y-half) / norm.y) * norm.x);
            let a = add_v2(mul_v2_f(norm, len), v2);
            let b = add_v2(mul_v2_f(norm, -len), v2);
            //let a = add_v2(mul_v2_f(norm, len), vec2(x, half));
            //let b = add_v2(mul_v2_f(norm, -len), vec2(x, half));
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();

            //#endregion

            ctx.lineWidth = this.arrow_tolerance * 1;

            //#region Line

            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(cen.x, cen.y);

            ctx.stroke();

            //#endregion

            //#region Arrow tip

            ctx.beginPath();

            let rads = Math.PI / 8;

            let tr1 = rotate_v2(div, -rads);
            let tr2 = rotate_v2(div, rads);

            let tip1 = add_v2(tr1, v2);
            let tip2 = add_v2(tr2, v2);

            ctx.moveTo(tip1.x, tip1.y);
            ctx.lineTo(cen.x, cen.y);
            ctx.lineTo(tip2.x, tip2.y);

            ctx.stroke();

            //#endregion

            //ctx.strokeStyle = "black";

            //#region Circles

            ctx.beginPath();

            ctx.arc(p.x, p.y, radius * 2, 0, Math.PI * 2);

            ctx.stroke();

            ctx.beginPath();

            ctx.arc(p.z, p.w, radius * 2, 0, Math.PI * 2);

            ctx.stroke();

            //#endregion
        });

        ctx.strokeStyle = "black";

        this.intersections.forEach(intersect => {
            ctx.beginPath();

            let p = screen_v(intersect.point, size);
            ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);

            ctx.fill();

            /*
            ctx.beginPath();

            ctx.moveTo(axis_dis_scr.x, axis_dis_scr.y);

            //let endp = normalize_v2(sub_v2(axis_dis_pos, intersect.point));
            //endp = mul_v2_f(endp, this.arrow_tolerance  * 100);
            //endp = add_v2(endp, axis_dis_scr);

                        

            let d1 = div_v2(intersect.a.start, intersect.b.start);
            let d2 = div_v2(intersect.a.end, intersect.b.end);

            let a = sub_v2(axis_dis_pos, intersect.a.start);

            a = mul_v2(a, d2);
            let endp = screen_v(a, size);

            ctx.lineTo(endp.x, endp.y);

            ctx.stroke();
            */
        });

        let ii = 0;
        if (this.camera_rotation_matrix)
        this.camera_rotation_matrix.forEach(vec => {
            let v = div_v3_f(vec, 4);
            let p = this.project_v3(v);
            let s = screen_v(p, size);
            let c = axis_dis_scr;

            ctx.strokeStyle = ["red", "lime", "dodgerblue"][ii++];

            ctx.beginPath();
            ctx.moveTo(c.x, c.y);
            ctx.lineTo(s.x, s.y);
            ctx.stroke();
        });

        {
            let s = screen_v(this.principal_point, size);

            ctx.strokeStyle = "orange";

            ctx.beginPath();
            
            ctx.arc(s.x, s.y, radius, 0, Math.PI * 2);

            ctx.stroke();
        }
    }

    project_v3(v) {
        return vec2(v.x / v.z, v.y / v.z);
    }

    solve() {
        this.intersections = [];
        let dots = [];

        for (let i = 0; i < this.arrows.length; i+=2) {
            let a = this.arrows[i];
            let b = this.arrows[i + 1];

            let intersection = this.find_intersection(a, b);

            a.magnitude = sub_v2(a.start, a.end);
            b.magnitude = sub_v2(b.start, b.end);

            a.mag_norm = normalize_v2(a.magnitude);
            b.mag_norm = normalize_v2(b.magnitude);

            let dot = sum_v2(mul_v2(a.mag_norm, b.mag_norm));

            let int_mag_norm = normalize_v2(add_v2(a.mag_norm, b.mag_norm));

            dots.push(dot);
            this.intersections.push({point:intersection, dot:dot, mag_norm:int_mag_norm, a:a, b:b});
        }

        let length = 0;

        dots.forEach(val => {
            length += val * val;
        });

        length = Math.sqrt(length);

        let norm_dots = [];

        dots.forEach(val => {
            norm_dots.push(val / length);
        });
        
        for (let i = 0; i < norm_dots.length; i++) {
            let num = norm_dots[i];
            let den = 1;
            for (let j = 0; j < norm_dots.length; j++) {
                if (i == j) continue;
                den *= norm_dots[j];
            }
            let frac = num / den;
            let angle = Math.atan(frac);
            let deg = angle / Math.PI * 180;
            this.intersections[i]['angle'] = deg;
            this.intersections[i]['frac'] = frac;
            this.intersections[i]['mag'] = num;
            this.intersections[i]['dot_angle'] = Math.acos(this.intersections[i].dot) / Math.PI * 180;
        }

        if (this.intersections.length < 2)
            return;

        let vn1 = this.intersections[0]['mag_norm'];
        let vn2 = this.intersections[1]['mag_norm'];
        let p = this.principal_point;

        let f = -this.focal_length;

        let OFu = vec3(vn1.x - p.x, vn1.y - p.y, f);
        let OFv = vec3(vn2.x - p.x, vn2.y - p.y, f);

        let s1 = length_v3(OFu);
        let s2 = length_v3(OFv);

        let vpRc = normalize_v3(OFu);
        let upRc = normalize_v3(OFv);
        let wpRc = cross_v3(upRc, vpRc);

        this.camera_rotation_matrix = [
            normalize_v3(vec3(OFu.x / s1, OFv.y / s2, wpRc.x)),
            normalize_v3(vec3(OFu.y / s1, OFv.y / s2,wpRc.y)),
            normalize_v3(vec3(-f / s1, -f / s2, wpRc.z))
        ]
    }
}

class Parameters {
    held = false;
    magnifier = false;
    selected_vector = undefined;
    current_image = undefined;
    arrows = new Arrows;
    diff_move_rel = undefined;
    final_move_rel = undefined;
    diff_move_scale = 1;

    elements = {
        'focal_length': 'range_focal_length',
        'opacity': 'range_opacity',
        'ui_scale': 'range_ui_scale',
        'range_focal_length': 'range_focal_length',
        'range_opacity': 'range_opacity',
        'range_ui_scale': 'range_ui_scale',
        'parameter_load': 'parameter_load',
        'parameter_save': 'parameter_save',
        'parameter_images': 'parameter_images',
        'parameter_info': 'parameter_info',
        'image_canvas': 'image_canvas',
        'image_holder': 'image_holder',
        'magnifier': 'magnifier',
        'arrows_canvas': 'arrows_canvas',
        'parameter_body': 'parameter_body',
        'body': 'parameter_body',
        'axis_count': 'axis_count',
        'axis_types': 'axis_types',
        'image_load': 'image_load',
        'image_opacity': 'image_opacity',
        'magnifier_scale': 'range_magnifier_scale',
        'range_magnifier_scale': 'range_magnifier_scale'
    };

    elements_func = {
        'magnifier_image': function(ptr) { return ptr.get_element('magnifier').firstChild; },
    };

    get_element(name) {
        if (name in this.elements_func)
            return this.elements_func[name](this);
        return document.getElementById(this.elements[name]);
    }

    add_event(name, event, func) {
        this.get_element(name).addEventListener(event, func);
    }

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

    get_mouse_rel_within(event, element) {
        let rect = event.target.getBoundingClientRect();
        let x = event.clientX;
        let y = event.clientY;
        x -= element.clientLeft;
        y -= element.clientTop;
        x = (x / element.clientWidth) * 2 - 1;
        y = (y / element.clientHeight) * 2 - 1;
        return {x, y};
    }

    get_mouse_rel_image(event, start, scale) {
        let ic = this.get_element('image_canvas');
        let ac = this.get_element('arrows_canvas');
        
        let l = ac.clientLeft + ac.offsetLeft;
        let t = ac.clientTop + ac.offsetTop;
        let w = ac.clientWidth;
        let h = ac.clientHeight;

        if (this.current_image) {
            l = ic.clientLeft + ic.offsetLeft;
            t = ic.clientTop + ic.offsetTop;
            w = ic.clientWidth;
            h = ic.clientHeight;
        }

        let ex = event.clientX;
        let ey = event.clientY;

        let rect = event.target.getBoundingClientRect();
        let scrx = ex - l;
        let scry = ey - t;
        let x = (scrx / w) * 2 - 1;
        let y = (scry / h) * 2 - 1;

        console.log('wrel', x, y, scrx, scry);

        if (start && scale) {
            return {
                x:(x-start.x)*scale+start.x,
                y:(y-start.y)*scale+start.y,
                scrx:(scrx-start.scrx)*scale+start.scrx,
                scry:(scry-start.scry)*scale+start.scry,
                ex:(ex-start.ex)*scale+start.ex,
                ey:(ey-start.ey)*scale+start.ey
            }
        }

        return {x,y,scrx,scry,ex,ey};
    }

    get_mouse_rel_image_autoscale(event) {
        let pos = undefined;
        if (this.diff_move_rel)
            pos = this.get_mouse_rel_image(event, this.diff_move_rel, this.diff_move_scale);
        else
            pos = this.diff_move_rel = this.get_mouse_rel_image(event);
        return pos;
    }

    get_size(event) {
        let rect = event.target.getBoundingClientRect();
        return vec2(rect.width, rect.height);
    }
    
    add_magnifier(event) {
        let e = this.get_element('magnifier');

        if (e || !this.current_image)
            return;

        this.magnifier = true;

        let n = document.createElement('div');
        let i = document.createElement('img');

        n.setAttribute('id', 'magnifier');
        //n.innerHTML = `<img src="${this.current_image.image.src}" />`;
        i.setAttribute('src', this.current_image.image.src);
        n.appendChild(i);

        
        this.set_magnifier_position(event, n, i);

        //this.e_image_holder().insertAdjacentElement(this.e_image_opacity(), n);
        this.get_element('image_opacity').insertAdjacentElement('afterend', n);

        console.log('add magnifier:', n);
    }

    set_magnifier_position(event, div, img) {
        let pos = this.get_mouse_rel_image_autoscale(event);
        let scale = this.arrows.arrow_tolerance * 100;

        let ac = this.get_element('arrows_canvas');
        let tw = this.current_image.width;
        let th = this.current_image.height;
        //tw = ac.width;
        //th = ac.height;
        let imgpos = screen_wh(pos, tw, th);

        let divx = pos.ex;
        let divy = pos.ey;
        let divw = scale;
        let divh = scale;

        div.style.setProperty('left', `${divx}px`);
        div.style.setProperty('top', `${divy}px`);
        div.style.setProperty('width', `${divw}px`);
        div.style.setProperty('height', `${divh}px`);

        let imgw = tw;
        let imgh = th;
        let imgx = -(imgpos.x - (divw * 0.5));
        let imgy = -(imgpos.y - (divh * 0.5));
        //imgx = divx - (imgw * 0.5);
        //imgy = divy - (imgh * 0.5);
        //imgx = -(divx + imgw);
        //imgy = -(divy + imgh);

        img.style.setProperty('left', `${imgx}px`);
        img.style.setProperty('top', `${imgy}px`);
        img.style.setProperty('width', `${imgw}px`);
        img.style.setProperty('height', `${imgh}px`);

        console.log('magnifier', div, img, '\n', divx, divy, divw, divh, imgx, imgy, imgw, imgh);
    }

    remove_magnifier() {
        let e = this.get_element('magnifier');

        //console.log('remove magnifier:', e);
    
        this.magnifier = false;

        if (e)
            e.parentNode.removeChild(e);
    }

    update_magnifier(event) {
        let e = this.get_element('magnifier');

        if (!e)
            return this.add_magnifier(event);

        let i = this.get_element('magnifier_image');

        if (!i)
            return;

        this.set_magnifier_position(event, e, i);
    }

    key_up(event) {
        //console.log('key up:', event);
        //this.magnifier = false;
    }

    key_down(event) {
        //console.log('key down:', event);
        //if (event.shiftKey) {
        //    this.magnifier = true;
        //}
    }

    key_press(event) {
        //console.log('key press:', event);
    }

    mouse_up(event) {
        this.held = false;
        this.selected_vector = undefined;
        this.diff_move_rel = undefined;

        //console.log('mouse_up:',event);

        if (this.magnifier) {
            this.remove_magnifier();
        }
    }

    mouse_down(event) {
        //if (event.shiftKey)
        //    this.add_magnifier(event);

        this.held = true;

        let pos = this.get_mouse_rel_image_autoscale(event);
        let size = this.get_size(event);
        this.selected_vector = this.arrows.find_arrow_by_mousepos_closest(pos, this.arrows.get_tolerance(size));

        //console.log('mouse_down:',event);
    }

    mouse_move(event) {
        let vector = this.selected_vector;

        if (!vector)
            return;

        let use_magnifier = this.held && event.shiftKey;

        if (use_magnifier) {
            this.update_magnifier(event);
            this.diff_move_scale = this.arrows.magnifier_scale;
        } else {
            this.diff_move_scale = 1;
            if (this.magnifier)
                this.remove_magnifier();
        }

        let pos = this.get_mouse_rel_image_autoscale(event);

        copy_v(vector.vector, pos);
        this.draw();
    }

    next_arrow_type() {
        let types = {'x':0,'y':0,'z':0};

        for (let i = 0; i < this.arrows.arrows.length; i++) {
            let arrow = this.arrows.arrows[i];
            if (!arrow || !arrow.axis)
                continue;
            let arrow_type = arrow.axis.replace('-', '').toLowerCase();
            types[arrow_type]++;
        }

        let l = types['x'];
        let lesser = undefined;
        for (const [key, value] of Object.entries(types)) {
            if (value == 0)
                return key;
            if (value < l)
                lesser = key;
            if (value % 2 == 1)
                return key;
        }

        return lesser;
    }

    axis_count_input(event) {
        let e = this.get_element('axis_count');

        let c = e.value * 2;
        let l = this.arrows.arrows.length;

        for (let i = c; i < l; i++)
            this.arrows.arrows.pop();

        for (let i = 0; i < c-l; i++) {
            let p = this.arrows.find_free_placement(0.05);

            this.arrows.arrows.push(get_arrow(p, add_v2(p, vec2(0.5, 0)), this.next_arrow_type()));
        }

        this.update_arrow_select();
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

    update_arrows_canvas() {
        if (!this.current_image)
            return;

        console.log('resize');

        let ic = this.get_element('image_canvas');
        let ac = this.get_element('arrows_canvas');

        let l = ic.offsetLeft;
        let t = ic.offsetTop;
        let w = ic.clientWidth;
        let h = ic.clientHeight;

        ac.style.setProperty('left', `${ic.offsetLeft}px`);
        ac.style.setProperty('top', `${ic.offsetTop}px`);
        ac.style.setProperty('width', `${ic.clientWidth}px`);
        ac.style.setProperty('height', `${ic.clientHeight}px`);
        ac.setAttribute('width', w);
        ac.setAttribute('height', h);
        //ac.width = ic.width;
        //ac.height = ic.height;
        //ac.top = ic.top;
        //ac.left = ic.left;
        this.arrows.draw(this.get_element('arrows_canvas'));
    }
    
    image_load_input(event) {
        let e = this.get_element('image_load');

        if (!e || !e.files || !e.files.length)
            return;

        let form = e.files[0];

        let reader = new FileReader();
        let e_image = this.get_element('image_canvas');
        let ac = this.get_element('arrows_canvas');
        let _this = this;

        reader.onload = function(e) {
            let image = new Image();
            image.onload = function() {
                _this.current_image = {
                    width: image.width,
                    height: image.height,
                    image: image
                };
                
                _this.update_arrows_canvas();

                _this.draw();
            }

            image.crossOrigin = "anonymous";
            e_image.crossOrigin = "anonymous";

            image.src = e.target.result;
            e_image.src = e.target.result;
        }

        reader.readAsDataURL(form);
    }

    range_opacity_input(event) {
        this.update_opacity();
    }

    range_ui_scale_input(event) {
        this.update_ui_scale();
        this.draw();
    }

    range_focal_length_input(event) {
        this.update_focal_length();
        this.draw();
    }

    range_magnifier_scale_input(event) {
        this.update_magnifier_scale();
    }

    async cookie_save() {
        let str = JSON.stringify(this.arrows);
        document.cookie = `parameters=${str}; path=/; expires=Tue, 19 Jan 2038 04:14:07 GMT`;
    }

    cookie_load() {
        let cookie = document.cookie;
        let target = 'parameters';
        let loaded = false;

        cookie.split(';').forEach((field) => {
            let s = field.split('=');
            if (!s.length)
                return;
            if (s[0].trim() != target)
                return;
            let p = field.substring(s[0].length + 1);
            //console.log('cookie', p);
            this.arrows = Object.assign(Arrows.prototype, JSON.parse(p));
            loaded = true;
        });

        return loaded;
    }

    parameter_load_input(event) {
        let e = this.get_element('parameter_load');

        if (!e || !e.files || !e.files.length)
            return;
        let form = e.files[0];
        let reader = new FileReader();
        let _this = this;

        reader.onload = function(e) {
            _this.arrows = Object.assign(Arrows.prototype, JSON.parse(reader.result));
            _this.draw();
        };

        reader.readAsText(form);
    }

    parameter_save_input(event) {
        const blob = new Blob([JSON.stringify(this.arrows, null, 2)], {
            type: "application/json",
        });
        let e = this.get_element('image_load');
        const elem = window.document.createElement('a');
        elem.href = window.URL.createObjectURL(blob);
        elem.download = 'parameters.json';
        if (this.current_image && e.files[0].name)
            elem.download = e.files[0].name + '_' + elem.download;
        document.body.appendChild(elem);
        elem.click();        
        document.body.removeChild(elem);
    }

    set_ui() {
        let a = this.arrows;
        this.get_element('range_ui_scale').value = (a.arrow_tolerance - 0.75 + 0.5) * 20;
        this.get_element('range_opacity').value = a.opacity;
        this.get_element('range_focal_length').value = a.focal_length * 100;
        this.get_element('range_magnifier_scale').value = a.magnifier_scale * 100;
        this.update_arrow_select();
        this.update_info();
    }

    update_magnifier_scale() {
        this.arrows.magnifier_scale = 0.01 * this.get_element('range_magnifier_scale').value;
    }

    update_ui_scale() {
        let e = this.get_element('range_ui_scale');
        this.arrows.arrow_tolerance = 0.75 + ((e.value*0.05-0.5));
    }

    update_opacity() {
        let e = this.get_element('range_opacity');
        let v = this.arrows.opacity = e.value;
        this.get_element('image_opacity').style.setProperty('opacity', `${v}%`);
    }

    update_focal_length() {
        this.arrows.focal_length = this.get_element('focal_length').value * 0.01;
    }

    update_info() {
        let e = this.get_element('parameter_info');
        let c = this.current_image;

        e.innerHTML = '<p style="text-align: center">Info</p>';
        e.innerHTML += `<p>width: ${c ? c.width : ''}</p>`;
        e.innerHTML += `<p>height: ${c ? c.height : ''}</p>`;
        e.innerHTML += `<p>focal length: ${this.arrows.focal_length.toFixed(3)}</p>`;
        
        {
            let str = '<div id="principal_point_info">';
            str += '<p>Principal Point</p>';
            str += `<p>${str_v2(this.arrows.principal_point)}</p>`;
            str += '</div>';

            e.innerHTML += str;
        }

        for (let i = 0; i < this.arrows.arrows.length; i++) {
            let str = '<div id="arrow_info">';
            let arrow = this.arrows.arrows[i];
            
            str += `<p>${i + 1} ${arrow.axis}</p>`;
            str += `<p>start: ${str_v2(arrow.start)}</p>`;
            str += `<p>end: ${str_v2(arrow.end)}</p>`;
            str += `<p>mag: ${str_v2(arrow.magnitude)}</p>`;
            str += `<p>mag_norm: ${str_v2(arrow.mag_norm)}</p>`;

            let x_int = (arrow.start.y * arrow.mag_norm.y) / (arrow.start.x * arrow.mag_norm.x);

            str += `<p>x_int: ${x_int.toFixed(3)}</p>`;

            str += '</div>';

            e.innerHTML += str;
        }

        for (let i = 0; i < this.arrows.intersections.length; i++) {
            let str = '<div id="axis_info">';
            let intersect = this.arrows.intersections[i];

            str += `<p>${i + 1}</p>`;
            str += `<p>intersect: ${intersect.point.x.toFixed(3)},${intersect.point.y.toFixed(3)}</p>`;
            str += `<p>dot: ${intersect.dot.toFixed(3)}</p>`;
            str += `<p>mag: ${intersect.mag.toFixed(3)}</p>`;
            str += `<p>angle: ${intersect.angle.toFixed(3)}</p>`;
            str += `<p>frac: ${intersect.frac.toFixed(3)}</p>`;
            str += `<p>dot angle: ${intersect.dot_angle.toFixed(3)}</p>`;

            str += '</div>';

            e.innerHTML += str;
        }

        if (this.arrows.camera_rotation_matrix && this.arrows.camera_rotation_matrix.length > 2){
            let str = '<div id="camera_info">';
            let mtx = this.arrows.camera_rotation_matrix;

            str += `<p>Camera</p>`;
            str += `<p>${str_v3(mtx[0])}</p>`;
            str += `<p>${str_v3(mtx[1])}</p>`;
            str += `<p>${str_v3(mtx[2])}</p>`;
            str += `</div>`;

            e.innerHTML += str;
        }
    }

    update_arrow_select() {
        let e = this.get_element('axis_types');
        
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
        this.arrows.draw(this.get_element('arrows_canvas'));
        this.update_info();
        this.cookie_save();
    }

    init() {
        for (let i = 1; i < 4; i++) {
            this.get_element('axis_count').innerHTML +=
                `<option ${i == 1 ? 'selected' : ''} value="${i}">${i}</option>`
        }

        if (!this.cookie_load()) {
            this.axis_count_input();
            this.update_opacity();
            this.update_ui_scale();
            this.update_arrow_select();
        } else {
            this.set_ui();
        }

        this.draw();
    }
}

let prm = new Parameters();

prm.init();

let prm_events = [
    ['body', 'mousemove', function(event){prm.mouse_move(event);}],
    ['body', 'keyup', function(event){prm.key_up(event);}],
    ['body', 'keydown', function(event){prm.key_down(event);}],
    ['body', 'keypress', function(event){prm.key_press(event);}],
    ['body', 'mouseup', function(event){prm.mouse_up(event);}],

    ['arrows_canvas', 'mousedown', function(event){prm.mouse_down(event);}],
    ['arrows_canvas', 'contextmenu', function(event){prm.mouse_down(event);}],
    ['arrows_canvas', 'change', function(event){prm.draw();}],

    ['axis_count', 'input', function(event){prm.axis_count_input(event);}],
    ['image_load', 'input', function(event){prm.image_load_input(event);}],
    ['range_opacity', 'input', function(event){prm.range_opacity_input(event);}],
    ['range_ui_scale', 'input', function(event){prm.range_ui_scale_input(event);}],
    ['parameter_save', 'click', function(event){prm.parameter_save_input(event);}],
    ['parameter_load', 'input', function(event){prm.parameter_load_input(event);}],
    ['focal_length', 'input', function(event){prm.range_focal_length_input(event);}],
    ['magnifier_scale', 'input', function(event){prm.range_magnifier_scale_input(event);}],
];

prm_events.forEach((field) => {
    prm.add_event(field[0], field[1], field[2]);
});

new ResizeObserver(() => prm.update_arrows_canvas()).observe(prm.get_element('parameter_images'));

prm.image_load_input();