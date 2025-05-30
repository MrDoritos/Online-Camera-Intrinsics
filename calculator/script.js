// #region Internal state and constants

let sensors_header = [];
let sensors_cache = [];
let sensors_fields = [];
let sensor_empty = {};
let sensor_formats = [];
let sensor_formats_header = [];
let sensors_all = [];
const red_color = [255,0,0,255];
const blue_color = [0,0,255,255];
const green_color = [0,255,0,255];
const std_diag_35mm = 43.3; //43.267

// #endregion

// #region Data generation

function quick_format_html(outline, readonly) {
	let innerHTML = "";
	let extra_text = readonly ? "readonly" : "";

	for (const [key, value] of Object.entries(outline)) {
		let html_type = readonly || value.calc < 1 ? "text" : "number";
		let html =
`<div id="${value.calc_id ? value.calc_id : ''}"><p>${value.text}</p><input type="${html_type}" name="${key}" step="${value.step}" value="${value.value}" ${extra_text} oninput="on_change(this)" /></div>\n`;
		innerHTML += html;
	}
	
	return innerHTML;
}

function get_empty_outline() {
	let outline_copy = {};
	for (const [key, value] of Object.entries(sensor_empty)) {
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

function camera_from_json(json) {
	let input_camera = get_empty_outline();

	if (!json)
		return input_camera;

	for (const [key, value] of Object.entries(json))
		if (json[key] && json[key] != 0)
			input_camera[key].value = value;

	return input_camera;
}

// #endregion

// #region Query internal state

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

function get_inputs() {
	return camera_from_form(get_form_input());
}

function get_outputs() {
	return camera_from_form(get_form_output());
}

function is_autocalc() {
	return document.getElementById('autocalc').checked;
}

function is_autodistort() {
	return document.getElementById('autodist').checked;
}

// #endregion

// #region Modify internal state

function set_presets_kvs(kvs) {
	let template_dropdown = document.querySelector('div #templates');
	template_dropdown.innerHTML = "<option selected disabled>Sensor Presets</option>";
	
	kvs.forEach(kv => {
		template_dropdown.innerHTML +=
			`<option value="${kv[0]}">${kv[0]} (${kv[1]})</option>`;
	});
}

function set_presets(sensors) {
	let kvs = [];

	sensors.forEach(n => {
		kvs.push([n['sensor-name'].value,n['sensor-name-friendly'].value]);
	});

	set_presets_kvs(kvs);
}

async function set_preset(sensor_name) {
	let cached = sensors_cache.find(n => n[0] === sensor_name);

	let camera = undefined;

	if (cached)
		camera = await load_preset(sensor_name);
	else
		camera = await load_preset_from_all(sensor_name);

	let link_path = '#';
	
	if (camera['sensor-name'] && camera['sensor-name'].value)
		link_path = '/sensors/' + camera['sensor-name'].value + '/';

	let link_element = document.getElementById("sensor_page_link");
	link_element.setAttribute('href', link_path);

	set_camera(camera);
}

function set_camera(camera) {
	if (!camera)
		return;

	set_inputs(camera);
	set_outputs(calculate_all(camera));

	return camera;
}

function set_inputs(camera) {
	inputs_div = document.getElementById('inputs');
	inputs_div.innerHTML = quick_format_html(camera, false);
}

function set_outputs(camera) {
	outputs_div = document.getElementById('outputs');
	outputs_div.innerHTML = quick_format_html(camera, true);
}

// #endregion

// #region Canvas, distortion rendering, image files

function put_pixel(imagedata,offset,data) {
	for (let i = 0; i < 4; i++) {
		imagedata[offset + i] = data[i];
	}
}

function get_offset(x, y, w) {
	return Math.round(Math.round(y) * w + x) * 4;
}

function get_distort_parameters(camera, direction) {
	let params = {k1:0.0,k2:0.0,k3:0.0,aspect:1.0,ppx:0,ppy:0,senw:1,senh:1,direction:direction};

	if (!camera) return params;

	let aspect = Number(camera['sensor-aspect'].value);

	let k1 = Number(camera['brown3-radial1'].value);
	let k2 = Number(camera['brown3-radial2'].value);
	let k3 = Number(camera['brown3-radial3'].value);
	
	let ppx = Number(camera['principal-pix-x'].value);
	let ppy = Number(camera['principal-pix-y'].value);

	let senw = Number(camera['sensor-pix-x'].value);
	let senh = Number(camera['sensor-pix-y'].value);

	if (aspect) {
		if (Math.abs(Math.log10(aspect)) <= 1) // verify aspect ratio is 1:10 or less
		 	params.aspect = aspect;
	}
	if (k1)	params.k1 = k1;
	if (k2)	params.k2 = k2;
	if (k3)	params.k3 = k3;
	if (senw) params.senw = senw;
	if (senh) params.senh = senh;
	if (ppx) params.ppx = ppx / senw;
	if (ppy) params.ppy = ppy / senh;

	return params;
}

function in_bound(x, y, width, height) {
	return (x < width && y < height && x >= 0 && y >= 0);
}

function emplace_pixel(data, pixel, x, y, width, height) {
	let offset = get_offset(x, y, width);
	for (let i = 0; i < 4; i++)
		data[offset + i] = pixel[i];
}

function emplace_pixel_bound(data, pixel, x, y, width, height) {
	if (!in_bound(x,y,width,height))
		return;
	emplace_pixel(data, pixel, x, y, width, height);
}

function sample_pixel(data, x, y, width, height) {
	let pixel = [0,0,0,255];
	let offset = get_offset(x, y, width);
	for (let i = 0; i < 4; i++)
		pixel[i] = data[offset + i];
	return pixel;
}

function sample_pixel_bound(data, x, y, width, height) {
	if (!in_bound(x,y,width,height))
		return [0,0,0,0];
	return sample_pixel(data, x, y, width, height);
}

function distort_pixel(parameters, x, y, width, height) {
	let center_x = 1 / 2 + parameters.ppx;
	let center_y = 1 / 2 + parameters.ppy;

	let rel_u = x / width;
	let rel_v = y / height;

	let u = rel_u - center_x;
	let v = rel_v - center_y;

	let max_radius = ((center_x * center_x) + (center_y * center_y));
	let pix_radius = ((u * u) + (v * v));
	let radius = pix_radius / max_radius;
	let model = ((Math.pow(radius, 2) * parameters.k1) +
				 (Math.pow(radius, 4) * parameters.k2) +
				 (Math.pow(radius, 6) * parameters.k3)) * parameters.direction;

	let undistort_u = (u * model);
	let undistort_v = (v * model);

	let undistort_rel_u = undistort_u + rel_u;
	let undistort_rel_v = undistort_v + rel_v;

	let edge = radius >= 1.0;
	//edge = (Math.abs(undistort_rel_u - 0.5) > 0.5 || Math.abs(undistort_rel_v - 0.5) > 0.5);

	return {u:undistort_rel_u, v:undistort_rel_v, edge:edge};
}

function render_distortion(camera) {
	let element = document.getElementById('distortion');
	let canvas = element.getContext('2d');
	canvas.imageSmoothingQuality = '';
	canvas.imageSmoothingEnabled = false;
	
	let params = get_distort_parameters(camera, 1);

	let width = element.width = 300;
	let height = element.height = Math.round(width / params.aspect);
	
	canvas.clearRect(0,0,width,height);
	
	let imageData = canvas.createImageData(width, height);
	let data = imageData.data;
	
	let divisions = 25;
	
	let dx = (width - 1) / divisions;
	let dy = dx / params.aspect;
	
	for (let _dx = 0; _dx < width; _dx+=dx) {
		for (let _y = 0; _y < height; _y++) {
			let uv = distort_pixel(params, _dx, _y, width, height);
			if (!uv.edge)
				emplace_pixel_bound(data, red_color, uv.u * width, uv.v * height, width, height);
		}
	}

	for (let _dy = 0; _dy < height; _dy+=dy) {
		for (let _x = 0; _x < width; _x++) {
			let uv = distort_pixel(params, _x, _dy, width, height);
			if (!uv.edge)
				emplace_pixel_bound(data, red_color, uv.u * width, uv.v * height, width, height);
		}
	}

	emplace_pixel_bound(data, green_color, width * 0.5 + params.ppx * width, height * 0.5 + params.ppy * width, width, height);

	canvas.putImageData(imageData, 0, 0);
}

function get_image_file() {
	return document.querySelector('input[id="undistort_image"]');
}

function is_image_loaded() {
	let img_file = get_image_file();
	return (img_file && img_file.files && img_file.files.length);
}

function get_image(width = 300, aspect = 1) {
	if (!is_image_loaded())
		return 0;

	let element_undistort_preview = document.getElementById('undistort_canvas');
	let element_image_save = document.getElementById('save_canvas');
	let element_image_source = document.getElementById('image_canvas');
	let canvas_undistort_preview = element_undistort_preview.getContext('2d');
	let canvas_image_save = element_image_save.getContext('2d');
	let canvas_image_source = element_image_source.getContext('2d');

	let width_undistort_preview = element_undistort_preview.width = width;
	let height_undistort_preview = element_undistort_preview.height = Math.round(width / aspect);
	let width_image_source = canvas_image_source.width = element_image_source.width;
	let height_image_source = canvas_image_source.height = element_image_source.height;

	let imagedata_undistort_preview = 
		canvas_undistort_preview.getImageData(0,0,width_undistort_preview,height_undistort_preview);
	let imagedata_image_source = 
		canvas_image_source.getImageData(0,0,width_image_source,height_image_source);

	return {
		element_undistort_preview, element_image_save, element_image_source,
		canvas_undistort_preview, canvas_image_save, canvas_image_source,
		width_undistort_preview, height_undistort_preview,
		width_image_source, height_image_source,
		imagedata_undistort_preview, imagedata_image_source
	};
}

function display_image(camera) {
	if (!is_image_loaded())
		return;

	let parameters = get_distort_parameters(camera, -1);
	let image = get_image(300, parameters.aspect);
	let ctx = image.canvas_undistort_preview;
	let ctxW = image.width_undistort_preview, ctxH = image.height_undistort_preview;
	let imgW = image.width_image_source, imgH = image.height_image_source;

	image.element_undistort_preview.setAttribute('class', '');

	ctx.imageSmoothingQuality = '';
	ctx.imageSmoothingEnabled = false;
	
	ctx.clearRect(0, 0, ctxW, ctxH);

	for (let canvas_x = 0; canvas_x < ctxW; canvas_x++) {
		for (let canvas_y = 0; canvas_y < ctxH; canvas_y++) {
			let uv = distort_pixel(parameters, canvas_x, canvas_y, ctxW, ctxH);

			emplace_pixel_bound(
				image.imagedata_undistort_preview.data,
				sample_pixel_bound(
					image.imagedata_image_source.data, 
					uv.u * imgW,
					uv.v * imgH,
					imgW,
					imgH
				),
				canvas_x,
				canvas_y,
				ctxW,
				ctxH
			);
		}
		
		ctx.putImageData(image.imagedata_undistort_preview, 0, 0);
	}
}

function load_image_data(data) {
	let image = new Image();
	image.onload = function() {
		let in_doc = get_image(300, 1);
		let width = image.width, height = image.height;
		in_doc.element_image_source.width = width;
		in_doc.element_image_source.height = height;
		in_doc.canvas_image_source.drawImage(image, 0, 0);
		display_image(get_outputs());
	};
	image.crossOrigin = "anonymous";
	image.src = data;
}

function load_image() {
	let file = get_image_file();

	if (!is_image_loaded())
		return;

	let image_form = file.files[0];

	let reader = new FileReader();
	reader.onload = function(e) {
		load_image_data(e.target.result);
	};

	reader.readAsDataURL(image_form);
}

function save_button() {
	let image = get_image(300, 1);

	if (!image)
		return;

	let params = get_distort_parameters(get_outputs(), -1);
	
	if (!params)
		return;

	image.element_image_save.width = image.width_image_source;
	image.element_image_save.height = image.height_image_source;
	let undistort_out = image.canvas_image_save.createImageData(image.width_image_source, image.height_image_source);

	for (let x = 0; x < undistort_out.width; x++) {
		for (let y = 0; y < undistort_out.height; y++) {
			let uv = distort_pixel(params, x, y, undistort_out.width, undistort_out.height);
			emplace_pixel_bound(undistort_out.data, 
				sample_pixel_bound(
					image.imagedata_image_source.data,
					uv.u * image.width_image_source,
					uv.v * image.height_image_source,
					image.width_image_source,
					image.height_image_source
				),
				x,
				y,
				undistort_out.width,
				undistort_out.height
			);
		}
	}

	image.canvas_image_save.putImageData(undistort_out, 0, 0);

	window.open(image.element_image_save.toDataURL("image/png"));

	display_image(get_outputs());
}

// #endregion

// #region Calculations

function get_missing(camera) {
	let missing_entries = [];
	for (const [key, value] of Object.entries(camera)) {
		if (value.value === "" && value.calc !== -1) {
			missing_entries.push(key);
		}
	}
	return missing_entries;
}

function get_valid(camera) {
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

// #region Equations

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

function auto_mp_div(cam, a, b) {
	return get_pixcnt(a) / b;
}

function auto_div_sqrt(cam, a, b) {
	return Math.sqrt(a / b);
}

function auto_div_sq(cam, a, b) {
	return a / (b*b);
}

// #endregion

const solve_requirements = [
	['sensor-aspect', 'sensor-width', 'sensor-height', auto_div, 1],
	['sensor-area', 'sensor-width', 'sensor-height', auto_mul, 1],
	['sensor-pix-size', 'sensor-area', 'sensor-mp', auto_div_sqrt, 1],
	['sensor-aspect', 'sensor-pix-x', 'sensor-pix-y', auto_div, 1],
	['sensor-mp', 'sensor-area', 'sensor-pix-size', auto_div_sq, 1],
	['sensor-pix-y', 'sensor-mp', 'sensor-aspect', auto_pixasp, 1],
	['sensor-pix-x', 'sensor-mp', 'sensor-pix-y', auto_mp_div, 1],
	['sensor-mp', 'sensor-pix-x', 'sensor-pix-y', auto_mul, 0.000001],
	['sensor-pix-x', 'sensor-width', 'sensor-pix-size', auto_div, 1000],
	['sensor-pix-y', 'sensor-height', 'sensor-pix-size', auto_div, 1000],
	['sensor-pix-x', 'sensor-mp', 'sensor-pix-y', auto_mp_div, 1],
	['sensor-pix-y', 'sensor-mp', 'sensor-pix-x', auto_mp_div, 1],
	['sensor-width', 'sensor-pix-x', 'sensor-pix-size', auto_mul, 0.001],
	['sensor-height', 'sensor-pix-y', 'sensor-pix-size', auto_mul, 0.001],
	['sensor-width', 'sensor-height', 'sensor-aspect', auto_mul, 1],
	['sensor-height', 'sensor-width', 'sensor-aspect', auto_div, 1],
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

function multipass_solver(cam, set_id) {
	let invalid = get_missing(cam);
	let valid = get_valid(cam);

	//console.log("(Pass)\ninvalid:", invalid, "valid:", valid);

	invalid.forEach(n => {
		solve_requirements.forEach(s => {
			if (s[0] == n) {
				if (valid.includes(s[1]) && valid.includes(s[2])) {
					//console.log('n:', n, 's:', s);
					let a = cam[s[1]].value;
					let b = cam[s[2]].value;
					cam[n].value = s[3](cam, a, b) * s[4];
					cam[n].calc_id = set_id;
				}
			}		
		});
	});

	return invalid.length;
}

function get_format_fraction(diagonal) {
	let number = diagonal * 1.5 / 25.4;

	if (number > 1.0)
		return String(Math.round(number*100.0)/100.0) + '&quot;';

	let frac = 1.0 / number;
	let v_frac = Math.round(frac * 100.0)/100.0;
	let s_frac = String(v_frac);

	return '1/' + s_frac + '&quot;';
}

function nearest_format(camera) {
	let diag_str = camera['sensor-diagonal'].value;

	if (!diag_str)
		return camera;

	let diag = Number(diag_str)

	let format_diag_index = sensor_formats_header.indexOf('sensor-diagonal');
	let format_name_index = sensor_formats_header.indexOf('sensor-format');
	let format_name_index_2 = sensor_formats_header.indexOf('format-name');

	let least_index = -1;
	let least_distance = Number.MAX_VALUE;

	for (let i = 0; i < sensor_formats.length; i++) {
		let cand_diag = Number(sensor_formats[i][format_diag_index]);
		let diff = diag - cand_diag;
		if (Math.abs(diff) < least_distance) {
			least_distance = diff;
			least_index = i;
		}
	}

	let format = sensor_formats[least_index];

	let format_name = format[format_name_index];
	let format_name_2 = format[format_name_index_2];

	format_name = format_name + ' (' + get_format_fraction(diag) + ')';

	if (format_name_2 && format_name_2.length > 0)
		format_name = format_name + ' (' + format_name_2 + ')';

	camera['sensor-format'].value = format_name;

	return camera;
}

function calculate_intrinsics(camera) {
	let prev_len = multipass_solver(camera, 'calc1');

	for (let i = prev_len, passes = 0; i > -1; i--, passes++) {
		let nlen = multipass_solver(camera, `calc${passes + 2}`);
		if (nlen == prev_len)
			break;
		prev_len = nlen;
	}

	camera = nearest_format(camera);

	return camera;
}

function calculate_all(camera) {
	camera = calculate_intrinsics(camera);

	render_distortion(camera);
	display_image(camera);

	return camera;
}

function calculate_partial(camera) {
	if (is_autocalc())
		camera = calculate_intrinsics(camera);

	if (is_autodistort()) {
		render_distortion(camera);
		display_image(camera);
	}

	return camera;
}

// #endregion

// #region Loaders

async function load_csv(url) {
	let csv = [];
	let r = await fetch(url)
	let text = await r.text();
	let lines = text.trim().split('\n');
	lines.forEach(n => {
		let parts = n.trim().split(',');
		csv.push(parts);
	});
	//console.log("csv:", csv);
	return csv;
}

async function load_old_sensors(csv) {
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

	//console.log("slots:", slots);
	return {empty: slots[0][1], 
			fields: fields, 
			formats: slots[1][1],
			presets: slots[2][1]};
}

async function load_cache(csv) {
	let _cache = [];

	for (let i = 1; i < csv.length; i++) {
		_cache.push([csv[i][0], csv[i][1]]);
	}

	return {cache:_cache};
}

async function load_all(csv) {
	let columns = outline_fields.length;
	let rows = csv.length;
	let _all = [];

	for (let i_row = 5; i_row < rows; i_row++) {
		let preset = get_empty_outline();

		for (let i_column = 0; i_column < columns; i_column++) {
			let key = outline_fields[i_column];
			let value = csv[i_row][i_column];

			preset[key].value = value;
		}

		_all.push(preset);
	}

	return {all:_all};
}

async function load_header(csv) {
	let _empty = {};
	let _fields = [];

	let field_line = csv[0];
	const titles = ['outline', 'text', 'value', 'step', 'calc'];

	for (let i = 0; i < field_line.length; i++) {
		_fields.push(field_line[i]);
		_empty[field_line[i]] = {};
	}

	//console.log(csv);
	for (let i = 1; i < csv.length; i++) {
		let row = csv[i];
		//console.log(row);
		for (let v = 0; v < _fields.length; v++) {
			//console.log(i,v,row[v],titles[i],_fields[v]);
			_empty[_fields[v]][titles[i]] = row[v];
		}
	}

	return {empty:_empty, fields:_fields};
}

async function load_preset(sensor_name) {
	let response = await fetch('/sensors/' + sensor_name + '/' + sensor_name + '.json');

	if (!response)
		return;

	return camera_from_json(await response.json());
}

async function load_preset_from_all(sensor_name) {
	let csv = await load_csv('/sensors/sensors_all.csv');
	let all = await load_all(csv);

	let all_index = all.find(n => n['sensor-name'] === sensor_name);

	if (!all_index)
		return;

	return camera_from_form(all_index);
}

async function load_formats(csv) {
	let _formats = [];
	let _formats_outline = [];

	_formats_outline = csv[0];

	for (let i = 1; i < csv.length; i++) {
		_formats.push(csv[i]);
	}

	return {outline:_formats_outline, formats:_formats};
}

// #endregion

// #region Explicit user inputs

function reset_button() {
	on_preset(document.getElementById('templates'));
}

function clear_button() {
	set_camera(get_empty_outline());
}

function swap_button() {
	set_camera(get_outputs());
}

function calculate_button() {
	set_outputs(calculate_all(get_inputs()));
}

// #endregion

// #region Interface events

function on_change(element) {
	set_outputs(calculate_partial(get_inputs()));
}

async function on_preset(element) {
	set_preset(element.value);
}

async function on_load(element) {
	let loadingElement = document.querySelector('#loading');
	loadingElement.textContent = "Loading...";

	let header = await load_header(await load_csv('/sensors/sensors_header.csv'));
	let cache = await load_cache(await load_csv('/sensors/sensors_cache.csv'));
	let formats = await load_formats(await load_csv('/sensors/sensors_format.csv'));

	sensors_cache = cache.cache;
	sensors_fields = header.fields;
	sensor_empty = header.empty;
	sensor_formats = formats.formats;
	sensor_formats_header = formats.outline;

	set_presets_kvs(sensors_cache);

	set_preset('IMX766');

	load_image();

	loadingElement.remove();
}

// #endregion