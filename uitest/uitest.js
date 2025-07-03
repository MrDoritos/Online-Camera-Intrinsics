const Pixel = class {
    static pixel = (r, g, b) => {
        return [r, g, b, 255];
    };

    static gray = (v) => {
        return [v, v, v, 255];
    };

    static grayf = (v) => {
        return Pixel.gray(v * 255);
    };
};

const Color = class {
    static WHITE = Pixel.grayf(1);
    static BLACK = Pixel.grayf(0);
};

class CanvasBuffer {
    canvas;
    context;
    image;
    width;
    height;

    canvas_clear = () => this.context.clearRect(0, 0, this.width, this.height);

    get_image_data = () => this.context.getImageData(0,0,this.width,this.height);

    put_image_data = () => this.context.putImageData(this.image, 0, 0);

    get_offset = (x, y) => Math.round(Math.round(y) * this.width + x) * 4;

    get_sample_offset = (x, y) => this.get_offset(x * this.width, y * this.height);

    set_size(width, height) {
        this.width = width;
        this.height = height;

        this.context.width = this.canvas.width = this.width;
        this.context.height = this.canvas.height = this.height;
    }

    get_width = () => this.width;
    get_height = () => this.height;

    set_canvas_size(width, height) {
        this.set_size(width, height);
    }

    is_bound(x, y) {
        return x < this.width && y < this.height && x >= 0 && y >= 0;
    }

    set_smoothing_off() {
        this.context.imageSmoothingQuality = '';
        this.context.imageSmoothingEnabled = false;
    }

    create_canvas(width, height) {
        let canvas = document.createElement('canvas');
        this.load_canvas(canvas, width, height);
    }

    load_canvas(canvas, width, height) {
        this.canvas = canvas;
        this.context = this.canvas.getContext('2d');
        this.set_canvas_size(width, height);
        this.image = this.get_image_data();
        this.canvas_clear();
    }

    draw_image(x, y, image) {
        this.context.drawImage(image, x, y);
    }

    load_image(image) {
        this.create_canvas(image.width, image.height);
        this.draw_image(0,0,image);
        this.image = this.get_image_data();
    }

    flush = () => this.put_image_data();

    static async load_image_url(url) {
        return new Promise((resolve, reject) => {
            let image = new Image();
            image.crossOrigin = "anonymous";
            image.src = url;
            image.onload = () => resolve(image);
            image.onerror = () => reject(new Error("Could not load image"));
        });
    }

    async load_url(url) {
        this.load_image(await CanvasBuffer.load_image_url(url));
    }
};

const TextureReader = (Super) => class extends Super {
    get_pixel_offset = (offset) => { let pixel = [0,0,0,255]; for (let i = 0; i < 4; i++) pixel[i] = this.image.data[offset + i]; return pixel; };

    get_pixel_bound = (x, y) => { if (this.is_bound(x, y)) this.get_pixel(x, y); };

    get_pixel = (x, y) => this.get_pixel_offset(this.get_offset(x, y));

    get_sample = (x, y) => this.get_pixel_offset(this.get_sample_offset(x, y));
};

const TextureWriter = (Super) => class extends Super {
    put_sample = (x, y, pixel) => this.put_pixel_offset(this.get_sample_offset(x, y), pixel);

    put_pixel_offset = (offset, pixel) => { for (let i = 0; i < 4; i++) this.image.data[offset + i] = pixel[i]; };

    put_pixel = (x, y, pixel) => this.put_pixel_offset(this.get_offset(x, y), pixel);

    put_pixel_bound = (x, y, pixel) => { if (this.is_bound(x, y)) this.put_pixel(x, y, pixel); };

    clear = (pixel) => this.fillrect(0, 0, this.width, this.height, pixel);

    fillrect = (x0, y0, x1, y1, pixel) => {
        for (let x = x0; x < x1; x++) {
            for (let y = y0; y < y1; y++) {
                this.put_pixel(x, y, pixel);
            }
        }
    };

    sample_texture(dx0, dy0, dx1, dy1, sx0, sy0, sx1, sy1, texture) {
        const ix = 1/this.width;
        const iy = 1/this.height;
        const dsx = (dx1 - dx0) * this.width;
        const dsy = (dy1 - dy0) * this.height;
        const isx = (sx1 - sx0) * texture.width;
        const isy = (sy1 - sy0) * texture.height;
        const six = dsx / isx;
        const siy = dsy / isy;

        for (let dx = dx0, sx = sx0; dx < dx1; dx += ix, sx += six) {
            for (let dy = dy0, sy = sy0; dy < dy1; dy += iy, sy += siy) {
                this.put_sample(dx, dy, 
                    texture.get_sample(sx, sy)
                );
            }
        }
    }

    draw_sprite(x, y, sprite) {
        for (let i = sprite.x0, k = x; i < sprite.x1; i++, k++) {
            for (let j = sprite.y0, l = y; j < sprite.y1; j++, l++) {
                const pixel = sprite.atlas.get_pixel(i, j);
                this.put_pixel(k, l, sprite.atlas.get_pixel(i, j));
            }
        }
    }
};

