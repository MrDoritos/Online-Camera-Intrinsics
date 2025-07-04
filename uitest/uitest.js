const Pixel = class {
    static pixel = (r, g, b) => {
        return [r, g, b, 255];
    };

    static pixel_lerp = (p1, p2, f) => {
        return [
            lerp(p1[0], p2[0], f),
            lerp(p1[1], p2[1], f),
            lerp(p1[2], p2[2], f),
            lerp(p1[3], p2[3], f),
        ];
    };

    static gray = (v) => {
        return [v, v, v, 255];
    };

    static grayf = (v) => {
        return Pixel.gray(v * 255);
    };

    static alpha_blend = (p_over, p_under) => {
        const alpha_over = p_over[3] / 255;
        return Pixel.pixel_lerp(p_under, p_over, alpha_over);
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

class Texture extends TextureReader(TextureWriter(CanvasBuffer)) {
    put_pixel_alpha_blend(x, y, pixel) {
        const mix_pixel = this.get_pixel(x, y);
        this.put_pixel(x, y, Pixel.alpha_blend(pixel, mix_pixel));
    }

    put_pixel_alpha_fast(x, y, pixel, alpha_threshold=64) {
        if (pixel[3] < alpha_threshold)
            return;

        this.put_pixel(x, y, pixel);
    }

    draw_sprite_alpha_blend(x, y, sprite, fast=false, fast_alpha_threshold=64) {
        const put_func = fast ? this.put_pixel_alpha_fast.bind(this) : this.put_pixel_alpha_blend.bind(this);
        for (let i = sprite.x0, k = x; i < sprite.x1; i++, k++) {
            for (let j = sprite.y0, l = y; j < sprite.y1; j++, l++) {
                const pixel = sprite.atlas.get_pixel(i, j);
                put_func(k, l, pixel);
            }
        }
    }
};

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

const KeyCodes = class {
    BACKSPACE = 8;
    ENTER = 13;
    SHIFT = 16;
    CTRL = 17;
    ALT = 18;
    CAPS = 20;
    ESCAPE = 27;
    ARROW_LEFT = 37;
    ARROW_UP = 38;
    ARROW_RIGHT = 39;
    ARROW_DOWN = 40;
    DELETE = 46;
    TAB = 9;
    F1 = 112;
    F2 = 113;
    F3 = 114;
    F4 = 115;
    F5 = 116;
    F6 = 117;
    F7 = 118;
    F8 = 119;
    F9 = 120;
    F10 = 121;
    F11 = 122;
    F12 = 123;
};

Codes = new KeyCodes();

class UIEventHandler {
    stopImmediatePropagation;
    stopPropagation;
    debug_events=false;
    total_start_time = Date.now();
    event_start_time;
    ignore_log = ['tick'];

    get_tree_str(element) {
        return (element.parent ? this.get_tree_str(element.parent) : '') + 
                `::${element.constructor.name}`;
    }

    log_event(element, event) {
        if (!this.debug_events || this.ignore_log.includes(event.type))
            return;

        const callback = element[event.type];

        const now = Date.now();
        const total_time = `[${String(now - this.total_start_time).padStart(5, ' ')} ms]`;
        const event_time = `[${String(now - this.event_start_time).padStart(5, ' ')} ms]`;
        const type = event.type.padStart(20, ' ');
        //const name = element.constructor.name;
        const name = this.get_tree_str(element);
        const hit = `-> ${callback ? 'hit': 'x'}`;

        console.log(`${total_time} ${event_time} ${type} ${name} ${hit}`);
    }

    async do_call(element, event) {
        const callback = element[event.type];

        if (callback)
            callback.bind(element, event)();

        if (this.debug_events)
            this.log_event(element, event);
    }

    log_stop() {
        if (this.debug_events)
            console.log(`${this.stopPropagation ? 'stopPropagation': ''} ${this.stopImmediatePropagation ? 'stopImmediatePropagation': ''}`.trim());
    }

    async handle(element, event) {
        if (!element)
            return;

        await this.do_call(element, event);

        if (this.stopPropagation || this.stopImmediatePropagation)
            return this.log_stop();

        const children = element.children;

        if (!children)
            return;

        for (const child of children) {
            await this.handle(child, event);
            
            this.stopPropagation = false;

            if (this.stopImmediatePropagation)
                return this.log_stop();
        }
    }

    async fire_event(element, event) {
        this.stopImmediatePropagation = false;
        this.stopPropagation = false;
        this.event_start_time = Date.now();
        await this.handle(element, event);
    }

    async fire_new_event(element, event_name, event_value) {
        const event = this.make_event(event_name, event_value);
        await this.fire_event(element, event);
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
            this.key_code = this.is_extended() ? key_code : 0;
            this.char_code = this.is_extended() ? 0 : key_code;
        }

        static make = (handler, event) => new UIEventHandler.UIKeyboardEvent(handler, event.key, event.keyCode, event.charCode);

        is_extended = () => this.key.length > 1;
        is_digit = () => this.char_code >= 48 && this.char_code <= 57;
        is_letter = () => this.is_char() && this.key.toLowerCase() != this.key.toUpperCase();
        is_arrow_key = () => this.key_code >= 37 && this.key_code <= 40;
        is_arrow_up_key = () => this.key_code == Codes.ARROW_UP;
        is_arrow_down_key = () => this.key_code == Codes.ARROW_DOWN;
        is_arrow_left_key = () => this.key_code == Codes.ARROW_LEFT;
        is_arrow_right_key = () => this.key_code == Codes.ARROW_RIGHT;
        //is_char = () => this.char_code > 31 && this.char_code < 127;
        is_char = () => !this.is_extended();
        is_alt_key = () => this.key_code == Codes.ALT;
        is_ctrl_key = () => this.key_code == Codes.CTRL;
        is_shift_key = () => this.key_code == Codes.SHIFT;
        is_backspace_key = () => this.key_code == Codes.BACKSPACE;
        is_enter_key = () => this.key_code == Codes.ENTER;
        is_delete_key = () => this.key_code == Codes.DELETE;
        is_escape_key = () => this.key_code == Codes.ESCAPE;
        is_caps_lock_key = () => this.key_code == Codes.CAPS;

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
        this.element.className = 'display';
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
            const uievent = UIEventHandler.UIKeyboardEvent.make(_this, event);
            if (this.debug_events)
                console.log('event', event, 'uievent', uievent);
            _this.root_fire(uievent);
        });
    }

    fire = async (event_name, event_value) => await this.fire_new_event(this, event_name, event_value);
    root_fire = async (event) => await this.fire_event(this, event);

    reset() {
        this.buffer.clear(Color.BLACK);
        this.buffer.flush();
    }
};

