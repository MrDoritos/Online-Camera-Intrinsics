function uuidv4() {
    return "10000000100040008000100000000000".replace(/[018]/g, c =>
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

function lerp(v1, v2, factor) {
    return v1 * (1 - factor) + v2 * factor;
}

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

    get_block(stub) {
        return this.blocks.find(block => block.stub == stub);
    }

    get_blocks_by_depth() {
        return this.blocks.toSorted((a,b) => a.depth < b.depth);
    }

    get_row_index_by_seconds(time) {
        let min_time=Math.abs(time - this.rows[0].seconds);
        let min_index=0;
        for (let i = 0; i < this.rows.length; i++) {
            if (Math.abs(time - this.rows[i].seconds) < min_time) {
                min_time = Math.abs(time - this.rows[i].seconds);
                min_index = i;
            }
        }
        return min_index;
    }

    get_row_by_seconds(time) {
        return this.rows[this.get_row_index_by_seconds(time)];
    }

    get_two_rows_indicies_by_seconds(time) {
        let a = this.get_row_index_by_seconds(time);
        if (a < 1)
            return [0, 1];
        if (a > this.rows.length - 2)
            return [this.rows.length-2, this.rows.length-1];

        let a1 = this.rows[a];
        let t1 = this.rows[a+1], t2 = this.rows[a-1];
        if (Math.abs(t1.seconds - a.seconds) < Math.abs(t2.seconds - a.seconds))
            return [a, a+1];
        return [a-1, a];
    }

    get_two_rows_by_seconds(time) {
        let ix = this.get_two_rows_indicies_by_seconds(time);
        return [this.rows[ix[0]], this.rows[ix[1]]];
    }

    get_linear_interpolated_block(block1, block2, factor=0.5) {
        return {
            value: lerp(block1.value, block2.value, factor),
            seconds: lerp(block1.seconds, block2.seconds, factor),
        };
    }

    get_linear_interpolated_block_by_seconds(time, block) {
        let ix = this.get_two_rows_indicies_by_seconds(time);
        return this.get_linear_interpolated_block(
            this.rows[ix[0]].columns[block.stub],
            this.rows[ix[1]].columns[block.stub]
        );
    }

    get_linear_interpolated_row_by_seconds(time) {
        let ix = this.get_two_rows_indicies_by_seconds(time);
        let r1 = this.rows[ix[0]];
        let r2 = this.rows[ix[1]];

        let row_factor = (time - r1.seconds) / (r2.seconds - r1.seconds);

        let columns = {};
        for (let i = 0; i < this.blocks.length; i+=1) {
            let stub = this.blocks[i].stub;
            let b1 = r1.columns[stub], b2 = r2.columns[stub];
            let block_factor = (time - b1.seconds) / (b2.seconds - b1.seconds);
            columns[this.blocks[i].stub] = this.get_linear_interpolated_block(b1, b2, block_factor);
        }

        return {
            columns,
            marker:0,
            seconds:lerp(r1.seconds, r2.seconds, row_factor),
        };
    }

    get_column(row_index, block) {
        return this.rows[row_index].columns[block.stub];
    }

    get_columns(block, indicies) {
        return indicies.map(index=>this.get_column(index, block));
    }

    get_sum(block, indicies) {
        return this.get_columns(block, indicies).reduce((sum, a) => sum + a.value, 0);
    }

    get_mean(block, indicies) {
        return this.get_sum(block, indicies) / indicies.length;
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
            block.min_time = 0;
            block.max_time = 0;
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

            let d = r;
            for (let i = 2, b = 0; i < d.length; i+=2, b++) {
                let block = this.blocks[b];
                let db = row.columns[stubs[b]] = {};
                db.value = Number(d[i]);
                db.seconds = Number(d[i-1]);

                if (db.value < block.min) {
                    block.min = db.value;
                    block.min_time = db.seconds;
                }
                if (db.value > block.max) {
                    block.max = db.value;
                    block.max_time = db.seconds;
                }
                block.range = block.max - block.min;
                block.range_inv = 1.0 / block.range;
            }

            this.seconds_max = row.seconds;
            this.seconds_range = this.seconds_max - this.seconds_min;

            this.rows.push(row);
        }.bind(this));
    }
};

function get_css_rule(rule) {
    let styles = document.styleSheets[0].cssRules;

    if (!styles)
        return;

    for (let i = 0; i < styles.length; i++)
        if (styles[i].selectorText == rule)
            return styles[i];
}

function get_css_field(rule, field) {
    let css_rule = get_css_rule(rule);

    if (!css_rule)
        return;

    return css_rule.style[field];
}

function add_css_rule(rule) {
    let sheet = document.styleSheets[0];
    return sheet.cssRules[sheet.insertRule(`${rule}{}`)];
}

function set_css_style(rule, field, value) {
    let style = get_css_rule(rule);

    if (!style)
        style = add_css_rule(rule);

    style.style[field] = value;
}

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

function create_matrix(rows, columns) {
    return Array(rows).fill(0).map(x => Array(columns).fill(0));
}

