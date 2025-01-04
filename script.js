let outline_empty = {};
let outline_fields = [];
let outline_presets = [];
let sensor_format_presets = [];
const std_diag_35mm = 43.3; //43.267

/*
Raspberry Pi camera documentation
https://www.raspberrypi.com/documentation/accessories/camera.html

Sensor crop factor <==> Focal length multiplier

*/

function get_form(query) {
	var inputs = document.querySelectorAll(query);
	let ret = {};
	inputs.forEach(n => {
		ret[n.name] = n.value;
	});
	return ret;
}

function get_empty_outline() {
	let outline_copy = {};
	for (const [key, value] of Object.entries(outline_empty)) {
		outline_copy[key] = { ... value };
	}
	return outline_copy;
}

function camera_from_form(form_input) {
	let input_camera = get_empty_outline();
	for (const [key, value] of Object.entries(form_input)) {
		input_camera[key].value = value;
	}
	return input_camera;
}

function get_form_input() {
	return get_form('#inputs input');
}

function get_form_output() {
	return get_form('#outputs input');
}

function get_inputs() {
	return camera_from_form(get_form_input());
}

function get_outputs() {
	return camera_from_form(get_form_output());
}

function quick_format_html(outline, readonly) {
	let innerHTML = "";
	let extra_text = readonly ? "readonly" : "";

	for (const [key, value] of Object.entries(outline)) {
		let html_type = readonly || value.calc < 1 ? "text" : "number";
		let html =
`<div><p>${value.text}</p><input type="${html_type}" name="${key}" step="${value.step}" value="${value.value}" ${extra_text} oninput="on_change(this)" /></div>\n`;
		innerHTML += html;
	}
	
	return innerHTML;
}

function set_inputs(camera) {
	inputs_div = document.getElementById('inputs');
	inputs_div.innerHTML = quick_format_html(camera, false);
}

function set_outputs(camera) {
	outputs_div = document.getElementById('outputs');
	outputs_div.innerHTML = quick_format_html(camera, true);
}

function get_missing(camera, template) {
	let missing_entries = [];
	for (const [key, value] of Object.entries(camera)) {
		if (value.value === "" && value.calc !== -1) {
			missing_entries.push(key);
		}
	}
	return missing_entries;
}

function get_valid(camera, template) {
	let valid_entries = [];
	for (const [key, value] of Object.entries(camera)) {
		if (value.value !== "" && value.calc !== -1) {
			valid_entries.push(key);
		}
	}
	return valid_entries;
}

function valid_field(camera, field) {
	for (const [key, value] of Object.entries(camera)) {
		if (field === key && value.value !== "")
			return true;
	}
	return false;
}

function auto_div(cam, a, b) {
	return a / b;
}

function auto_mul(cam, a, b) {
	return a * b;
}

function auto_pyt(cam, a, b) {
	return Math.sqrt((a*a)+(b*b));
}

function auto_cf(cam, a, b) {
	return std_diag_35mm / a;
}

function auto_xfov(cam, a, b) {
	return (2.0 * 180.0 * Math.atan(b / (2 * a))) / 3.14159;
}

function auto_xefl(cam, a, b) {
	let arad = (a * 3.14159) / 360;
	return b / 2 / Math.tan(arad);
}

function get_pixcnt(mp) {
	return mp * 1000000;
}

function auto_pix(cam, a, b) {
	let pixcnt = get_pixcnt(a);
	return pixcnt / b;
}

function auto_pixasp(cam, a, b) {
	let pixcnt = get_pixcnt(a);
	return Math.sqrt(pixcnt / b);
}

const solve_requirements = [
	['sensor-aspect', 'sensor-height', 'sensor-width', auto_div, 1],
	['sensor-aspect', 'sensor-pix-x', 'sensor-pix-y', auto_div, 1],
	['sensor-mp', 'sensor-pix-x', 'sensor-pix-y', auto_mul, 0.000001],
	['sensor-pix-x', 'sensor-width', 'sensor-pix-size', auto_div, 1000],
	['sensor-pix-y', 'sensor-height', 'sensor-pix-size', auto_div, 1000],
	['sensor-pix-x', 'sensor-mp', 'sensor-pix-y', auto_pix, 1],
	['sensor-pix-y', 'sensor-mp', 'sensor-pix-x', auto_pix, 1],
	['sensor-pix-y', 'sensor-mp', 'sensor-aspect', auto_pixasp, 1],
	['sensor-width', 'sensor-pix-x', 'sensor-pix-size', auto_mul, 0.001],
	['sensor-height', 'sensor-pix-y', 'sensor-pix-size', auto_mul, 0.001],
	['sensor-width', 'sensor-height', 'sensor-aspect', auto_mul, 1],
	['sensor-height', 'sensor-width', 'sensor-aspect', auto_div, 1],
	['sensor-area', 'sensor-width', 'sensor-height', auto_mul, 1],
	['sensor-diagonal', 'sensor-width', 'sensor-height', auto_pyt, 1],
	['sensor-crop-factor', 'sensor-diagonal', 'sensor-diagonal', auto_cf, 1],
	['effective-focal-length', 'focal-length', 'sensor-crop-factor', auto_div, 1],
	['focal-length', 'effective-focal-length', 'sensor-crop-factor', auto_mul, 1],
	['lens-dfov', 'effective-focal-length', 'sensor-diagonal', auto_xfov, 1],
	['lens-hfov', 'effective-focal-length', 'sensor-width', auto_xfov, 1],
	['lens-vfov', 'effective-focal-length', 'sensor-height', auto_xfov, 1],
	['effective-focal-length', 'lens-dfov', 'sensor-diagonal', auto_xefl, 1],
	['effective-focal-length', 'lens-hfov', 'sensor-width', auto_xefl, 1],
	['effective-focal-length', 'lens-vfov', 'sensor-height', auto_xefl, 1],
];

