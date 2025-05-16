function uuidv4() {
    return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c =>
      (+c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> +c / 4).toString(16)
    );
}  

class CSV {
    text = undefined;
    rows = [];

    constructor(text) {
        this.text = text;
        this.parse();
    }

    parse() {
        let lines = this.text.trim().split('\n');
        lines.forEach(function(line) {
            let cols = line.trim().split(',');
            this.rows.push(cols);
        }.bind(this));
    }
};

class Log {
    filename = undefined;
    text = undefined;
    name = undefined;

    header = undefined;
    module = undefined;
    blocks = undefined;
    rows = undefined;
    csv = undefined;
    markers = undefined;

    seconds_min = 0;
    seconds_max = 0;
    seconds_range = 0;

    colors = [ 
        "orange",
        "green",
        "yellow",
        "blue",
        "red",
        "pink",
        "cyan",
        "goldenrod",
        "coral",
        "greenyellow",
        "magenta",
        "maroon"
    ];

    constructor(filename, text) {
        this.filename = filename;
        this.text = text;
        this.csv = new CSV(this.text);
        this.name = uuidv4();
        this.parse();
    }

    parse() {
        let rs = this.csv.rows;
        let r = rs[0];

        this.header = {
            weekday: r[0],
            day: r[1],
            month: r[2],
            year: r[3],
            build: r[4],
            version: r[5],
            data_version: r[6]
        };
        
        r = rs[1];
        
        this.module = {
            part_number: r[0],
            part_name: r[2]
        };

        this.header.log_type = r[1];

        r = rs[2];
        let r2 = rs[4];
        let r3 = rs[5];
        let r4 = rs[6];

        let b = r.slice(2);
        let b2 = r2.slice(2);
        let b3 = r3.slice(2);
        let b4 = r4.slice(2);

        this.blocks = [];
        let stubs = [];

        for (let i = 0, j = 0; i < b.length && i < b2.length && i < b3.length && b4.length; i+=2, j++) {
            let block = {
                group:b[i],
                field:b[i+1],
                visible:true,
                depth:0
            };
            block.group_num = Number(block.group.match('[0-9]+')[0]);
            block.field_num = Number(block.field.match('[0-9]+')[0]);
            block.name = b3[i];
            block.unit = b4[i].trim();
            block.combined_name = b2[i];
            block.stub = block.group + block.field;

            block.min = 0;
            block.max = 0;
            block.color = this.colors[j];

            stubs.push(block.stub);
            this.blocks.push(block);
        }

        this.rows = [];
        this.markers = [];

        rs.slice(7).forEach(function(r) {
            let row = {};

            row.marker = Number(r[0]);
            row.seconds = Number(r[1]);
            row.columns = {};

            if (row.marker)
                this.markers.push({marker:row.marker,seconds:row.seconds});

            let d = r.slice(2);
            for (let i = 0, b = 0; i < d.length; i+=2, b++) {
                let block = this.blocks[b];
                let db = row.columns[stubs[b]] = {};
                db.value = Number(d[i]);
                db.seconds = Number(d[i-1]);

                if (db.value < block.min)
                    block.min = db.value;
                if (db.value > block.max)
                    block.max = db.value;
                block.range = block.max - block.min;
                block.range_inv = 1.0 / block.range;
            }

            this.seconds_max = row.seconds;
            this.seconds_range = this.seconds_max - this.seconds_min;

            this.rows.push(row);
        }.bind(this));
    }
};

class Parameters {
    constructor(log, element) {
        this.context = element.getContext('2d');
        this.size = element.getBoundingClientRect();

        element.width = log.rows.length * 2;

        if (element.width > 6000) element.width = 6000;
        if (element.width < 800) element.width = 800;

        this.aspect_ratio = this.size.height / this.size.width;

        element.height = this.aspect_ratio * element.width;

        this.line_width = element.height / 100;
        this.border_radius = this.line_width;

        this.context.lineWidth = this.line_width;

        this.width = element.width - this.border_radius * 2;
        this.height = element.height - this.border_radius * 2;

        this.log = log;
        this.element = element;

        this.delta_time = log.seconds_max - log.seconds_min;
        this.delta_time_inv = 1.0 / this.delta_time;

        this.x_start = 0;
        this.x_end = 1;
        this.y_start = 0;
        this.y_end = 1;
    }