class Parameters {
    constructor(log, element) {
        this.context = element.getContext('2d');
        this.size = element.getBoundingClientRect();

        this.log = log;
        this.element = element;

        this.delta_time = log.seconds_max - log.seconds_min;
        this.delta_time_inv = 1.0 / this.delta_time;

        this.x_start = 0;
        this.x_end = 1;
        this.y_start = 0;
        this.y_end = 1;

        this.update_canvas_size();
    }

    update_canvas_size() {
        this.element.width = this.log.rows.length * 2;

        if (this.element.width > 6000) this.element.width = 6000;
        if (this.element.width < 800) this.element.width = 800;

        this.aspect_ratio = this.size.height / this.size.width;

        this.element.height = this.aspect_ratio * this.element.width;

        this.line_width = this.element.height / 100;
        this.border_radius = this.line_width;

        this.context.lineWidth = this.line_width;

        this.width = this.element.width - this.border_radius * 2;
        this.height = this.element.height - this.border_radius * 2;

        this.modified = true;
    }

    is_bound_absolute(pos) {
        //return (pos.x > -1 && pos.y > -1 && pos.x < this.width && pos.y < this.height);
        //return (pos.x > -1 && pos.x < this.width);
        return true;
    }

    reset_view_boundary() {
        this.set_view_boundary({x1:0,x2:1,y1:0,y2:1});
    }

    get_view_boundary() {
        return {x1:this.x_start,x2:this.x_end,y1:this.y_start,y2:this.y_end};
    }

    set_view_boundary(size) {
        let vb = this.get_view_boundary();
        this.modified |= (
            vb.x1 != size.x1 || 
            vb.x2 != size.x2 || 
            vb.y1 != size.y1 ||
            vb.y2 != size.y2
        );
        this.x_start = size.x1;
        this.x_end = size.x2;
        this.y_start = size.y1;
        this.y_end = size.y2;
    }

    get_view_seconds(x) {
        return x * this.log.seconds_range + this.log.seconds_min;
    }

    get_view_seconds_relative(position) {
        return this.get_view_seconds(
            position.x * (this.x_end - this.x_start) + this.x_start
        );
    }

    get_view_seconds_range() {
        let b = this.get_view_boundary();
        let r = {
            start:this.get_view_seconds(b.x1),
            end:this.get_view_seconds(b.x2),
        };
        r.range = Math.abs(r.start - r.end);
        return r;
    }

    get_view_row_range() {
        let sr = this.get_view_seconds_range();
        let r = {
            start:this.log.get_row_index_by_seconds(sr.start),
            end:this.log.get_row_index_by_seconds(sr.end),
        };
        r.range = Math.abs(r.start - r.end);
        return r;
    }

    get_view_rows() {
        let rr = this.get_view_row_range();
        return this.log.rows.slice(rr.start, rr.end);
    }

    foreach_view_row(callback) {
        let rr = this.get_view_row_range();

        for (let i = rr.start; i < rr.end; i += 1) {
            callback(this.log.rows[i]);
        }
    }

    get_view_rows_count() {
        let rr = this.get_view_row_range();
        return rr.range;
    }

    get_view_nearest_row(position, tolerance=1, interpolate=false) {
        let time = this.get_view_seconds_relative(position);

        if (interpolate)
            return this.log.get_linear_interpolated_row_by_seconds(time);
        return this.log.get_row_by_seconds(time);
    }

    get_view_nearest_block(position, tolerance=1, interpolate=false) {
        let row = this.get_view_nearest_row(position, tolerance, interpolate);

        let n = {value:tolerance,row};
        for (const [key, column] of Object.entries(row.columns)) {
            let block = this.log.get_block(key);
            let y = (column.value - block.min) * block.range_inv;
            y = this.get_shifted_relative({x:0,y}).y;
            let diff_y = Math.abs((1-position.y) - y);
            if (diff_y < n.value) {
                n.block = block;
                n.column = column;
                n.value = diff_y;
            }
        }

        if (!n.row || !n.block || !n.column)
            return undefined;

        return n;
    }

    moveTo(relative) {
        let pos = this.get_position_absolute(relative);
        if (!this.is_bound_absolute(pos))
            return;
        this.context.moveTo(pos.x, pos.y);
    }

