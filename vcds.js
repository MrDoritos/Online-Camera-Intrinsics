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

    seconds_min = 0;
    seconds_max = 0;

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
                field:b[i+1]
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

        rs.slice(7).forEach(function(r) {
            let row = {};

            row.marker = Number(r[0]);
            row.seconds = Number(r[1]);
            row.columns = {};

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
            }

            this.seconds_max = row.seconds;
            this.rows.push(row);
        }.bind(this));
    }
};

class VCDS {
    get_element(name) {
        return document.getElementById(name);
    }

    events = [
        ['log_load', 'input', this.log_load_input],
    ];

    logs = {};

    constructor() {
        this.events.forEach(function(event) {
            this.get_element(event[0]).addEventListener(event[1], event[2].bind(this));
        }.bind(this));
        this.log_load_input();
    }

    render_log(log, element) {
        let ctx = element.getContext('2d');
        let rect = element.getBoundingClientRect();

        let delta_time = log.seconds_max - log.seconds_min;
    
        element.width = log.rows.length;

        let line_width = element.width / rect.width * 5;

        ctx.lineWidth = `${line_width}px`;

        let border_radius = line_width;

        let width = element.width - border_radius * 2;
        let height = element.height - border_radius * 2;

        console.log(element, ctx, rect, line_width);

        for (let i = 0; i < log.blocks.length; i++) {
            let block = log.blocks[i];
            let delta_value = block.max - block.min;
            let x = 0;
            let y = 0;

            ctx.strokeStyle = block.color;

            ctx.beginPath();

            ctx.moveTo(x, height - ((log.rows[0].columns[block.stub].value - block.min) / delta_value) * height - border_radius);

            log.rows.forEach(function(row) {
                let column = row.columns[block.stub];

                x = (column.seconds - log.seconds_min) / delta_time;
                y = (column.value - block.min) / delta_value;

                ctx.lineTo(x * width + border_radius, height - (y * height - border_radius));

                //ctx.closePath();
            }.bind(this));

            ctx.stroke();
        }

        log.rows.forEach(function(row) {
            for (const [k, v] of Object.entries(row.columns)) {

            }
        }.bind(this));
    }

    add_log(log) {
        this.logs[log.name] = log;

        let body = this.get_element('log_body');

        let e = document.createElement('div');
        e.setAttribute('id', 'log_view_div');
        e.setAttribute('name', log.name);

        e.innerHTML = "";

        let table = "<div id='log_view_canvas_div'><canvas id='log_view_canvas' width=800 height=800></canvas></div><div id='log_view_container_div'><table>";
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
        this.render_log(log, document.querySelector(`div#log_view_div[name='${log.name}'] canvas#log_view_canvas`));
    }

    log_close_click(event) {
        this.get_element('log_body').removeChild(event.parentElement.parentElement);
    }

    log_toggle_click(event) {
        //let e = event.parentElement.getElementById('log_view_container_div');
        let name = event.getAttribute('name');
        let e = document.querySelector(`div#log_view_div[name='${name}'] div#log_view_container_div`);
        if (event.innerText.includes('-')) {
            e.style.setProperty('display', 'none');
            event.innerText = '+';
        } else {
            e.style.setProperty('display', "");
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