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

class SensorDB {
	constructor() {
		this.acronyms = [];
		this.formats = [];
		this.models = [];
		this.sensors = [];
		this.sensor_header = [];
	}

	acronyms_parse(rows) {
		console.log(rows);
		this.acronyms = rows;
	}

	formats_parse(rows) {
		console.log(rows);
		this.formats = rows;
	}

	models_parse(rows) {
		console.log(rows);
		this.models = rows;
	}

	sensors_parse(rows) {
		console.log(rows);
		this.sensors = rows;
	}

	async resource_fetch() {
		const resources = [
			['/sensors/acronyms.csv', this.acronyms_parse],
			['/sensors/formats.csv', this.formats_parse],
			['/sensors/models.csv', this.models_parse],
			['/sensors/sensors.csv', this.sensors_parse],
		];

		const requests = resources.map((rsrc) =>
			new Promise((resolve, reject) => {
				fetch(rsrc[0])
					.then(
						(resp) => {
							resp.text()
								.then((text) => {
									rsrc[1](CSV.loadCSV(text));
									resolve(1);
								}, 
								reject('text error')
							);
						},
						reject('fetch error')
				);
			})
		);

		return Promise.all(requests);
	}
};

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

async function get_preset() {
	//let presets = document.querySelector('div #templates');

	return get_inputs();
}

// #endregion

// #region Modify internal state