    clear() {
        this.context.clearRect(0,0,this.element.width,this.element.height);
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

    get_log_view_selector() {
        return `div#log_view_div[name='${this.log.name}']`;
    }

    get_log_view_div() {
        return document.querySelector(this.get_log_view_selector());
    }

    get_log_engine_div() {
        return document.querySelector(this.get_log_view_selector() + " #log_view_engine");
    }

    get_log_canvas() {
        return document.querySelector(this.get_log_view_selector() + " canvas");
    }

    get_log_view_container_div() {
        return document.querySelector(this.get_log_view_selector() + " #log_view_container_div");
    }

    get_log_view_canvas_container() {
        return document.querySelector(this.get_log_view_selector() + " #log_view_canvas_container");
    }

    get_log_table() {
        return document.querySelector(this.get_log_view_selector() + " table");
    }

    get_log_table_body() {
        return document.querySelector(this.get_log_view_selector() + " tbody");
    }
    
    get_canvas_info_div() {
        return document.querySelector(this.get_log_view_selector() + " #canvas_info");
    }

    get_log_canvas_all() {
        return document.querySelector(this.get_log_view_selector() + " #log_view_canvas_all_div");
    }

    get_canvas_buttons_resize_bar() {
        return document.querySelector(this.get_log_view_selector() + " #canvas_buttons_resize_bar");
    }

    get_canvas_table_resize_bar() {
        return document.querySelector(this.get_log_view_selector() + " #canvas_table_resize_bar");
    }

    get_resize_bars() {
        return [this.get_canvas_buttons_resize_bar(), this.get_canvas_table_resize_bar()];
    }

    get_overlay() {
        return document.querySelector(this.get_log_view_selector() + " #overlay");
    }

    get_cursor_info_element() {
        return document.querySelector(this.get_log_view_selector() + " #cursor_info");
    }

    render_canvas() {
        let layers = this.log.get_blocks_by_depth();
        let rr = this.get_view_row_range();

        layers.forEach(function(block) {
            if (!block.visible)
                return;

            this.context.strokeStyle = block.color;

            this.context.beginPath();
            let rel = this.get_column_relative(block, this.log.rows[rr.start].columns[block.stub]);
            rel.x = -0.01;
            this.moveTo(rel);

            this.foreach_view_row(function(row) {
                this.lineTo(this.get_column_relative(block, row.columns[block.stub]));
            }.bind(this));

            rel = this.get_column_relative(block, this.log.rows[rr.end].columns[block.stub]);
            rel.x = 1.01;
            this.lineTo(rel);

            this.context.stroke();
        }.bind(this));
    }

    render_markers() {
        this.context.strokeStyle = "black";
        this.log.markers.forEach(function(marker) {
            this.context.beginPath();
            this.moveTo({x:marker.seconds/this.delta_time,y:1.1});
            this.lineTo({x:marker.seconds/this.delta_time,y:-0.1});
            this.context.stroke();
        }.bind(this));
    }

    get_second_step(range) {
        let diff = Math.abs(range.start - range.end);

        if (diff <= 1)
            return 0;
        if (diff <= 5)
            return 1;
        if (diff <= 60)
            return 5;
        if (diff <= 3600)
            return 60;
        return 300;
    }

    get_view_second_step() {
        return this.get_second_step(this.get_view_seconds_range());
    }

    render_bars() {
        let st = this.get_view_seconds_range();

        let ss = this.get_second_step(st);

        if (ss < 60) { //render per sample time
            this.context.strokeStyle = "#CCCCCC";
            this.foreach_view_row(function(row) {
                this.context.beginPath();
                let x = row.seconds / this.delta_time;
                this.moveTo({x,y:1.1});
                this.lineTo({x,y:-0.1});
                this.context.stroke();
            }.bind(this));
        }
        if (ss) {
            this.context.strokeStyle = "#BBBBBB";
            for (let t = st.start; t < st.end; t+=ss) {
                this.context.beginPath();
                let x = t / this.delta_time;
                this.moveTo({x,y:1.1});
                this.lineTo({x,y:-0.1});
                this.context.stroke();
            }
        }
    }

    render() {
        if (!this.modified)
            return;

        this.clear();
        this.render_bars();
        this.render_markers();
        this.render_canvas();
        this.set_ui();

        this.modified = false;
    }

    get_block_identifier(block) {
        return `B${this.log.name}${block.stub}`;
    }

    get_table_entries_html() {
        let sr = this.get_view_row_range();
        let str = '';
        
        this.foreach_view_row(function(row) {
            str += "<tr>";
            str += `<td><p>${row.seconds}</p></td>`;
            
            for (const [k, v] of Object.entries(row.columns)) {
                str += `<td><p>${v.value}</p></td>`;
            }
            str += "</tr>";
        }.bind(this));

        return str;
    }

    set_table() {
        let e = this.get_log_table_body();

        e.innerHTML = this.get_table_entries_html();
    }

    set_block_color(block, color) {
        block.color = color;
        let iden = this.get_block_identifier(block);
        set_css_style(`.${iden}`, 'background-color', color);
        this.modified = true;
    }

    set_styles() {
        this.log.blocks.forEach(function(block) {
            this.set_block_color(block, block.color);
        }.bind(this));
    }

    async set_cursor_info(rel) {
        let time = this.get_view_seconds_relative(rel);
        let row_index = this.log.get_row_index_by_seconds(time);
        let row = this.log.rows[row_index];
        this.cursor_info_element.innerText = `${row.seconds.toFixed(2)}s [${row_index}]`;
    }

    async remove_cursor_info() {
        this.cursor_info_element.innerText = `--.--s [---]`;
    }

    set_canvas_info() {
        let e = this.get_canvas_info_div();
        
        let sr = this.get_view_seconds_range();
        let ss = this.get_second_step(sr);
        let rc = this.get_view_rows_count();

        let str = '';
        str += `<p>x_div: ${ss ? ss + 's' : 'marker'}</p>`;
        str += `<p>${sr.start.toFixed(2)}s to ${sr.end.toFixed(2)}s (${sr.range.toFixed(2)}s)</p>`;
        str += `<p>${rc} samples</p>`;
        str += `<p>${(rc / sr.range).toFixed(1)} samples/s</p>`;
        str += `<p id='cursor_info'></p>`;
        str += `<button name="${this.log.name}" onclick="vcds.log_export_range_input(this)">Export Range</button>`;

        e.innerHTML = str;

        this.cursor_info_element = this.get_cursor_info_element();
    }

    set_ui() {
        this.set_table();
        this.set_canvas_info();
    }

    export_range(range) {
        let str = '';

        str += 'Seconds,' + this.log.blocks.map(x => x.name).join(',');

        for (let i = range.start; i < range.end; i+=1) {
            let row = this.log.rows[i];
            str += `\n${row.seconds},${Object.entries(row.columns).map(x=>x[1].value).join(',')}`;
        }

        return str;
    }

    canvas_buttons_resize_bar_drag(event, bar) {
        let e = this.get_log_canvas_all();
        //let div = this.get_log_view_container_div();
        let div = this.get_log_view_div();
        let rel = get_position_relative_to_element(event, div);
        let pos = get_element_position(e);
        let bw = bar.clientWidth / 2;
        //console.log(event, e, bar, div, rel, pos, bw);
        //e.style.width=((rel.x * div.clientWidth) - (bar.clientWidth / 2)) + "px";
        e.style.width = (event.x - pos.x - bw) + "px";
    }

    canvas_table_resize_bar_drag(event, bar) {
        let e = this.get_log_view_canvas_container();
        let div = this.get_log_view_div();
        let pos = get_element_position(e);
        let bh = bar.clientHeight / 2;
        //let rel = get_position_relative_to_element(event, div);
        //console.log(event, e, bar, div, pos, bh);
        //e.style.height=((rel.y * div.clientHeight) - (bar.clientHeight / 2)) + "px";
        e.style.height = (event.y - pos.y - bh) + "px";
    }

    resize_bar_drag(event, bar) {
        if (bar.id == 'canvas_buttons_resize_bar')
            this.canvas_buttons_resize_bar_drag(event, bar);
        if (bar.id == 'canvas_table_resize_bar')
            this.canvas_table_resize_bar_drag(event, bar);
    }

    resize_bar_mouse_input(event) {
        let rebars = this.get_resize_bars();
        if (event.type == "mousedown") {
            let cur = rebars.find(bar => is_position_of_element(event, bar));
            if (cur)
                cur.name = "down";
            return !cur;
        }
        if (event.type == "mouseup") {
            rebars.forEach(bar => bar.name = "up");
            return false;
        }
        if (event.type == "mousemove") {
            let cur = rebars.find(bar => bar.name && bar.name == "down");
            if (cur)
                this.resize_bar_drag(event, cur);
            return cur;
        }
        return false;
    }

    overlay_mouse_input(event) {
        let overlay = this.overlay_element;
        let inside = is_position_of_element(event, this.element);

        if (event.type == "dblclick") {
            if (!inside)
                return false;

            this.reset_view_boundary();
            this.remove_overlay();
            this.render();
            return true;
        }

        if (event.type == "mousedown") {
            if (!inside)
                return false;

            this.remove_tooltip();
            this.create_overlay();
            this.set_overlay_position(event, this.overlay_element, this.element);
            return true;
        }

        if (event.type == "mouseup") {
            if (!overlay)
                return false;

            this.set_view_from_overlay(this.overlay_element, this.element);
            this.remove_overlay();
            this.render();
            return true;
        }

        if (event.type == "mousemove") {
            if (!overlay)
                return false;

            this.set_overlay_position(event, this.overlay_element, this.element);
            return true;
        }

        return this.overlay_element;
    }

    export_view_range() {
        return this.export_range(this.get_view_row_range());
    }

    remove_tooltip() {
        let b = this.get_log_view_div();
        document.querySelectorAll(this.get_log_view_selector() + " #tooltip")
            .forEach(x=>b.removeChild(x));
        this.tooltip_element=undefined;
    }

    create_tooltip() {
        let b = this.get_log_view_div();
        let tooltip = document.createElement('div');
        b.insertAdjacentElement('beforeend', tooltip);
        tooltip.id = "tooltip";
        this.tooltip_element = tooltip;
        return tooltip;
    }

    remove_overlay() {
        let b = this.get_log_view_div();
        document.querySelectorAll(this.get_log_view_selector() + " #overlay")
            .forEach(x=>b.removeChild(x));
        this.overlay_element = undefined;
    }

    create_overlay() {
        let b = this.get_log_view_div();
        let overlay = document.createElement('div');
        b.insertAdjacentElement('beforeend', overlay);
        overlay.id = "overlay";
        this.overlay_element = overlay;
        return overlay;
    }

    set_view_from_overlay(overlay, elem) {
        let rel = get_element_relative_to_element(overlay, elem);
        let x_src_diff = rel.x2 - rel.x1;
        if (Math.abs(x_src_diff) > 0.01) {
            let x_diff = this.x_end - this.x_start;
            let x_start = x_diff * rel.x1 + this.x_start;
            let x_end = x_diff * x_src_diff + x_start;
            let vb = {x1:x_start,x2:x_end,y1:this.y_start,y2:this.y_end};
            this.set_view_boundary(vb);
        }
    }

    set_overlay_position(event, overlay, elem) {
        let rel = get_position_relative_to_element(event, elem);
        let start = overlay.mouse_start;
        if (!start) {
            let size = get_element_position(elem);
            overlay.mouse_start = rel;
            overlay.style.width = "0px";
            overlay.style.height = elem.clientHeight + "px";
            overlay.style.top = size.y + "px";
            overlay.style.left = event.clientX + "px";
            return;
        }

        let ml = start, mr = rel;
        if (ml.x > mr.x)
            [ml, mr] = [mr, ml];
        let l = ml.x * elem.clientWidth + elem.clientLeft;
        let w = (mr.x - ml.x) * elem.clientWidth;

        if (l + w < elem.clientLeft + elem.clientWidth && l > elem.clientLeft) {
            overlay.style.left = l + "px";
            overlay.style.width = w + "px";
        }
    }

    async cursor_info_mouse_input(event) {
        if (is_position_of_element(event, this.element))
            this.set_cursor_info(get_position_relative_to_element(event, this.element));
        else
            this.remove_cursor_info();
    }

    mouse_input(event) {
        let tt = this.tooltip_element;

        this.cursor_info_mouse_input(event);

        if (this.overlay_mouse_input(event))
            return;

        if (this.resize_bar_mouse_input(event))
            return;

        if (!is_position_of_element(event, this.element) || event.type == "mouseleave") {
            if (tt) {
                this.remove_tooltip();
            }
            return;
        }

        if (!tt)
            tt = this.create_tooltip();

        if (tt) {
            let rel = get_position_relative_to_element(event, this.element);
            //tt.style.left = (event.x + 10) + "px";
            //tt.style.top = event.y + "px";
            //tt.style.top = this.element.top;
            let off_h = this.get_shifted_relative({x:0,y:0}).y * this.element.clientHeight;
            let tt_w = 4;
            tt.style.height = (this.element.clientHeight - (off_h * 2)) + "px";
            tt.style.width = tt_w + "px";
            tt.style.left = (event.x - (tt_w*0.5)) + "px";
            tt.style.top = (this.element.clientTop + this.element.offsetTop + off_h) + "px";
            let block = this.get_view_nearest_block(rel, 0.05, true);
            if (!block) {
                this.remove_tooltip();
                return;
            }
            tt.style.backgroundColor = block.block.color;
            tt.innerHTML = `<div style="top: ${event.y}px; left: ${event.x + 10}px; background-color: ${block.block.color}"><p>${block.column.value.toFixed(2)}</p><p>${block.column.seconds.toFixed(2)}s</p><p>${block.block.name}</p></div>`;
        }        
    }

    get_linear_regression(block, indicies) {
        return this.log.get_mean(block, indicies);
    }

    get_quadratic_regression(block, indicies, coeff_count) {
        //let coeff_count = indicies.length;
        let point_count = indicies.length;
        let degree_count = coeff_count - 1;
        let matrix_a = create_matrix(point_count, coeff_count);
        let columns = this.log.get_columns(block, indicies);

        function index_matrix(matrix, r, c) {
            let index = r * matrix.length + c;
            let r_index = Math.floor(index / matrix.length);
            let c_index = Math.floor(index % matrix[0].length);
            return {r:r_index,c:c_index};
        }

        function set_matrix(matrix, r, c, value) {
            let index = index_matrix(matrix, r, c);
            matrix[index.r][index.c] = value;
        }

        function get_matrix(matrix, r, c) {
            let index = index_matrix(matrix, r, c);
            return matrix[index.r][index.c];
        }

        console.log(columns, matrix_a);

        for (let j = 0; j < point_count; j+=1) {
            for (let k = 0; k < coeff_count; k+=1) {
                matrix_a[j][k] = 0;
                for (let i = 0; i < point_count; i+=1) {
                    matrix_a[j][k]+=Math.pow(columns[i].seconds,j+k);
                }
            }
        }

        console.log(matrix_a);

        for (let j = 0; j < point_count; j+=1) {
            set_matrix(matrix_a, j, point_count - 1, 0);
            for (let i = 0; i < point_count; i+=1) {
                let r = Math.pow(columns[i].seconds,j-1);
                let index = index_matrix(matrix_a, j, point_count);
                console.log(index);
                let v = matrix_a[index.r][index.c];
                matrix_a[index.r][index.c] = v + columns[i].value * r;
            }
        }

        console.log(matrix_a);

        for (let k = 0; k < point_count; k+=1) {
            for (let i = 0; i < point_count; i+=1) {
                if (i != k) {
                    let u = get_matrix(matrix_a, i, k)/get_matrix(matrix_a, k, k);
                    for (let j = k; j < point_count; j+=1) {
                        let v = get_matrix(matrix_a, i, j);
                        v = v - u * get_matrix(matrix_a, k, j);
                        set_matrix(matrix_a, i, j, v);
                    }
                }
            }
        }

        console.log(matrix_a);
        
        let a = Array(point_count).fill(0);

        for (let i = 0; i < point_count; i+=1) {
            let v1 = get_matrix(matrix_a, i, point_count);
            let v2 = get_matrix(matrix_a, i, i);
            a[i] = v1/v2;
        }

        return a;
    }
};

class Engine {
    name="2.0T FSI";
    code="BPY";
    family="EA113";
    cylinder_count=4;
    displacement=1984;
    bore=82.5;
    stroke=92.8;
    compression_ratio=10.5;