class UIText extends UIElement {
    constructor(url='font.png', font_width=8, font_height=12, text='', alpha_blend=true, alpha_fast=true) {
        super();
        this.font_atlas = new FontAtlas();
        this.text = text;
        this.font_width = font_width;
        this.font_height = font_height;
        this.url = url;
        this.cursor_x = 0;
        this.cursor_y = 0;
        this.alpha_blend = alpha_blend;
        this.alpha_fast = alpha_fast;
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

    async load() {
        await this.load_resources();
    }

    draw_character(x, y, character) {
        const font_sprite = this.font_atlas.get_character(character);

        if (this.alpha_blend) {
            this.buffer.draw_sprite_alpha_blend(x, y, font_sprite, this.alpha_fast);
        } else {
            this.buffer.draw_sprite(x, y, font_sprite);
        }
    }

    draw_at_cursor = (character) => this.draw_character(this.cursor_x, this.cursor_y, character);

    get_columns = () => (this.get_width() / this.font_width) | 0;
    get_rows = () => (this.get_height() / this.font_height) | 0;

    set_cursor_position(columns, rows) {
        this.cursor_x = columns * this.font_width + this.get_left();
        this.cursor_y = rows * this.font_height + this.get_top();
    }

    get_cursor_index(index) {
        const columns = index % this.get_columns();
        const rows = (index / this.get_columns()) | 0;
        return [columns, rows];
    }

    set_cursor_index(index) {
        const position = this.get_cursor_index(index);
        this.set_cursor_position(position[0], position[1]);
    }

    get_cursor_wrap_index(index) {
        let row = 0;
        let column = 0;
        const columns = this.get_columns();

        for (let i = 0; i < this.text.length && i < index; i++) {
            if (this.text[i] == '\n') {
                row++;
                column = 0;
            } else {
                if (this.text[i] == '\t') {
                    column++;
                }
                column++;
            }
            if (column >= columns) {
                column = 0;
                row++;
            }
        }

        return [column, row];
    }

    set_cursor_wrap_index(index) {
        const position = this.get_cursor_wrap_index(index);
        this.set_cursor_position(position[0], position[1]);
    }

    draw_string_at_cursor(text) {
        for (let i = 0; i < text.length; i++) {
            const character = text[i];

            if (character == '\n') {
                this.cursor_x = this.get_left();
                this.cursor_y += this.font_height;
                continue;
            }

            if (character == '\t') {
                this.cursor_x += this.font_width;
            } else {
                this.draw_at_cursor(character);
            }

            this.cursor_x += this.font_width;
            if (this.cursor_x + this.font_width > this.get_right()) {
                this.cursor_x = this.get_left();
                this.cursor_y += this.font_height;
            }
        }

        this.buffer.flush();
    }

    draw() {
        this.cursor_x = this.get_left();
        this.cursor_y = this.get_top();

        if (!this.text || this.text.length < 1)
            return;

        this.draw_string_at_cursor(this.text);

        this.draw_end_x = this.cursor_x;
        this.draw_end_y = this.cursor_y;

    }

    draw_text(text) {
        this.text = text;
        this.draw();
    }

    insert_text(i, text) {
        this.text = this.text.slice(0, i) + text + this.text.slice(i);
    }

    remove_range(i, n=1) {
        this.text = this.text.slice(0, i-1) + this.text.slice(i+n-1);
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
    user_cursor_index=0;

    down_arrow() {
        if (this.user_cursor_index >= this.text.length)
            return;

        const final = this.get_cursor_wrap_index(this.text.length-1);
        const start = this.get_cursor_wrap_index(this.user_cursor_index);

        if (final[1] == start[1]) {
            this.user_cursor_index = this.text.length;
            return;
        }

        let best_index = 0;

        for (let i = this.user_cursor_index; i < this.text.length; i++) {
            const position = this.get_cursor_wrap_index(i);

            if (position[1] > start[1] + 1 || (position[0] > start[0] && position[1] > start[1]))
                break;

            best_index = i;
        }

        this.user_cursor_index = best_index;
    }

    up_arrow() {
        const start = this.get_cursor_wrap_index(this.user_cursor_index);

        if (start[1] < 1) {
            this.user_cursor_index = 0;
            return;
        }

        let best_index = 0;


        for (let i = 0; i < this.user_cursor_index; i++) {
            const position = this.get_cursor_wrap_index(i);

            best_index = i;
        
            if (position[1] >= start[1] || (position[0] >= start[0] && position[1]+1 >= start[1]))
                break;
        }

        this.user_cursor_index = best_index;
    }

    keyboard(event) {
        if (event.is_char()) {
            this.insert_text(this.user_cursor_index, event.key);
            this.user_cursor_index++;
        } else {
            switch (event.key_code) {
                case Codes.BACKSPACE:
                    if (this.text.length > 0) {
                        this.remove_range(this.user_cursor_index);
                        this.user_cursor_index--;
                    }
                    break;
                case Codes.DELETE:
                    if (this.text.length > 0 && this.user_cursor_index < this.text.length) {
                        this.remove_range(this.user_cursor_index+1);
                    }
                    break;
                case Codes.ENTER:
                    this.insert_text(this.user_cursor_index, '\n');
                    this.user_cursor_index++;
                    break;
                case Codes.ARROW_LEFT:
                    if (this.user_cursor_index > 0)
                        this.user_cursor_index--;
                    break;
                case Codes.ARROW_RIGHT:
                    if (this.user_cursor_index < this.text.length)
                        this.user_cursor_index++;
                    break;
                case Codes.ARROW_UP:
                    this.up_arrow();
                    break;
                case Codes.ARROW_DOWN:
                    this.down_arrow();
                    break;
                default:
                    return;
            }
        }

        this.ticks = 0;

        this.draw();
    }

    //is_replace = () => this.user_cursor_index < this.text.length;

    is_tick_interval = () => (this.ticks % this.flash_ticks) == 0;

    reset() {
        this.ticks = 0;
    }

    draw() {
        this.clear();

        super.draw();

        const is_flash = this.ticks % (this.flash_ticks * 2) < this.flash_ticks;

        if (is_flash) {
            this.set_cursor_wrap_index(this.user_cursor_index);
            this.cursor_x -= this.font_width * .4;
            this.draw_at_cursor('|');
        }
        this.buffer.flush();
    }

    tick() {
        this.ticks = ++this.ticks % (this.flash_ticks * 2);
        if (this.is_tick_interval())
            this.draw();
    }
};

const UITicking = (Super) => class extends Super {
    ticks=0;
    flash_ticks=10;

    is_tick_interval = () => (this.ticks % this.flash_ticks) == 0;
    is_tick_major = () => this.ticks % (this.flash_ticks * 2) < this.flash_ticks;
    increment_tick = () => (this.ticks = ++this.ticks % (this.flash_ticks * 2));

    reset() {
        this.ticks = 0;
    }

    tick() {
        this.increment_tick();
        if (this.is_tick_interval())
            this.draw();        
    }
};

class UIClock extends UITicking(UIText) {
    draw() {
        const now = new Date();

        const dayStr = [
            "Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"
        ][now.getDay()];

        const dateStr = String(now.getDate());
        const monthStr = String(now.getMonth()+1);
        const combDateStr = `${monthStr}/${dateStr}`;
        const hourStr = String(now.getHours()).padStart(2, '0');
        const minuteStr = String(now.getMinutes()).padStart(2, '0');

        this.clear();

        this.cursor_x = this.get_right() - this.font_width * 12.5;
        this.cursor_y = this.get_top();

        this.draw_string_at_cursor(dayStr);
        //this.cursor_x = this.get_right() - this.font_width * 10.2;
        this.cursor_x = this.get_right() - this.font_width * 7.8 - (combDateStr.length * .5 * this.font_width);
        this.draw_string_at_cursor(combDateStr);

        //this.draw_string_at_cursor(`${dayStr} ${combDateStr}`);

        `${hourStr}${this.is_tick_major() ? ':' : ' '}${minuteStr}`;
        this.cursor_x = this.get_right() - this.font_width * 2;
        this.draw_string_at_cursor(minuteStr);
        this.cursor_y = this.get_top();
        this.cursor_x = this.get_right() - this.font_width * 4.5;
        this.draw_string_at_cursor(hourStr);
        this.cursor_x = this.get_right() - this.font_width * 2.6;
        if (this.is_tick_major())
            this.draw_string_at_cursor(':');
    }
};

class DPad {
    dpad_enter_url = 'dpad_enter.png';
    dpad_arrow_url = 'dpad_arrow.png';

    constructor(element) {
        this.inner = document.createElement('div');
        this.inner.id = "container";
        this.inner.className = "dpad";
        this.element = this.inner.appendChild(document.createElement('div'));
        this.element.id = "inner";
        this.element.className = "dpad";
        element.appendChild(this.inner);

        this.get_dpad(this.element);
    }

    get_enter(element, url) {
        let node = document.createElement('img');
        node.src = url;
        node.crossOrigin = "anonymous";
        node.className = "enter";
        return element.appendChild(node);
    }

    get_arrow(element, url, id) {
        let node = document.createElement('img');
        node.src = url;
        node.crossOrigin = "anonymous";
        node.className = "arrow";
        node.id = id;
        return element.appendChild(node);
    }

    get_dpad(element) {
        this.enter = this.get_enter(element, this.dpad_enter_url);
        this.arrows = [];
        for (let i = 0; i < 4; i++)
            this.arrows.push(this.get_arrow(element, this.dpad_arrow_url, `rotation_${i}`));
    }
};

let ui = undefined, uitext = undefined, uiclock = undefined, dpad, container;

async function page_load() {
    container = document.querySelector('#body');
    ui = new UIRoot(container);
    dpad = new DPad(container);
    //ui.debug_events = true;
    uitext = ui.appendChild(new UITextInput());
    uiclock = ui.appendChild(new UIClock());
    uitext.set_size(8, 16, 112-1, 94);
    uiclock.set_size(0, 0, 128, 12);
    await ui.fire('load');
    await ui.fire('reset');
    await ui.fire('set_buffer_event', ui.buffer);
    await ui.fire('draw');
    ui.listener_of(document.querySelector('body'));
    
    setInterval(() => ui.fire('tick'), 50);

    let events = ['touchend', 'touchstart', 'touch', 'mousedown', 'click'];

    for (const event of events)
        ui.buffer.canvas.addEventListener(event, () => {
            console.log('touch');
            document.querySelector('#textinput.dummy').focus();
        });
}

page_load();