class Texture extends TextureReader(TextureWriter(CanvasBuffer)) { };

class Atlas extends Texture {
    sprite_width;
    sprite_height;
    atlas_width;
    atlas_height;

    set_sprite_size(width, height) {
        this.sprite_width = width;
        this.sprite_height = height;
        this.atlas_width = this.get_atlas_width();
        this.atlas_height = this.get_atlas_height();
    }

    get_atlas_width = () => this.width / this.sprite_width;

    get_atlas_height = () => this.height / this.sprite_height;

    get_sprite_position(x, y, xn=1, yn=1) {
        return [
            x * this.sprite_width,
            y * this.sprite_height,
            (x + xn) * this.sprite_width,
            (y + yn) * this.sprite_height,
        ];
    }

    get_sprite(x, y, xn=1, yn=1) {
        let pos = this.get_sprite_position(x, y, xn, yn);
        return new Atlas.Sprite(this, pos[0], pos[1], pos[2], pos[3]);
    }

    static Sprite = class extends Texture {
        constructor(atlas, x0, y0, x1, y1) {
            super();
            this.atlas = atlas;
            this.x0 = x0;
            this.y0 = y0;
            this.x1 = x1;
            this.y1 = y1;
        }
    };
};

class FontAtlas extends Atlas {
    get_character(char) {
        const code = char.charCodeAt(0);
        const x = code % this.atlas_width;
        const y = (code / this.atlas_width) | 0;
        return this.get_sprite(x, y);
    }
};

const UISize = (Super) => class extends (Super) {
    constructor(offsetx=0, offsety=0, width=0, height=0) {
        super();
        this.offsetx = offsetx;
        this.offsety = offsety;
        this.width = width;
        this.height = height;
    }

    offsetx;
    offsety;
    width;
    height;

    set_width = (width) => this.width = width;
    set_height = (height) => this.height = height;
    set_offsetx = (offsetx) => this.offsetx = offsetx;
    set_offsety = (offsety) => this.offsety = offsety;
    
    set_left = (left) => this.set_offsetx(left);
    set_right = (right) => this.set_width(right - this.get_offsetx());
    set_top = (top) => this.set_offsety(top);
    set_bottom = (bottom) => this.set_height(bottom - this.get_offsety());

    set_size = (offsetx, offsety, width, height) => { this.set_offsetx(offsetx); this.set_offsety(offsety); this.set_width(width); this.set_height(height); };
    set_box = (top, right, bottom, left) => { this.set_top(top); this.set_left(left); this.set_bottom(bottom); this.set_right(right); };

    get_width = () => this.width;
    get_height = () => this.height;
    get_offsetx = () => this.offsetx;
    get_offsety = () => this.offsety;

    get_left = () => this.get_offsetx();
    get_right = () => this.get_offsetx() + this.get_width();
    get_top = () => this.get_offsety();
    get_bottom = () => this.get_offsety() + this.get_height();

    is_bound = (x, y) => x >= this.get_left() && x < this.get_right() && y >= this.get_top() && y < this.get_bottom();

    get_absolute() {
        return this;
    }

    get_relative(size) {
        return UISize.make_size(this.get_offsetx() + size.get_offsetx(), this.get_offsety() + size.get_offsety(), this.get_width(), this.get_height());
    }

    set_relative_offset(size) {
        this.set_offsetx(this.get_offsetx() + size.get_offsetx());
        this.set_offsety(this.get_offsety() + size.get_offsety());
    }

    set_relative_padding(size, padding_horizontal, padding_vertical) {
        this.set_offsetx(size.get_offsetx() + padding_horizontal);
        this.set_offsety(size.get_offsety() + padding_vertical);
        this.set_width(size.get_width() - padding_horizontal);
        this.set_height(size.get_height() - padding_vertical);
    }

    static make() {
        return new UISize(object);
    }

    static make_box(top, right, bottom, left) {
        let ret = UISize.make();
        ret.set_box(top, right, bottom, left);
        return ret;
    }

    static make_size(offsetx, offsety, width, height) {
        let ret = UISize.make();
        ret.set_size(offsetx, offsety, width, height);
        return ret;
    }
};