function multipass_solver(cam) {
	invalid = get_missing(cam, outline_empty);
	valid = get_valid(cam, outline_empty);

	//console.log("(Pass)\ninvalid:", invalid, "valid:", valid);

	invalid.forEach(n => {
		solve_requirements.forEach(s => {
			if (s[0] == n) {
				if (valid.includes(s[1]) && valid.includes(s[2])) {
					//console.log('n:', n, 's:', s);
					let a = cam[s[1]].value;
					let b = cam[s[2]].value;
					cam[n].value = s[3](cam, a, b) * s[4];
				}
			}		
		});
	});

	return invalid.length;
}

function calculate_intrinsics(camera) {
	let prev_len = multipass_solver(camera);	

	for (let i = prev_len; i > -1; i--) {
		let nlen = multipass_solver(camera);
		if (nlen == prev_len)
			break;
		prev_len = nlen;
	}

	set_outputs(camera);
}

function put_pixel(imagedata,offset,data) {
	for (let i = 0; i < 4; i++) {
		imagedata[offset + i] = data[i];
	}
}

function get_offset(x, y, w) {
	return Math.round(Math.round(y) * w + x) * 4;
}

let red_color = [255,0,0,255];
let blue_color = [0,0,255,255];
let green_color = [0,255,0,255];

function render_distortion(camera) {
	let element = document.getElementById('distortion');
	let canvas = element.getContext('2d');
	canvas.imageSmoothingQuality = '';
	canvas.imageSmoothingEnabled = false;
	
	let aspect = Number(camera['sensor-aspect'].value);
	let ppx = Number(camera['principal-pix-x'].value);
	let ppy = Number(camera['principal-pix-y'].value);
	let senw = Number(camera['sensor-pix-x'].value);
	let senh = Number(camera['sensor-pix-y'].value);
	
	let k1 = Number(camera['brown3-radial1'].value);
	let k2 = Number(camera['brown3-radial2'].value);
	let k3 = Number(camera['brown3-radial3'].value);
	
	if (!aspect)
		aspect = 1;
	
	let width = element.width = 150;
	let height = element.height = Math.round(width / aspect);
	
	canvas.clearRect(0,0,width,height);
	
	let image = canvas.getImageData(0,0,width, height);
	let data = image.data;
	
	let x0 = width * 0.5;
	let y0 = height * 0.5;
	
	let scale = 1.0;
	let divisions = 25;
	let div_x = divisions;
	let div_y = divisions * aspect;
	
	let dx = width / divisions;
	let dy = height / divisions * aspect;
	
	let xoffset = dx * 0.5;
	let yoffset = dy * 0.5;
	
	let _sw = senw / width;
	let _sh = senh / height;
	let _ppx = ((senw / 2) + ppx) / _sw;
	let _ppy = ((senh / 2) + ppy) / _sh;
	
	let rmax = Math.sqrt((x0 * x0) + (y0 * y0));
	
	for (let _dx = 0; _dx < div_x; _dx++) {
		for (let _dy = 0; _dy < div_y; _dy++) {
			for (let _x = 0, _y = 0; _x < dx && _y < dy; _x++, _y++) {
				let _xo = Math.round(_dx * dx - (dx*0.5));
				let _yo = Math.round(_dy * dy - (dy*0.5));
				let x = _xo + _x;
				let y = _yo + _y;
				let rx = x;
				let ry = y;
				let cx = rx - x0 - (_ppx - x0);
				let cy = ry - y0 - (_ppy - y0);
						
				let rpix = Math.sqrt((cx * cx) + (cy * cy)); //sample dist from center
				let r = rpix / rmax;
				let model = ((Math.pow(r, 2) * k1) + (Math.pow(r, 4) * k2) + (Math.pow(r, 6) * k3));
				
				let undistort_x = rx + (cx * model);
				let undistort_y = ry + (cy * model);
				let undistort_x0 = _xo + (cx * model);
				let undistort_y0 = _yo + (cy * model);

				let rux = Math.round(undistort_x);
				let ruy = Math.round(undistort_y);
				let rux0 = Math.round(undistort_x0);
				let ruy0 = Math.round(undistort_y0);
				
				
				if (rux < 0 || rux >= width || ruy < 0 || ruy >= height)
					continue;
				
				//put_pixel(data, get_offset(x, _yo, width), blue_color);
				//put_pixel(data, get_offset(_xo, y, width), blue_color);
				put_pixel(data, get_offset(rux, ruy0, width), red_color);
				put_pixel(data, get_offset(rux0, ruy, width), red_color);
			}
		}
	}
	
	put_pixel(data, get_offset(_ppx, _ppy, width), green_color);

	canvas.putImageData(image, 0, 0);
}

