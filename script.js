function quick_format(values) {
	return {
		text: values[1],
		value: values[2],
		step: values[3],
		calc: values[4]
	};
}

function outline_from_raw(raw_input) {
	let outline = {};
	raw_input.forEach(n => {
		outline[n[0]] = { ... quick_format(n) };
	});
	//console.log("outline:", outline);
	return outline;
}

function get_empty_outline(raw_input) {
	let full_outline = outline_from_raw(raw_input);
	for (const [key, value] of Object.entries(full_outline)) {
		//full_outline[key].value = ;
	}
	return full_outline;
}

function get_form(query) {
	var inputs = document.querySelectorAll(query);
	let ret = {};
	inputs.forEach(n => {
		ret[n.name] = n.value;
	});
	return ret;
}

function get_form_input() {
	return get_form('#inputs input');
}

function get_form_output() {
	return get_form('#outputs input');
}

/*
sensor-format 2.3/1"
radial1 0.158
radial2 -0.411
radial3 0.347

*/

const raw_outline = [
	["sensor-name", "Sensor part number", '', 0, -1],
	["sensor-name-friendly", "Sensor name", '', 0, -1],
	["FL", "35mm focal length", '', 0.1, 1],
	["EFL", "Effective focal length", '', 0.1, 1],
	["sensor-pix-x", "Sensor X pixel count", '', 100, 1],
	["sensor-pix-y", "Sensor Y pixel count", '', 100, 1],
	["sensor-pix-size", "Sensor pixel size (μm)", '', 0.1, 1],
	["sensor-width", "Sensor width (mm)", '', 0.5, 1],
	["sensor-height", "Sensor height (mm)", '', 0.5, 1],
	["sensor-diagonal", "Sensor diagonal (mm)", '', 0.5, 1],
	["sensor-area", "Sensor area (mm²)", '', 1.0, 1],
	["sensor-format", "Sensor format", '', 0, -1],
	["sensor-mp", "Sensor MP", '', 0.5, 1],
	["sensor-aspect", "Sensor aspect ratio", '', 0.05, 1],
	["sensor-crop-factor", "Sensor crop factor", '', 0.5, 1], //"Focal length multiplier"
	["lens-hfov", "Lens horizontal FOV", '', 0.5, 1],
	["lens-vfov", "Lens vertical FOV", '', 0.5, 1],
	["lens-dfov", "Lens diagonal FOV", '', 0.5, 1],
	["lens-dof", "Lens depth of field", '', 0.5, 1],
	["lens-cof", "Lens circle of confusion", '', 0.5, 1],
	["lens-image-circle", "Lens image circle dia.", '', 0.5, 1],
	["subject-distance", "Subject distance (m)", '', 1, 1],
	["distortion-type", "Radial distortion type", '', 0, -1],
	["brown3-radial1", "Brown 3 radial 1", '', 0.05, 1],
	["brown3-radial2", "Brown 3 radial 2", '', 0.05, 1],
	["brown3-radial3", "Brown 3 radial 3", '', 0.05, 1],
	["principle-pix-x", "Principle point X", 0, 1, 1],
	["principle-pix-y", "Principle point Y", 0, 1, 1]
];

const outline_empty = get_empty_outline(raw_outline);

function get_camera_quick(sn, snf, efl, fl, spx, spy, sps, sf, br1, br2, br3, smp, sd) {
	let camera_outline = get_empty_outline(raw_outline);
	camera_outline["EFL"].value = efl;
	camera_outline["FL"].value = fl;
	camera_outline["sensor-name"].value = sn;
	camera_outline["sensor-name-friendly"].value = snf;
	camera_outline["sensor-pix-x"].value = spx;
	camera_outline["sensor-pix-y"].value = spy;
	camera_outline["sensor-pix-size"].value = sps;
	camera_outline["sensor-diagonal"].value = sd;
	camera_outline["sensor-format"].value = sf;
	camera_outline["sensor-mp"].value = smp;
	camera_outline["brown3-radial1"].value = br1;
	camera_outline["brown3-radial2"].value = br2;
	camera_outline["brown3-radial3"].value = br3;
	return camera_outline;
}

const default_preset = "IMX766";

const sensor_format_presets = [
	['1/10"', 1.6, 1.28, 0.96]
	['1/1.56"',10.2,8.16, 6.12]
];

/*
Raspberry Pi camera documentation
https://www.raspberrypi.com/documentation/accessories/camera.html
*/