    get_property_string(prop) {
        return {
            name:"Name",
            code:"Code",
            family:"Family",
            cylinder_count:"Cylinder Count",
            displacement:"Displacement (ml)",
            bore:"Bore (mm)",
            stroke:"Stroke (mm)",
            compression_ratio:"Compression Ratio",
        }[prop];
    }

    get_cylinder_volume() {
        return this.stroke * Math.PI * Math.pow(this.bore / 2, 2) * 0.001;
    }

    get_engine_string() {
        let strs = [];
        if (this.family)
            strs.push(this.family);
        if (this.code)
            strs.push(this.code);
        if (this.name)
            strs.push(this.name);
        if (!strs.length)
            return "Untitled Engine";
        return strs.join(' ');
    }
};

class VCDS {
    get_element(name) {
        return document.getElementById(name);
    }

    events = [
        ['log_load', 'input', this.log_load_input],
        ['define_engine', 'click', this.define_engine_input],
        ['clear_engine', 'click', this.clear_engine_input],
        ['save_engine', 'click', this.save_engine_input],
        ['load_engine', 'input', this.load_engine_input],
        ['engine_info', 'input', this.engine_info_input],
        //['log_body', 'mousemove', this.mouse_input],
        //['log_body', 'mousedown', this.mouse_input],
        //['log_body', 'mouseup', this.mouse_input],
        //['log_body', 'dblclick', this.mouse_input],
    ];

