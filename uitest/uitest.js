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
    constructor(element, width=128, height=128) {
        this.element = document.createElement('div');
        this.element.id = 'container';
        element.appendChild(this.element);

        this.canvas = document.createElement('canvas');
        this.canvas.id = 'canvas';
        this.element.appendChild(this.canvas);

        this.context = this.canvas.getContext('2d');

        this.set_size(width, height);
        this.context.clearRect(0, 0, this.width, this.height);

        this.image = this.get_image_data();

        this.context.imageSmoothingQuality = '';
        this.context.imageSmoothingEnabled = false;

        this.clear(Color.BLACK);

        this.put_image_data();
    }

    set_size(width, height) {
        this.width = width;
        this.height = height;

        this.context.width = this.canvas.width = this.width;
        this.context.height = this.canvas.height = this.height;
    }

    get_image_data = () => this.context.getImageData(0,0,this.width,this.height);

    put_image_data = () => this.context.putImageData(this.image, 0, 0);

    put_pixel_offset = (offset, pixel) => { for (let i = 0; i < 4; i++) this.image.data[offset + i] = pixel[i]; };

    get_offset = (x, y) => Math.round(Math.round(y) * this.width + x) * 4;

    is_bound = (x, y) => (x < this.width && y < this.height && x >= 0 && y >= 0);

    put_pixel = (x, y, pixel) => this.put_pixel_offset(this.get_offset(x, y), pixel);

    put_pixel_bound = (x, y, pixel) => { if (this.is_bound(x, y)) this.put_pixel(x, y, pixel); };

    get_pixel = (x, y) => { let pixel = [0,0,0,255]; const offset = this.get_offset(x, y); for (let i = 0; i < 4; i++) pixel[i] = this.image.data[offset + i]; return pixel; };

    get_pixel_bound = (x, y) => { if (this.is_bound(x, y)) this.get_pixel(x, y); };

    clear = (pixel) => this.fillrect(0, 0, this.width, this.height, pixel);

    fillrect = (x0, y0, x1, y1, pixel) => {
        for (let x = x0; x < x1; x++) {
            for (let y = y0; y < y1; y++) {
                this.put_pixel(x, y, pixel);
            }
        }
    };
};

class UITest {
    constructor(element) {
        this.element = element;
        this.buffer = new CanvasBuffer(this.element);
    }
};

ui = new UITest(body);