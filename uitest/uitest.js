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

    do_call(element, event) {
        const callback = element[event.type];

        if (callback)
            callback(event);
    }

    handle(element, event) {
        if (!element)
            return;

        this.do_call(element, event);

        if (this.stopPropagation || this.stopImmediatePropagation)
            return;

        const children = element.children;

        if (!children)
            return;

        for (const child of children) {
            this.handle(child, event);
            
            this.stopPropagation = false;

            if (this.stopImmediatePropagation)
                return;
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
};

const UIElementMixin = (Super) => class extends UISize(Super) {
    children = [];

    appendChild = (ui_element) => this.children.push(ui_element);
    removeChild = (ui_element) => this.children = this.children.filter(x => x != ui_element);
};

class UIElement extends UIElementMixin(object) {};

class UIDisplay extends Texture {
    constructor(element, width=128, height=128) {
        super();
        this.element = document.createElement('div');
        this.element.id = 'container';
        element.appendChild(this.element);

        this.create_canvas(width, height);
        this.canvas.id = 'canvas';
        this.element.appendChild(this.canvas);

        this.clear(Color.BLACK);
        this.put_image_data();
    }
}

class UIText extends UIElement {
    constructor(url='font.png', font_width=8, font_height=12, text=undefined) {
        this.font_atlas = new FontAtlas();
        this.text = text;
        this.font_width = font_width;
        this.font_height = font_height;
        this.url = url;
    }

    text;
    font_atlas;
    font_width;
    font_height;
    url;

    async load_resources() {
        await this.font_atlas.load_url(this.url);
        this.font_atlas.set_sprite_size(this.font_width, this.font_height);
    }

    load() {
        this.load_resources();
    }

    draw(buffer) {
        if (!this.text || this.text.length < 1)
            return;

        let x = 0;
        let y = 0;

        for (let i = 0; i < this.text.length; i++) {
            const character = this.text[i];
            const font_sprite = this.font_atlas.get_character(character);
            buffer.draw_sprite(x, y, font_sprite);

            x += this.font_atlas.sprite_width;
            if (x + this.font_atlas.sprite_width > buffer.width) {
                x = 0;
                y += this.font_atlas.sprite_height;
            }
        }

        buffer.flush();
    }

    draw_text(buffer, text) {
        this.text = text;
        this.draw(buffer);
    }

    static async make(url='font.png', text=undefined) {
        let ret = new UIText(url);
        ret.text = text;
        await ret.load_resources();
        return ret;
    }
};

class UITest {
    constructor(element) {
        this.element = element;
        this.buffer = new UIDisplay(this.element);
        this.fontatlas = new Atlas();
    }

    async load_resources() {
        await this.fontatlas.load_url('font.png');
        this.fontatlas.set_sprite_size(8, 12);
    }

    async test() {
        await this.load_resources();

        this.buffer.draw_sprite(0, 0, this.fontatlas.get_sprite(0, 0));
        this.buffer.put_image_data();
    }
};

ui = new UITest(body);
ui.test();