    is_bound_absolute(pos) {
        //return (pos.x > -1 && pos.y > -1 && pos.x < this.width && pos.y < this.height);
        //return (pos.x > -1 && pos.x < this.width);
        return true;
    }

    moveTo(relative) {
        let pos = this.get_position_absolute(relative);
        if (!this.is_bound_absolute(pos))
            return;
        this.context.moveTo(pos.x, pos.y);
    }

    lineTo(relative) {
        let pos = this.get_position_absolute(relative);
        if (!this.is_bound_absolute(pos))
            return;
        this.context.lineTo(pos.x, pos.y);
    }

    get_column_relative(block, column) {
        return {
            x: (column.seconds - this.log.seconds_min) * this.delta_time_inv,
            y: (column.value - block.min) * block.range_inv,
        };
    }

    get_position_relative(pos) {

    }

    get_shifted_relative(pos) {
        let sx = this.x_end - this.x_start;
        let sy = this.y_end - this.y_start;
        return {
            x:(pos.x - this.x_start) / sx,
            y:(pos.y - this.y_start) / sy,
        };
    }

    get_position_absolute(position) {
        let pos = this.get_shifted_relative(position);
        return {
            x: pos.x * this.width + this.border_radius,
            y: this.height - (pos.y * this.height - this.border_radius),
        };
    }

    get_position(block, column, x_offset=0, y_offset=0) {
        let rel = this.get_column_relative(block, column);
        return this.get_position_absolute(rel);
    }
};

function get_element_position(element) {
    let rect = element.getBoundingClientRect();
    return {
        x: rect.left + window.scrollX,
        y: rect.top + window.scrollY,
        width: rect.width,
        height: rect.height,
        size:rect,
    };
}

function is_bound(position, size={x:0,y:0,width:1,height:1}) {
    return (
        position.x >= size.x && position.x <= (size.x + size.width) &&
        position.y >= size.y && position.y <= (size.y + size.height)
    );
}

function is_position_of_element(position, element) {
    let e_pos = get_element_position(element);
    return is_bound(position, e_pos);
}

function get_position_relative_to_element(position, element) {
    let e_pos = get_element_position(element);
    let x = position.x - e_pos.x;
    let y = position.y - e_pos.y;
    return {x:x/e_pos.width,y:y/e_pos.height};
}

function get_element_relative_to_element(inner, outer) {
    let inner_pos = get_element_position(inner);
    let outer_pos = get_element_position(outer);
    let ir = inner_pos.x + inner_pos.width;
    let ib = inner_pos.y + inner_pos.height;
    let or = outer_pos.x + outer_pos.width;
    let ob = outer_pos.y + outer_pos.height;
    return {
        x1:(inner_pos.x - outer_pos.x) / outer_pos.width,
        y1:(inner_pos.y - outer_pos.y) / outer_pos.height,
        x2:ir/or,
        y2:ib/ob,
        inner,
        outer,
        inner_pos,
        outer_pos,
    };
}

class VCDS {
    get_element(name) {
        return document.getElementById(name);
    }

    events = [
        ['log_load', 'input', this.log_load_input],
        ['log_body', 'mousemove', this.mouse_input],
        ['log_body', 'mousedown', this.mouse_input],
        ['log_body', 'mouseup', this.mouse_input],
        ['log_body', 'dblclick', this.mouse_input],
    ];

    logs = [];

    constructor() {
        this.events.forEach(function(event) {
            this.get_element(event[0]).addEventListener(event[1], event[2].bind(this));
        }.bind(this));
        this.log_load_input();
    }

    held = false;
    current_canvas = undefined;
    current_log = undefined;
    canvas_overlay = undefined;
    mouse_start = undefined;

    clear_overlay() {
        this.held = false;
        let e = document.getElementById('canvas_overlay');
        if (e)
            document.body.removeChild(e);
        this.current_canvas = undefined;
        this.current_log = undefined;
        this.canvas_overlay = undefined;
        this.mouse_start = undefined;
    }

    get_hovering_log(event) {
        return this.logs.find(log => is_position_of_element(event, log.parameters.element));
    }

