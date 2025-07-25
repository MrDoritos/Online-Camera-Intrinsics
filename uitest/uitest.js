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
    static get_random = (range=128,min=64) => Pixel.pixel((Math.random()*range+min)|0,(Math.random()*range+min)|0,(Math.random()*range+min)|0);
};

class CanvasBuffer {
    canvas;
    context;
    image;
    width;
    height;
    image_source;

    canvas_clear = () => this.context.clearRect(0, 0, this.width, this.height);

    get_image_data = () => this.context.getImageData(0,0,this.width,this.height);

    put_image_data = () => this.context.putImageData(this.image, 0, 0);

    get_offset = (x, y) => Math.round(Math.round(y) * this.width + x) * 4;

    get_sample_offset = (u, v) => this.get_offset(u * this.width, v * this.height);

    get_sample_position = (u, v) => [u * this.width, v * this.height];

    to_sample_position = (x, y) => [x / this.width, y / this.height];

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

    translate_abs(x, y) {
        this.context.translate(x, y);
    }

    translate_rel(u, v) {
        const [x, y] = this.get_sample_position(u, v);
        this.translate_abs(x, y);
    }

    rotate_rad(rad) {
        this.context.rotate(rad);
    }

    rotate_deg(deg) {
        this.rotate_rad((deg * Math.PI) / 180);
    }

    rotate_around_abs_rad(x, y, rad) {
        this.translate_abs(x, y);
        this.rotate_rad(rad);
        this.translate_abs(-x, -y);
    }

    rotate_around_rel_rad(u, v, rad) {
        const [x, y] = this.get_sample_position(u, v);
        this.rotate_around_abs_rad(x, y, rad);
    }

    rotate_around_abs_deg = (x, y, degrees) => this.rotate_around_abs_rad(x, y, get_radians(degrees));
    rotate_around_rel_deg = (u, v, degrees) => this.rotate_around_rel_rad(u, v, get_radians(degrees));

    reset_transform = () => this.context.resetTransform();

    set_smoothing_off() {
        this.context.imageSmoothingQuality = '';
        this.context.imageSmoothingEnabled = false;
    }

    create_canvas(width, height) {
        let canvas = document.createElement('canvas');
        this.load_canvas(canvas, width, height);
    }

    create_canvas_from_image_size(image) {
        this.create_canvas(image.width, image.height);
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
        this.image = this.get_image_data();
    }

    load_image(image) {
        this.image_source = image;
        this.create_canvas(image.width, image.height);
        this.draw_image(0,0,image);
        this.image = this.get_image_data();
    }

    push = () => this.context.save();

    pop = () => this.context.restore();

    flush = () => this.put_image_data();

    reload = () => this.image = this.get_image_data();

    load_url = async (url) => this.load_image(await load_image_url(url));

    draw_url = async (x, y, url) => this.draw_image(x, y, await load_image_url(url));
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

    line_callback(x1, y1, x2, y2, callback) {
        let x,y,dx,dy,dx1,dy1,px,py,xe,ye,i;
		
		dx=x2-x1;
		dy=y2-y1;
		
		dx1=Math.abs(dx);
		dy1=Math.abs(dy);
		
		px=2*dy1-dx1;
		py=2*dx1-dy1;

		if(dy1<=dx1) {
			if(dx>=0) {
				x=x1;
				y=y1;
				xe=x2;
			} else {
				x=x2;
				y=y2;
				xe=x1;
			}
            
            callback(x,y);
			
			for(i=0;x<xe;i++) {
				x=x+1;
				if(px<0) {
					px=px+2*dy1;
				} else {
					if((dx<0 && dy<0) || (dx>0 && dy>0)) {
						y=y+1;
					} else {
						y=y-1;
					}
					px=px+2*(dy1-dx1);
				}

				callback(x,y);
			}
		} else {
			if(dy>=0) {				
				x=x1;
				y=y1;
				ye=y2;
			} else {
				x=x2;
				y=y2;
				ye=y1;
			}  
			
            callback(x,y);
  
			for(i=0;y<ye;i++) {
				y=y+1;
				if(py<=0) {
					py=py+2*dx1;
				} else {
					if((dx<0 && dy<0) || (dx>0 && dy>0)) {
						x=x+1;
					} else {
						x=x-1;
					}
					
					py=py+2*(dx1-dy1);
				}	
				
                callback(x,y);
			}
		}
    }

    line = (x1, y1, x2, y2, pixel) => this.line_callback(x1, y1, x2, y2, (x,y) => this.put_pixel(x, y, pixel));

