class Util {
    static add_events(elements, callback, assign_to_element=false, ...events) {
        let event_list = [].concat(events).map(x => assign_to_element ? 'on' + x : x);
        elements.forEach(function(element) {
            event_list.forEach(function(event) {
                if (assign_to_element)
                    element[event] = callback;
                else
                    element.addEventListener(event, callback);
            });
        });
    }

    static diagonal(x, y) {
        return Math.sqrt(x ** 2 + y ** 2);
    }

    static mean_entries(x, carry=undefined) {
        if (!carry)
            carry = {i:0,sum:0};
        for (const entry of Object.values(x))
            if (entry instanceof Object)
                Util.mean_entries(entry, carry);
            else if (!isNaN(entry) && isFinite(entry)) {
                carry.i++;
                carry.sum += entry;
            }
        return carry.sum / carry.i;
    }

    static from_diagonal(opposite, diagonal) {
        return opposite / diagonal;
    }
};

class CanvasContext {
    constructor(element) {
        this.element = element;
        this.context = element.getContext('2d');

        this.update_size();
    }

    set_size(width, height) {
        this.width = this.size.width = this.element.width = width;
        this.height = this.size.height = this.element.height = height;
        this.diagonal = Util.diagonal(this.width, this.height);
    }

    set_stroke_width(width=undefined) { 
        this.context.lineWidth = this.lineWidth = width ?? this.diagonal / 300;
        this.lineWidthRel = this.lineWidth / this.diagonal;
    }

    get_absolute = (relative) => ({x: relative.x * this.width, y: (1 - relative.y) * this.height});

    moveTo(relative) {
        let pos = this.get_absolute(relative);
        this.context.moveTo(pos.x, pos.y);
    }

    lineTo(relative) {
        let pos = this.get_absolute(relative);
        this.context.lineTo(pos.x, pos.y);
    }

    arc(relative, rel_radius, start_angle, end_angle, counter_clockwise=false) {
        let pos = this.get_absolute(relative);
        let radius = this.diagonal * rel_radius;
        this.context.arc(pos.x, pos.y, radius, start_angle, end_angle, counter_clockwise);
    }

    rect(x, y, width, height) {
        let xy = this.get_absolute({x,y:y<height?height:y});
        let wh = this.get_absolute({x:width, y:y>height?height:y});
        this.context.rect(xy.x, xy.y, wh.x, wh.y);
    }

    beginPath = () => this.context.beginPath();

    stroke = () => this.context.stroke();

    fill = () => this.context.fill();

    clear = () => this.context.clearRect(0,0,this.width,this.height);

    update_size() {
        this.size = this.element.getBoundingClientRect();
        
        this.set_size(this.size.width, this.size.height);
        this.set_stroke_width();
    }
};

class Camera {
    static diagonal_35mm = Util.diagonal(36, 24);

    static effective_focal_length_canonical(fx, fy, image_x=1, image_y=1, pixel_size=1) {
        return {x: fx * image_x * pixel_size, y: fy * image_y * pixel_size };
    }

    static effective_focal_length_2(sensor, lens) {
        let fl = Camera.focal_length_2(sensor, lens);
        let cf = sensor.get_crop_factor();
        return {
            x:Camera.effective_focal_length(fl.x, cf),
            y:Camera.effective_focal_length(fl.y, cf),
        };
    }

    static effective_focal_length_canonical_2(sensor, lens) {
        let efl = Camera.effective_focal_length_2(sensor, lens);
        return {
            x:sensor.width/efl.x,
            y:sensor.height/efl.y,
        };
    }

    static effective_focal_length(focal_length, crop_factor) {
        return focal_length / crop_factor;
    }

    static effective_focal_length_2_old(sensor, lens) {
        let efl = lens.get_effective_focal_length();
        let d = sensor.get_diagonal();
        let efu = (sensor.width / d) * efl;
        let efv = (sensor.height / d) * efl;
        return {x:efu,y:efv};
    }

    static effective_focal_length_px(sensor, lens) {

    }

    static focal_length_2_old(sensor, lens) {
        let fl = lens.get_focal_length();
        let d = sensor.get_diagonal();
        let fu = (sensor.width / d) * fl;
        let fv = (sensor.height / d) * fl;
        return {x:fu,y:fv};
    }

    static focal_length_2(sensor, lens) {
        let fuv = sensor.to_scale(1/(sensor.get_diagonal()/lens.get_focal_length() /* * sensor.get_pixel_size()*/));
        return {x:fuv.width,y:fuv.height};
    }