class UIEventHandler {
    stopImmediatePropagation;
    stopPropagation;
    debug_events=false;

    do_call(element, event) {
        const callback = element[event.type];

        if (callback)
            callback.bind(element, event)();

        if (this.debug_events)
            console.log(`${element.constructor.name} -> ${callback ? 'hit': 'x'}`);
    }

    log_stop() {
        if (this.debug_events)
            console.log(`${this.stopPropagation ? 'stopPropagation': ''} ${this.stopImmediatePropagation ? 'stopImmediatePropagation': ''}`.trim());
    }

    handle(element, event) {
        if (!element)
            return;

        this.do_call(element, event);

        if (this.stopPropagation || this.stopImmediatePropagation)
            return this.log_stop();

        const children = element.children;

        if (!children)
            return;

        for (const child of children) {
            this.handle(child, event);
            
            this.stopPropagation = false;

            if (this.stopImmediatePropagation)
                return this.log_stop();
        }
    }

    fire_event(element, event) {
        this.stopImmediatePropagation = false;
        this.stopPropagation = false;
        this.handle(element, event);
    }

    fire_new_event(element, event_name, event_value) {
        const event = this.make_event(event_name, event_value);
        this.fire_event(element, event);
    }

    make_event(event_name, event_value=undefined) {
        return new UIEventHandler.UIEvent(this, event_name, event_value);
    }

    static UIEvent = class {
        constructor(handler, type, value=undefined) {
            this.handler = handler;
            this.type = type;
            this.value = value;
        }

        handler;
        type;
        value;

        stopPropagation() {
            this.handler.stopPropagation = true;
        }

        stopImmediatePropagation() {
            this.handler.stopImmediatePropagation = true;
        }
    };

    static UIKeyboardEvent = class extends UIEventHandler.UIEvent {
        constructor(handler, key, key_code, char_code) {
            super(handler, 'keyboard');
            this.key = key;
            this.key_code = key_code;
            this.char_code = char_code;
        }

        static make = (handler, event) => new UIEventHandler.UIKeyboardEvent(handler, event.key, event.keyCode, event.charCode);

        is_digit = () => this.key_code >= 48 && this.key_code <= 57;
        is_letter = () => this.key.toLowerCase() != this.key.toUpperCase();
        is_arrow_key = () => this.key_code >= 37 && this.key_code <= 40;
        is_arrow_up_key = () => this.key_code == 38;
        is_arrow_down_key = () => this.key_code == 40;
        is_arrow_left_key = () => this.key_code == 37;
        is_arrow_right_key = () => this.key_code == 39;
        is_char = () => this.key_code > 31 && this.key_code < 127;
        is_alt_key = () => this.key_code == 18;
        is_ctrl_key = () => this.key_code == 17;
        is_shift_key = () => this.key_code == 16;
        is_backspace_key = () => this.key_code == 8;
        is_enter_key = () => this.key_code == 13;
        is_delete_key = () => this.key_code == 46;
        is_escape_key = () => this.key_code == 27;
        is_caps_lock_key = () => this.key_code == 20;
    };
};

const UIElementMixin = (Super) => class extends UISize(Super) {
    children = [];
    buffer;
    parent;

    appendChild = (ui_element) => { this.children.push(ui_element); ui_element.buffer = this.buffer; ui_element.parent = this; return ui_element; }
    removeChild = (ui_element) => { this.children = this.children.filter(x => x != ui_element); ui_element.parent = undefined; }

    set_buffer(buffer) {
        this.buffer = buffer;
        this.set_width(buffer.get_width());
        this.set_height(buffer.get_height());
    }

    set_buffer_event(event) {
        this.buffer = event.value;
    }

    clear() {
        this.buffer.fillrect(this.get_left(), this.get_top(), this.get_right(), this.get_bottom(), Color.BLACK);
    }
};

class UIElement extends UIElementMixin(Object) {};