    logs = [];
    engine = undefined;

    constructor() {
        this.events.forEach(function(event) {
            this.get_element(event[0]).addEventListener(event[1], event[2].bind(this));
        }.bind(this));
        this.log_load_input();
        this.load_engine_local();
        this.set_ui();
    }

    held = false;
    current_canvas = undefined;
    current_log = undefined;
    canvas_overlay = undefined;
    mouse_start = undefined;

    set_engine_info(engine) {
        //let de = document.getElementById('define_engine');
        //let ei = document.getElementById('engine_info');
        if (!engine) {
            //document.getElementById('define_engine').style.display = "block";
            //doc
            define_engine.style.display = "block";
            engine_info.style.display = "none";
            engine_data_opts.style.display = "none";
            return;
        }

        define_engine.style.display = "none";
        engine_info.style.display = "block";
        engine_data_opts.style.display = "flex";

        let str = "";

        for (const [key, value] of Object.entries(engine)) {
            let div = "<div>";
            div += `<p>${engine.get_property_string(key)}</p><input type="text" key="${key}" value="${value}" />`;
            div += "</div>";
            str += div;
        }

        engine_input.innerHTML = str;

        this.set_engine_calculations(engine_calc, engine);
    }

    async set_engine_calculations(engine_calc_div, engine) {
        let str = "<div id='engine_calc'>";
        str += `<p>Cylinder Volume (ml): ${engine.get_cylinder_volume()}</p>`;
        str += "</div>";
        engine_calc_div.innerHTML = str;
    }