    static focal_length(effective_focal_length, crop_factor) {
        return effective_focal_length * crop_factor;
    }

    static crop_factor(diagonal_mm) {
        return this.diagonal_35mm / diagonal_mm;
    }

    static pixel_size(image_length, sensor_length) {
        return sensor_length / image_length;
    }

    static pixel_size_2(image,sensor) {
        return {x:sensor.width/image.width,y:sensor.height/image.height};
    }

    static pixel_size_all(image, sensor) {
        let real = sensor.pixel_size;
        let im_first = Camera.pixel_size_2(image, sensor);
        let sn_first = Camera.pixel_size_2(sensor.get_image_size(), image.to_scale(real));
        return {
            real:{x:real,y:real},
            from_image:im_first,
            from_sensor:sn_first,
        };
    }

    static pixel_size_auto = (image, sensor, mult=1000) => Util.mean_entries(Camera.pixel_size_all(image, sensor))*mult;

    static Size = class {
        constructor(width,height) { 
            this.width = width;
            this.height = height;
        }

        width;
        height;

        get_area = () => this.width * this.height;
        get_diagonal = () => Util.diagonal(this.width, this.height);
        get_width = () => this.width;
        get_height = () => this.height;

        set_width = (width) => this.width = width;
        set_height = (height) => this.height = height;
        set_size = (width, height) => { this.set_width(width); this.set_height(height); };
        set_diagonal = (diagonal) => this.scale(diagonal / this.get_diagonal());
        get_aspect_ratio = () => this.width / this.height;

        scale = (v) => this.set_size(this.width * v, this.height * v); 
        to_scale = (v) => new Camera.Size(this.width * v, this.height * v);
    };

    static Image = class extends Camera.Size {
        constructor(width,height) {
            super(width,height);
        }
    };

    static Sensor = class extends Camera.Size {
        constructor(width,height,pixel_size) {
            super(width,height);
            this.pixel_size = pixel_size;
        }

        get_crop_factor = () => Camera.crop_factor(this.get_diagonal());
        get_pixel_size = () => this.pixel_size;
        get_pixel_size_um = () => this.get_pixel_size() * 1000;
        get_image_size = () => new Camera.Size(this.get_width()/this.get_pixel_size(),this.get_height()/this.get_pixel_size());

        set_pixel_size = (length) => this.pixel_size = length;
        set_pixel_size_um = (micrometers) => this.set_pixel_size(micrometers*0.001);

        set_pixel_size_crop_factor = 
            (crop_factor) => this.set_pixel_size(this.pixel_size * (crop_factor / this.get_crop_factor()));
    };

    static Lens = class {
        constructor(sensor, image, focal_length) {
            this.sensor = sensor;
            this.image = image;
            this.focal_length = focal_length;
        }

        get_effective_focal_length =
            () => Camera.effective_focal_length(this.get_focal_length(), this.sensor.get_crop_factor());
        
        get_focal_length = () => this.focal_length;

        set_focal_length = (focal_length) => this.focal_length = focal_length;

        set_effective_focal_length =
            (effective_focal_length) => this.set_focal_length(Camera.focal_length(effective_focal_length, this.sensor.get_crop_factor()));
    };
};

class InputBind {
    constructor(callback,attribute="value",cast_prototype=undefined, ...elements) {
        this.elements = [].concat(...elements);
        this.elements.forEach(this.add_events.bind(this));
        this.attribute = attribute;
        this.callback = callback;
        this.cast_prototype = cast_prototype;
        this.callbacks = [];
    }

    get_value = (element) => this.cast_prototype ? this.cast_prototype.constructor(element[this.attribute]) : element[this.attribute];

    oninput(event) {
        let value = this.get_value(event.target);
        InputBind.set_values(
            this.elements.filter(x => x != event.target), 
                value, this.attribute, this.fire_event.bind(this));
    }

    add_listener(callback) {
        this.callbacks.push(callback);
    }

    add_listeners(...callbacks) {
        this.callbacks = this.callbacks.concat(...callbacks);
    }

    fire_event(value) {
        if (this.callback)
            this.callback(value);
        if (this.callbacks)
            for (let i = 0; i < this.callbacks.length; i++)
                this.callbacks[i](value);
    }

    static set_values(elements,value,attribute,callback) {
        elements.forEach(x => x[attribute] = value);
        callback(value);
    }

    set_value = (value, attribute=undefined) => InputBind.set_values(this.elements, value, attribute ?? this.attribute, this.fire_event.bind(this));

    add_events = (element) => element.addEventListener('input', this.oninput.bind(this));