class UIRoot extends UIElementMixin(UIEventHandler) {
    constructor(element, width=128, height=128) {
        super();
        this.element = document.createElement('div');
        this.element.id = 'container';
        element.appendChild(this.element);

        let buffer = new Texture();
        buffer.create_canvas(width, height);
        buffer.canvas.id = 'canvas';
        this.element.appendChild(buffer.canvas);
        this.set_buffer(buffer);
    }

    listener_of(element) {
        let _this = this;
        element.addEventListener('keydown', (event) => {
            _this.root_fire(UIEventHandler.UIKeyboardEvent.make(_this, event));
        });
    }

    fire = (event_name, event_value) => this.fire_new_event(this, event_name, event_value);
    root_fire = (event) => this.fire_event(this, event);

    reset() {
        this.buffer.clear(Color.BLACK);
        this.buffer.flush();
    }
};

class UIText extends UIElement {
    constructor(url='font.png', font_width=8, font_height=12, text='') {
        super();
        this.font_atlas = new FontAtlas();
        this.text = text;
        this.font_width = font_width;
        this.font_height = font_height;
        this.url = url;
        this.cursor_x = 0;
        this.cursor_y = 0;
    }

    text;
    font_atlas;
    font_width;
    font_height;
    url;
    draw_end_x;
    draw_end_y;
    cursor_x;
    cursor_y;

    async load_resources() {
        await this.font_atlas.load_url(this.url);
        this.font_atlas.set_sprite_size(this.font_width, this.font_height);
    }

    load() {
        this.load_resources();
    }

    draw_character(x, y, character) {
        const font_sprite = this.font_atlas.get_character(character);

        this.buffer.draw_sprite(x, y, font_sprite);
    }

    draw_at_cursor = (character) => this.draw_character(this.cursor_x, this.cursor_y, character);

    draw() {
        this.cursor_x = this.get_left();
        this.cursor_y = this.get_top();

        if (!this.text || this.text.length < 1)
            return;

        for (let i = 0; i < this.text.length; i++) {
            const character = this.text[i];

            if (character == '\n') {
                this.cursor_x = 0;
                this.cursor_y += this.font_atlas.sprite_height;
                continue;
            }

            this.draw_at_cursor(character);

            this.cursor_x += this.font_atlas.sprite_width;
            if (this.cursor_x + this.font_atlas.sprite_width > this.get_right()) {
                this.cursor_x = 0;
                this.cursor_y += this.font_atlas.sprite_height;
            }
        }

        this.draw_end_x = this.cursor_x;
        this.draw_end_y = this.cursor_y;

        this.buffer.flush();
    }

    draw_text(text) {
        this.text = text;
        this.draw();
    }

    insert_text(i, text) {
        this.text = this.text.slice(0, i) + text + this.text.slice(i);
    }

    remove_range(i, n) {
        this.text = this.text.slice(0, i) + this.text.slice(i+n);
    }

    static async make(url='font.png', text='') {
        let ret = new UIText(url);
        ret.text = text;
        await ret.load_resources();
        return ret;
    }
};

class UITextInput extends UIText {
    constructor() {
        super();
    }

    ticks=0;
    flash_ticks=10;

    keyboard(event) {
        if (event.is_char()) {
            this.text += event.key;
        } else
        if (event.is_backspace_key()) {
            if (this.text.length > 0)
                this.text=this.text.slice(0, this.text.length-1);
        } else
        if (event.is_enter_key()) {
            this.text += '\n';
        } else {
            return;
        }

        this.ticks = 0;

        this.draw();
    }

    is_tick_interval = () => (this.ticks % this.flash_ticks) == 0;

    reset() {
        this.ticks = 0;
    }

    draw() {
        this.clear();

        super.draw();

        const is_flash = this.ticks % (this.flash_ticks * 2) < this.flash_ticks;
        
        this.draw_at_cursor(is_flash ? '|' : ' ');

        this.buffer.flush();
    }

    tick() {
        this.ticks = ++this.ticks % (this.flash_ticks * 2);
        if (this.is_tick_interval())
            this.draw();
    }
};


let ui = new UIRoot(body);
let uitext = ui.appendChild(new UITextInput());
uitext.set_size(0, 0, 64, 64);
ui.fire('load');
ui.fire('reset');
ui.fire('set_buffer_event', ui.buffer);
ui.listener_of(document.querySelector('body'));

setInterval(() => ui.fire('tick'), 50);