    set_ui() {
        this.set_engine_info(this.engine);
    }

    async define_engine_input(event) {
        this.engine = new Engine();
        this.save_engine_local();
        this.set_ui();
    }

    async clear_engine_input(event) {
        this.engine = undefined;
        this.save_engine_local();
        this.set_ui();
    }

    async engine_info_modified() {
        this.logs.forEach(p => this.set_log_engine_html(p));
        this.set_engine_calculations(engine_calc, this.engine);
    }

    async engine_info_input(event) {
        if (!this.engine)
            return;
        let elems = document.querySelectorAll('#engine_input input');
        elems.forEach(function (elem) {
            this.engine[elem.getAttribute('key')] = elem.value;
        }.bind(this));
        this.save_engine_local();
        this.engine_info_modified();
    }

    async save_file(filename, data, dialog=false, mime_type="application/json") {
        let blob = undefined;
        if (mime_type == "application/json")
            blob = new Blob([JSON.stringify(data, null, 2)], {type:mime_type});
        else
            blob = new Blob([data], {type:mime_type});
        const elem = window.document.createElement('a');
        elem.href = window.URL.createObjectURL(blob);
        elem.download = filename;
        if (dialog) {
            window.open(elem.href);
        } else {
            document.body.appendChild(elem);
            elem.click();
            document.body.removeChild(elem);
        }

    }