const outline_presets = [
	get_camera_quick("None", "None", '', '', '', '', '', '', '', '', '', '', ''),
	get_camera_quick("IMX766", "Samsung A54", 5.54, 24.5, 8160, 6120, 1.0, '1/1.56"', 0.158, -0.411, 0.347, 49.9392, ''),
	get_camera_quick("OV5647", "Raspberry Pi v1", 3.6, '', 2592, '', 1.4, '1/4"', '', '', '', 5.0, ''),
	get_camera_quick("IMX219", "Raspberry Pi v2", 3.04, '', 3280, '', 1.12, '1/4"', '', '', '', 8.0, 4.6),
	get_camera_quick("IMX708", "Raspberry Pi v3", 4.74, '', 4608, '', 1.4, '1/2.43"', '', '', '', 11.9, 7.4),
	get_camera_quick("IMX477", "Raspberry Pi High Quality", 4.0, '', 4056, '', 1.55, '1/2.3"', '', '', '', 12.3, 7.9),
	get_camera_quick("IMX500", "Raspberry Pi AI", 4.74, '', 4056, '', 1.55, '1/2.3"', '', '', '', 12.3, 3.75),
	get_camera_quick("QV2710", "Arducam", 2.8, '', 1920, 1080, 3.0, '1/2.7"', '', '', '', '', ''),
	get_camera_quick("35mm", "Standard", 35.0, '', '3600', '2400', '10', '36x24', '')
];

//console.log("outline_from_raw", outline_from_raw(raw_outline), "raw_outline", raw_outline);
//console.log("get_inputs()", get_inputs());

function camera_from_form(form_input) {
	let input_camera = outline_empty;
	//console.log('form_input:', form_input);
	for (const [key, value] of Object.entries(form_input)) {
		input_camera[key].value = value;
	}
	return input_camera;
}

function get_inputs() {
	return camera_from_form(get_form_input());
}

function get_outputs() {
	return camera_from_form(get_form_output());
}

function quick_format_html(outline, readonly) {
	let innerHTML = "";
	html_type = readonly ? "text" : "number";
	extra_text = readonly ? "readonly" : "";

	for (const [key, value] of Object.entries(outline)) {
		let html =
`<div><p>${value.text}</p><input type="${html_type}" name="${key}" step="${value.step}" value="${value.value}" ${extra_text} oninput="on_change(this)" /></div>\n`;
		//console.log("html", html);
		innerHTML += html;
	}
	//console.log("innerHTML", innerHTML, "outline", outline);
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

const std_diag_35mm = 43.3; //43.267

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
	['EFL', 'FL', 'sensor-crop-factor', auto_div, 1],
	['FL', 'EFL', 'sensor-crop-factor', auto_mul, 1],
	['lens-dfov', 'EFL', 'sensor-diagonal', auto_xfov, 1],
	['lens-hfov', 'EFL', 'sensor-width', auto_xfov, 1],
	['lens-vfov', 'EFL', 'sensor-height', auto_xfov, 1],
	['EFL', 'lens-dfov', 'sensor-diagonal', auto_xefl, 1],
	['EFL', 'lens-hfov', 'sensor-width', auto_xefl, 1],
	['EFL', 'lens-vfov', 'sensor-height', auto_xefl, 1],
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
	let ppx = Number(camera['principle-pix-x'].value);
	let ppy = Number(camera['principle-pix-y'].value);
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
	/*
	for (let x = -x0; x < x0; x+=dx) {
		for (let y = -y0; y < y0; y+=dy) {
			//canvas.moveTo(x0+x,y0+y);
			//canvas.lineTo(x0+x,y0+y);
			let rx = Math.round(x0 + x + xoffset);
			let ry = Math.round(y0 + y + yoffset);
			
			let offset = ((ry * width) + rx) * 4;
			
			let rpix = Math.sqrt((x * x) + (y * y));
			let r = rpix / rmax;
			
			let model = ((Math.pow(r, 2) * k1) + (Math.pow(r, 4) * k2) + (Math.pow(r, 6) * k3));
			
			let undistort_x = rx + (x * model);
			let undistort_y = ry + (y * model);

			let rux = Math.round(undistort_x);
			let ruy = Math.round(undistort_y);
			
			if (rux < 0 || rux >= width || ruy < 0 || ruy >= height)
				continue;
			
			let undistort_offset = ((ruy * width) + rux) * 4;
			
			//data[offset] = 255;
			//data[offset+1] = 0;
			//data[offset+2] = 0;
			//data[offset+3] = 255;
			put_pixel(data, undistort_offset, red_color);
		}
	}
	*/
	
	put_pixel(data, get_offset(_ppx, _ppy, width), green_color);
	canvas.putImageData(image, 0, 0);
	//Principle point
	canvas.font = '20px Arial';
	canvas.textAlign = 'center';
	canvas.textBaseline = 'middle';
	//canvas.fillText('x', _ppx, _ppy);
	
	//canvas.stroke();
	
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
	template_dropdown.innerHTML = "";
	outlines.forEach(n => {
		template_dropdown.innerHTML +=
`<option value="${n['sensor-name'].value}">${n['sensor-name'].value} (${n['sensor-name-friendly'].value})</option>`;
	});
	template_dropdown.value = default_preset;
	on_preset(template_dropdown);
}

function reset_button() {
	on_preset(document.getElementById('templates'));
}

function clear_button() {
	let empty = get_empty_outline(raw_outline);
	set_inputs(empty);
	calculate_all(empty);	
}

function swap_button() {
	let to_swap = get_outputs();
	set_inputs(to_swap);
	calculate_all(to_swap);
}

//set_outputs(outline_empty);
//set_inputs(outline_empty);
add_presets(outline_presets);