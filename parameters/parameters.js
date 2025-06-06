function put_pixel(data, offset, data) {
    for (let i = 0; i < 4; i++) {
        data[offset + i] = data[i];
    }
}

function get_offset(x, y, w) {
    return Math.round(Math.round(y) * w + x) * 4;
}

function str_v(v, digits=3) {
    if (v != null && v != undefined)
        return v.toFixed(digits);
    return "NULL";
}

function str_vs(v, c, digits=3) {
    let str = '';
    for (let i = 0; i < c; i++)
        str += `${str_v(v[col_m(i)], digits)}${i == c-1 ? '\n' : ', '}`;
    return str;
}

function str_v2(v, digits=3) {
    //return `${v.x.toFixed(digits)}, ${v.y.toFixed(digits)}`;
    return str_vs(v, 2, digits);
}

function str_v3(v, digits=3) {
    //return `${v.x.toFixed(digits)}, ${v.y.toFixed(digits)}, ${v.z.toFixed(digits)}`;
    return str_vs(v, 3, digits);
}

function str_m(m, r, c, digits=3) {
    let str = '';
    for (let i = 0; i < r; i++) {
        str += str_vs(m[i], c, digits);
        //for (let j = 0; j < c; j++) {
        //    str += `${m[i][col_m(j)].toFixed(digits)}${j == c-1 ? '\n' : ', '}`;
        //}    
    }
    return str.trimEnd();
}

function str_m3(m, digits=3) {
    return str_m(m, 3, 3, digits);
    //return `${str_v3(m[0],digits)}\n${str_v3(m[1],digits)}\n${str_v3(m[2],digits)}`;
}

function str_m4(m, digits=3) {
    return str_m(m, 4, 4, digits);
}

function vec(w) {
    let v = {};
    for (let i = 0; i < w; i++)
        v[['x','y','z','w'][i]] = 0;
    return v;
}

function mat(w,h) {
    let m = [];
    for (let i = 0; i < h; i++)
        m.push(vec(w));
    return m;
}

function vec2(x,y) {
    return {x:x, y:y};
}

function vec3(x,y,z) {
    return {x:x, y:y, z:z};
}

function vec4(x,y,z,w) {
    return {x,y,z,w};
}

