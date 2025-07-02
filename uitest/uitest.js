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
    }

    static async load_image_url(url) {
        return new Promise((resolve, reject) => {
            let image = new Image();
            image.crossOrigin = "anonymous";
            image.src = url;
            image.onload = () => resolve(image);
            image.onerror = () => reject(new Error("Could not load image"));
        });
    }

    static async load_url(url) {
        let texture = new CanvasBuffer();

        texture.load_image(await CanvasBuffer.load_image_url(url));

        return texture;
    }
};

const TextureReader = (Super) => class extends Super {
    get_pixel_offset = (offset) => { let pixel = [0,0,0,255]; for (let i = 0; i < 4; i++) pixel[i] = this.image.data[offset + i]; return pixel; };

    get_pixel_bound = (x, y) => { if (this.is_bound(x, y)) this.get_pixel(x, y); };

    get_pixel = (x, y) => this.get_pixel_offset(this.get_offset(x, y));
};

const TextureWriter = (Super) => class extends Super {
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
};

class Texture extends TextureReader(TextureWriter(CanvasBuffer)) { };

class Atlas {
    constructor(image_url) {

    }
};

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

class UITest {
    constructor(element) {
        this.element = element;
        this.buffer = new UIDisplay(this.element);
    }
};

ui = new UITest(body);