    async load_object(event, proto) {
        let e = event.target;

        if (!e || !e.files || !e.files.length)
            return;

        let form = e.files[0];
        let reader = new FileReader();
        let obj = undefined;

        reader.onload = function(e) {
            obj = Object.assign(proto, JSON.parse(reader.result));
        };

        reader.readAsText(form);

        return obj;
    }

    async save_local(prop, obj) {
        if (obj)
            localStorage.setItem(prop, JSON.stringify(obj));
        else
            localStorage.setItem(prop, null);
    }

    load_local(prop, proto) {
        const data = localStorage.getItem(prop);

        if (!data)
            return new proto.constructor();

        let obj = Object.assign(proto, JSON.parse(data));

        return obj;
    }

    async save_engine_input(event) {
        if (!this.engine)
            return;
        this.save_file(`${this.engine.get_engine_string()}.json`, this.engine);
    }

    async load_engine_input(event) {
        this.engine = await this.load_object(event, Engine.prototype);
        this.save_engine_local();
        this.set_ui();
    }

    load_engine_local() {
        this.engine = this.load_local('engine', Engine.prototype);
    }

    async save_engine_local() {
        this.save_local('engine', this.engine);
    }

    clear_overlay() {
        this.held = false;
        //let e = document.getElementById('canvas_overlay');
        //if (e)
        //    document.body.removeChild(e);
        document.querySelectorAll('#canvas_overlay').forEach(x=>document.body.removeChild(x));
        this.current_canvas = undefined;
        this.current_log = undefined;
        this.canvas_overlay = undefined;
        this.mouse_start = undefined;
    }

    get_hovering_log(event) {
        return this.logs.find(log => is_position_of_element(event, log.element));
    }