function get_arrow(v1, v2, axis) {
    return {start:v1, end:v2, axis:axis, primary_axis:axis.replace('-','')};
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

function op_v4(v1, v2, op) {
    return vec4(
        op(v1.x, v2.x),
        op(v1.y, v2.y),
        op(v1.z, v2.z),
        op(v1.w, v2.w)
    );
}

function op_m2_v2(m, v, op) {
    return {
        x:(op(m[0].x, v.x) + op(m[0].y, v.y)),
        y:(op(m[1].x, v.x) + op(m[1].y, v.y))
    };
}

function op_span_v2(v, op) {
    return op(v.x, v.y);
}

function op_span_v3(v, op) {
    return op(op(v.x, v.y), v.z);
}

function op_span_v4(v, op) {
    return op(op(op(v.x, v.y), v.z), v.w);
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

function add_v3(v1, v2) {
    return op_v3(v1, v2, op_add);
}

function add_v4(v1, v2) {
    return op_v4(v1, v2, op_add);
}

function mul_v2(v1, v2) {
    return op_v2(v1, v2, op_mul);
}

function mul_v3(v1, v2) {
    return op_v3(v1, v2, op_mul);
}

function mul_v4(v1, v2) {
    return op_v4(v1, v2, op_mul);
}

function mul_v2_f(v, f) {
    return mul_v2(v, vec2(f,f));
}

function mul_v3_f(v, f) {
    return mul_v3(v, vec3(f,f,f));
}

function mul_v4_f(v, f) {
    return mul_v4(v, vec4(f,f,f,f));
}

function mul_m2_v2(m, v) {
    return op_m2_v2(m, v, op_mul);
}

function mul_m3_v3(m, v) {
    return vec3(
        op_span_v3(mul_v3(m[0], v), op_add),
        op_span_v3(mul_v3(m[1], v), op_add),
        op_span_v3(mul_v3(m[2], v), op_add)
    );
}

function mul_m4_v4(m, v, perspective_divide = false) {
    let r = vec4(
        op_span_v4(mul_v4(m[0], v), op_add),
        op_span_v4(mul_v4(m[1], v), op_add),
        op_span_v4(mul_v4(m[2], v), op_add),
        op_span_v4(mul_v4(m[3], v), op_add)
    );

    if (perspective_divide) {
        r.x /= r.w;
        r.y /= r.w;
        r.z /= r.w;
    }

    return r;
}

function xy_m3(m, row, col) {
    return m[row][['x','y','z','w'][col]];
}

function col_m(col) {
    return ['x','y','z','w'][col];
}

function left_op_m(m1, m2, cc, rc, op) {
    let output = mat(cc, rc);

    for (let r = 0; r < rc; r++) {
        for (let c = 0; c < cc; c++) {
            let sum = 0;

            for (let sr = 0; sr < rc; sr++) {
                sum += op(xy_m3(m1, sr, c), xy_m3(m2, r, sr));
            }

            output[r][col_m(c)] = sum;
        }
    }

    return output;
}

//left multiply
function mul_m3(m1, m2) {
    return left_op_m(m1, m2, 3, 3, op_mul);
}

function mul_m4(m1, m2) {
    return left_op_m(m1, m2, 4, 4, op_mul);
}

//left divide?
function div_m3(m1, m2) {

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

function sum_v2(v) {
    return op_span_v2(v, op_add);
}

function sum_v3(v) {
    return op_span_v3(v, op_add);
}

function abs_v2(v) {
    return vec2(Math.abs(v.x), Math.abs(v.y));
}

function product_v2(v) {
    return op_span_v2(v, op_mul);
}

function distance_nosqrt_v2(v1, v2) {
    let diff = sub_v2(v2, v1);
    diff = mul_v2(diff, diff);
    return sum_v2(diff);
}

function distance_v3(v1, v2) {
    let diff = sub_v3(v2, v1);
    return Math.sqrt(sum_v3(mul_v3(diff, diff)));
}

function distance_v2(v1, v2) {
    let diff = sub_v2(v2, v1);
    return Math.sqrt(sum_v2(mul_v2(diff, diff)));
}

function length_v2(v) {
    return distance_v2(v, vec2(0,0));
}

function length_v3(v) {
    return distance_v3(v, vec3(0,0,0));
}

function norm_v2(v) {
    return vec2(v.x * .5 + .5, v.y * .5 + .5);
}

function clip_v2(v, min_f, max_f) {
    return {
        x:v.x > max_f ? max_f : v.x < min_f ? min_f : v.x,
        y:v.y > max_f ? max_f : v.y < min_f ? min_f : v.y
    };
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
    var n = norm_v2(v);
    return vec2(n.x * w, n.y * h);
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

function dupe_v3(v) {
    return vec3(v.x, v.y, v.z);
}

function dupe_v4(v) {
    return vec4(v.x, v.y, v.z, v.w);
}

function dupe_m4(m) {
    return [
        dupe_v4(m[0]),
        dupe_v4(m[1]),
        dupe_v4(m[2]),
        dupe_v4(m[3]),
    ];
}

function matrix2(v1, v2) {
    return [
        dupe_v2(v1),
        dupe_v2(v2)
    ];
}

//s as values in diagonal 4x4 matrix
function matrix4(s) {
    return [
        vec4(s, 0, 0, 0),
        vec4(0, s, 0, 0),
        vec4(0, 0, s, 0),
        vec4(0, 0, 0, s)
    ];
}

function vec4_v3(v, w=0) {
    return vec4(v.x, v.y, v.z, w);
}

function vec4_v2(v, z=0, w=0) {
    return vec4(v.x, v.y, z, w);
}

function matrix4_m3(m) {
    return [
        vec4_v3(m[0]),
        vec4_v3(m[1]),
        vec4_v3(m[2]),
        vec4(0,0,0,1)
    ]
}

function rotation_m2(radians) {
    let c = Math.cos(radians);
    let s = Math.sin(radians);
    return [
        {x:c,y:-s},
        {x:s,y:c}
    ];
}

function translate_m4(m, translation) {
    let r = dupe_m4(m), t = translation;
    let v = mul_m4_v4(m, translation);
    //r[0].w += (t.x * m[0].x) + (t.y * m[0].y) + (t.z * m[0].z);
    //r[1].w += (t.x * m[1].x) + (t.y * m[1].y) + (t.z * m[1].z);
    //r[2].w += (t.x * m[2].x) + (t.y * m[2].y) + (t.z * m[2].z);
    r[0].w = v.x;
    r[1].w = v.y;
    r[2].w = v.z;
    return r;
}

function set_translate_m4(m, translation) {
    let r = dupe_m4(m), t = translation;
    r[0].w = t.x;
    r[1].w = t.y;
    r[2].w = t.z;
    return r;
}

/*
function translate_v3_m4(m, t) {
    let r = vec3(0,0,0);
    r.x = (t.x * m[0].x) + (t.y * m[0].y) + (t.z * m[0].z) + m[0].w;
    r.y = (t.x * m[1].x) + (t.y * m[1].y) + (t.z * m[1].z) + m[1].w;
    r.z = (t.x * m[2].x) + (t.y * m[2].y) + (t.z * m[2].z) + m[2].w;
    return r;
}
*/

function translation_m4(translation) {
    return [
        vec4(1,0,0,translation.x),
        vec4(0,1,0,translation.y),
        vec4(0,0,1,translation.z),
        vec4(0,0,0,1)
    ];
}

function determinant_m2(m) {
    return (m[0].x * m[1].y) - (m[1].x * m[0].y);
}

function determinant_m3(m) {
    return (m[0].x * m[1].y * m[2].z) +
           (m[0].y * m[1].z * m[2].x) +
           (m[0].z * m[1].x * m[2].y) -
           (m[0].x * m[1].z * m[2].y) -
           (m[0].y * m[1].x * m[2].z) -
           (m[0].z * m[1].y * m[2].x);
}

function inverse_m2(m) {
    let d = 1 / determinant_m2(m);
    
    return [
        vec2(m[1].y * d, m[0].y * d),
        vec2(m[1].x * d, m[0].x * d),
    ]
}

function inverse_m3(m) {
    let det = determinant_m3(m);

    return [
        {
            x:(m[1].y * m[2].z - m[1].z * m[2].y) / det,
            y:(m[0].z * m[2].y - m[0].y * m[2].z) / det,
            z:(m[0].y * m[1].z - m[0].z * m[1].y) / det
        },
        {
            x:(m[1].z * m[2].x - m[1].x * m[2].z) / det,
            y:(m[0].x * m[2].z - m[0].z * m[2].x) / det,
            z:(m[0].z * m[1].x - m[0].x * m[1].z) / det
        },
        {
            x:(m[1].x * m[2].y - m[1].y * m[2].x) / det,
            y:(m[0].y * m[2].x - m[0].x * m[2].y) / det,
            z:(m[0].x * m[1].y - m[0].y * m[1].x) / det
        }
    ];
}

function determinant_m4(m) {
    return (
        m[0].w * m[1].z * m[2].y * m[3].x - m[0].z * m[1].w * m[2].y * m[3].x - 
        m[0].w * m[1].y * m[2].z * m[3].x + m[0].y * m[1].w * m[2].z * m[3].x + 
        m[0].z * m[1].y * m[2].w * m[3].x - m[0].y * m[1].z * m[2].w * m[3].x - 
        m[0].w * m[1].z * m[2].x * m[3].y + m[0].z * m[1].w * m[2].x * m[3].y + 
        m[0].w * m[1].x * m[2].z * m[3].y - m[0].x * m[1].w * m[2].z * m[3].y - 
        m[0].z * m[1].x * m[2].w * m[3].y + m[0].x * m[1].z * m[2].w * m[3].y + 
        m[0].w * m[1].y * m[2].x * m[3].z - m[0].y * m[1].w * m[2].x * m[3].z - 
        m[0].w * m[1].x * m[2].y * m[3].z + m[0].x * m[1].w * m[2].y * m[3].z + 
        m[0].y * m[1].x * m[2].w * m[3].z - m[0].x * m[1].y * m[2].w * m[3].z - 
        m[0].z * m[1].y * m[2].x * m[3].w + m[0].y * m[1].z * m[2].x * m[3].w + 
        m[0].z * m[1].x * m[2].y * m[3].w - m[0].x * m[1].z * m[2].y * m[3].w - 
        m[0].y * m[1].x * m[2].z * m[3].w + m[0].x * m[1].y * m[2].z * m[3].w
    ); 
}

function inverse_m4(m) {
    let det = determinant_m4(m);

    return [
        {
            x: (m[1].z * m[2].w * m[3].y - m[1].w * m[2].z * m[3].y + m[1].w * m[2].y * m[3].z - m[1].y * m[2].w * m[3].z - m[1].z * m[2].y * m[3].w + m[1].y * m[2].z * m[3].w)/det,
            y: (m[0].w * m[2].z * m[3].y - m[0].z * m[2].w * m[3].y - m[0].w * m[2].y * m[3].z + m[0].y * m[2].w * m[3].z + m[0].z * m[2].y * m[3].w - m[0].y * m[2].z * m[3].w)/det,
            z: (m[0].z * m[1].w * m[3].y - m[0].w * m[1].z * m[3].y + m[0].w * m[1].y * m[3].z - m[0].y * m[1].w * m[3].z - m[0].z * m[1].y * m[3].w + m[0].y * m[1].z * m[3].w)/det,
            w: (m[0].w * m[1].z * m[2].y - m[0].z * m[1].w * m[2].y - m[0].w * m[1].y * m[2].z + m[0].y * m[1].w * m[2].z + m[0].z * m[1].y * m[2].w - m[0].y * m[1].z * m[2].w)/det
        },
        {
            x: (m[1].w * m[2].z * m[3].x - m[1].z * m[2].w * m[3].x - m[1].w * m[2].x * m[3].z + m[1].x * m[2].w * m[3].z + m[1].z * m[2].x * m[3].w - m[1].x * m[2].z * m[3].w)/det,
            y: (m[0].z * m[2].w * m[3].x - m[0].w * m[2].z * m[3].x + m[0].w * m[2].x * m[3].z - m[0].x * m[2].w * m[3].z - m[0].z * m[2].x * m[3].w + m[0].x * m[2].z * m[3].w)/det,
            z: (m[0].w * m[1].z * m[3].x - m[0].z * m[1].w * m[3].x - m[0].w * m[1].x * m[3].z + m[0].x * m[1].w * m[3].z + m[0].z * m[1].x * m[3].w - m[0].x * m[1].z * m[3].w)/det,
            w: (m[0].z * m[1].w * m[2].x - m[0].w * m[1].z * m[2].x + m[0].w * m[1].x * m[2].z - m[0].x * m[1].w * m[2].z - m[0].z * m[1].x * m[2].w + m[0].x * m[1].z * m[2].w)/det
        },
        {
            x: (m[1].y * m[2].w * m[3].x - m[1].w * m[2].y * m[3].x + m[1].w * m[2].x * m[3].y - m[1].x * m[2].w * m[3].y - m[1].y * m[2].x * m[3].w + m[1].x * m[2].y * m[3].w)/det,
            y: (m[0].w * m[2].y * m[3].x - m[0].y * m[2].w * m[3].x - m[0].w * m[2].x * m[3].y + m[0].x * m[2].w * m[3].y + m[0].y * m[2].x * m[3].w - m[0].x * m[2].y * m[3].w)/det,
            z: (m[0].y * m[1].w * m[3].x - m[0].w * m[1].y * m[3].x + m[0].w * m[1].x * m[3].y - m[0].x * m[1].w * m[3].y - m[0].y * m[1].x * m[3].w + m[0].x * m[1].y * m[3].w)/det,
            w: (m[0].w * m[1].y * m[2].x - m[0].y * m[1].w * m[2].x - m[0].w * m[1].x * m[2].y + m[0].x * m[1].w * m[2].y + m[0].y * m[1].x * m[2].w - m[0].x * m[1].y * m[2].w)/det
        },
        {
            x: (m[1].z * m[2].y * m[3].x - m[1].y * m[2].z * m[3].x - m[1].z * m[2].x * m[3].y + m[1].x * m[2].z * m[3].y + m[1].y * m[2].x * m[3].z - m[1].x * m[2].y * m[3].z)/det,
            y: (m[0].y * m[2].z * m[3].x - m[0].z * m[2].y * m[3].x + m[0].z * m[2].x * m[3].y - m[0].x * m[2].z * m[3].y - m[0].y * m[2].x * m[3].z + m[0].x * m[2].y * m[3].z)/det,
            z: (m[0].z * m[1].y * m[3].x - m[0].y * m[1].z * m[3].x - m[0].z * m[1].x * m[3].y + m[0].x * m[1].z * m[3].y + m[0].y * m[1].x * m[3].z - m[0].x * m[1].y * m[3].z)/det,
            w: (m[0].y * m[1].z * m[2].x - m[0].z * m[1].y * m[2].x + m[0].z * m[1].x * m[2].y - m[0].x * m[1].z * m[2].y - m[0].y * m[1].x * m[2].z + m[0].x * m[1].y * m[2].z)/det
        }
    ];
}

function cross_v3(v1, v2) {
    return vec3(
        (v1.y * v2.z) - (v1.z * v2.y),
        (v1.z * v2.x) - (v1.x * v2.z),
        (v1.x * v2.y) - (v1.y * v2.x)
    );
}

function dot_v2(v1, v2) {
    return sum_v2(mul_v2(v1, v2));
}

function midpoint_v2(v1, v2) {
    return add_v2(mul_v2_f(sub_v2(v1, v2), 0.5), v2);
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
    if (distance_nosqrt_v2(v1, point) < distance_nosqrt_v2(v2, point))
        return v1;
    return v2;
}

function emplace_pixel(data, pixel, x, y, width, height) {
    let offset = get_offset(x, y, width);
    for (let i = 0; i < 4; i++)
        data[offset + i] = pixel[i];
}

/*

    To-Do

    * Optional separate image shift and manual principal point

*/

class Arrows {
    arrows = [];
    arrow_placement = {};
    vanishing_points = [];
    camera_rotation_matrix = [];
    view_transform_matrix = [];
    projection_matrix = [];
    calculated_principal_point = vec2(0,0);
    calculated_third_vanishing_point = vec2(0,0);
    principal_point = vec2(0,0);
    axis_view_origin = vec2(0,0);
    focal_length = 1;
    opacity = 50;
    magnifier_scale = .1;
    horizontal_fov = 0;
    axis_types = {
        'x': 'red',
        '-x': 'red',
        'y': 'lime',
        '-y': 'lime',
        'z': 'dodgerblue',
        '-z': 'dodgerblue'
    };
    arrow_tolerance = 1;
    debug_mode = false;

    get_tolerance(size) {
        return this.arrow_tolerance / Math.sqrt((size.x * size.y * 3));
        //return normalize_v3(vec3(size.x, size.y, this.arrow_tolerance)).z;
        //return this.arrow_tolerance;
    }

    find_alt_moveable(mpos, tolerance) {
        let alt_moveable = [
            this.principal_point,
            this.axis_view_origin,
        ];

        let ret = undefined;

        alt_moveable.forEach(function (vector) {
            if (distance_nosqrt_v2(vector, mpos) <= tolerance)
                ret = {arrow:undefined, vector:vector, distance:tolerance};
        }.bind(this));

        return ret;
    }

    find_arrow_by_mousepos_first(mpos, tolerance) {
        let ret = undefined;
        let vec = undefined;
        let val = undefined;

        if (ret = this.find_alt_moveable(mpos, tolerance))
            return ret;

        this.arrows.forEach(arrow => {
            let a = distance_nosqrt_v2(arrow.start, mpos);
            let b = distance_nosqrt_v2(arrow.end, mpos);

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

        if (closest = this.find_alt_moveable(mpos, tolerance))
            return closest;

        this.arrows.forEach(arrow => {
            let a = distance_nosqrt_v2(arrow.start, mpos);
            let b = distance_nosqrt_v2(arrow.end, mpos);

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

    intersection(line1, line2) {
        let v1 = line1.start;
        let v2 = line1.end;
        let v3 = line2.start;
        let v4 = line2.end;

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

    find_intersection(a1, a2) {
        return this.intersection(a1, a2);
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
        
        let prim_scale = 0.1;

        function draw_point(vector, scale=undefined) {
            let sc = scale ? scale : prim_scale;
            let s = screen_v(mul_v2_f(vector, sc), size);
            ctx.beginPath();
            ctx.arc(s.x, s.y, radius, 0, Math.PI * 2);
            ctx.stroke();
        }

        function draw_line(line, scale=undefined) {
            let sc = scale ? scale : prim_scale;
            let a = mul_v2_f(line.start, sc);
            let b = mul_v2_f(line.end, sc);
            let sa = screen_v(a, size);
            let sb = screen_v(b, size);
            ctx.beginPath();    
            ctx.moveTo(sa.x, sa.y);
            ctx.lineTo(sb.x, sb.y);
            ctx.stroke();
        }

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

        this.vanishing_points.forEach(intersect => {
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
        let as = 1;
        let av = [vec4(as,0,0,1),vec4(0,as,0,1),vec4(0,0,as,1)];
        let cam = this.camera_rotation_matrix;
        let inv = this.view_transform_matrix;
        let mat = this.camera_transform_matrix;

        if (cam && inv && cam.length && inv.length) {

        //let unproj_matrix = inverse
        //let o = this.get_3d_origin(this.axis_view_origin, this.principal_point, this.focal_length, -1);
        let o = vec4_v2(this.axis_view_origin, -1, 1);
        let ss = -1;
        let off = vec4(ss * -o.x, ss * -o.y, 1 * ss, 1.0);
        //this.inverse_matrix = mul_m4(this.projection_matrix, this.view_transform_matrix);
        this.inverse_matrix = inverse_m4(this.projection_matrix);
        //this.inverse_matrix = set_translate_m4(this.inverse_matrix, this.get_3d_origin(o, this.principal_point, this.focal_length));
        //let mat = this.inverse_matrix = mul_m4(this.inverse_matrix, this.camera_transform_matrix);
        //o = mul_v4_f(o, 4);
        //o = mul_m4_v4(this.camera_transform_matrix, o);
        //this.view_transform_matrix = translate_m4(this.view_transform_matrix, o);
        //this.camera_transform_matrix = set_translate_m4(this.camera_transform_matrix, o);
        //this.view_transform_matrix = inverse_m4(this.camera_transform_matrix);
        this.view_transform_matrix = set_translate_m4(this.view_transform_matrix, o);
        //this.view_transform_matrix = mul_m4(this.projection_matrix, this.view_transform_matrix);
        //this.view_transform_matrix = set_translate_m4(this.view_transform_matrix, o);
        //this.view_transform_matrix = mul_m4(this.view_transform_matrix, this.projection_matrix);
        this.matrix = mul_m4(this.projection_matrix, this.view_transform_matrix);
        //this.matrix = mul_m4(this.projection_matrix, this.camera_transform_matrix);
        //this.matrix = this.view_transform_matrix;
        //this.matrix = inverse_m4(this.view_transform_matrix);
        //this.matrix = mul_m4(this.view_transform_matrix, this.projection_matrix);
        //this.matrix = set_translate_m4(this.matrix, o);
        //this.matrix = mul_m4(this.matrix, translation_m4(o));
        //this.view_transform_matrix = translate_m4(matrix4_m3(cam), vec4(0,0,0,0));
        //let inverse_projection = inverse_m4(this.projection_matrix);
        //this.matrix = mul_m4(this.view_transform_matrix, this.projection_matrix);
        //this.inverse_matrix = inverse_m4(this.matrix);
        //let off_world = translate_v3_m4(this.view_transform_matrix, off);
        //let off_world_proj = translate_v3_m4(this.projection_matrix, off_world);
        //let off_world = mul_m4_v4(this.view_transform_matrix, off);
        //let off_world_proj = mul_m4_v4(this.inverse_matrix, off);
        let project = function get_projection(point) {
            //let t = mul_m4_v4(this.view_transform_matrix, off);
            //return add_v4(t, point);
            let b = mul_m4_v4(this.matrix, point);
            return b;
        }.bind(this);

        //let off_world_proj = mul_m4_v4(mat, vec4(0, 0, 0, 1));
        //off_world_proj = project(vec4(0,0,0,1));

        //console.log('off:', off);
        //console.log('off_world:', off_world);
        //console.log('off_world_proj:', off_world_proj);

        let points = [];
        for (let i = 0; i < 3; i++) {
            let ax = av[i];
            //ax = add_v4(off_world, ax);
            //let v = translate_v3_m4(this.matrix, av[i]);
            //v = mul_m4_v4(this.projection_matrix, v);
            //let v = translate_v3_m4(this.view_transform_matrix, ax);
            //let v = mul_m4_v4(this.view_transform_matrix, ax);
            let v = ax;
            //v = add_v4(v, off_world_proj);
            //v = translate_v3_m4(this.projection_matrix, v);
            //v = mul_m4_v4(mat, v);
            v = project(v);
            //v = add_v4(v, off_world);
            //let v = translate_v3_m4(this.pro)
            //let p = this.project_v3(v);
            let p = vec2(v.x, v.y);
            console.log('v:',str_v3(v),'p:',str_v2(p));

            let s = screen_v(p, size);
            let c = screen_v(o, size);
            //c = screen_v(project(o), size);
            c = screen_v(project(vec4(0,0,0,1)), size);

            points.push(s);

            ctx.strokeStyle = ["red", "lime", "dodgerblue"][ii++];

            ctx.beginPath();
            ctx.moveTo(c.x, c.y);
            ctx.lineTo(s.x, s.y);
            ctx.stroke();
        }
        ctx.strokeStyle = "black";
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        ctx.lineTo(points[1].x, points[1].y);
        ctx.lineTo(points[2].x, points[2].y);
        ctx.lineTo(points[0].x, points[0].y);
        ctx.stroke();

        draw_point(this.axis_view_origin, 1);
        }

        {
            let s = screen_v(this.principal_point, size);

            ctx.strokeStyle = "orange";

            ctx.beginPath();
            
            ctx.arc(s.x, s.y, radius, 0, Math.PI * 2);

            ctx.stroke();
        }


        if (this.vanishing_points.length > 1 && this.tv && this.oc && this.debug_mode)
        {
            let a = this.vanishing_points[0].point;
            let b = this.vanishing_points[1].point;

            let sa = screen_v(a, size);
            let sb = screen_v(b, size);

            ctx.strokeStyle = "magenta";
            ctx.lineWidth = this.arrow_tolerance * 0.5;

            draw_line({start:a,end:b});
            
            draw_line(this.tv.line1);
            draw_line(this.tv.line2);
            

            let cpp = this.calculated_principal_point;
            ctx.strokeStyle = "black";
            draw_line({start:this.oc.v1, end:cpp});
            draw_line({start:this.oc.v2, end:cpp});
            draw_line({start:this.oc.v3, end:cpp});

            ctx.strokeStyle = "aqua";
            draw_line(this.oc.line1);
            draw_line(this.oc.line2);
            draw_point(this.oc.v1);
            draw_point(this.oc.v2);
            draw_point(this.oc.v3);

            draw_point(this.calculated_principal_point);
        }
    }

    project_v3(v) {
        //let p = this.principal_point;
        //let f = this.focal_length;
        //let d2 = vec2(v.x / v.z, v.y / v.z);
        //return mul_v2_f(d2, f);
        //return vec2(v.x * p.x + v.x * f, v.y * p.y + v.y * f);
        //return mul_v2_f(v, 1/v.z);
        return vec2(v.x / v.z, v.y / v.z);
    }

    third_vertex(v1, v2, p) {
        let a_prime = sub_v2(p, v1);
        let dir_v2_v1 = normalize_v2(sub_v2(v2, v1));
        let dir_a_prime = normalize_v2(a_prime);
        let length_a_prime = length_v2(a_prime);

        let dot = dot_v2(dir_v2_v1, dir_a_prime);
        let theta = Math.acos(dot);
        let hypotenuse = distance_v2(v1, v2);
        let opposite = Math.sin(theta) * hypotenuse;
        let adjacent = Math.sqrt(opposite * opposite + hypotenuse * hypotenuse);

        let b_prime_to_v1 = mul_v2_f(dir_a_prime, adjacent);
        let b_prime = sub_v2(b_prime_to_v1, v2);

        let length_mp = Math.cos(theta) * length_a_prime;
        let mp = mul_v2_f(dir_v2_v1, length_mp);
        mp = add_v2(mp, v1);

        let line1 = {start:mp, end:p};
        let line2 = {start:v2, end:b_prime};

        this.tv = {line1, line2};

        return this.find_intersection(line1, line2);
    }

    ortho_center(v1, v2, v3) {
        let dir_v1_v3 = normalize_v2(sub_v2(v1, v3));
        let dir_v2_v3 = normalize_v2(sub_v2(v2, v3));

        let slope13 = dir_v1_v3.y / dir_v1_v3.x;
        let slope23 = dir_v2_v3.y / dir_v2_v3.x;

        let perp13 = -1 / slope13;
        let perp23 = -1 / slope23;

        let line1 = {start:v2, end:sub_v2(v2, vec2(1, perp13))};
        let line2 = {start:v1, end:add_v2(v1, vec2(1, perp23))};

        this.oc = {line1, line2, v1, v2, v3};

        return this.find_intersection(line1, line2);
    }

    get_focal_length(vu, vv, p) {
        let dirFuFv = sub_v2(vu, vv);
        dirFuFv = normalize_v2(dirFuFv);
        let vp = sub_v2(p, vv);
        let proj = dot_v2(dirFuFv, vp);
        let uvp = add_v2(mul_v2_f(dirFuFv, proj), vv);

        let ppuv = length_v2(sub_v2(p, uvp));
        let vpuv = length_v2(sub_v2(vv, uvp));
        let upuv = length_v2(sub_v2(vu, uvp));

        let suv = vpuv * upuv - ppuv * ppuv;

        return Math.sqrt(suv);
    }

    get_focal_length_absolute(focal_length_relative, width) {
        return (width * (focal_length_relative * 0.5));
    }

    get_field_of_view(focal_length_relative, mm, w, ar=1) {
        //let sw = w * ar;
        //let 
        //(360 * Math.atan(32/(2*focal_length_relative))) / Math.PI
        return (360 * Math.atan(ar/focal_length_relative)) / Math.PI;
    }

    solve_arrow_placement(arrows) {
        let arrows_by_axis = {};

        for (let i = 0; i < arrows.length; i++) {
            let arrow = arrows[i];

            if (!arrows_by_axis[arrow.primary_axis])
                arrows_by_axis[arrow.primary_axis] = [];

            arrow.direction = arrow.primary_axis == arrow.axis ? 1 : -1;

            arrows_by_axis[arrow.primary_axis].push(arrow);
        }

        let filtered_axis = {};

        for (const [axis, arrows] of Object.entries(arrows_by_axis)) {
            if (!arrows || arrows.length < 1 || arrows.length > 2)
                continue;

            if (!filtered_axis[axis])
                filtered_axis[axis] = [];

            filtered_axis[axis] = arrows;
        }

        return filtered_axis;
    }

    get_axis_vector(axis) {
        switch (axis) {
            case 'x': return vec4(1,0,0,0);
            case 'y': return vec4(0,1,0,0);
            case 'z': return vec4(0,0,1,0);
        }
        return vec4(0,0,0,0);
    }

    get_axis_vector_matrix(vanishing_points) {
        let axis = ['x','y','z'].filter(function(x) { vanishing_points.find(v => v.axis == x) });

        let vv = {
            'x': 0,
            'y': 1,
            'z': 2
        };

        let m = matrix4(0);

        for (let i = 0; i < vanishing_points.length; i++) {
            let v = vanishing_points[i];
            //m[] = v.axis_vector;
        }
    }

    solve_vanishing_points(arrow_placement) {
        let vanishing_points = [];

        for (const [axis, arrows] of Object.entries(arrow_placement)) {
            if (arrows.length != 2)
                continue;

            let a = arrows[0];
            let b = arrows[1];

            let vanishing_point = {
                point:this.find_intersection(a, b),
                dot:sum_v2(mul_v2(a.mag_norm, b.mag_norm)),
                int_mag_norm:normalize_v2(add_v2(a.mag_norm, b.mag_norm)),
                a:a,
                b:b,
                axis:axis,
                axis_vector:this.get_axis_vector(axis),
            };

            vanishing_point.angle = Math.acos(vanishing_point.dot) / Math.PI * 180;

            vanishing_points.push(vanishing_point);
        }

        return vanishing_points;
    }

    solve_supplemental_axis(arrow_placement) {
        let supplemental = [];

        for (const [axis, arrows] of Object.entries(arrow_placement)) {
            if (arrows.length != 1)
                continue;

            supplemental.push(arrows[0]);
        }

        return supplemental;
    }

    solve_arrows(arrows) {
        arrows.forEach(function(arrow) {
            arrow.magnitude = sub_v2(arrow.start, arrow.end);
            arrow.mag_norm = normalize_v2(arrow.magnitude);
        }.bind(this));
        return arrows;
    }

    solve_2vp_supplemental() {
        let vns = this.vanishing_points;
        let vn1 = vns[0].point, vn2 = vns[1].point;
        this.focal_length = this.get_focal_length(vn1, vn2, this.principal_point);
        this.horizontal_fov = this.get_field_of_view(this.focal_length, 35, 1, 1);
        this.calculated_third_vanishing_point = this.third_vertex(vn1, vn2, this.principal_point);
        return [vn1, vn2, this.calculated_third_vanishing_point, this.principal_point, this.focal_length];
    }

    solve_3vp_supplemental() {
        let vns = this.vanishing_points;
        let vn1 = vns[0].point, vn2 = vns[1].point, vn3 = vns[2].point;
        this.horizontal_fov = this.get_field_of_view(this.focal_length, 35, 1, 1);
        this.calculated_principal_point = this.ortho_center(vn1, vn2, vn3);
        this.focal_length = this.get_focal_length(vn1, vn2, this.calculated_principal_point);
        return [vn1, vn2, vn3, this.calculated_principal_point, this.focal_length];
    }

    get_transform_matrix(rotation_matrix, translation, scale=1) {
        let r = rotation_matrix, t = translation, s = scale;
        return [
            vec4(r[0].x, r[0].y, r[0].z, scale),
            vec4(r[1].x, r[1].y, r[1].z, scale),
            vec4(r[2].x, r[2].y, r[2].z, scale),
            vec4(t.x   , t.y   , t.z   , 1    ),
        ];
    }

    get_projection_matrix(focal_length_relative, principal_point, ar) {
        let f = focal_length_relative / 2;
        let p = principal_point;

        return [
            vec4(1/f   , 0     , p.x   , 0     ),
            vec4(0     , 1/f*ar, p.y   , 0     ),
            vec4(0     , 0     , -1     , 0     ),
            vec4(0     , 0     , 0     , 1     ),
        ];
    }

    solve_projection_matrix(view_transform_matrix, projection_matrix) {

    }

    get_vanishing_point(vn, p, f) {
        let point = vec3(vn.x - p.x, vn.y - p.y, -f);
        point.length = length_v3(point);
        point.normalized = normalize_v3(point);
        return point;
    }

    get_3d_origin(origin_2d, principal_point, focal_length_relative, z=-1) {
        let k = 2 / focal_length_relative;
        return vec4(
            k * (origin_2d.x - principal_point.x),
            k * (origin_2d.y - principal_point.y),
            z,
            1
        );
    }

    get_view_transform_matrix(rotation_matrix, unit_vector_matrix, origin_3d) {
        let view_transform_matrix = mul_m4(unit_vector_matrix, rotation_matrix);
        //view_transform_matrix = translate_m4(view_transform_matrix, origin_3d);
        //view_transform_matrix[0].w = origin_3d.x;
        //view_transform_matrix[1].w = origin_3d.y;
        //view_transform_matrix[2].w = origin_3d.z;
        this.camera_transform_matrix = inverse_m4(view_transform_matrix);
        this.rotation_matrix = inverse_m3(rotation_matrix);
        return view_transform_matrix;
    }
    
    solve_1vp() {

    }

    solve_2vp() {
        let v = this.solve_2vp_supplemental();

        let vn1 = v[0];
        let vn2 = v[1];
        let p = v[3];
        let f = v[4];

        let OFu = this.get_vanishing_point(vn1, p, f);
        let OFv = this.get_vanishing_point(vn2, p, f);

        let s1 = OFu.length;
        let s2 = OFv.length;

        let vpRc = OFv.normalized;
        let upRc = OFu.normalized;
        let wpRc = cross_v3(upRc, vpRc);

        this.camera_rotation_matrix = [
            normalize_v3(vec3(OFu.x / s1, OFv.x / s2, wpRc.x)),
            normalize_v3(vec3(OFu.y / s1, OFv.y / s2, wpRc.y)),
            normalize_v3(vec3(-f / s1, -f / s2, wpRc.z))
        ];

        //this.view_transform_matrix = mul_m3(this.camera_rotation_matrix, [vec3(1,0,0),vec3(0,1,0),vec3(0,0,1)]);
        //this.view_transform_matrix = inverse_m3(this.view_transform_matrix);
        this.origin_3d = this.get_3d_origin(this.axis_view_origin, p, f);

        this.view_transform_matrix = 
            this.get_view_transform_matrix(
                matrix4_m3(this.camera_rotation_matrix), 
                matrix4(1),
                this.origin_3d
            );

        this.projection_matrix = this.get_projection_matrix(f, p, 1);
    }

    solve_3vp() {
        let v = this.solve_3vp_supplemental();

        let vn1 = v[0], vn2 = v[1], vn3 = v[2];
        let p = v[3];
        let f = v[4];

        let OFu = this.get_vanishing_point(vn1, p, f);
        let OFv = this.get_vanishing_point(vn2, p, f);
        let OFw = this.get_vanishing_point(vn3, p, f);

        let s1 = OFu.length;
        let s2 = OFv.length;
        let s3 = OFw.length;

        let up = OFu.normalized;
        let vp = OFv.normalized;
        let wp = OFw.normalized;

        this.camera_rotation_matrix = [
            normalize_v3(vec3(OFu.x / s1, OFv.x / s2, wp.x)),
            normalize_v3(vec3(OFu.y / s1, OFv.y / s2, wp.y)),
            normalize_v3(vec3(-f / s1, -f / s2, wp.z)),
        ];

        this.origin_3d = this.get_3d_origin(this.axis_view_origin, p, f);

        this.view_transform_matrix = 
            this.get_view_transform_matrix(
                matrix4_m3(this.camera_rotation_matrix),
                matrix4(1),
                this.origin_3d
            );

        this.projection_matrix = this.get_projection_matrix(f, p, 1);
    }

    solve() {
        this.arrows = this.solve_arrows(this.arrows);
        this.arrow_placement = this.solve_arrow_placement(this.arrows);
        this.vanishing_points = this.solve_vanishing_points(this.arrow_placement);

        switch (this.vanishing_points.length) {
            case 1: this.solve_1vp(); break;
            case 2: this.solve_2vp(); break;
            case 3: this.solve_3vp(); break;
        }
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
    last_save = 0;

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
        'range_magnifier_scale': 'range_magnifier_scale',
        'checkbox_debug': 'checkbox_debug',
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

        //console.log('wrel', x, y, scrx, scry);

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

        //console.log('magnifier', div, img, '\n', divx, divy, divw, divh, imgx, imgy, imgw, imgh);
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

        pos = clip_v2(pos, -1, 1);

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
        this.update_axis_count();
        this.update_axis_select();
        this.draw();
    }

    axis_type_input(event) {
        this.update_axis_select();
        this.draw();
    }

    update_arrows_canvas() {
        if (!this.current_image)
            return;

        let ic = this.get_element('image_canvas');
        let ac = this.get_element('arrows_canvas');
        let is = this.get_element('image_holder');

        {
            let sw = is.clientWidth;
            let sh = is.clientHeight;
            let iw = this.current_image.width;
            let ih = this.current_image.height;

            let rw = sw;
            let rh = sh;

            if (sw / sh > iw / ih)
                rw = (iw * sh) / ih;
            else
                rh = (ih * sw) / iw;

            ic.style.setProperty('width', `${rw}px`);
            ic.style.setProperty('height', `${rh}px`);
        }

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

    checkbox_debug_input(event) {
        this.arrows.debug_mode = event.target.checked;
        this.draw();
    }

    async parameter_save_local() {
        let str = JSON.stringify(this.arrows);
        localStorage.setItem('parameters', str);
    }

    parameter_load_local() {
        const params = localStorage.getItem('parameters');

        if (!params)
            return false;

        this.arrows = Object.assign(Arrows.prototype, JSON.parse(params));

        return true;
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
        this.get_element('checkbox_debug').checked = a.debug_mode;
        //this.get_element('axis_count').value = a.arrows.length/2;
        this.update_axis_count_html();
        this.update_axis_select();
        this.update_opacity();
        this.update_axis_count();
        a.solve();
        //this.update_info();
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

    update_debug_checkbox() {
        this.arrows.debug_mode = this.get_element('checkbox_debug').checked;
    }

    update_info() {
        let e = this.get_element('parameter_info');
        let c = this.current_image;

        e.innerHTML = '<p style="text-align: center">Info</p>';
        e.innerHTML += `<p>Width: ${c ? c.width : ''}</p>`;
        e.innerHTML += `<p>Height: ${c ? c.height : ''}</p>`;
        e.innerHTML += `<p>Focal Length: ${str_v(this.arrows.focal_length)}</p>`;
        e.innerHTML += `<p>Focal Length (35mm): ${this.arrows.get_focal_length_absolute(this.arrows.focal_length, 36).toFixed(3)}</p>`;
        e.innerHTML += `<p>Horizontal FOV: ${str_v(this.arrows.horizontal_fov)}</p>`;
        
        {
            let str = '<div id="principal_point_info">';
            str += '<p>Principal Point</p>';
            str += `<p>${str_v2(this.arrows.principal_point)}</p>`;
            str += '</div>';

            e.innerHTML += str;
        }

        if (this.arrows.debug_mode) {
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

            for (let i = 0; i < this.arrows.vanishing_points.length; i++) {
                let str = '<div id="axis_info">';
                let intersect = this.arrows.vanishing_points[i];

                str += `<p>${i + 1}</p>`;
                str += `<p>intersect: ${str_v2(intersect.point)}</p>`;
                str += `<p>dot: ${intersect.dot.toFixed(3)}</p>`;
                str += `<p>int_mag_norm: ${str_v2(intersect.int_mag_norm)}</p>`;
                str += `<p>angle: ${intersect.angle.toFixed(3)}</p>`;

                str += '</div>';

                e.innerHTML += str;
            }
        }

        if (this.arrows.vanishing_points.length > 2)
            e.innerHTML += `<p>Calculated Principal Point</p><p>${str_v2(this.arrows.calculated_principal_point)}</p>`;

        if (this.arrows.vanishing_points.length > 1)
            e.innerHTML += `<p>Calculated 3rd Vanishing Point</p><p>${str_v2(this.arrows.calculated_third_vanishing_point)}</p>`;

        if (this.arrows.camera_rotation_matrix && this.arrows.camera_rotation_matrix.length > 2){
            let str = '<div id="camera_info">';
            let mtx = this.arrows.camera_rotation_matrix;

            str += `<p>Camera\n${str_m3(mtx)}</p>`.replaceAll('\n', '<br/>');
            str += `<p>View\n${str_m4(this.arrows.view_transform_matrix)}</p>`.replaceAll('\n', '<br/>');

            if (this.arrows.projection_matrix && this.arrows.debug_mode)
                str += `<p>Projection\n${str_m4(this.arrows.projection_matrix)}</p>`.replaceAll('\n', '<br/>');

            if (this.arrows.matrix && this.arrows.debug_mode)
                str += `<p>Final Matrix\n${str_m4(this.arrows.matrix)}</p>`.replaceAll('\n', '<br/>');

            if (this.arrows.inverse_matrix && this.arrows.debug_mode)
                str += `<p>Inverse\n${str_m4(this.arrows.inverse_matrix)}</p>`.replaceAll('\n', '<br/>');

            if (this.arrows.camera_transform_matrix && this.arrows.debug_mode)
                str += `<p>Camera\n${str_m4(this.arrows.camera_transform_matrix)}</p>`.replaceAll('\n', '<br/>');

            if (this.arrows.rotation_matrix && this.arrows.debug_mode)
                str += `<p>Rotation Matrix\n${str_m3(this.arrows.rotation_matrix)}</p>`.replaceAll('\n', '<br/>');

            if (this.arrows.axis_view_origin && this.arrows.debug_mode)
                str += `<p>Origin 2D\n${str_v2(this.arrows.axis_view_origin)}</p>`.replaceAll('\n', '<br/>');

            if (this.arrows.origin_3d && this.arrows.debug_mode)
                str += `<p>Origin 3D\n${str_v3(this.arrows.origin_3d)}</p>`.replaceAll('\n', '<br/>');

            //str += `<p>Camera Inverse\n${str_m3(inverse_m3(mtx))}</p>`.replaceAll('\n', '<br/>');

            e.innerHTML += `</div>`;
            e.innerHTML += str;
        }
    }

    update_axis_select() {
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

        for (let i = 0; i < this.arrows.arrows.length; i++) {
            let arrow = this.arrows.arrows[i];
            let s = document.querySelector(`select#axis_select[name="${i}"`);
            if (s) {
                arrow.axis = s.value;
                arrow.primary_axis = s.value.replace('-', '');
            }
        }
    }

    update_axis_count_html() {
        let e = this.get_element('axis_count');

        let l = this.arrows.arrows.length;

        e.innerHTML = "";
        for (let i = 1; i < 4; i++) {
            e.innerHTML +=
                `<option ${i == l/2 ? 'selected' : ''} value="${i}">${i}</option>`;
        }
    }

    update_axis_count() {
        let e = this.get_element('axis_count');

        let c = e.value * 2;
        
        if (c < 2)
            c = 2;

        let l = this.arrows.arrows.length;

        console.log(c, l);

        for (let i = c; i < l; i++)
            this.arrows.arrows.pop();

        for (let i = 0; i < c-l; i++) {
            let p = this.arrows.find_free_placement(0.025);

            this.arrows.arrows.push(get_arrow(p, add_v2(p, vec2(0.5, 0)), this.next_arrow_type()));
        }
        
        this.update_axis_count_html();
    }

    draw() {
        this.arrows.draw(this.get_element('arrows_canvas'));
        this.update_info();
        if (Date.now() > this.last_save + 1000) {
            this.parameter_save_local();
            this.last_save = Date.now();
        }
    }

    init() {
        let initialize = function() {
            this.update_axis_count();
            this.update_opacity();
            this.update_ui_scale();
            this.update_axis_select();
            this.update_debug_checkbox();
        }.bind(this);

        try {    
            if (!this.parameter_load_local()) {
                console.log('loadlocal');
                initialize();
            } else {
                console.log('setui');
                this.set_ui();
            }
        } catch (error) {
            console.log("init:", error);
            localStorage.clear();
            initialize();
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
    ['checkbox_debug', 'click', function(event){prm.checkbox_debug_input(event);}],
];

prm_events.forEach((field) => {
    prm.add_event(field[0], field[1], field[2]);
});

new ResizeObserver(() => prm.update_arrows_canvas()).observe(prm.get_element('parameter_images'));

prm.image_load_input();