    mouse_input(event) {
        if (event.type == "dblclick") {
            let e = this.get_hovering_log(event);
            if (e) {
                let cl = e.parameters;
                cl.x_start = 0;
                cl.y_start = 0;
                cl.x_end = 1;
                cl.y_end = 1;
                this.held = false;
                this.render_log(cl);
                this.clear_overlay();
            }
            return;
        }
        if (event.type == "mousedown") {
            let e = this.get_hovering_log(event);
            if (!e)
                return;
            this.current_log = e;
            let cc = this.current_canvas = e.parameters.element;
            this.mouse_start = get_position_relative_to_element(event, this.current_canvas);
            let size = get_element_position(cc);
            let co = this.canvas_overlay = document.createElement('div');
            document.body.insertAdjacentElement('beforeend', this.canvas_overlay);
            co.id = "canvas_overlay"
            co.style.minWidth = "0px";
            co.style.minHeight = `${size.height}px`;
            co.style.top = `${size.y}px`;
            co.style.left = `${event.clientX}px`;

            this.held = true;
            return;
        }
        if (!this.current_canvas || !this.canvas_overlay) {
            this.held = false;
            return;
        }
        let co = this.canvas_overlay, cc = this.current_canvas, ms = this.mouse_start, cl = this.current_log;
        let mp = get_position_relative_to_element(event, cc);
        if (event.type == "mouseup") {
            let rel = get_element_relative_to_element(co, cc);
            let p = cl.parameters;
            let x_src_diff = rel.x2 - rel.x1;
            let x_start = p.x_start;
            let x_end = p.x_end;
            let x_diff = x_end - x_start;
            //let x1 = p.get_shifted_relative({x:rel.x1+p.x_end,y:0}).x;
            //let x2 = p.get_shifted_relative({x:rel.x2+p.x_end,y:0}).x;
            x_start = x_diff * rel.x1 + x_start;
            x_end = x_diff * x_src_diff + x_start;
            console.log(rel, p, x_start, x_end, x_diff, p.x_start, p.x_end);
            p.x_start = x_start;
            p.x_end = x_end;
            this.render_log(cl.parameters);
            this.clear_overlay();
        }
        if (!this.held)
            return;
        if (event.type == "mousemove") {
            let x = ms.x;
            let ml = ms, mr = mp;
            if (ml.x > mr.x)
                [ml, mr] = [mr, ml];
            let l = ml.x * cc.clientWidth + cc.clientLeft;
            let w = (mr.x - ml.x) * cc.clientWidth;
            co.style.left = `${l}px`;
            co.style.minWidth = `${w}px`;
        }
    }

    render_markers(p) {
        let ctx = p.context;
        ctx.strokeStyle = "black";
        p.log.markers.forEach(function(marker) {
            ctx.beginPath();
            p.moveTo({x:marker.seconds/p.delta_time,y:1});
            p.lineTo({x:marker.seconds/p.delta_time,y:0});
            ctx.stroke();
        }.bind(this));
    }

    render_log(p) {
        let ctx = p.context, border_radius = p.border_radius, height = p.height, width = p.width, delta_time = p.delta_time, log=p.log, element=p.element;

        ctx.clearRect(0, 0, p.width, p.height);
        this.render_markers(p);
        //console.log(element, ctx, rect, line_width);

        let layers = log.blocks.toSorted(function(a,b){return a.depth < b.depth});

        //console.log(layers);


        for (let i = 0; i < layers.length; i++) {
            let block = layers[i];

            if (!block.visible)
                continue;

            let delta_value = block.max - block.min;
            let x = 0;
            let y = 0;

            ctx.strokeStyle = block.color;

            ctx.beginPath();

            //ctx.moveTo(x - border_radius, height - (((log.rows[0].columns[block.stub].value - block.min) / delta_value) * height - border_radius));

            let rel = p.get_column_relative(block, p.log.rows[0].columns[block.stub]);
            rel.x = -0.01;
            p.moveTo(rel);

            log.rows.forEach(function(row) {
                let column = row.columns[block.stub];

                //x = (column.seconds - log.seconds_min) / delta_time;
                //y = (column.value - block.min) / delta_value;

                //ctx.lineTo(x * width + border_radius, height - (y * height - border_radius));

                p.lineTo(p.get_column_relative(block, column));

                //ctx.closePath();
            }.bind(this));

            rel = p.get_column_relative(block, p.log.rows.at(-1).columns[block.stub]);
            rel.x = 1.01;
            p.lineTo(rel);
            //ctx.lineTo(width + border_radius * 2, height - (y * height - border_radius));

            ctx.stroke();
        }

        log.rows.forEach(function(row) {
            for (const [k, v] of Object.entries(row.columns)) {

            }
        }.bind(this));
    }