    mouse_input(event) {
        if (event.type == "dblclick") {
            let e = this.get_hovering_log(event);
            if (e) {
                let cl = e;
                this.held = false;
                let vb = {x1:0,x2:1,y1:0,y2:1};
                cl.set_view_boundary(vb);
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
            let cc = this.current_canvas = e.element;
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
            let p = cl;
            let x_src_diff = rel.x2 - rel.x1;
            if (Math.abs(x_src_diff) > 0.01) {
                let x_start = p.x_start;
                let x_end = p.x_end;
                let x_diff = x_end - x_start;
                x_start = x_diff * rel.x1 + x_start;
                x_end = x_diff * x_src_diff + x_start;
                let vb = {x1:x_start,x2:x_end,y1:p.y_start,y2:p.y_end};
                p.set_view_boundary(vb);
            }
            this.render_log(cl);
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
            //console.log(l+w, cc.clientLeft+cc.clientWidth, l, cc.clientLeft);
            if (l + w < cc.clientLeft+cc.clientWidth && l > cc.clientLeft) {
                co.style.left = `${l}px`;
                co.style.minWidth = `${w}px`;
            }
        }
    }

    render_log(p) {
        p.render();
    }

    get_log_block_identifier(p, block) {
        return `B${p.log.name}${block.stub}`;
    }

    get_log_buttons_html(p) {
        let str = "";

        str += "<div id='log_view_buttons_div'>";
        {
            p.log.blocks.forEach(function(block) {
                let iden = this.get_log_block_identifier(p, block);
                //this.set_css_style(`.${iden}`, 'background-color', block.color);
                str += `<div class="${iden}">`;
                str += `<input id="inline" class="${block.stub}" name="${p.log.name}" type="checkbox" onclick="vcds.log_block_toggle_click(this)" checked /><div>`;
                str += `<p id="inline">${block.name}</p>`;
                str += `<p>${block.min} - ${block.max} (${block.range.toFixed(2)}) ${block.min_time} - ${block.max_time}</p>`;
                str += `</div></div>`;
            }.bind(this));
        }
        str += "</div>";

        return str;
    }

    get_log_table_html(p) {
        let log = p.log;
        let table = "<table>";
        {
            table += "<thead></tr><th><div id='vertical'><p>Seconds</p></div></th>";
            log.blocks.forEach(function(block) {
                let iden = p.get_block_identifier(block);
                table += `<th class="${iden}"><div id='header_flex'><div id='header'><p>${block.name}</p></div></div></th>`;
            }.bind(this));
            table += "</tr></thead><tbody>";

            //table += p.get_table_entries_html();
        }
        table += "</tbody></table>";

        return table;
    }

    get_log_header_html(p) {
        let log = p.log;
        let str = `<div id='log_view_header_div'>`;
        str += `<a id='log_toggle' name='${log.name}' onclick='vcds.log_toggle_click(this)'>-</a>`;
        str += `<p>${log.filename}</p>`;
        str += `<a id='log_close' name='${log.name}' onclick='vcds.log_close_click(this)'>X</a>`;
        str += `</div>`;
        return str;
    }

    get_log_engine_html(p, engine) {
        if (!engine)
            return '';
        let str = '';
        str += `<p>${engine.name}</p>`;
        return str;
    }

    get_log_engine_div_html(p, engine) {
        let str = `<div id='log_view_engine'>`;
        str += this.get_log_engine_html(p, engine);
        str += '</div>';
        return str;
    }

    async set_log_engine_html(p, engine) {
        let e = p.get_log_engine_div();

        e.innerHTML = this.get_log_engine_html(p, engine);
        e.style.display = this.engine ? '' : 'display:none';
    }

    set_log(p) {
        let div = p.get_log_view_div();

        this.set_log_engine_html(p);
    }

    add_log(log) {
        let body = this.get_element('log_body');
        let e = document.createElement('div');
        let p = {log};

        e.setAttribute('id', 'log_view_div');
        e.setAttribute('name', log.name);

        e.innerHTML = "";

        let canvas_div = "<div id='log_view_canvas_container'>";
        canvas_div += `<div id='log_view_canvas_all_div'><div id='log_view_canvas_div'><canvas id='log_view_canvas' width=800 height=800></canvas></div><div id='canvas_info'></div></div><div class='vertical_resize_bar resize_bar' id='canvas_buttons_resize_bar'></div>`;
        canvas_div += this.get_log_buttons_html(p);
        canvas_div += "</div><div class='horizontal_resize_bar resize_bar' id='canvas_table_resize_bar'></div><div id='log_view_container_div'></div><div id='log_view_engine'></div>";

        e.innerHTML += this.get_log_header_html(p);
        e.innerHTML += canvas_div;

        body.insertBefore(e, this.get_element('log_load_div'));
        
        let canvas_element = document.querySelector(`div#log_view_div[name='${log.name}'] canvas`);

        let params = new Parameters(log, canvas_element);
        this.logs.push(params);

        params.get_log_engine_div().innerHTML = this.get_log_engine_html(params, this.engine);
        params.get_log_view_container_div().innerHTML = this.get_log_table_html(params);
        //params.get_log_table_body().innerHTML = 

        let lce = params.get_log_view_div();

        let add_mouse_events = function(elem, func) {
            ['mouseenter', 'mouseleave', 'mousedown', 'mouseup', 'mousemove', 'dblclick'].forEach(
                event => elem.addEventListener(event, func)
            );            
        };

        add_mouse_events(lce, params.mouse_input.bind(params));

        params.set_styles();
        this.set_log(params);

        this.render_log(params);
    }

    log_close_click(event) {
        this.get_element('log_body').removeChild(event.parentElement.parentElement);
    }

    log_toggle_click(event) {
        //let e = event.parentElement.getElementById('log_view_container_div');
        let name = event.getAttribute('name');
        let q = `div#log_view_div[name='${name}']`
        let e1 = document.querySelector(q + ' div#log_view_container_div');
        let e2 = document.querySelector(q + ' div#log_view_canvas_div');
        let e3 = document.querySelector(q + ' div#log_view_canvas_container');
        let e4 = document.querySelector(q + ' div#log_view_canvas_all_div');

        if (event.innerText.includes('-')) {
            e1.style.setProperty('display', 'none');
            //e2.style.setProperty('resize', 'horizontal');
            //e3.style.setProperty('max-height', '10vh');
            //this.set_css_style('.log_view_height_limit', 'max-height', '10vh');
            //e3.style.maxHeight = "10vh";
            e3.className = "log_view_height_limit";
            event.innerText = '+';
        } else {
            e1.style.setProperty('display', "");
            //e2.style.setProperty('resize', 'both');
            //e3.style.setProperty('max-height', "");
            //this.set_css_style('.log_view_height_limit', 'max-height', 'fit-content');
            //e3.style.maxHeight = "fit-content";
            e3.className = "";
            event.innerText = '-';
        }
    }

    get_parameters(event) {
        if (!event.name)
            return;
        return this.logs.find(log => event.name == log.log.name);
    }

    get_log(event) {
        if (!event.name)
            return;
        return this.get_parameters(event).log;
    }

    get_block_stub(event) {
        return event.target.class;
    }

    log_block_toggle_click(event) {
        let log = this.get_parameters(event);
        //console.log(event, log);
        let block = log.log.get_block(event.className);
        if (!block)
            return;
        block.visible = !block.visible;
        log.modified = true;
        this.render_log(log);
    }

    log_load_input(event) {
        //console.log('log_load_input', this, event);

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

    async log_export_range_input(event) {
        let p = this.get_parameters(event);
        let r = p.get_view_row_range();

        this.save_file(`${p.log.filename} range ${r.start} to ${r.end}.csv`, p.export_view_range(), false, 'text/csv');
    }
};

let vcds = new VCDS();