function set_presets() {
	let template_dropdown = document.querySelector('div #templates');

	function get_option_html(preset) {
		return `<option value="${preset['sensor-name'].value}">${preset['sensor-name'].value} (${preset['sensor-name-friendly'].value})</option>`;
	};

	function get_option_label_html(label, extra='') {
		return `<option ${extra} disabled>${label}</option>`;
	};

	let html = '';

	html += get_option_label_html('Sensor Presets', 'selected');

	let custom_presets = load_custom_presets();

	if (Object.entries(custom_presets).length) {
		html += get_option_label_html('Custom Presets');
		for (const [key, value] of Object.entries(custom_presets))
			html += get_option_html(custom_presets[key]);
	}

	html += get_option_label_html('Built-in Presets');

	sensors_cache.forEach(sensor => {
		html += get_option_html({'sensor-name':{value:sensor[0]}, 'sensor-name-friendly':{'value':sensor[1]}});
	});

	template_dropdown.innerHTML = html;
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
	let params = {k1:0.0,k2:0.0,k3:0.0,aspect:1.0,ppx:0,ppy:0,senw:1,senh:1,direction:direction,fx:0.0,fy:0.0};

	if (!camera) return params;

	let aspect = Number(camera['sensor-aspect'].value);

	let k1 = Number(camera['brown3-radial1'].value);
	let k2 = Number(camera['brown3-radial2'].value);
	let k3 = Number(camera['brown3-radial3'].value);
	
	let ppx = Number(camera['principal-pix-x'].value);
	let ppy = Number(camera['principal-pix-y'].value);

	let senw = Number(camera['sensor-pix-x'].value);
	let senh = Number(camera['sensor-pix-y'].value);

	let f = Number(camera['focal-length'].value);

	if (f) {
		params.fx = 1 / f;
		params.fy = 1 / f;
	}

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
	let center_x = parameters.ppx + 0.5; //.5
	let center_y = parameters.ppy + 0.5;

	let d = parameters.direction;

	let rel_u = x / width; //0 - 1
	let rel_v = y / height;

	let cu = rel_u - center_x; //-.5 - .5 
	let cv = rel_v - center_y;

	let u = cu * parameters.fx + cu;
	let v = cv * parameters.fy + cv;

	let max_radius = ((center_x * center_x) + (center_y * center_y));
	let pix_radius = ((u * u) + (v * v));
	//let radius = pix_radius / max_radius;
	let radius = pix_radius;
	let model = ((Math.pow(radius, 2) * parameters.k1) +
				 (Math.pow(radius, 4) * parameters.k2) +
				 (Math.pow(radius, 6) * parameters.k3));// * parameters.direction;

	let undistort_u = model * u;
	let undistort_v = model * v;

	let undistort_rel_u = undistort_u * d + rel_u; // + 0 - 1
	let undistort_rel_v = undistort_v * d + rel_v;

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

	console.log(params);
	
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

	let parameters = get_distort_parameters(camera, 1);
	let image = get_image(300, parameters.aspect);
	let ctx = image.canvas_undistort_preview;
	let ctxW = image.width_undistort_preview, ctxH = image.height_undistort_preview;
	let imgW = image.width_image_source, imgH = image.height_image_source;

	image.element_undistort_preview.setAttribute('class', '');

	ctx.imageSmoothingQuality = '';
	ctx.imageSmoothingEnabled = false;
	
	ctx.clearRect(0, 0, ctxW, ctxH);

	//console.log(parameters);

	for (let canvas_x = 0; canvas_x < ctxW; canvas_x++) {
		for (let canvas_y = 0; canvas_y < ctxH; canvas_y++) {
			let cu = canvas_x / ctxW;
			let cv = canvas_y / ctxH;

			let uv = distort_pixel(parameters, canvas_x, canvas_y, ctxW, ctxH);

			if (!uv.edge)
			emplace_pixel_bound(
				image.imagedata_undistort_preview.data,
				sample_pixel_bound(
					image.imagedata_image_source.data, 
					cu * imgW,
					cv * imgH,
					imgW,
					imgH
				),
				uv.u * ctxW,
				uv.v * ctxH,
				ctxW,
				ctxH
			);
		}
	}

	//ctx.putImageData(image.imagedata_undistort_preview, 0, 0);

	for (let image_x = 0; image_x < imgW; image_x++) {
		for (let image_y = 0; image_y < imgH; image_y++) {
			let uv = distort_pixel(parameters, image_x, image_y, imgW, imgH);

			if (uv.edge)
				continue;

			emplace_pixel_bound(
				image.imagedata_undistort_preview.data,
				sample_pixel(
					image.imagedata_image_source.data,
					image_x,
					image_y,
					imgW,
					imgH
				),
				uv.u * ctxW,
				uv.v * ctxH,
				ctxW,
				ctxH
			)
		}
	}

	ctx.putImageData(image.imagedata_undistort_preview, 0, 0);
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
	['sensor-area', 'sensor-diagonal', 'sensor-diagonal', auto_mul, 0.5],
	['sensor-diagonal','sensor-crop-factor','sensor-crop-factor',auto_cf,1],
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

function load_cache(csv) {
	let _cache = [];

	for (let i = 1; i < csv.length; i++) {
		_cache.push([csv[i][0], csv[i][1]]);
	}

	return {cache:_cache};
}

function load_all(csv) {
	let columns = sensors_fields.length;
	let rows = csv.length;
	let _all = [];

	for (let i_row = 5; i_row < rows; i_row++) {
		let preset = get_empty_outline();

		console.log(preset);
		for (let i_column = 0; i_column < columns; i_column++) {
			let key = sensors_fields[i_column];
			let value = csv[i_row][i_column];

			preset[key].value = value;
		}

		_all.push(preset);
	}

	return _all;
}

function load_header(csv) {
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
	//let csv = await load_csv('/sensors/sensors_all.csv');
	let csv = CSV.loadCSV(await load_text_url('/sensors/sensors_all.csv'));
	let all = await load_all(csv);

	let all_index = all.find(n => n['sensor-name'].value === sensor_name);

	if (all_index)
		return camera_from_form(all_index);

	let custom_preset = get_custom_preset(sensor_name);

	if (custom_preset)
		return custom_preset;

	let first_sensor_name = sensors_cache?.first?.get('sensor-name')?.value;

	if (first_sensor_name)
		return await load_preset(first_sensor_name);

	return get_empty_outline();
}

function load_formats(csv) {
	let _formats = [];
	let _formats_outline = [];

	_formats_outline = csv[0];

	for (let i = 1; i < csv.length; i++) {
		_formats.push(csv[i]);
	}

	return {outline:_formats_outline, formats:_formats};
}

function load_custom_presets() {
	return load_local_json('custom_presets', Object.prototype);
}

function save_custom_presets(custom_presets) {
	save_local_json('custom_presets', custom_presets);
}

function get_custom_preset_entry(sensor_name) {
	let presets = load_custom_presets();

	for (const [key, value] of Object.entries(presets))
		if (value['sensor-name'].value == sensor_name)
			return {'key': key, 'value': value};
}

function get_custom_preset(sensor_name) {
	let custom_preset = get_custom_preset_entry(sensor_name);

	if (custom_preset)
		return custom_preset.value;
}

function add_custom_preset(camera) {
	let presets = load_custom_presets();

	presets[uuidv4()] = camera;

	save_custom_presets(presets);
}

function remove_custom_preset() {
	let presets = load_custom_presets();

	let custom_preset = get_custom_preset_entry(presets['sensor-name']?.value);

	if (custom_preset)
		delete presets[custom_preset.key];

	save_custom_presets(presets);
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

async function do_calib_input_dialog() {
	function matrix_input(rows, cols, disp_guide) {
		let str = '';
		for (let r = 0; r < rows; r++) {
			for (let c = 0; c < cols; c++) {
				let disable = '';
				let guide = disp_guide ? disp_guide[r][c] : '';
				if (!guide || (guide.length && guide instanceof Array && guide[1]) || guide.length < 1)
					disable = 'disabled';
				str += `<div id="input_matrix" style="grid-area:${r+1}/${c+1}" row="${r}" col="${c}"><input type="number" ${disable}></input></div>`;
			}
		}
		return str;
	};

	function do_grid(rows, cols, data) {
		let str = '';
		for (let r = 0; r < rows; r++) {
			for (let c = 0; c < cols; c++) {
				let txt = '';
				if (data[r] && data[r][c] && data[r][c].length)
					txt = data[r][c] instanceof Array ? data[r][c][0] : data[r][c];
				str += `<div id="display_matrix" style="grid-area:${r+1}/${c+1}"><div>${txt}</div></div>`;
			}
		}
		return str;
	};

	let cm_info = [
		['fx','','cx'],
		['','fy','cy'],
		['','',['1', true]],
	];

	let dist_info = [
		['k1','k2','k3','t1','t2'],
	];

	let img_size_info = [
		['width', 'height'],
	];

	let html = 
'<div id="input_screen">' +
'<div id="placement">' +
'<div>' +
`<h4>Camera Matrix</h4><div id="cam_mtx"><div id="input_matrix_container">${matrix_input(3,3,cm_info)}</div><div id="display_matrix_container">${do_grid(3,3,cm_info)}</div></div>` +
`<div id="img_size_container"><div><input type="checkbox" id="enable"></input><h4>Image size</h4></div><div id="img_size"><div id="input_matrix_container">${matrix_input(1,2,img_size_info)}</div><div id="display_matrix_container">${do_grid(1,2,img_size_info)}</div></div></div>` +
`<h4>Distortion Parameters</h4><div id="dist"><div id="input_matrix_container">${matrix_input(1,5,dist_info)}</div><div id="display_matrix_container">${do_grid(1,5,dist_info)}</div></div>` +
'</div>' + 
'<div id="input_buttons">' +
'<button id="close">Cancel</button>' +
'<button id="submit">Apply</button>' +
'</div>' +
'</div></div>';

	function cancel_calib() {
		let e = document.querySelector('#input_screen').parentElement;
		if (e)
			e.parentElement.removeChild(e);
	}

	function get_matrix_values(container, ...args) {
		let vals = [];
		for (let i = 0; i < args.length; i++) {
			let arg = args[i];
			let e_arg = container.querySelector(`div[row='${arg[0]}'][col='${arg[1]}'] input`);
			vals.push(e_arg.value);
		}
		return vals;
	}

	function checkbox_input(event) {
		let es = event.target.parentElement.parentElement.querySelectorAll('#input_matrix_container input');
		es.forEach(e => e.disabled = !event.target.checked);
	}

	function apply_calib() {
		let e = document.querySelector('#input_screen');
		if (!e)
			return;
		let mtx = get_matrix_values(e.querySelector('#cam_mtx #input_matrix_container'), [0,0], [1,1], [0,2], [1,2]);
		let dist = get_matrix_values(e.querySelector('#dist #input_matrix_container'), [0,0], [0,1], [0,2], [0,3], [0,4]);
		let size = get_matrix_values(e.querySelector('#img_size #input_matrix_container'), [0,0], [0,1]);

		let use_absolute = e.querySelector('#img_size_container #enable').checked;

		let cam = get_inputs();

		if (dist[0]) cam['brown3-radial1'].value = dist[0];
		if (dist[1]) cam['brown3-radial2'].value = dist[1];
		if (dist[2]) cam['brown3-radial3'].value = dist[2];

		let fx = Number(mtx[0]);
		let fy = Number(mtx[1]);
		let px = Number(mtx[2]);
		let py = Number(mtx[3]);

		if (use_absolute && size[0] && size[1]) {
			if (px)
				px = (px / size[0] - 0.5) * size[0];
			if (py)
				py = (py / size[1] - 0.5) * size[1];
		} else {
			let w = cam['sensor-pix-x']?.value;
			let h = cam['sensor-pix-y']?.value;
			let g = w;
			if (w && h) g = w > h ? w : h;
			else if (!w && h) g = h;
			if (g) {
				g = Number(g);
				if (px)
					px = (px - .5) * g;
				if (py)
					py = (py - .5) * g;
				if (fx)
					fx = (fx * g);
				if (fy)
					fy = (fy * g);
			}
		}

		if (px) cam['principal-pix-x'].value = px;
		if (py) cam['principal-pix-y'].value = py;

		if (cam['sensor-pix-size']?.value && mtx[0] && mtx[1]) {
			let ps = Number(cam['sensor-pix-size'].value)*0.001;

			fx *= ps;
			fy *= ps;
			let f = Math.sqrt((fx * fx) + (fy * fy));

			cam['focal-length'].value = '';
			cam['effective-focal-length'].value = f;
		}

		set_camera(cam);

		cancel_calib();
	}

	let e = document.createElement('div');

	e.innerHTML = html;
	e.querySelector('#input_screen').addEventListener('click', cancel_calib);
	e.querySelector('#placement').addEventListener('click', function(event) {event.stopPropagation();});
	e.querySelector('#close').addEventListener('click', cancel_calib);
	e.querySelector('#submit').addEventListener('click', apply_calib);
	let c = e.querySelector('#img_size_container #enable');
	c.addEventListener('input', checkbox_input);
	checkbox_input({target:c});

	document.querySelector('body').appendChild(e);
	
}

async function do_save_custom_dialog() {
	let html = 
	'<div id="input_screen">' +
	'<div id="placement">' +
	'<form><div>' +
	`<h4>Save Custom Preset</h4><p>Preset Name</p>` +
	`<div id="preset_name"><input type="text"></input></div>` +
	'</div>' +
	`<div id="input_buttons">` +
	'<input type="button" id="close" value="Cancel" />' +
	'<button type="submit" id="submit">Save</button>' +
	'</div></form></div></div>';

	function cancel_save() {
		let e = document.querySelector('#input_screen')?.parentElement;
		if (e)
			e.parentElement.removeChild(e);
	};

	function custom_save() {
		let e = document.querySelector('#input_screen #preset_name input');
		if (!e)
			return;
		
		let name = e.value;
		if (!name)
			name = 'Untitled Sensor';

		let camera = get_inputs();
		camera['sensor-name'].value = name;

		add_custom_preset(camera);

		set_presets();

		cancel_save();
	};

	let e = document.createElement('div');

	e.innerHTML = html;

	e.querySelector('#input_screen').addEventListener('click', cancel_save);
	e.querySelector('#placement').addEventListener('click', function(event){event.stopPropagation();});
	e.querySelector('#close').addEventListener('click', cancel_save);
	e.querySelector('#submit').addEventListener('click', custom_save);

	let input_e = e.querySelector('#input_screen #preset_name input');
	input_e.value = get_inputs()['sensor-name']?.value ?? '';

	document.querySelector('body').appendChild(e);
}

async function do_delete_custom() {
	remove_custom_preset();
	set_presets();
}

async function on_calib_input(event) {
	switch (event.target.id) {
		case 'save_custom': do_save_custom_dialog(); break;
		case 'delete_custom': do_delete_custom(); break;
		case 'enter_calib': do_calib_input_dialog(); break;
	}
}

async function on_load(element) {
	let loadingElement = document.querySelector('#loading');
	loadingElement.textContent = "Loading...";

	//let header = await load_header(await load_csv('/sensors/sensors_header.csv'));
	//let cache = await load_cache(await load_csv('/sensors/sensors_cache.csv'));
	//let formats = await load_formats(await load_csv('/sensors/sensors_format.csv'));
	//let header = load_header(CSV.loadCSV(await load_text_url('/sensors/sensors_header.csv')));
	//let cache = load_cache(CSV.loadCSV(await load_text_url('/sensors/sensors_cache.csv')));
	//let formats = load_formats(CSV.loadCSV(await load_text_url('/sensors/sensors_format.csv')));

	let p = new SensorDB();
	await p.resource_fetch();
	console.log('complete');
	return;

	sensors_cache = cache.cache;
	sensors_fields = header.fields;
	sensor_empty = header.empty;
	sensor_formats = formats.formats;
	sensor_formats_header = formats.outline;

	set_presets();

	set_preset('IMX766');

	load_image();

	document.querySelectorAll('#save_custom,#delete_custom,#enter_calib')
		.forEach(x => x.addEventListener('click', on_calib_input));

	loadingElement.remove();
}

// #endregion