    add_log(log) {
        let log_entry = {log};
        this.logs.push(log_entry);

        let body = this.get_element('log_body');

        let e = document.createElement('div');
        e.setAttribute('id', 'log_view_div');
        e.setAttribute('name', log.name);

        e.innerHTML = "";

        let canvas_div = "<div id='log_view_canvas_container' class='log_view_height_limit'>";
        canvas_div += `<div id='log_view_canvas_div'><canvas id='log_view_canvas' class='log_view_height_limit' width=800 height=800></canvas></div>`;
        canvas_div += "<div id='log_view_buttons_div'>";
        {
            log.blocks.forEach(function(block) {
                canvas_div += `<div>`;
                canvas_div += `<input class="${block.stub}" name="${log.name}" type="checkbox" checked />`;
                canvas_div += `<p style="background-color:${block.color}">${block.name}</p>`;
                canvas_div += `</div>`;
            }.bind(this));
        }
        canvas_div += "</div>";
        canvas_div += "</div>";

        let table = canvas_div + "<div id='log_view_container_div'><table>";
        {
            table += "<tr><th><div id='vertical'><p>Seconds</p></div></th>";
            log.blocks.forEach(function(block) {
                table += `<th><div id='header_flex' style="background-color:${block.color}"><div id='header'><p>${block.name}</p></div></div></th>`;
            }.bind(this));
            table += "</tr>";

            log.rows.forEach(function (row) {
                table += "<tr>";

                table += `<td><p>${row.seconds}</p></td>`;

                for (const [k, v] of Object.entries(row.columns)) {
                    table += `<td><p>${v.value}</p></td>`
                }

                table += "</tr>";
            }.bind(this));
        }
        table += "</table></div>";

        let str = `<div id='log_view_header_div'>`;
        str += `<a id='log_toggle' name='${log.name}' onclick='vcds.log_toggle_click(this)'>-</a>`;
        str += `<p>${log.filename}</p>`;
        str += `<a id='log_close' name='${log.name}' onclick='vcds.log_close_click(this)'>X</a>`;
        str += `</div>`;

        e.innerHTML += str;
        e.innerHTML += table;

        body.insertBefore(e, this.get_element('log_load_div'));
        
        let canvas_element = document.querySelector(`div#log_view_div[name='${log.name}'] canvas`);
        log_entry.parameters = new Parameters(log, canvas_element);

        this.render_log(log_entry.parameters);
    }

    log_close_click(event) {
        this.get_element('log_body').removeChild(event.parentElement.parentElement);
    }

    get_css_rule(rule) {
        let styles = document.styleSheets[0].cssRules;

        if (!styles)
            return;

        for (let i = 0; i < styles.length; i++)
            if (styles[i].selectorText == rule)
                return styles[i];
    }

    get_css_field(rule, field) {
        let css_rule = this.get_css_rule(rule);

        if (!css_rule)
            return;

        return css_rule.style[field];
    }

    set_css_style(rule, field, value) {
        let style = this.get_css_rule(rule);

        if (!style)
            return;

        style[field] = value;
    }

    log_toggle_click(event) {
        //let e = event.parentElement.getElementById('log_view_container_div');
        let name = event.getAttribute('name');
        let q = `div#log_view_div[name='${name}']`
        let e1 = document.querySelector(q + ' div#log_view_container_div');
        let e2 = document.querySelector(q + ' div#log_view_canvas_div');
        let e3 = document.querySelector(q + ' div#log_view_canvas_container');

        if (event.innerText.includes('-')) {
            e1.style.setProperty('display', 'none');
            e2.style.setProperty('resize', 'horizontal');
            //e3.style.setProperty('max-height', '10vh');
            this.set_css_style('.log_view_height_limit', 'max-height', '10vh');
            event.innerText = '+';
        } else {
            e1.style.setProperty('display', "");
            e2.style.setProperty('resize', 'both');
            //e3.style.setProperty('max-height', "");
            this.set_css_style('.log_view_height_limit', 'max-height', 'fit-content');
            event.innerText = '-';
        }
    }

    log_load_input(event) {
        console.log('log_load_input', this, event);

        let e = this.get_element('log_load');

        if (!e || !e.files || !e.files.length)
            return;

        let form = e.files[0];

        let reader = new FileReader();

        reader.onload = function(e) {
            this.add_log(new Log(form.name, e.target.result));
        }.bind(this);

        reader.readAsText(form);
    }
};

let vcds = new VCDS();