    circle = (cx, cy, r, pixel, fill=true) => {
        const r2 = r ** 2;

        for (let x = cx-r; x < cx+r+1; x++) {
            for (let y = cy-r; y < cy+r+1; y++) {
                const xy2 = (x-cx) ** 2 + (y-cy) ** 2;
                if (!fill && Math.abs(xy2 - r2) > 2)
                    continue;
                if (xy2 < r2)
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

    draw_sprite(x, y, sprite, w=undefined, h=undefined) {
        w = w ?? sprite.get_width();
        h = h ?? sprite.get_height();

        for (let i = 0, k = x; i < w; i++, k++) {
            for (let j = 0, l = y; j < h; j++, l++) {
                //const pixel = sprite.atlas.get_pixel(i + sprite.x0, j + sprite.y0);
                this.put_pixel(k, l, sprite.atlas.get_pixel(i + sprite.x0, j + sprite.y0));
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

    draw_sprite_alpha_blend(x, y, sprite, fast=false, fast_alpha_threshold=64, w=undefined, h=undefined) {
        w = w ?? sprite.get_width();
        h = h ?? sprite.get_height();

        const put_func = fast ? this.put_pixel_alpha_fast.bind(this) : this.put_pixel_alpha_blend.bind(this);
        for (let i = 0, k = x; i < w; i++, k++) {
            for (let j = 0, l = y; j < h; j++, l++) {
                put_func(k, l, sprite.atlas.get_pixel(i + sprite.x0, j + sprite.y0));
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

    get_atlas_width = () => (this.width / this.sprite_width) | 0;

    get_atlas_height = () => (this.height / this.sprite_height) | 0;

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

    static Sprite = class {
        constructor(atlas, x0, y0, x1, y1) {
            this.atlas = atlas;
            this.x0 = x0;
            this.y0 = y0;
            this.x1 = x1;
            this.y1 = y1;
        }

        get_width = () => (this.x1 - this.x0);
        get_height = () => (this.y1 - this.y0);
        get_size = () => [this.get_width(), this.get_height()];
    };
};

class FontAtlas extends Atlas {
    async load(font_url, font_width, font_height) {
        this.url = font_url;
        await this.load_url(font_url);
        this.set_sprite_size(font_width, font_height);
    }
 
    get_character(char) {
        const code = char.charCodeAt(0);
        const x = code % this.atlas_width;
        const y = (code / this.atlas_width) | 0;
        return this.get_sprite(x, y);
    }

    static async make(font_url, font_width, font_height) {
        let obj = new FontAtlas();
        await obj.load(font_url, font_width, font_height);
        return obj;
    }

    static DEFAULT;
    static fonts = [];
};

class SpriteSheet extends Texture {
    constructor(sprites={}) {
        super();
        this.append_sprites(sprites);
    }

    append_sprites(sprites) {
        for (const [key, sprite] of Object.entries(sprites)) {
            if (sprite instanceof Array)
                this.sprites[key] = new Atlas.Sprite(this, sprite[0], sprite[1], sprite[2]+sprite[0], sprite[3]+sprite[1]);
            if (sprite instanceof Atlas.Sprite)
                this.sprites[key] = sprite;
            if (typeof sprite == 'string' || sprite instanceof String)
                this.sprites[key] = this.sprites[sprite];
        }
    }

    make_sprite(array) {
        return new Atlas.Sprite(this, array[0], array[1], array[2]+array[0], array[3]+array[1]);
    }

    sprites = {};

    static TEXTURES = {
        'battery_4x8': [0, 10, 4, 8],
        'battery_5x10': [0, 18, 5, 10],
        'battery_13x6': [5, 11, 13, 6],
        'battery': 'battery_5x10',

        'heart_large': [20, 12, 11, 11],
        'heart_small': [32, 13, 9, 8],
        'heart': 'heart_small',
    };

    static TEXT_3x5 = {
        '0': [0,0,3,5],
        '1': [3,0,3,5],
        '2': [6,0,3,5],
        '3': [9,0,3,5],
        '4': [12,0,3,5],
        '5': [15,0,3,5],
        '6': [18,0,3,5],
        '7': [21,0,3,5],
        '8': [24,0,3,5],
        '9': [27,0,3,5],
        '%': [0,5,3,5],
        'A': [71,0,3,5],
        'B': [75,0,3,5],
        'C': [79,0,3,5],
        'D': [83,0,3,5],
        'E': [87,0,3,5],
        'F': [91,0,3,5],
        'G': [95,0,3,5],
        'H': [99,0,3,5],
        'I': [103,0,3,5],
        'J': [107,0,3,5],
        'K': [111,0,3,5],
        'L': [115,0,3,5],
        'O': [127,0,3,5],
        'P': [131,0,3,5],
        'Q': [135,0,3,5],
        'R': [139,0,3,5],
        'S': [143,0,3,5],
        'T': [147,0,3,5],
        'U': [151,0,3,5],
        'V': [155,0,3,5],
        //'W': [159,0,3,5],
        'X': [163,0,3,5],
        'Y': [167,0,3,5],
        'Z': [171,0,3,5],
        
    };

    static TEXT_5x5 = {
        'M': [71, 17, 5, 5],
    };

    static TEXT_4x5 = {
        'N': [77, 17, 4, 5],
    };

    small_text(character, fallback_font=FontAtlas.DEFAULT) {
        const sheets = [
            SpriteSheet.TEXT_3x5,
            SpriteSheet.TEXT_4x5,
            SpriteSheet.TEXT_5x5,
        ];

        for (const sheet of sheets)
            if (sheet[character])
                return this.make_sprite(sheet[character]);
        
        return fallback_font.get_character(character);
    }

    get_sprite = (sprite_id) => this.sprites[sprite_id] ?? new Atlas.Sprite(this,0,0,0,0);
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

    set_offset = (offsetx, offsety) => { this.set_offsetx(offsetx); this.set_offsety(offsety); };
    set_length = (width, height) => { this.set_width(width); this.set_height(height); };
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

    get_centerx = () => (this.get_width() * .5) + this.get_offsetx();
    get_centery = () => (this.get_height() * .5) + this.get_offsety();
    get_center = () => [this.get_centerx(), this.get_centery()];

    is_bound = (x, y) => x >= this.get_left() && x < this.get_right() && y >= this.get_top() && y < this.get_bottom();

    get_absolute() {
        return this;
    }

    get_relative(size) {
        return UISize.make_size(this.get_offsetx() + size.get_offsetx(), this.get_offsety() + size.get_offsety(), this.get_width(), this.get_height());
    }

    get_offset = () => [this.get_offsetx(), this.get_offsety()];
    get_size = () => [this.get_offsetx(), this.get_offsety(), this.get_width(), this.get_height()];
    get_box = () => [this.get_top(), this.get_right(), this.get_bottom(), this.get_left()];
    get_length = () => [this.get_width(), this.get_height()];

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

    add_length = (ox, oy) => [ox + this.get_width(), oy + this.get_height()];
    add_offset = (x, y) => [x + this.get_offsetx(), y + this.get_offsety()];
    add_size = (x, y) => [x + this.get_right(), y + this.get_bottom()];

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

const Codes = {
    BACKSPACE : 8,
    ENTER : 13,
    SHIFT : 16,
    CTRL : 17,
    ALT : 18,
    CAPS : 20,
    ESCAPE : 27,
    ARROW_LEFT : 37,
    ARROW_UP : 38,
    ARROW_RIGHT : 39,
    ARROW_DOWN : 40,
    DELETE : 46,
    TAB : 9,
    F1 : 112,
    F2 : 113,
    F3 : 114,
    F4 : 115,
    F5 : 116,
    F6 : 117,
    F7 : 118,
    F8 : 119,
    F9 : 120,
    F10 : 121,
    F11 : 122,
    F12 : 123,
};

class UIEvents {
    static debug=false;
    static debug_ignore=['tick'];

    static UIEvent = class {
        constructor(type, value=undefined) {
            this.type = type;
            this.value = value;
            this.prevent_default = false;
            this.reset_propagation();
            this.start_time = Date.now();
        }

        type;
        value;
        prevent_default;
        stop_propagation;
        stop_immediate_propagation;
        start_time;

        reset_propagation = () => this.stop_propagation = this.stop_immediate_propagation = false;
        is_stop_any = () => this.stop_propagation || this.stop_immediate_propagation;
        is_stop_propagation = () => this.stop_propagation;
        is_stop_immediate = () => this.stop_immediate_propagation;
        is_stop_default = () => this.prevent_default;
        handle = (element) => { if (element[this.type]) { element[this.type].bind(element, this)(); if (UIEvents.debug) this.handle_log(element); } };

        handle_log(element) {
            if (UIEvents.debug_ignore.includes(this.type)) return;
            const callback = element[this.type];
            const start_time = `[${String(Date.now() - this.start_time).padStart(5)}ms]`;
            const type = this.type.padStart(20);
            const name = element.get_tree_str();
            const hit = `-> ${callback ? 'hit' : 'x'}`;

            console.log(`${start_time} ${type} ${name} ${hit}`);

            if (hit) {
                //const end = Date.now() + 50;
                //while (Date.now() < end) continue;
            }
        }
    };

    static UIKeyboardEvent = class extends UIEvents.UIEvent {
        constructor({key, key_code, char_code}) {
            super('keyboard');
            this.key = key;
            this.key_code = this.is_extended() ? key_code : 0;
            this.char_code = this.is_extended() ? 0 : key_code;
        }

        is_extended = () => !this.key || this.key.length > 1;
        is_digit = () => this.char_code >= 48 && this.char_code <= 57;
        is_letter = () => this.is_char() && this.key.toLowerCase() != this.key.toUpperCase();
        is_arrow_key = () => this.key_code >= 37 && this.key_code <= 40;
        is_arrow_up_key = () => this.key_code == Codes.ARROW_UP;
        is_arrow_down_key = () => this.key_code == Codes.ARROW_DOWN;
        is_arrow_left_key = () => this.key_code == Codes.ARROW_LEFT;
        is_arrow_right_key = () => this.key_code == Codes.ARROW_RIGHT;
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

class UIBoxModel {
    top;
    right;
    bottom;
    left;
    value;

    get_value = () => this.value ?? 0;
    get_left = () => this.left ?? this.get_value();
    get_right = () => this.right ?? this.get_value();
    get_bottom = () => this.bottom ?? this.get_value();
    get_top = () => this.top ?? this.get_value();
    get_width = () => this.get_left() + this.get_right();
    get_height = () => this.get_top() + this.get_bottom();
};

class UIStyle {
    position = "static";
    display = "block";
    horizontal_align;
    vertical_align;
    top; //undefined == auto
    right;
    bottom;
    left;
    min_width;
    width;
    max_width;
    min_height;
    height;
    max_height;
    text_wrap = "nowrap";
    text_align = "left";
    overflow_x = "hidden"; // 'auto'/undefined
    overflow_y = "hidden";
    alpha_threshold = 64;

    margin = new UIBoxModel();
    padding = new UIBoxModel();

    computed_width;
    computed_height;
    used_width;
    used_height;
    content_width;
    content_height;

    static debug_mode = false;

    is_value_relative = (value) => value != undefined && (typeof value == 'string' || value instanceof String);
    is_value_variable = (value) => value == undefined || typeof value == 'string' || value instanceof String || isNaN(value) || !isFinite(value);
    is_width_variable = () => this.is_value_variable(this.width);
    is_height_variable = () => this.is_value_variable(this.height);
    any_variable = (...values) => { for (const value of values) { if (this.is_value_variable(value)) return true; } return false; };

    get_comp = (func, ...value) => {
        let min = undefined;
        for (const val of value) {
            if (!this.is_value_variable(val) && this.is_value_variable(min))
                min = val;
            else if (this.is_value_variable(val))
                continue;
            else if (func(min, val))
                min = val;
        }
        return min;
    };
    get_min = (...value) => this.get_comp((a,b) => a > b, ...value);
    get_max = (...value) => this.get_comp((a,b) => a < b, ...value);
    get_minmax = (a, min, max) => this.get_min(this.get_max(a, min), max);
    get_valminmax = (a, val, min, max) => val ?? this.get_minmax(a, min, max);

    get_min_width = () => this.get_max(this.min_width, this.width);
    get_min_height = () => this.get_max(this.min_height, this.height);
    get_max_width = () => this.get_min(this.max_width, this.width);
    get_max_height = () => this.get_min(this.max_height, this.height);
    try_get_width = () => this.get_minmax(this.width, this.min_width, this.max_width);
    try_get_height = () => this.get_minmax(this.height, this.min_height, this.max_height);
    try_get_size = () => [this.try_get_width(), this.try_get_height()];

    to_abs = (src, str) => {
        //if (!this.is_value_variable(str))
        if (!this.is_value_relative(str))
            return str;
        let rel = Number(str)*0.01;
        return src * rel;
    };

    try_dynamic(p_size, src, min, max) {
        return this.get_minmax(this.to_abs(p_size, src), this.to_abs(p_size, min), this.to_abs(p_size, max));
    }

    //from top
    try_dynamic_width = (element) => this.try_dynamic(element.parent.get_width(), this.width, this.min_width, this.max_width);

    try_dynamic_height = (element) => this.try_dynamic(element.parent.get_height(), this.height, this.min_height, this.max_height);

    try_dynamic_size = (element) => [this.computed_width ?? this.try_dynamic_width(element), this.computed_height ?? this.try_dynamic_height(element)];

    //self static
    try_compute_width = (element) => this.try_get_width() ?? element.get_width();

    try_compute_height = (element) => this.try_get_height() ?? element.get_height();

    try_compute_size = (element) => [this.try_compute_width(element), this.try_compute_height(element)];

    try_change_width = (width) => this.is_width_variable() ? this.get_valminmax(width, this.computed_width, this.min_width, this.max_width) : this.try_get_width();

    try_change_height = (height) => this.is_height_variable() ? this.get_valminmax(height, this.computed_height, this.min_height, this.max_height) : this.try_get_height();

    try_change_size = (width, height) => [this.try_change_width(width), this.try_change_height(height)];

    update_element_size(element, width, height) {
        if (!this.is_value_variable(width)) { element.set_width(width); this.computed_width = width; }
        if (!this.is_value_variable(height)) { element.set_height(height); this.computed_height = height; }
        //this.computed_width = width;
        //this.computed_height = height;
    }

    clear_computed() {
        this.computed_width = undefined;
        this.computed_height = undefined;
    }

    log_debug(name, element, ...params) {
        if (!UIStyle.debug_mode)
            return;

        const [offset_x, offset_y, width, height] = element.get_size();

        let db = {
            'styling':{min_width:this.min_width, width: this.width, max_width: this.max_width, min_height:this.min_height, height: this.height, max_height:this.max_height},
            'content':{width:this.content_width, height:this.content_height},
            'computed':{width:this.computed_width, height:this.computed_height},
            'used':{width:this.used_width, height:this.used_height},
            'client':{offset_x, offset_y, width, height},
            //'source_elem':element,
            //'style':element.style,
        };
        
        console.log('\n', name, element.get_tree_str(), ...params);
        for (const [key, value] of Object.entries(db))
            console.log(key.padStart(11), value);
    }

    //from top
    set_static_sizes(element) {
        this.clear_computed();

        for (const child of element.children) {
            child.get_style().set_static_sizes(child);
        }

        const [width, height] = this.try_get_size(element);
        this.update_element_size(element, width, height);
        this.log_debug('static', element);
    }

    set_dynamic_sizes(element) {
        const [width, height] = this.try_dynamic_size(element);
        this.update_element_size(element, width, height);
        this.log_debug('dynamic', element);

        for (const child of element.children) {
            child.get_style().set_dynamic_sizes(child);
        }
    }

    set_offsets_pre(element, child, offsetx, offsety, inlinew, inlineh) {
        const cstyle = child.get_style();
        const position = cstyle.position;
        const display = cstyle.display;
        this.log_debug('offset_pre', child);

        if (position == 'static' || position == 'relative' || position == 'absolute') {
            child.set_offset(offsetx, offsety);
            if (display == 'inline-block')
                child.set_offset(offsetx, offsety-inlineh);
            if (display == 'block')
                child.set_offset(element.get_offsetx(), offsety /*+ inlineh*/);
        }

        if (position == 'sticky') {
            child.set_offset(element.get_offsetx(), element.get_offsety());
        }
    }

    set_offsets_post(element, child, offsetx, offsety) {
        const cstyle = child.get_style();
        const position = cstyle.position;
        const display = cstyle.display;
        const overflow_x = cstyle.overflow_x, overflow_y = cstyle.overflow_y;
        const [width, height] = child.get_length();
        this.log_debug('offset_post', child);

        if (position == 'relative' || position == 'absolute' || position == 'fixed')
            return [offsetx, offsety];

        if (display == 'block') {
            //offsety += height;
            //offsetx = element.get_offsetx();
        }

        if (display == 'inline-block') {
            //offsetx += width;
            //offsety = element.get_offsety();
        }     
        [offsetx,offsety] = [child.get_right(),child.get_bottom()];   

        return [offsetx, offsety];
    }

    set_offsets(element) {
        const [Poffsetx, Poffsety] = element.get_offset();
        let [offsetx, offsety] = [Poffsetx, Poffsety];

        for (const child of element.get_children()) {
            this.set_offsets_pre(element, child, offsetx, offsety, offsetx-Poffsetx, offsety-Poffsety);
            child.get_style().set_offsets(child);
            [offsetx, offsety] = this.set_offsets_post(element, child, offsetx, offsety);
        }

        this.log_debug('offsets_post_children', element);
        const [width, height] = this.try_change_size(offsetx-Poffsetx,offsety-Poffsety);
        this.update_element_size(element, width, height);
        this.log_debug('offsets', element, Poffsetx, Poffsety, offsetx, offsety, width, height, this.is_width_variable(), this.is_height_variable());
    }

    canvas_debug_r(element) {
        element.clear(undefined, Color.get_random());

        for (const child of element.get_children())
            this.canvas_debug_r(child);
    }

    canvas_debug(element) {
        if (!UIStyle.debug_mode)
            return;

        this.canvas_debug_r(element);
        element.buffer.flush();
    }

    compute_layout(element) {
        this.set_static_sizes(element);
        this.set_dynamic_sizes(element);
        this.set_offsets(element);
        this.canvas_debug(element);
    }

    set_computed = (width, height) => { this.computed_width = width; this.computed_height = height; };
    set_used = (width, height) => {this.used_width = width; this.used_height = height; };
    get_used = () => [this.used_width, this.used_height];
    get_used_or_default = (def=0) => [this.used_width ?? def, this.used_height ?? def];
    get_computed = () => [this.computed_width, this.computed_height];
    get_computed_or_default = (def=0) => [this.computed_width ?? def, this.computed_height ?? def];
    set_all = (width, height) => { this.set_computed(width, height); this.set_used(width, height); };

    compute_layout_2(element) {
        this.get_computed_values(element);
        this.get_used_values(element, new UIStyle.Context());
        this.get_actual_values(element);
        this.canvas_debug(element);
    }

    /*
        Fills in missing values after layout and sets offsets
    */
    get_actual_values(element, poffsetx=0, poffsety=0, container_w=0, container_h=0, container_x=0,container_y=0) {
        let [offset_x, offset_y] = [poffsetx, poffsety];
        let [soffset_x, soffset_y] = [offset_x, offset_y];
        let [inline_w, inline_h] = [0,0];
        let [width, height] = this.get_used();

        if (this.display == 'block' && this.computed_width == undefined) {
            width = container_w - soffset_x;
        }

        //width -= this.margin.get_width();
        //height -= this.margin.get_height();
        //width -= this.padding.get_width();
        //height -= this.padding.get_height();
        //width += this.margin.get_
        if (this.horizontal_align || this.vertical_align) {
            if (UIStyle.debug_mode) console.log(soffset_x, soffset_y, container_w, container_h, width, height, container_x, container_y);
            if (this.horizontal_align == 'center') {
                soffset_x = container_x + (container_w * .5) - (width * .5);
            }
            if (this.horizontal_align == 'right') {
                soffset_x = container_x + container_w - width;
            }
            if (this.horizontal_align == 'left') {
                soffset_x = container_x;
            }
            if (this.vertical_align == 'bottom') {
                soffset_y = container_y + container_h - height;
            }
            if (this.vertical_align == 'top') {
                soffset_y = container_y;
            }
            if (this.vertical_align == 'center') {
                soffset_y += (container_h * .5) - (height * .5);
            }
            if (UIStyle.debug_mode) console.log(soffset_x, soffset_y, container_w * .5, container_h * .5, width * .5, height * .5);
        }
        

        const [s_width, s_height] = [width, height];
        width -= this.padding.get_width() + this.margin.get_width();
        height -= this.padding.get_height() + this.margin.get_height();
        //width -= this.margin.get_width();
        //height -= this.margin.get_height();

        soffset_x += this.margin.get_left();
        soffset_y += this.margin.get_top();
        [offset_x, offset_y] = [soffset_x, soffset_y];
        offset_x += this.padding.get_left();
        offset_y += this.padding.get_top();
        const [inner_offset_x, inner_offset_y] = [offset_x, offset_y];

        if (this.position == 'absolute') {
            if (this.bottom != undefined)
                offset_y = container_h - this.to_abs(container_h, this.bottom) - height;
            if (this.right != undefined)
                offset_x = container_w - this.to_abs(container_w, this.right) - width;
            if (this.left != undefined)
                offset_x += this.to_abs(container_w, this.left);
            if (this.top != undefined)
                offset_y += this.to_abs(container_h, this.top);
            [soffset_x, soffset_y] = [offset_x, offset_y];
            inline_w += width;
            inline_h += height;
            [poffsetx, poffsety] = [offset_x, offset_y];
        }

        let ctxp = 'block';
        
        for (const child of element.get_children()) {
            const style = child.get_style();
            const display = style.display;
            const position = style.position;

            if (position == 'absolute') {
                style.get_actual_values(child, inner_offset_x, inner_offset_y, width, height, inner_offset_x, inner_offset_y);
                continue;
            }

            if (display == 'block') {
                //inline_w = 0;
                //inline_h
                offset_y += inline_h;
                //offset_x = poffsetx;
                offset_x = inner_offset_x;
                inline_h = 0;
                inline_w = 0;
            }

            if (display == 'inline-block') {
                inline_h = 0;
            }

            style.get_actual_values(child, offset_x + inline_w, offset_y + inline_h, width, height, inner_offset_x, inner_offset_y);
            const [used_width, used_height] = style.get_used();
            //const [used_width, used_height] = child.get_length();

            if (display == 'inline-block') {
                //offset_x += used_width;
                inline_w += used_width;
                inline_h = used_height;
            }
            if (display == 'block') {
                //offset_x = poffsetx;
                offset_x = inner_offset_x;
                offset_y += used_height;
                inline_w = 0;
                inline_h = 0;
            }
            ctxp = display;
        }

        [offset_x, offset_y] = [soffset_x, soffset_y];
        let [final_width, final_height] = [s_width, s_height];

        //if (this.display == 'block') {
        //    final_width = container_w;
        //}
        //final_width -= this.margin.get_right();// + this.padding.get_width();
        //final_height -= this.margin.get_bottom();// + this.padding.get_height();

        element.set_size(offset_x, offset_y, final_width, final_height);
        this.set_used(s_width + this.margin.get_width(), s_height + this.margin.get_height());

        this.log_debug('after actual', element);
    }

    static Context = class {
        context = [[0,0]];
        add_box(style) {
            let [width, height] = style.get_used_or_default();
            //width += style.margin.get_width() + style.padding.get_width();
            //height += style.margin.get_height() + style.padding.get_height();
            return [width, height];
        }

        inline_block(style) {
            //const [width, height] = style.get_used_or_default();
            const [width, height] = this.add_box(style);
            const end = this.context.length-1;
            const [w, h] = this.context[end];
            this.context[end] = [width + w, (height > h) ? height : h];
        }

        block(style) {
            this.context.push(this.add_box(style));
        }

        get_sum(i) {
            let sum = 0;
            for (const val of this.context)
                sum += val[i];
            return sum;
        }

        get_max(i) {
            let max = 0;
            for (const val of this.context)
                if (max < val[i])
                    max = val[i];
            return max;
        }

        get_width = () => this.get_max(0);
        get_height = () => this.get_sum(1);
        get_size = () => [this.get_width(), this.get_height()];

        append(style) {
            const display = style.display;

            if (display == 'inline-block') this.inline_block(style);
            if (display == 'block') this.block(style);
        }
    };

    /*
        Finds values after layout
    */
    get_used_values(element, parent_context) {
        const display = this.display;
        let context = new UIStyle.Context();

        for (const child of element.get_children()) {
            child.get_style().get_used_values(child, context);
        }

        let [context_width, context_height] = context.get_size();
        //context_width += this.margin.get_width() + this.padding.get_width();
        //context_height += this.margin.get_height() + this.padding.get_height();
        context_width += this.padding.get_width();
        context_height += this.padding.get_height();

        const [computed_width, computed_height] = this.get_computed();

        let [used_width, used_height] = [context_width,context_height];

        /*
            Overflow styling?
        */

        if (this.overflow_x == 'hidden') used_width = computed_width ?? context_width;
        if (this.overflow_y == 'hidden') used_height = computed_height ?? context_height;

        if (this.overflow_x == 'auto' || !this.overflow_x) used_width = context_width ?? computed_width;
        if (this.overflow_y == 'auto' || !this.overflow_y) used_height = context_height ?? computed_height;

        //used_width += this.margin.get_width() + this.padding.get_width();
        //used_height += this.margin.get_width() + this.padding.get_width();
        //used_width += this.margin.get_right();
        //used_height += this.margin.get_bottom();

        /*if (element.parent && this.display == 'block') {
            if (element.parent.style.computed_width != undefined)
                [used_width, ] = element.parent.style.get_computed();
        }*/

        this.set_used(used_width, used_height);

        if (this.position == 'static')
            parent_context.append(this);

        this.log_debug('after used', element);
    }

    get_computed_value(container, value, min, max) {
        if (this.is_value_variable(container))
            return this.get_minmax(value, min, max);

        return this.try_dynamic(container, value, min, max);
    }

    /*
        Distributes initial values and finds computed sizes before layout
    */
    get_computed_values(element) {
        const pelement = element?.parent;
        const pstyle = pelement?.get_style();
        const display = this.display;
        let [container_width, container_height] = [0,0];

        if (!pstyle) {
            // root element
            this.set_all(this.try_get_width(), this.try_get_height());
        } else {
            // initial container size
            [container_width, container_height] = pstyle.get_computed();

            if (container_width)
                container_width -= this.margin.get_width();
            if (container_height)
                container_height -= this.margin.get_height();

            // our size or generated size (from text or image)
            const [self_width, self_height] = [
                this.width ?? this.content_width,
                this.height ?? this.content_height,
            ];

            // use our styling or find relative to container
            let [computed_width, computed_height] = [
                this.get_computed_value(container_width, self_width, this.min_width, this.max_width),
                this.get_computed_value(container_height, self_height, this.min_height, this.max_height),
            ];

            // computed or initial
            //this.set_computed(computed_width ?? container_width, computed_height ?? container_width);
            if (display == 'block' && computed_width == undefined) computed_width = container_width;

            /*
            if (computed_width)
                computed_width -= this.margin.get_width();// + this.padding.get_width();
            if (computed_height)
                computed_height -= this.margin.get_height();// + this.padding.get_height();
            */

            this.set_computed(computed_width, computed_height);
        }

        this.log_debug('after computed', element, container_width, container_height, this.is_value_variable(container_width), this.is_value_variable(container_height));

        for (const child of element.get_children())
            child.get_style().get_computed_values(child);
    }
};

const UIElementMixin = (Super) => class extends UISize(Super) {
    children = [];
    buffer;
    parent;
    style = new UIStyle();

    appendChild = (ui_element) => { this.children.push(ui_element); ui_element.buffer = this.buffer; ui_element.parent = this; return ui_element; }
    removeChild = (ui_element) => { this.children = this.children.filter(x => x != ui_element); ui_element.parent = undefined; }

    set_buffer(buffer) {
        this.buffer = buffer;
        this.set_width(buffer.get_width());
        this.set_height(buffer.get_height());
    }

    set_style = (style) => this.style = style;

    get_style = () => this.style;

    get_children = () => this.children;

    set_buffer_event(event) {
        this.buffer = event.value;
    }

    clear(event=undefined, color=Color.BLACK) {
        this.buffer.fillrect(this.get_left(), this.get_top(), this.get_right(), this.get_bottom(), color);
    }

    log = (...params) => this.dispatch_value('log_event', params, 'broadcast');

    get_name = () => this.constructor.name;

    get_tree_str = () => (this.parent ? this.parent.get_tree_str() : '') + `::${this.get_name()}`;
    
    dispatch_event(event, event_action='bubble', skip_source=false) {
        if (!this || event.is_stop_any()) return;

        const self_handle = () => {
            if (!skip_source)
                event.handle(this);
        };

        const self_first = event_action.endsWith('_selffirst');
        const action = self_first ? event_action.replace('_selffirst', '') : event_action;

        if (action == 'bubble') {
            if (self_first) self_handle();
            if (this.parent)
                this.parent.dispatch_event(event, event_action);
            if (!self_first) self_handle();
            return;
        }

        if (action == 'capture') {
            if (self_first) self_handle();

            if (this.children) {
                for (const child of this.children) {
                    child.dispatch_event(event, event_action);

                    if (event.is_stop_immediate()) return;

                    event.reset_propagation();
                }
            }

            if (!self_first) self_handle();
            return;
        }

        if (action == 'broadcast') {
            if (self_first) self_handle();
            const app = self_first ? '_selffirst' : '';
            this.dispatch_event(event, 'capture' + app, true);
            this.dispatch_event(event, 'bubble' + app, true);
            if (!self_first) self_handle();
            return;
        }
    }

    dispatch_value = (event_type, event_value, event_action='bubble', skip_source=false) => this.dispatch_event(new UIEvents.UIEvent(event_type, event_value), event_action, skip_source);

    dispatch = (event_type, event_action='bubble', skip_source=false) => this.dispatch_event(new UIEvents.UIEvent(event_type), event_action, skip_source);

    dispatch_keyboard_event = ({key=undefined, char_code=0, key_code=0}, event_action='bubble', skip_source=false) => this.dispatch_event(new UIEvents.UIKeyboardEvent({key, key_code, char_code}), event_action, skip_source);
};

class UIElement extends UIElementMixin(Object) {};

class UIRoot extends UIElement {
    constructor(element, width=128, height=128) {
        super();
        this.container = document.createElement('div');
        this.container.id = 'container';
        this.container.className = 'display';
        element.appendChild(this.container);
        this.element = document.createElement('div');
        this.element.id = 'inner';
        this.element.className = 'display';
        this.container.appendChild(this.element);

        let buffer = new Texture();
        buffer.create_canvas(width, height);
        buffer.canvas.id = 'canvas';
        this.element.appendChild(buffer.canvas);
        this.set_buffer(buffer);
    }

    interval_id=0;
    interval_period=50;
    screens=[];
    active_screen=undefined;

    listener_of(element) {
        element.addEventListener('keydown', event => 
            this.dispatch_keyboard_event({key:event?.key,key_code:event?.keyCode,char_code:event?.charCode}, 'capture'));
    }

    reset() {
        this.buffer.clear(Color.BLACK);
        this.buffer.flush();
    }

    layout = (skip_clear=false,skip_draw=false,skip_buffer=false,skip_content_size=false) => { 
        if (!skip_content_size)
            this.dispatch('content_size', 'capture');
        this.style.compute_layout_2(this);
        if (!skip_buffer)
            this.dispatch_value('set_buffer_event', this.buffer, 'capture', true);
        if (!skip_clear)
            this.dispatch('clear', 'capture');
        if (!skip_draw)
            this.dispatch('draw', 'capture_selffirst');
    };

    remove_screen(screen) {
        this.children = this.children.filter(x => x != screen && x != undefined);
    }

    set_screen(screen) {
        this.remove_screen(this.active_screen);
        this.active_screen = screen;
        this.children.splice(1, 0, screen);
        this.children.at(-1).children[0].text = this.active_screen.get_name();
        this.layout();
    }

    screen_index(screen) {
        if (this.screens.includes(screen))
            return this.screens.indexOf(screen);
        return 0;
    }

    screen_next() {
        let index = this.screen_index(this.active_screen) + 1;
        index %= this.screens.length;
        this.set_screen(this.screens[index]);
    }

    screen_prev() {
        let index = this.screen_index(this.active_screen) - 1;
        index = (index + this.screens.length) % this.screens.length;
        this.set_screen(this.screens[index]);
    }

    keyboard(event) {
        if (event.is_stop_default())
            return;

        if (event.is_arrow_right_key())
            this.screen_next();

        if (event.is_arrow_left_key())
            this.screen_prev();
    }

    has_valid_interval = () => this.interval_id > 0;

    make_interval = () => setInterval(() => this.dispatch('tick', 'capture'), this.interval_period);

    start_interval = () => { if (!this.has_valid_interval()) this.interval_id = this.make_interval(); };

    stop_interval = () => { if (this.has_valid_interval()) clearInterval(this.interval_id); this.interval_id = 0; };

    start = () => this.start_interval();

    stop = () => this.stop_interval();

    set_interval_period = (period_ms) => { this.stop_interval(); this.interval_period = period_ms; this.start_interval(); };
};

class UIText extends UIElement {
    constructor(text='', font=FontAtlas.DEFAULT, alpha_blend=true, alpha_fast=true) {
        super();
        this.font_atlas = font;
        this.text = text;
        this.cursor_x = 0;
        this.cursor_y = 0;
        this.alpha_blend = alpha_blend;
        this.alpha_fast = alpha_fast;
    }

    text;
    font_atlas;
    draw_end_x;
    draw_end_y;
    cursor_x;
    cursor_y;

    get_name = () => this.text;

    get_font_width = () => this.font_atlas.sprite_width;
    get_font_height = () => this.font_atlas.sprite_height;
    get_font_size = () => [this.get_font_width(), this.get_font_height()];
    get_font_sprite = (character) => this.font_atlas.get_character(character);

    content_size() {
        const style = this.get_style();

        const [clientHeight, clientWidth] = this.get_length();
        let width = 0, height = 0;
        let line_width = 0, line_height = 0;

        for (const character of this.text) {
            const sprite = this.get_font_sprite(character);
            const [w, h] = sprite.get_size();

            if (h > line_height) line_height = h;
            line_width += w;

            if (style.text_wrap == 'wrap') {
                if (clientWidth) {
                    if (line_width > clientWidth) {
                        height += line_height;
                        line_width = 0;
                    }
                }
            }
        }

        if (style.text_wrap == 'wrap') {
            height = height == 0 ? line_height : height;
            width = width == 0 ? line_width : width;
        } else {
            width = line_width;
            height = line_height;
        }

        style.content_width = width == 0 ? undefined : width;
        style.content_height = height == 0 ? undefined : height;
    }

    set_font(font) {
        this.font_atlas = font;
    }

    reset_uitext() {
        this.text = '';
    }

    reset() {
        //this.reset_uitext();
    }

    is_char_bound = (x, y) => (x >= this.get_left() && x + this.get_font_width() <= this.get_right() && y >= this.get_top() && y + this.get_font_height() <= this.get_bottom());

    draw_sprite(x, y, sprite) {
        if (this.alpha_blend) {
            this.buffer.draw_sprite_alpha_blend(x, y, sprite, this.alpha_fast);
        } else {
            this.buffer.draw_sprite(x, y, sprite);
        }
    }

    draw_character(x, y, character) {
        this.draw_sprite(x,y,this.get_font_sprite(character));
    }

    draw_sprite_at_cursor = (sprite) => this.draw_sprite(this.cursor_x, this.cursor_y, sprite);

    draw_at_cursor = (character) => this.draw_character(this.cursor_x, this.cursor_y, character);
    draw_at_cursor_bound = (character) => { if (this.is_char_bound(this.cursor_x, this.cursor_y)) this.draw_at_cursor(character); };

    get_columns = () => (this.get_width() / this.get_font_width()) | 0;
    get_rows = () => (this.get_height() / this.get_font_height()) | 0;

    set_cursor_position(columns, rows) {
        this.cursor_x = columns * this.get_font_width() + this.get_left();
        this.cursor_y = rows * this.get_font_height() + this.get_top();
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
        const [font_width, font_height] = this.get_font_size();
        for (let i = 0; i < text.length; i++) {
            const character = text[i];

            if (this.cursor_x + font_width > this.get_right()) {
                this.cursor_x = this.get_left();
                this.cursor_y += font_height;
            }

            if (character == '\n') {
                this.cursor_x = this.get_left();
                this.cursor_y += font_height;
                continue;
            }

            if (character == '\t') {
                this.cursor_x += font_width;
            } else {
                this.draw_at_cursor(character);
            }

            this.cursor_x += font_width;
            if (this.cursor_y + font_height > this.get_bottom())
                break;
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

    async log_event(event) {
        this.append_text(event.value.map(String).join(' '));
        this.clear();
        this.draw();
    }

    draw_text(text) {
        this.text = text;
        this.draw();
    }

    append_text = (text) => this.text += text;

    insert_text(i, text) {
        this.text = this.text.slice(0, i) + text + this.text.slice(i);
    }

    remove_range(i, n=1) {
        this.text = this.text.slice(0, i-1) + this.text.slice(i+n-1);
    }

    static async make(font, text='') {
        return new UIText(text, font);
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

    right_arrow = () => this.user_cursor_index < this.text.length ? this.user_cursor_index++ : this.user_cursor_index;
    left_arrow = () => this.user_cursor_index > 0 ? this.user_cursor_index-- : 0;

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
                    this.left_arrow();
                    break;
                case Codes.ARROW_RIGHT:
                    this.right_arrow();
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

    reset_uitextinput() {
        this.ticks = 0;
        this.user_cursor_index = 0;
    }

    reset() {
        this.reset_uitextinput();
        super.reset();
    }

    draw() {
        this.clear();

        super.draw();

        const is_flash = this.ticks % (this.flash_ticks * 2) < this.flash_ticks;

        if (is_flash) {
            this.set_cursor_wrap_index(this.user_cursor_index);
            this.cursor_x -= this.get_font_width() * .2;
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

const UIBorderBoxMixin = (Super) => class extends Super {
    border_left = 0;
    border_right = 0;
    border_top = 0;
    border_bottom = 0;

    set_border({border,top,right,bottom,left}) {
        if (border != undefined) {
            this.border_top = this.border_right = this.border_bottom = this.border_left = border;
        }
        if (top != undefined) this.border_top = top;
        if (right != undefined) this.border_right = right;
        if (bottom != undefined) this.border_bottom = bottom;
        if (left != undefined) this.border_left = left;

        this.style.padding.top = this.border_top;
        this.style.padding.left = this.border_left;
        this.style.padding.right = this.border_right;
        this.style.padding.bottom = this.border_bottom;

        //this.dispatch('layout', 'bubble', true);
    }

    draw() {
        const [top, right, bottom, left] = this.get_box();
        const [btop,bright,bbottom,bleft] = [this.border_top,this.border_right,this.border_bottom,this.border_left];
        const pixel = Color.WHITE;

        if (btop)
            this.buffer.fillrect(left, top, right, top+btop, pixel);
        if (bright)
            this.buffer.fillrect(right-bright,top,right,bottom,pixel);
        if (bbottom)
            this.buffer.fillrect(left, bottom-bbottom, right, bottom, pixel);
        if (bleft)
            this.buffer.fillrect(left, top, left+bleft, bottom, pixel);

        this.buffer.flush();
    }
};

class UIBorderBox extends UIBorderBoxMixin(UIElement) {};

const UIStyleMixin = (Super) => class extends Super {
    constructor(style={}, ...cons) {
        super(...cons);
        Object.assign(this.style, style);
    }
};

const make_styled = (obj, style, ...cons) => {
    let ret = UIStyleMixin(obj);
    return new ret(style, ...cons);
};

class UIClock extends UITicking(UIText) {
    content_size() {
        this.style.height = this.get_font_height();
        this.style.width = this.get_font_width() * 12.5;
    }

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

        const [font_width, font_height] = this.get_font_size();

        this.cursor_x = this.get_right() - font_width * 12.5;
        this.cursor_y = this.get_top();

        this.draw_string_at_cursor(dayStr);
        //this.cursor_x = this.get_right() - this.font_width * 10.2;
        this.cursor_x = this.get_right() - font_width * 7.8 - (combDateStr.length * .5 * font_width);
        this.draw_string_at_cursor(combDateStr);

        //this.draw_string_at_cursor(`${dayStr} ${combDateStr}`);

        `${hourStr}${this.is_tick_major() ? ':' : ' '}${minuteStr}`;
        this.cursor_x = this.get_right() - font_width * 2;
        this.draw_string_at_cursor(minuteStr);
        this.cursor_y = this.get_top();
        this.cursor_x = this.get_right() - font_width * 4.5;
        this.draw_string_at_cursor(hourStr);
        this.cursor_x = this.get_right() - font_width * 2.7;
        if (this.is_tick_major())
            this.draw_string_at_cursor(':');
    }
};

class UISprite extends UIElement {
    constructor(sprite=undefined) {
        super();
        this.set_sprite(sprite);
    }

    content_size() {
        if (this.sprite) {
            const [width, height] = this.sprite.get_size();
            this.style.content_width = width;
            this.style.content_height = height;
        }
    }

    draw_sprite(sprite) {
        const [offsetx, offsety, width, height] = this.get_size();
        if (this.style.alpha_threshold == undefined) {
            this.buffer.draw_sprite(offsetx, offsety, sprite, width, height);
            return;
        }

        this.buffer.draw_sprite_alpha_blend(offsetx, offsety, sprite, true, this.style.alpha_threshold)
    }

    draw() {
        if (!this.sprite)
            return;

        this.clear();

        this.draw_sprite(this.sprite);

        this.buffer.flush();
    }

    set_sprite(sprite) {
        this.sprite = sprite;
    }

    sprite;
};

class DPad {
    dpad_enter_url = 'dpad_enter.png';
    dpad_arrow_url = 'dpad_arrow.png';
    curfont=0;

    constructor(element, handler) {
        this.handler = handler;

        this.inner = document.createElement('div');
        this.inner.id = "container";
        this.inner.className = "dpad";
        this.element = this.inner.appendChild(document.createElement('div'));
        this.element.id = "inner";
        this.element.className = "dpad";
        element.appendChild(this.inner);
        DOMUtil.add_events(
            document.querySelector('body'),
            ['pointerdown', 'pointerup', 'pointermove', 'pointerleave'],
            this.input_event.bind(this)
        );

        this.get_dpad(this.element);
    }

    async get_canvasbuffer(element, url, id, className) {
        let buffer = new Texture();
        if (url?.length)
            await buffer.load_url(url);
        
        element.appendChild(buffer.canvas);

        buffer.id = id;
        buffer.canvas.className = className;
        return buffer;
    }

    debug_element_positioning(element, event) {
        console.log(event);
        console.log(element);
        for (const prep of ['offset', 'client', 'scroll'])
            for (const prop of ['Left', 'Width', 'Top', 'Height'])
                console.log(prep+prop, element.canvas[prep+prop]);
        for (const prep of ['screen', 'page', 'client', 'layer'])
            for (const prop of ['X', 'Y'])
                console.log(prep+prop, event[prep+prop]);
        console.log(element.canvas.getBoundingClientRect());
    }

    debug_mode = false;

    button_click(element) {
        const key_code = element.id != 4 ? element.id + Codes.ARROW_LEFT : Codes.ENTER;

        if (this.debug_mode) {
            this.handler.log(`${element.id}-`);
            const prev = this.curfont;
            if (element.id == 1)
                this.curfont++;
            else
            if (element.id == 3)
                this.curfont=FontAtlas.fonts.length+this.curfont-1;
            this.curfont %= FontAtlas.fonts.length;
            if (prev != this.curfont) {
                const font = FontAtlas.fonts[this.curfont];
                uitext.set_font(font);
                uitext.reset_uitext();
                this.handler.log(font.url);
                console.log(font.url, font.sprite_width, font.sprite_height);
            }
        }
    
        if (element.id == 4) {
            //this.debug_mode = !this.debug_mode;
            //this.handler.dispatch('reset', 'broadcast');
            //uitext.reset_uitext();
            //this.handler.dispatch('draw', 'broadcast');
            return;
        }

        if (!this.debug_mode)
            this.handler.dispatch_keyboard_event({key_code}, 'broadcast');
    }

    is_in_element(element, x, y) {
        const left = element.offsetWidth;
        const right = left + element.clientWidth;
        const top = element.offsetTop;
        const bottom = top + element.clientHeight;

        return x >= element.offsetLeft && 
               x < element.offsetWidth + element.offsetLeft &&  
               y >= element.offsetTop && 
               y < element.offsetHeight + element.offsetTop;
    }

    is_event_in_element(element, event) {
        if (event.changedTouches && event.changedTouches.length)
            for (const touch of event.changedTouches)
                if (this.is_in_element(element, touch.clientX, touch.clientY))
                    return true;
        return this.is_in_element(element, event.clientX, event.clientY);
    }

    get_input_relative_position(input, element, rect = undefined) {
        const pos = rect ?? element.getBoundingClientRect();
        return [(input.clientX - pos.x) / pos.width, (input.clientY - pos.y) / pos.height];
    }

    is_input_over_opaque(input, buffer, rect = undefined) {
        const [x, y] = this.get_input_relative_position(input, buffer.canvas, rect);
        return (x >= 0 && y >= 0 && x <= 1 && y <=1 && buffer.get_sample(x, y)[3] > 64);
    }

    is_event_over_opaque(event, buffer) {
        const rect = buffer.canvas.getBoundingClientRect();
        if (event.changedTouches && event.changedTouches.length)
            for (const touch of event.changedTouches)
                if (this.is_input_over_opaque(touch, buffer, rect))
                    return true;
        return this.is_input_over_opaque(event, buffer, rect);
    }

    input_event(event) {
        const nodes = [this.enter].concat(this.arrows);
        const state = 'hover';
        const setState = (node, state='') => { if (node) node.canvas.id = state; };
        const setStates = (nodes, state='') => nodes.forEach(x => setState(x, state));
        const checkHovering = (node) => node && this.is_event_over_opaque(event, node);
        const checkActive = (node) => node && node.canvas.id == state;
        const checkActivelyHovering = (node) => checkActive(node) && checkHovering(node);
        const findHovering = () => nodes.find(checkHovering);
        const findActive = () => nodes.find(checkActive);
        const findActivelyHovering = () => nodes.find(checkActivelyHovering);
        const activated = (node) => { setStates(nodes); if (node) this.button_click(node); };
        const stateOne = (node, state) => { setStates(nodes); setState(node, state); return node; };
        const verifyOne = () => stateOne(findActivelyHovering(), state);
        const activateOne = () => activated(verifyOne());
        const pressOne = () => stateOne(findHovering(), state);
        
        if (this.debug_mode)
            this.handler.log(`${event.type.slice(7)},`);

        if (event.type == 'mousemove' || event.type == 'touchmove' || event.type == 'pointermove') { if (findActive()) return verifyOne(); if (event.buttons == 1 || event.type == 'touchmove') return pressOne(); }

        if (event.type == 'mouseleave' || event.type == 'touchcancel' || event.type == 'pointerleave') return setStates(nodes);

        if (event.type == 'mouseup' || event.type == 'pointerup') return activateOne();

        if (event.type == 'mousedown' || event.type == 'touchstart' || event.type == 'pointerdown') return pressOne();
    }
 
    async get_enter(element, url) {
        return await this.get_canvasbuffer(element, url, 4, 'enter');
    }

    async get_arrow(element, url, rotation) {
        let buffer = new Texture();
        let image = await load_image_url(url);
        buffer.image_source = image;
        buffer.create_canvas_from_image_size(image);
        buffer.rotate_around_rel_deg(0.5, 0.5, 90 * rotation - 180);
        buffer.draw_image(0, 0, image);
        buffer.reload();
        buffer.canvas.className = 'arrow';
        buffer.id = rotation;
        element.appendChild(buffer.canvas);
        return buffer;
    }

    async get_dpad(element) {
        let promises = [];

        for (let i = 0; i < 4; i++)
            promises.push(new Promise((resolve) => resolve(this.get_arrow(element, this.dpad_arrow_url, i))));

        promises.push(new Promise((resolve) => resolve(this.get_enter(element, this.dpad_enter_url))));
        
        let nodes = await Promise.all(promises);

        this.enter = nodes.pop();
        this.arrows = nodes;
    }
};

class UIScreen extends UIElement {
    get_name = () => "Screen";
};

class UISubText extends UIText {
    constructor(text, subtext, textures, fallback, y_baseline=0) {
        super(text, fallback);
        this.subtext = subtext;
        this.texture = textures;
        this.font = fallback;
        this.y_baseline = y_baseline;
    }

    content_size() {
        super.content_size();

        let [width, height] = [this.style.content_width,this.style.content_height];

        for (const char of this.subtext) {
            const sprite = this.texture.small_text(char, this.font);
            if (!sprite)
                continue;
            width += sprite.get_width();
            if (sprite.get_height() > height)
                height = sprite.get_height();
        }

        //this.style.content_width = width;
        //this.style.content_height = height;
        [this.style.content_width, this.style.content_height] = [width, height];
    }

    draw() {
        super.draw();
        this.cursor_x+=1;
        console.log(this.cursor_y, this.cursor_x);
        for (const char of this.subtext) {
            const sprite = this.texture.small_text(char, this.font);
            if (!sprite)
                continue;
            const y =  this.cursor_y + this.get_font_height() - sprite.get_height() + this.y_baseline;
            this.draw_sprite(this.cursor_x, y, sprite);
            this.cursor_x += sprite.get_width()+1;
        }
    }
};

class UIScreenMain extends UIScreen {
    constructor(props) {
        super();
        Object.assign(this, props);

        let row1 = new UIElement();
        let heart = row1.appendChild(new UISprite(this.textures.get_sprite(this.heart_sprite)));
        //let heart_text = row1.appendChild(new UIText('65BPM', this.font));
        let heart_text = row1.appendChild(new UISubText('65', 'BPM', this.textures, this.font));
        heart_text.style.margin.left = 3;
        let spdiv = row1.appendChild(new UIElement());
        let spo2 = spdiv.appendChild(new UISubText('SpO', '2', this.textures, this.font));
        spo2.style.display='inline-block';
        //spo2.style.padding.right = 3;
        let spo2_text = spdiv.appendChild(new UIText(' 98.1%', this.font));
        //spo2_text.style.padding.left = 3;
        spo2_text.style.display='inline-block';
        spdiv.style.horizontal_align = 'right';
        let row2 = new UIElement();
        let temp = row2.appendChild(new UIText('103°F', this.font));
        let humd = row2.appendChild(new UIText('23%', this.font));
        let baro = row2.appendChild(new UIText('0.91atm', this.font));
        humd.style.horizontal_align='center';
        baro.style.horizontal_align='right';
        let row3 = new UIElement();
        let br = row3.appendChild(new UIText('30br/m', this.font));
        let row4 = new UIElement();
        let body_temp = row3.appendChild(new UIText('Body 98°F', this.font));
        body_temp.style.horizontal_align = 'right';
        let hydrat = row4.appendChild(new UISubText('Suggested H', '2', this.textures, this.font));
        row4.appendChild(new UIText('O', this.font)).style.margin.left=1;
        let h2o = row4.appendChild(new UIText('3L', this.font));
        h2o.style.horizontal_align = 'right';
        //hydrat.style.horizontal_align = 'right';
        let row5 = new UIElement();
        let uv = row5.appendChild(new UIText('UV 80%', this.font));
        let uv_exp = row5.appendChild(new UIText('24Hr Sum 20%', this.font));
        uv_exp.style.horizontal_align = 'right';
        let row6 = new UIElement();
        let cos = row6.appendChild(new UISubText('CO', '2', this.textures, this.font));
        let co2 = row6.appendChild(new UIText(' 1200ppm', this.font));
        let aqi = row6.appendChild(new UIText('AQI 30%', this.font));
        aqi.style.horizontal_align = 'right';
        let row7 = new UIElement();
        let wea = row7.appendChild(new UIText('Weather UV+HOT', this.font));
        let tim = row7.appendChild(new UIText('3 Hrs', this.font));
        //tim.style.margin.left=3;
        tim.style.horizontal_align='right';


        this.children = [
            row1,
            row2,
            row3,
            row4,
            row5,
            row6,
            row7,
        ];

        for (const child of this.children) {
            for (const sub of child.children)
                sub.style.display = 'inline-block';
            child.style.min_height=14;
            child.style.max_height=16;
        }
    }

    heart_sprite='heart_large';
    textures;
    font;

    get_name = () => "Live Data";
};

class UIScreenClock extends UIScreen {
    draw() {
        this.clear();
        const min = Math.min(this.get_height(), this.get_width());
        const rd = min * .5;
        const [cx, cy] = this.get_center();
        this.buffer.circle(cx, cy, rd, Color.WHITE, true);

        const time = new Date();

        const fill = (x,y,width,pixel) => {
            this.buffer.circle(x,y,width,pixel,true);
        };

        const to_rect = (rad, radius, x, y) => {
            return [radius * Math.cos(rad) + x, radius * Math.sin(rad) + y];
        };

        const linefill = (sx, sy, ex, ey, width, pixel=Color.BLACK) => {
            this.buffer.line_callback(sx, sy, ex, ey, (x, y) =>
                fill(x, y, width, pixel));
        };
        
        const polar_line = (rad, radius, width, pixel=Color.BLACK, _cx=cx, _cy=cy) => {
            const ex = radius * Math.cos(rad) + _cx;
            const ey = radius * Math.sin(rad) + _cy;
            linefill(_cx, _cy, ex, ey, width, pixel);
        };

        let hours = time.getHours();
        let minutes = time.getMinutes();
        let seconds = time.getSeconds();
        minutes += seconds * (1/60);
        hours += minutes * (1/60);

        polar_line(hours * (1/12) * Math.PI * 2 - (Math.PI * .5), rd * .9, 2);
        //polar_line(hours * (1/12) * Math.PI * 2 - (Math.PI * .5), rd * .8, .75, Color.WHITE);
        polar_line(seconds * (1/60) * Math.PI * 2 - (Math.PI * .5), rd * .75, 1);
        polar_line(minutes * (1/60) * Math.PI * 2 - (Math.PI * .5), rd * 0.8, 1.5);

        for (let i = 0; i < Math.PI * 2; i+=(Math.PI * 2 * (1/60))){
            const [[sx, sy],[ex,ey]] = [to_rect(i,rd*.91,cx,cy),to_rect(i,rd,cx,cy)];
            linefill(sx, sy, ex, ey, 1, Color.BLACK);
        }

        for (let i = 0; i < Math.PI * 2; i+=(Math.PI * 2 * (1/12))){
            const [[sx, sy],[ex,ey]] = [to_rect(i,rd*.87,cx,cy), to_rect(i,rd,cx,cy)];
            linefill(sx, sy, ex, ey, 1.5, Color.BLACK);
        }

        this.buffer.circle(cx,cy,2,Color.BLACK,true);
        this.buffer.circle(cx,cy,1,Color.WHITE,true);
    }

    tick = () => this.draw();

    get_name = () => "Clock";
};

let ui = undefined, uitext = undefined, uiclock = undefined, dpad, container, uidummy, textures, bottom_label, uidiv, mainscreen, screenclock;

async function load_additional_fonts() {
    const font_list = [
        ['font_8x12.png', 8, 12],
        ['IBM_BIOS_8x8.png', 8, 8],
        ['IBM_CGA_8x8.png', 8, 8],
        ['IBM_CGAthin_8x8.png', 8, 8],
        ['IBM_Model3x_Alt1_8x14.png', 8, 14],
        ['IBM_VGA_8x16.png', 8, 16],
        ['DOS_VGA_8x16.png', 8, 16],
        ['DOS_JPN12_6x12.png', 6, 12],
        ['fixedsys_8x14.png', 8, 14],
    ];

    const font = font_list[1];

    //FontAtlas.fonts = [FontAtlas.DEFAULT];
    FontAtlas.DEFAULT = await FontAtlas.make(font[0], font[1], font[2]);

    const promises = font_list.map(x => new Promise(resolve => FontAtlas.make(x[0], x[1], x[2]).then(resolve)));
    
    await Promise.allSettled(promises)
        .then(fulfilled => {
            for (const promise of fulfilled)
                if (promise?.value)
                    FontAtlas.fonts.push(promise?.value);
        });
}

async function page_load() {
    container = document.querySelector('#body');
    ui = new UIRoot(container);
    dpad = new DPad(container, ui);
    textures = new SpriteSheet(SpriteSheet.TEXTURES);
    await load_additional_fonts();
    await textures.load_url('textures.png');

    //ui.debug_events = true;
    uidiv = ui.appendChild(new UIBorderBox());
    uidummy = uidiv.appendChild(new UISprite(textures.get_sprite('battery')));
    let batl = uidiv.appendChild(new UIText('0%', FontAtlas.fonts[7]));
    uiclock = uidiv.appendChild(new UIClock());
    //let border = ui.appendChild(new UIStyleMixin(new UIBorderBox(), {width:10,height:10}));
    let border = new UIBorderBox();//ui.appendChild(new UIBorderBox());
    border.appendChild(new UISprite(textures.get_sprite('heart'))).style.horizontal_align='center';
    uitext = new UITextInput();//ui.appendChild(new UITextInput());
    mainscreen = new UIScreenMain({textures, font:FontAtlas.fonts[7]});
    mainscreen.style.margin.top=1;
    //ui.appendChild(mainscreen);
    ui.screens.push(mainscreen);
    screenclock = new UIScreenClock();
    screenclock.style.height=96;
    screenclock.style.vertical_align = 'center';
    screenclock.style.position = 'absolute';
    let bottom_div = ui.appendChild(new UIBorderBox());
    bottom_label = bottom_div.appendChild(new UIText('UI Test Demo', FontAtlas.fonts[7]));
    ui.screens.push(screenclock);
    ui.set_screen(mainscreen);
    //uitext.set_size(8, 16, 112-1, 94);
    //uiclock.set_size(0, 1, 128, 12);
    ui.style.width = 128;
    ui.style.height = 128;
    border.style.margin.top = 1;
    //uitext.style.width = 128;
    uitext.style.height = 90 + 8;
    //uitext.style.margin.left = 1;
    //uitext.style.margin.right = 1;
    uitext.style.margin.value = 1;
    //uiclock.style.width = 112;
    //uiclock.style.height = 12;
    uiclock.style.horizontal_align = 'right';
    uiclock.set_font(FontAtlas.fonts[7]);
    uiclock.style.vertical_align = 'center';
    uidummy.style.vertical_align = 'center';
    //uiclock.style.position = 'absolute';
    //uiclock.style.top = 1;
    //uiclock.style.right = 1;
    //uidummy.style.position = 'absolute';
    //uidummy.style.left = 1;
    //uidummy.style.top = 1;
    //uidiv.style.height = 14;
    //uidummy.style.width = "50";
    batl.style.display = 'inline-block';
    batl.style.vertical_align = 'center';
    uidummy.style.margin.left=1;
    batl.style.margin.left=1;
    uidiv.style.min_height = 15;
    uidiv.set_border({bottom:1});
    bottom_div.set_border({top:1});
    bottom_label.style.horizontal_align = 'center';
    bottom_div.style.vertical_align = 'bottom';
    bottom_div.style.min_height=14;
    
    uidiv.style.padding.right = 1;
    //batl.style.vertical_align = 'center';
    uiclock.style.display = 'inline-block';
    uidummy.style.display = 'inline-block';
    UIEvents.debug = UIStyle.debug_mode;
    ui.dispatch('load', 'capture');
    ui.dispatch('reset', 'capture');
    ui.dispatch_value('set_buffer_event', ui.buffer, 'capture');
    //batl.text = '0%';
    ui.dispatch('content_size', 'capture');
    border.set_border({border:1});
    ui.layout(true,true);
    if (UIStyle.debug_mode)
        await async_wait(2000);
    ui.dispatch('draw', 'capture_selffirst');
    ui.listener_of(document.querySelector('body'));
    ui.start_interval();

    let events = ['pointerdown'];

    for (const event of events)
        ui.buffer.canvas.addEventListener(event, () => {
            console.log('touch');
            document.querySelector('#textinput.dummy').focus();
        });

    const welcome = async () => {
        const writetext = async (text, millis) => {
            for (const key of text) {
                await async_wait(millis);
                ui.dispatch_keyboard_event({key}, 'capture');
            }
        };
        await writetext("Welcome!", 200);
        await writetext("\n\n", 500);
        await writetext("NASA\n\tinternship\n\tproject", 200);
        await async_wait(1000);
        //await uitext.reset();
        uitext.reset_uitext();
        await writetext("\n\nStart typing...", 200);
        await async_wait(1000);
        //await uitext.reset();
        uitext.reset_uitext();
    };
    //if (!UIStyle.debug_mode)
    //    welcome();
}

page_load();