function is_autocalc() {
	return document.getElementById('autocalc').checked;
}

function is_autodistort() {
	return document.getElementById('autodist').checked;
}

function on_change(element) {
	//console.log("on_change:", element);

	let camera = get_inputs();

	if (is_autocalc()) {
		calculate_intrinsics(camera);
	}
	
	if (is_autodistort()) {
		render_distortion(camera);
	}
}

function calculate_all(camera) {
	calculate_intrinsics(camera);
	render_distortion(camera);
}

function calculate_button() {
	calculate_all(get_inputs());
}

function on_preset(element) {
	let current_preset_name = element.value;	
	outline_presets.forEach(n => {
		if (n['sensor-name'].value === current_preset_name) {
			set_inputs(n);
			on_change(element);
			return;
		}
	});
}

function add_presets(outlines) {
	let template_dropdown = document.querySelector('div #templates');
	template_dropdown.innerHTML = "<option selected disabled>Sensor Presets</option>";
	
	outlines.forEach(n => {
		template_dropdown.innerHTML +=
`<option value="${n['sensor-name'].value}">${n['sensor-name'].value} (${n['sensor-name-friendly'].value})</option>`;
	});
	//template_dropdown.value = outlines[0]['sensor-name'].value;
	//on_preset(template_dropdown);
}

function reset_button() {
	on_preset(document.getElementById('templates'));
}

function clear_button() {
	let empty = get_empty_outline();
	set_inputs(empty);
	calculate_all(empty);	
}

function swap_button() {
	let to_swap = get_outputs();
	set_inputs(to_swap);
	calculate_all(to_swap);
}

async function load_csv(url) {
	let csv = [];
	let r = await fetch(url)
	let text = await r.text();
	let lines = text.split('\n');
	lines.forEach(n => {
		let parts = n.split(',');
		csv.push(parts);
	});
	console.log("csv:", csv);
	return csv;
}

async function process_csv(csv) {
	let slots = [
		['outlines', {}],
		['formats', []],
		['presets', []]
	];

	let active = -1;
	let field = '';
	let fieldline = false;
	let tfields = [];
	let fields = [];

	for (let i = 0; i < csv.length; i++) {
		let n = csv[i];
		fieldline = false;
		if (n[0].length > 0) {
			for (let j = 0; j < slots.length; j++) {
				if (n[0] === slots[j][0]) {
					active = j;
					field = '';
					fieldline = true;
				}
			}

			if (active > -1) {
				if (n[0] !== slots[active][0]) {
					field = n[0];
				}
			}
		}

		if (active < 0)
			continue;

		let name = slots[active][0];
		let slot = slots[active][1];

		if (name === 'outlines') {
			if (fieldline) {
				fields = n.slice(1);
				fields.forEach(n => {
					slot[n] = {};
				});
			} else {
				if (field.length > 0) {
					for (let i = 0; i < fields.length; i++) {
						slot[fields[i]][field] = n[i+1];
					}
				}
			}
			field = '';
		}

		if (name === 'formats') {
			if (fieldline) {
				tfields = n.slice(1);
			} else {
				let format = {};
				if (n[1] === undefined || n[1].length < 1)
					continue;
				
				for (let i = 0; i < tfields.length; i++) {
					if (tfields[i].length > 0) {
						format[tfields[i]] = n[i+1];
					}
				}
				slot.push(format);
			}
		}

		if (name === 'presets') {
			if (fieldline) {

			} else {
				let preset = {};
				let exit = false;
				for (let i = 0; i < fields.length; i++) {
					if (n[i+1] === undefined) {
						exit = true;
						break;
					}
					let _field = fields[i];
					//preset[fields[i]] = n[i+1];
					preset[_field] = { ... slots[0][1][_field] };
					preset[_field].value = n[i+1];
				}
				if (!exit) {
					slot.push(preset);
				}
			}
		}
	}

	console.log("slots:", slots);
	
	outline_empty = slots[0][1];
	outline_fields = fields;
	sensor_format_presets = slots[1][1];
	outline_presets = slots[2][1];

	return;
}

async function on_load(element) {
	document.querySelector('#center').insertAdjacentHTML('afterbegin', '<h1 id="loading">Loading...</h1>');
	await process_csv(await load_csv('sensors.csv'));

	//set_inputs(outline_empty);
	//set_outputs(outline_empty);
	add_presets(outline_presets);
	//reset_button();
	set_inputs(outline_presets[1]);
	calculate_all(get_inputs());


	document.querySelector('#loading').remove();
}