    add_element = (element) => { this.elements.push(element); this.add_events(element); }

    static make_bind(...elements) {
        let bind = new InputBind(undefined,'value',undefined,...elements);
        bind.set_value(bind.get_value(arguments[0]));
        return bind;
    }
};

class Page {
    constructor() {
        this.sensor = new Camera.Sensor();
        this.image = new Camera.Image();
        this.lens = new Camera.Lens(this.sensor, this.image, 25);
        this.canvas = new CanvasContext(document.querySelector('canvas#focal'));

        function make_obj(selector, call) {
            return {selector,call,elements:Object.values(document.querySelectorAll(selector))};
        };

        //pixel_size = function() {
            //return Camera.pixel
        //}.bind(this);

        this.inputs = {
            focal_length:make_obj('input#focal_length', this.lens.set_focal_length.bind(this.lens)),
            effective_focal_length:make_obj('input#effective_focal_length', this.lens.set_effective_focal_length.bind(this.lens)),
            sensor_pix_x:make_obj('input#sensor_pix_x', this.image.set_width.bind(this.image)),
            sensor_pix_y:make_obj('input#sensor_pix_y', this.image.set_height.bind(this.image)),
            sensor_width:make_obj('input#sensor_width', this.sensor.set_width.bind(this.sensor)),
            sensor_height:make_obj('input#sensor_height', this.sensor.set_height.bind(this.sensor)),
            pixel_size:make_obj('input#pixel_size', this.sensor.set_pixel_size_um.bind(this.sensor)),
        };

        this.outputs = {
            focal_length:make_obj('p#focal_length', this.lens.get_focal_length.bind(this.lens)),
            focal_length_canonical:make_obj('p#focal_length_canonical'),
            effective_focal_length:make_obj('p#effective_focal_length', this.lens.get_effective_focal_length.bind(this.lens)),
            effective_focal_length_canonical:make_obj('p#effective_focal_length_canonical'),
            x_focal_length:make_obj('p#x_focal_length'),
            y_focal_length:make_obj('p#y_focal_length'),
            x_focal_length_canonical:make_obj('p#x_focal_length_canonical'),
            y_focal_length_canonical:make_obj('p#y_focal_length_canonical'),
            aspect_ratio:make_obj('p#aspect_ratio', this.sensor.get_aspect_ratio.bind(this.sensor)),
            crop_factor:make_obj('p#crop_factor', this.sensor.get_crop_factor.bind(this.sensor)),
            pixel_size:make_obj('p#pixel_size', this.sensor.get_pixel_size_um.bind(this.sensor)),
            sensor_diagonal:make_obj('p#sensor_diagonal', this.sensor.get_diagonal.bind(this.sensor)),
            image_diagonal:make_obj('p#image_diagonal', this.image.get_diagonal.bind(this.image)),
            pixel_size_estimation:make_obj('p#pixel_size_estimation', Camera.pixel_size_auto.bind(Camera.prototype, this.image,this.sensor)),
        };

        Object.values(this.inputs).forEach(function(x) {
            x.bind = InputBind.make_bind(x.elements);
            x.bind.add_listener(x.call);
            x.bind.add_listener(this.set_outputs.bind(this));
            x.bind.cast_prototype = Number.prototype;
        }.bind(this));
    }

    async render_canvas() {
        this.canvas.clear();
        const radius = Math.SQRT1_2 * 0.5 - this.canvas.lineWidthRel;
        this.canvas.context.strokeStyle = "green";
        this.canvas.beginPath();
        //this.canvas.moveTo({x:0.5,y:0.5});
        this.canvas.arc({x:0.5,y:0.5}, radius, 0, Math.PI * 2);
        this.canvas.stroke();

        let sensor_d = this.sensor.get_diagonal();
        let sensor_w = this.sensor.get_width() / sensor_d;
        let sensor_h = this.sensor.get_height() / sensor_d;
        let image_d = this.image.get_diagonal();
        let image_w = this.image.get_width() / image_d;
        let image_h = this.image.get_height() / image_d;

        let sensor_x = (1 - sensor_w) * 0.5;
        let sensor_y = (1 - sensor_h) * 0.5;

        this.canvas.context.strokeStyle = "red";
        this.canvas.beginPath();
        this.canvas.rect(sensor_x, sensor_y, sensor_w, sensor_h);
        this.canvas.stroke();

    }

    async set_outputs() {
        this.render_canvas();
        Object.values(this.outputs).forEach(x =>
            x.elements[0].innerText = x.call ? x.call() : '');
    }
};

let page = new Page();