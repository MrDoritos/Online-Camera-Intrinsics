function uuidv4() {
    return "10000000100040008000100000000000".replace(/[018]/g, c =>
      (+c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> +c / 4).toString(16)
    );
}  

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
        this.name = uuidv4();

        if (!text || !text.length)
            return;

        this.text = text;
        this.csv = CSV.parseCSV(text);
        this.parse();
    }

    get_block(stub) {
        return this.blocks.find(block => block.stub == stub);
    }

    get_blocks_by_depth() {
        return this.blocks.toSorted((a,b) => a.depth < b.depth);
    }

    get_row_index_by_seconds_via_approximation(time) {
        let ss = this.rows.length / this.seconds_range;
        let ai = (time - this.seconds_min) * ss;
        let ss2 = ss * 0.5;
    
        let min_time = Math.abs(time - this.rows[0].seconds);
        let min_index = 0;

        for (let i = 0; i < this.rows.length; i++) {
            let si = (i >> 1) * ((i & 1) ? 1 : -1) + ai;
            if (Math.abs(time - this.rows[si].seconds) < min_time) {
                min_time = Math.abs(time - this.rows[si].seconds);
                min_index = si;
                if (min_time < ss2)
                    break;
            }
        }
        return min_index;
    }

    get_row_index_by_seconds_via_binary_search_r(time, start=0,end=-1,depth=0) {
        if (end == -1) {
            end = this.rows.length;
        }

        const range = end-start;
        const mid = start+Math.floor(range*.5);
        const midRow = this.rows[mid];

        if (depth > 30)
            throw "bad";

        if (range < 2) {
            //console.log('index', start);
            return start;
        }

        if (midRow.seconds < time) {
            //console.log('upper', 'time', time, 'start', start, 'mid', mid, 'end', end, 'range', range);
            return this.get_row_index_by_seconds_via_binary_search_r(time, mid, end, depth+1);
        } else {
            //console.log('lower', 'time', time, 'start', start, 'mid', mid, 'end', end, 'range', range);
            return this.get_row_index_by_seconds_via_binary_search_r(time, start, mid, depth+1);
        }
    }

    get_row_index_by_seconds_via_binary_search(time) {
        const index = this.get_row_index_by_seconds_via_binary_search_r(time);
        //if (index < 1 || index + 2 > this.rows.length)
        //    return index;
        let search_min = index-1, search_max = index+2;
        if (index < 1) {
            search_min = 0;
            search_max = 3;
        } else
        if (index + 2 > this.rows.length) {
            search_min = this.rows.length - 3;
            search_max = this.rows.length;
        }

        let min_time = time - this.rows[search_min].seconds;
        let min_index = search_min;
        for (let i = search_min; i < search_max; i++) {
            const t = time - this.rows[i].seconds;
            if (t < min_time && t >= 0) {
                min_time = t;
                min_index = i;
            }
        }

        return min_index;
    }

    get_row_index_by_seconds(time) {
        let min_time = time - this.rows[0].seconds;
        let min_index = 0;
        for (let i = 0; i < this.rows.length; i++) {
            //let t = Math.abs(time - this.rows[i].seconds);
            const t = time - this.rows[i].seconds;
            if (t < min_time && t >= 0) {
                min_time = t;
                min_index = i;
            }
        }
        return min_index;
    }

    get_row_index_by_block_seconds(time, block) {
        let min_time = time - this.rows[0].columns[block.stub].seconds;
        let min_index = 0;
        for (let i = 0; i < this.rows.length; i++) {
            let t = time - this.rows[i].columns[block.stub].seconds;
            if (t < min_time && t >= 0) {
                min_time = t;
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
        //let t1 = this.rows[a+1], t2 = this.rows[a-1];
        //if (Math.abs(t1.seconds - a1.seconds) < Math.abs(t2.seconds - a1.seconds))
        if (time - a1.seconds >= 0)
            return [a, a+1];
        return [a-1, a];
    }

    get_two_rows_indicies_by_block_seconds(time, block) {
        let a = this.get_row_index_by_block_seconds(time, block);
        if (a < 1) return [0, 1];
        if (a > this.rows.length - 2) return [this.rows.length-2,this.rows.length-1];

        let a1 = this.rows[a];
        //let t1 = this.rows[a+1], t2 = this.rows[a-1];
        //if (Math.abs(t1.columns[block.stub].seconds - a1.columns[block.stub].seconds) < Math.abs(t2.columns[block.stub].seconds - a1.seconds))
        if (time - a1.columns[block.stub].seconds >= 0)
            return [a, a+1];
        return [a-1, a];
    }

    get_two_rows_by_seconds(time) {
        let ix = this.get_two_rows_indicies_by_seconds(time);
        return [this.rows[ix[0]], this.rows[ix[1]]];
    }

    get_two_rows_by_block_seconds(time, block) {
        let ix = this.get_two_rows_indicies_by_block_seconds(time, block);
        return [this.rows[ix[0]], this.rows[ix[1]]];
    }

    get_linear_interpolated_block(block1, block2, factor=0.5) {
        return {
            value: lerp(block1.value, block2.value, factor),
            seconds: lerp(block1.seconds, block2.seconds, factor),
        };
    }

    get_linear_interpolated_block_by_seconds(time, block) {
        let ix = this.get_two_rows_indicies_by_block_seconds(time, block);
        let b1 = this.rows[ix[0]].columns[block.stub];
        let b2 = this.rows[ix[1]].columns[block.stub];
        let factor = (time - b1.seconds) / (b2.seconds - b1.seconds);
        return this.get_linear_interpolated_block(
            b1,
            b2,
            factor
        );
    }

    get_linear_interpolated_row_by_seconds(time) {
        let ix = this.get_two_rows_indicies_by_seconds(time);
        let r1 = this.rows[ix[0]];
        let r2 = this.rows[ix[1]];

        let row_factor = (time - r1.seconds) / (r2.seconds - r1.seconds);
        let seconds = lerp(r1.seconds, r2.seconds, row_factor);

        let columns = {};
        for (let i = 0; i < this.blocks.length; i+=1) {
            columns[this.blocks[i].stub] =
                this.get_linear_interpolated_block_by_seconds(seconds, this.blocks[i]);
            //let stub = this.blocks[i].stub;
            //let b1 = r1.columns[stub], b2 = r2.columns[stub];
            //let block_factor = (time - b1.seconds) / (b2.seconds - b1.seconds);
            //columns[this.blocks[i].stub] = this.get_linear_interpolated_block(b1, b2, block_factor);
        }

        return {
            columns,
            marker:0,
            seconds,
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

    fix_unit(block, unit) {
        if (unit.includes("BTDC"))
            return "\u00B0BTDC";
        if (unit.includes("KW"))
            return "\u00B0KW";

        return unit;
    }

    fix_block(block) {
        block.unit = this.fix_unit(block, block.unit);

        return block;
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
        let r2 = rs[3];
        let r3 = rs[4];
        let r4 = rs[5];

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
            this.fix_block(block);
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

class SensaGramLog extends Log {
    constructor(filename, text=undefined, interpolate=true, maxSampleCount=-1,multithreaded=true) {
        super(filename, undefined);

        this.interpolate = interpolate;
        this.maxSampleCount = maxSampleCount;
        this.multithreaded = multithreaded;

        if (!text || !text.length)
            return;

        this.parse(text);
    }

    async parseText(text, interpolate=true, maxSampleCount=-1, multithreaded=true, threadCount=8) {
        this.text = text;
        this.interpolate = interpolate;
        this.maxSampleCount = maxSampleCount;
        this.multithreaded = multithreaded;
        this.threadCount = threadCount;
        
        await this.parse();
    }

    async parse() {
        const s_sg = 'SensaGram';

        this.header = {
            build: '0',
            data_version: '0',
            day: '0',
            log_type: s_sg,
            month: '0',
            version: '0',
            weekday: '0',
            year: '0',
        };

        this.module = {
            part_number: s_sg,
            part_name: s_sg,
        };

        //const text = text;
        //this.text = text;
        const text = this.text, length = this.text.length;
        
        let objs = [];
        let token_start = 0;

        //console.log('split by entry');
        for (let i = 0; i < length; i++) {
            const c = text[i];
            
            if (c == '{') {
                token_start = i;
                continue;
            }

            if (c == '}') {
                objs.push(text.slice(token_start, i+1));
                continue;
            }
        }

        let jobjs = [];

        let step = 1;
        if (this.maxRowCount > 0 && this.maxRowCount < objs.length) {
            step = Math.floor(objs.length / this.maxRowCount);
        }
        this.step = step;

        const thread_count = this.threadCount ?? 8;
        const entry_count = objs.length;
        const tasks_per_worker = Math.floor(entry_count / thread_count);

        if (this.multithreaded) {
            let workers = [];
            await new Promise(resolve => setTimeout(resolve, 1));
            for (let i = 0; i < thread_count; i++) {
                const start = i * tasks_per_worker;
                let end = start + tasks_per_worker;
                if (i == thread_count-1)
                    end = entry_count;
                workers.push(new Promise((resolve) => {
                    let resolved = [];
                    for (let j = start; j < end; j++) {
                        resolved.push(JSON.parse(objs[j]));
                    }
                    resolve(resolved);
                }));
            }

            await Promise.all(workers).then((resolved) => {
                resolved.map(x => jobjs = jobjs.concat(x));
            });
        } else {
            for (let i = 0; i < entry_count; i+=step) {
                jobjs.push(JSON.parse(objs[i]));
            }
        }

        const time_scale = 0.000000001; //nanoseconds
        let rows = [], blocksRaw = {}, fmt = {}, block_count = 0, time_start = 0;
        //this.fmt = fmt;

        const getTimestamp = (field) => {
            return field.timestamp ?? field.elapsedRealtimeNanos;
        };

        const toSeconds = (time, magnitude=time_scale) => {
            return time * magnitude;
        };

        const getFmtSec = (fmt) => {
            return toSeconds(getTimestamp(fmt)-time_start);
        };

        const nameOf = (key) => {
            const names = {
                "android.sensor.accelerometer": 'Accelerometer',
                "android.sensor.gyroscope": "Gyroscope",
                "android.gps": "GPS",
            };

            return names[key] ?? key;
        };

        const nameOfField = (key) => {
            const fields = {
                "android.sensor.accelerometer": ['X', 'Y', 'Z'],
                "android.sensor.gyroscope": ['X', 'Y', 'Z'],
            };

            return fields[key];
        };

        const unitOf = (key) => {
            const G = 'G';
            const degrees = '\u00B0';
            const percent = '%';
            const MPS = 'm/s';
            const MPS2 = 'm/s²';
            const RPS = 'rad/s';
            const units = {
                "android.sensor.accelerometer": MPS2,
                "android.sensor.gyroscope": RPS,
                "longitude": degrees,
                "latitude": degrees,
                "bearing": degrees,
                "accuracy": percent,
                "speed": MPS,
                "speedAccuracyMetersPerSecond": MPS,
                "bearingAccuracyDegrees": degrees,
            };

            return units[key] ?? '';
        };

        const stubOf = (group_num, field_num) => {
            const group_stub = 'G' + String(group_num).padStart(3, '0');
            const field_stub = `F${field_num}`;
            return group_stub + field_stub;
        };

        const createBlock = (group_num, field_num, group_key, field_key) => {
            const fieldOrGroup = field_key ?? group_key;
            const depth = block_count++;
            const color = this.colors[depth];
            const combined_name = `Group ${group_num} - Field ${field_num}`;
            const group_stub = 'G' + String(group_num).padStart(3, '0');
            const field_stub = `F${field_num}`;
            const stub = group_stub + field_stub;
            const groupname = nameOf(group_key);
            const fieldnames = nameOfField(group_key);
            const fieldname = (fieldnames && fieldnames.length > field_num) ? fieldnames[field_num] : field_key;
            const name = `${groupname} - ${fieldname}`;
            const unit = unitOf(fieldOrGroup);

            if (!blocksRaw[group_num][field_num]) {
                blocksRaw[group_num][field_num] = {
                    color,
                    combined_name,
                    depth,
                    field:field_stub,
                    field_num,
                    field_key,
                    group:group_stub,
                    group_num,
                    group_key,
                    max:undefined,
                    max_time:undefined,
                    min:undefined,
                    min_time:undefined,
                    name,
                    range:0,
                    range_inv:0,
                    stub,
                    unit,
                    visible:true,
                };
            }
        };

        //console.log('parse javascript');
        for (const entry of jobjs) {
            const key = entry.type;

            if (!fmt[key])
                fmt[key] = [];
                
            fmt[key].push(entry);

            const seconds = getTimestamp(entry);

            if (time_start == undefined)
                time_start = seconds;
            else
            if (time_start > seconds)
                time_start = seconds;
        }

        let time_end = time_start;
        const fmtVals = Object.values(fmt);
        const fmtLength = fmtVals.length;

        let maxRowCount = 0;

        //console.log('get max row count');
        for (let i = 0; i < fmtLength; i++) {
            const rowCount = fmtVals[i].length;
            if (rowCount > maxRowCount)
                maxRowCount = rowCount;
        }

        //console.log('filter complete');
        const wMaxRows = fmtVals.filter(x => x.length == maxRowCount);
        //console.log('filter sparse');
        const nMaxRows = Object.entries(fmt).filter(v => v[1].length != maxRowCount);

        //this.wMaxRows = wMaxRows;
        //this.nMaxRows = nMaxRows;

        //console.log('fill rows');
        for (let i = 0; i < maxRowCount; i++) {
            const min = wMaxRows.reduce((acculumator,current) => 
                Math.min(acculumator, getTimestamp(current[i])),
                getTimestamp(wMaxRows[0][i])
            );
            const seconds = toSeconds(min-time_start);
            rows.push({marker:0,seconds:seconds,columns:{}});
        }
        this.rows = rows;

        const blockMinMax = (block, value, seconds) => {
            if (block.max == undefined || block.max < value) {
                block.max = value;
                block.max_time = seconds;
            }
            if (block.min == undefined || block.min > value) {
                block.min = value;
                block.min_time = seconds;
            }
        };

        const blockProc = (group_num, field_num, group_key, field_key, value, seconds, curCol) => {
            if (!blocksRaw[group_num][field_num])
                createBlock(group_num, field_num, group_key, field_key);
            const block = blocksRaw[group_num][field_num];
            blockMinMax(block, value, seconds);
            curCol[block.stub] = {
                value,
                seconds,
            };
        };

        //console.log('fill data');
        for (let group = 0; group < fmtLength; group++) {
            const column = fmtVals[group];
            blocksRaw[group] = {};

            for (let j = 0; j < column.length; j++) {
                const block = column[j];
                const slug = block.type;
                const timestamp = block.timestamp ?? block.elapsedRealtimeNanos;
                const seconds = toSeconds(timestamp - time_start);
                const curRow = this.rows[this.get_row_index_by_seconds_via_binary_search(seconds)];
                const curCol = curRow.columns;

                if (timestamp > time_end)
                    time_end = timestamp;

                if (values) {
                    const values = block.values;
                    for (let h = 0; h < values.length; h++) {
                        const field = h;
                        const value = values[field];

                        blockProc(group, field, slug, slug, value, seconds, curCol);
                    }
                }

                if (slug == "android.gps") {
                    const field_slugs = [
                        'latitude', 'longitude', 'altitude', 'bearing', 'accuracy', 'speed'
                    ];

                    for (let h = 0; h < field_slugs.length; h++) {
                        const field = h;
                        const field_slug = field_slugs[field];
                        const value = block[field_slug];

                        blockProc(group, field, slug, field_slug, value, seconds, curCol);
                    }
                }
            }
        }

        this.rows = rows;
        this.markers = [];
        //this.blocksRaw = blocksRaw;
        this.blocks = [];

        //console.log('realize blocks');
        for (const group of Object.values(blocksRaw)) {
            for (const block of Object.values(group)) {
                block.range = block.max - block.min;
                block.range_inv = 1.0 / block.range;
                this.blocks.push(block);
            }
        }

        //console.log('fill sparse blocks');
        if (this.interpolate) {
            for (const group of nMaxRows) {
                let groupIndex = 0;
                const group_key = group[0];
                const columns = group[1];
                const groupMaxCount = columns.length;
                const fmtSrc = fmt[group_key];
                const stubs = this.blocks.filter(x => x.group_key == group_key);
                for (let i = 0; i < maxRowCount; i++) {
                    const row = rows[i];
                    const seconds = row.seconds;
                    const groupCur = fmtSrc[groupIndex]; 
                    const groupSec = getFmtSec(groupCur);
                    const groupPrev = groupIndex > 0 ? groupIndex-1 : undefined;
                    const groupNext = groupIndex + 2 < groupMaxCount ? groupIndex+1 : undefined;
                    for (const block of stubs) {
                        const field_key = block.field_key;
                        const value = fmtSrc[groupIndex][field_key];
                        if (groupPrev == undefined || groupNext == undefined) {
                            row.columns[block.stub] = {
                                seconds,
                                value,
                            };
                            continue;
                        }
                        const fmtPrev = fmtSrc[groupPrev], fmtNext = fmtSrc[groupNext];
                        const fmtPrevS = getFmtSec(fmtPrev), fmtNextS = getFmtSec(fmtNext);
                        let srcA = undefined, srcB = undefined;
                        if (seconds - fmtPrevS >= 0) {
                            srcA = fmtPrev;
                            srcB = fmtSrc[groupIndex];
                        } else {
                            srcA = fmtSrc[groupIndex];
                            srcB = fmtNext;
                        }

                        const factor = (seconds - getFmtSec(srcA)) / (getFmtSec(srcB) - getFmtSec(srcA));

                        row.columns[block.stub] = {
                            seconds,
                            value:lerp(srcA[field_key], srcB[field_key], factor),
                        };
                    }
                    if (groupIndex + 1 < groupMaxCount && seconds > groupSec) {
                        groupIndex++;
                        //console.log('increment groupIndex', groupIndex);
                        //console.log('groupPrev', groupPrev, 'groupNext', groupNext);
                        //console.log('seconds', seconds, 'groupSecs', groupSec);
                        //console.log('fmt[groupIndex]', fmtSrc[groupIndex]);
                    }
                }
            }
        }

        this.seconds_min = toSeconds(time_start - time_start);
        this.seconds_max = toSeconds(time_end - time_start);
        this.seconds_range = this.seconds_max - this.seconds_min;
        //console.log('complete');
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
        x: rect.left,// + window.scrollX,
        y: rect.top,// + window.scrollY,
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

function get_element_corners(elem) {
    let pos = get_element_position(elem);
    return {
        x1:pos.x,
        x2:pos.x + pos.width,
        y1:pos.y,
        y2:pos.y + pos.height,
    };
}

function is_element_overlap_element(a, b) {
    let corners_a = get_element_corners(a);
    let corners_b = get_element_corners(b);
    return (
        corners_a.x2 >= corners_b.x1 &&
        corners_a.x1 <= corners_b.x2 &&
        corners_a.y2 >= corners_b.y1 &&
        corners_a.y1 <= corners_b.y2
    );
}

function create_matrix(rows, columns) {
    return Array(rows).fill(0).map(x => Array(columns).fill(0));
}

class OptionAbstract {
    create(){}
    update(element){}
    remove(element){}
    set_readonly(element,readonly=true){}
    get_value(element){}
    set_value(element,value){}
};

class OptionElement extends OptionAbstract {
    constructor(element_type, input_type, id, text) {
        super();
        this.type = element_type;
        this.input_type = input_type;
        this.id = id;
        this.text = text;
    }

    type;
    id;
    text;
    input_type;

    is_bool() {
        return this.input_type && this.input_type == 'checkbox';
    }

    get_number_types() {
        return ['range', 'number'];
    }

    is_num() {
        return this.input_type && this.input_type in this.get_number_types();
    }

    is_int() {
        return this.is_num();
    }

    is_float() {
        return this.is_num();
    }

    create() {
        return document.createElement(this.type);
    }

    remove(element) {
        if (element.parentElement)
            element.parentElement.removeChild(element);
        else
            document.removeChild(element);
    }

    set_readonly(element, readonly=true) {
        element.readOnly = readonly;
        element.disabled = readonly;
    }

    get_value_loc() {
        if (this.input_type == 'checkbox')
            return 'checked';
        return 'value';
    }

    set_value(element, value) {
        element[this.get_value_loc()] = value;
    }

    get_raw_value(element) {
        return element[this.get_value_loc()];
    }

    get_value(element) {
        let raw = this.get_raw_value(element);

        if (this.is_bool())
            return raw;
        else
        if (this.is_num() && !isNaN(parseFloat(raw)))
            return parseFloat(raw);
        else
            return raw;
    }

    update(element, set_default=false) {
        if (this.input_type)
            element.type = this.input_type;

        if (this.id)
            element.id = this.id;
    }
}

class OptionSelection extends OptionElement {
    constructor(option_id, option_text, default_selection, selection_list) {
        super('select', null, option_id, option_text);
        this.default_selection = default_selection;
        this.selection_list = selection_list;
    }

    create_select_option_element(select_item) {
        let e = document.createElement('option');
        e.value = select_item.value;
        e.innerText = select_item.text;
        return e;
    }

    get_select_option(key) {
        let text = this.selection_list[key];
        if (!text)
            text = key;
        return {value:key, text};
    }

    set_readonly(element, readonly=true) {
        element.disabled = readonly;
    }

    update(element, set_default=false) {
        super.update(element, set_default);

        let v = set_default ? this.default_selection : element.value;
        let keys = Object.keys(this.selection_list);

        element.innerHTML = "";

        let str = '';

        keys.forEach(function(k) {
            let so = this.get_select_option(k);
            str += `<option value=${so.value} ${k == v ? 'selected' : ''}>${so.text}</option>`;
        }.bind(this));

        element.innerHTML = str;
        //element.value = v;
    }
}

class OptionBase extends OptionElement {
    constructor(option_element, default_value=0.5, min=0, max=1, step=0.01) {
        super();
        Object.assign(this, option_element)
        this.default_value = default_value;
        this.min = min;
        this.max = max;
        this.step = step;
    }

    is_int() {
        return this.is_num() && Math.abs(Math.round(this.step) - this.step) < 0.00001;
    }

    is_float() {
        return this.is_num() && !this.is_int();
    }

    update(element, set_default=false) {
        super.update(element, set_default);

        if (this.is_num()) {
            element.step = this.step;
            element.min = this.min;
            element.max = this.max;
            if (set_default)
                element.value = this.default_value;
        } else
        if (this.is_bool()) {
            element.checked = this.default_value;
        } else {
            if (set_default)
                element.value = this.default_value;
        }
    }
};

class Options {
    constructor(container_element, options_list, base_options=undefined, base_override_type='try_self_first') {
        this.container_element = container_element;
        this.options_list = options_list;
        this.option_groups = {};
        this.base_options = base_options;
        this.base_override_type = base_override_type;

        this.onchange = function(group,id,value) {
            console.log('\ngroup:', group, '\nid:', id, '\nvalue:', value);
        };

        this.create_options_container();
    }

    option_input(event) {
        let id = event.target?.id;
        let group = this.get_group(id);
        let value = this.get_value(id);
        if (!group)
            return;
        this.update_group(group);
        this.onchange(group, id, value);
    }

    is_toggle_override() {
        return this.base_options && this.base_override_type == 'toggle';
    }

    get_toggle_option(key) {
        return new OptionBase({type:'input',input_type:'checkbox',id:key,text:''}, false);
    }

    update_group(group, set_default=false) {
        group.option.update(group.option_element, set_default);

        if (this.is_toggle_override()) {
            if (!group.toggle_option) {
                group.toggle_option = this.get_toggle_option(group.option.id);
            }

            if (!group.toggle_element) {
                group.toggle_element = group.toggle_option.create();
                group.container_element.insertBefore(group.toggle_element, group.option_element);
                group.toggle_option.update(group.toggle_element, true);
                group.toggle_element.addEventListener('input', this.option_input.bind(this));
            }

            console.log(group.toggle_option, group.toggle_option.get_value(group.toggle_element), group.toggle_element);
            group.option.set_readonly(group.option_element, !group.toggle_option.get_value(group.toggle_element));
        } else {
            if (group.toggle_element)
                group.toggle_element.remove(group.container_element);

            if (group.toggle_option)
                group.toggle_option = undefined;

            group.option.set_readonly(group.option_element, false);
        }
    }

    update_groups(set_default=false) {
        Object.values(this.option_groups).forEach(n => this.update_group(n, set_default));
    }

    get_group(key) {
        let self_group = this.option_groups[key];
        let base_group = this.base_options?.get_group(key);

        return self_group ? self_group : base_group;
    }

    get_option(key) {
        return this.get_group(key)?.option;
    }

    get_value(key) {
        let group = this.get_group(key);
        return group?.option.get_value(group?.option_element);
    }

    get_dict() {
        let dict = {};

        for (const [key, value] of Object.entries(this.option_groups)) {
            dict[key] = this.get_value(key);
        }

        return dict;
    }

    inherit(container_element, override_type='try_self_first', additional_options=[]) {
        let opts = Array.prototype.concat(this.options_list, additional_options);
        return new Options(container_element, opts, this, override_type);
    }

    create_option_element(option) {
        let element = document.createElement('div');
        let text = element.appendChild(document.createElement('p'));
        let opt = element.appendChild(option.create());
        if (option.text)
            text.innerText = option.text;
        return {container_element:element,option_element:opt,text_element:text,option};
    }

    create_options_container() {
        let element = document.createElement('div');

        this.element = element;
        this.container_element.appendChild(element);

        this.options_list.forEach(function(option) {
            if (this.option_groups[option.id])
                return;

            let group = this.create_option_element(option);
            element.appendChild(group.container_element);
            group.option_element.addEventListener('input', this.option_input.bind(this));
            this.option_groups[option.id] = group;
            this.update_group(group, this.base_options == undefined);
        }.bind(this));
    }
};

class Parameters {
    constructor(log, element) {
        this.context = element.getContext('2d');

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
        this.size = this.element.getBoundingClientRect();
        this.aspect_ratio = this.size.height / this.size.width;

        let default_height = 100;
        let default_width = 500;

        if (this.size.height < default_height) {
            this.size.height = default_height;
            this.size.width = this.size.height / this.aspect_ratio;
        } else
        if (this.size.width < default_width) {
            this.size.width = default_width;
            this.size.height = this.aspect_ratio * this.element.width;
        }

        this.element.width = this.size.width;
        this.element.height = this.size.height;

        this.line_width = this.element.width / 300;
        if (this.line_width < 2)
            this.line_width = 2;

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
            end:this.log.get_row_index_by_seconds(sr.end)+1,
        };
        r.range = Math.abs(r.start - r.end);
        return r;
    }

    get_view_rows() {
        let rr = this.get_view_row_range();
        return this.log.rows.slice(rr.start, rr.end);
    }

    foreach_view_row(callback, rowLimit=-1) {
        const rr = this.get_view_row_range();
        const range = rr.end - rr.start;

        let rs = 1;
        if (rowLimit > 0 && range > rowLimit) {
            rs = Math.floor((rr.end - rr.start) / rowLimit);
        }

        for (let i = rr.start; i < rr.end; i += rs) {
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
            if (!block.visible)
                continue;
            let y = (column.value - block.min) * block.range_inv;
            y = this.get_shifted_relative({x:0,y}).y;
            let diff_y = Math.abs((1-position.y) - y);
            if (diff_y < n.value) {
                n.block = block;
                n.column = column;
                n.value = diff_y;
            }
        }

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

    arc(relative, radius, startAngle, endAngle, counterclockwise=false) {
        let pos = this.get_position_absolute(relative);
        this.context.arc(pos.x, pos.y, radius, startAngle, endAngle, counterclockwise);
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

    get_button_elements() {
        return Object.values(document.querySelectorAll(this.get_log_view_selector() + " #log_view_buttons_div > div"));
    }

    get_button_div() {
        return document.querySelector(this.get_log_view_selector() + " #log_view_buttons_div");
    }

    get_element(element_id) {
        return document.querySelector(this.get_log_view_selector() + ` #${element_id}`);
    }

    get_log_toggle() {
        return this.get_element('log_toggle');
    }

    get_log_remove() {
        return this.get_element('log_close');
    }

    get_header_div() {
        return this.get_element('log_view_header_div');
    }

    get_log_options_div() {
        return this.get_element('log_view_opts');
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

            rel = this.get_column_relative(block, this.log.rows[rr.end-1].columns[block.stub]);
            rel.x = 1.01;
            this.lineTo(rel);

            this.context.stroke();

            this.context.fillStyle = block.color;
            if (this.get_view_rows_count() <= 60)
            this.foreach_view_row(function(row) { 
                this.context.beginPath();
                this.arc(this.get_column_relative(block, row.columns[block.stub]), 5, 0, 2 * Math.PI);
                this.context.fill();
            }.bind(this));
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

    render(skip_table=false) {
        if (!this.modified)
            return;

        this.clear();
        this.render_bars();
        this.render_markers();
        this.render_canvas();
        this.set_ui(skip_table);

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
        }.bind(this), 10000);

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
        str += `<p id='cursor_info'>--.--s [---]</p>`;
        str += `<button name="${this.log.name}" onclick="vcds.log_export_range_input(this)">Export Range</button>`;

        e.innerHTML = str;

        this.cursor_info_element = this.get_cursor_info_element();
    }

    set_ui(skip_table=false) {
        if (!skip_table)
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

    async resize_bar_drag(event, bar) {
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

        if (!rebars.some(bar => bar.name == 'down'))
            return false;

        if (event.type == "mouseup") {
            rebars.forEach(bar => bar.name = "up");
            this.update_canvas_size();
            this.render(true);
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

    async remove_tooltip() {
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

    async remove_overlay() {
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

    async set_overlay_position(event, overlay, elem) {
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

    async set_tooltip_info(event, tooltip, elem) {
        let rel = get_position_relative_to_element(event, elem);
        let n = this.get_view_nearest_block(rel, 0.05, true);

        tooltip.style.backgroundColor = "";

        let main_tooltip = undefined;

        if (!n.block) {
            tooltip.style.backgroundColor = "black";
            tooltip.className = "";
            tooltip.innerHTML = "";
        } else {
            let iden = this.get_block_identifier(n.block);

            tooltip.className = iden;

            main_tooltip = tooltip.querySelector('#main');
            let create_child = !main_tooltip;

            if (create_child)
                main_tooltip = document.createElement('div');
            main_tooltip.className = iden;
            main_tooltip.id = "main";
            //main_tooltip.style.top = event.y + "px";
            //main_tooltip.style.top = (get_position_relative_to_element(event, tooltip).y * 100).toFixed(2) + "%";
            main_tooltip.style.top = "110%";
            //main_tooltip.style.left = "10px";
            main_tooltip.style.transform = 'translate(-50%,0)';

            let str = '';
            str += `<p>${n.column.value.toFixed(2)}${n.block.unit}</p>`;
            str += `<p>${n.column.seconds.toFixed(2)}</p>`;
            str += `<p>${n.block.name}</p>`;
            str += `<p>${n.block.group} - ${n.block.field}</p>`;
            main_tooltip.innerHTML = str;

            if (create_child)
                tooltip.appendChild(main_tooltip);
        }

        let tt_left = tooltip.offsetLeft;

        for (const [key, column] of Object.entries(n.row.columns)) {
            let block = this.log.get_block(key);
            if (!block.visible)
                continue;
            let iden = this.get_block_identifier(block);

            let abs = this.get_column_relative(block, column);
            let rel = this.get_shifted_relative(abs);
            let element_height = elem.clientHeight;
            let offset_height = (1-rel.y) * element_height;
            let element_y = elem.clientTop + elem.offsetTop;
            let tooltip_y = element_y + offset_height;
            //let tooltip_r = event.x - 10;
            let tooltip_r = 30;

            let tooltip_l = tt_left - tooltip_r;


            let style_r = tooltip_r.toFixed(2) + "px";
            let style_t = ((1-rel.y) * 100).toFixed(2) + "%";

            let div = tooltip.querySelector('#offset_helper.' + iden);
            let create_child = !div;
            if (!create_child)
                div = div.parentElement;

            if (create_child)
                div = document.createElement('div');

            //div.className = iden;
            div.id = "extra";
            div.style.top = style_t;
            div.style.left = '';

            let d_str = "";

            //d_str += `<div class='${iden}'>`;
            //d_str += `<p>${block.name}</p>`;
            //d_str += `<p>${column.value.toFixed(2)}${block.unit}</p>`;
            //d_str += `</div>`;
            //d_str += `<div class='${iden}'><p>${column.value.toFixed(2)}${block.unit}</p><p>${block.name}</p></div>`;
            div.childNodes.forEach(x => div.removeChild(x));
            let value_e = document.createElement('p');
            let name_e = document.createElement('p');
            value_e.innerText = `${column.value.toFixed(2)}${block.unit}`;
            name_e.innerText = `${block.name}`;
            let ee = document.createElement('div');
            ee.className = iden;

            //div.innerHTML = d_str;

            if (create_child)
                tooltip.appendChild(div);

            ee.appendChild(name_e);
            ee.appendChild(value_e);
            ee.id = "offset_helper";
            div.appendChild(ee);
            ee.style.right = "-" + value_e.clientWidth + "px";

            //let div_size = div.getBoundingClientRect();

            //console.log(div_size, window.innerWidth);

            if (div.getBoundingClientRect().left < 0) {
                div.id = "extra_flip";
                ee.style.left = ee.style.right;
                ee.style.right = '';
            }
        }

        let compare_elems = function(a, b) {
            return a.offsetTop - b.offsetTop;
        };

        let sorted = Object.values(tooltip.querySelectorAll('#extra'))
            .toSorted(compare_elems);

        let height = undefined;
        if (sorted.length)
            height = sorted[0].clientHeight;

        for (let i = 1; i < sorted.length; i++) {
            let e = sorted[i];
            if (e.offsetTop < sorted[i-1].offsetTop + height) {
                e.id = "extra_flip";
                if (e.getBoundingClientRect().right > window.innerWidth) {
                    e.id = "extra";
                    continue;
                }
                let aa = e.childNodes[0];
                aa.style.left = aa.style.right;
                aa.style.right = '';
                sorted = sorted.filter(x => x !== e);
            }
        }

        let a_sorted = Object.values(tooltip.querySelectorAll('#extra'))
            .toSorted(compare_elems);

        let b_sorted = Object.values(tooltip.querySelectorAll('#extra_flip'))
            .toSorted(compare_elems);

        let modify_positions = async function(elems) {
            for (let i = 1; i < elems.length; i++) {
                let e = elems[i];
                let b = elems[i-1];
                let height = b.clientHeight;
                let bottom = b.offsetTop + height;
                let n_top = e.offsetTop - height;
                if (n_top > bottom) {
                    e.style.top = n_top + "px";
                } else
                if (e.offsetTop < bottom) {
                    e.style.top = bottom + "px";
                }
            }
        };

        modify_positions(a_sorted);
        modify_positions(b_sorted);

        if (main_tooltip && main_tooltip.getBoundingClientRect().left < 0) {
            //main_tooltip.style.left = "5px";
            main_tooltip.style.transform = `translate(-${event.x - 10}px,0)`;
        }

    }

    async set_tooltip_position(event, tooltip, elem) {
        let tooltip_width = 3;
        let element_height = elem.clientHeight;
        let offset_height = this.get_shifted_relative({x:0,y:0}).y * element_height;
        let element_y = elem.clientTop + elem.offsetTop;
        let tooltip_y = element_y + offset_height;
        let tooltip_height = (element_height - offset_height * 2);
        let tooltip_x = event.x - tooltip_width * 0.5;
        
        tooltip.style.height = tooltip_height + "px";
        tooltip.style.width = tooltip_width + "px";
        tooltip.style.left = tooltip_x + "px";
        tooltip.style.top = tooltip_y + "px";
    }

    async tooltip_mouse_input(event) {
        if (!is_position_of_element(event, this.element) || event.type == "mouseleave") {
            if (this.tooltip_element)
                this.remove_tooltip();
            return;
        }

        if (!this.tooltip_element)
            this.create_tooltip();

        this.set_tooltip_position(event, this.tooltip_element, this.element);
        this.set_tooltip_info(event, this.tooltip_element, this.element);
    }

    collapse() {
        let toggle_element = this.get_log_toggle();

        let e1 = this.get_element('log_view_canvas_container');
        let e2 = this.get_element('log_view_container_div');

        e1.className = "log_view_height_limit";
        e2.style.display = "none";

        toggle_element.innerText = '+';
        toggle_element.state = true;
    }
    
    expand() {
        let toggle_element = this.get_log_toggle();

        let e1 = this.get_element('log_view_canvas_container');
        let e2 = this.get_element('log_view_container_div');

        e1.className = "";
        e2.style.display = "";

        toggle_element.innerText = '-';
        toggle_element.state = false;
    }

    toggle() {
        let toggle_element = this.get_log_toggle();

        if (!toggle_element.state) {
            this.collapse();
        } else {
            this.expand();
        }
    }

    header_mouse_input(event) {
        let remove_element = this.get_log_remove();
        let toggle_element = this.get_log_toggle();
        let header_element = this.get_header_div();

        let elements = [remove_element, toggle_element, header_element];

        let remove_hover = is_position_of_element(event, remove_element) && remove_element.hover;
        let toggle_hover = is_position_of_element(event, toggle_element) && toggle_element.hover;
        let header_hover = is_position_of_element(event, header_element) && header_element.hover;

        if (event.type == 'mouseleave') {
            elements.forEach(elem => elem.hover = false);    
            return false;
        }

        if (event.type == 'mousedown') {
            let is_hovering = false;
            elements.forEach(elem => {
                if (is_position_of_element(event, elem))
                    is_hovering |= elem.hover = true;
            });
            return is_hovering;
        }

        if (event.type == 'mouseup') {
            elements.forEach(elem => elem.hover = false);

            if (remove_hover)
                this.remove();
            if (toggle_hover)
                this.toggle();
        }

        return remove_hover || toggle_hover || header_hover;
    }

    async mouse_input(event) {
        this.cursor_info_mouse_input(event);

        if (this.header_mouse_input(event))
            return;

        if (this.overlay_mouse_input(event))
            return;

        if (this.resize_bar_mouse_input(event))
            return;

        this.tooltip_mouse_input(event);
    }

    async clear_user_selection() {
        if (document.selection && document.selection.empty) {
            document.selection.empty();
        } else if (window.getSelection) {
            window.getSelection().removeAllRanges();
        }
    }

    async button_div_mouse_input(event) {
        let bd = this.get_button_div();
        if (!is_position_of_element(event, bd))
            return;

        let buttons = this.get_button_elements();
        let hb = buttons.find(btn => is_position_of_element(event, btn));

        if (!hb)
            return;

        let check_element = hb.querySelector('input');
        let block = this.log.get_block(check_element.className);
        let checked = check_element.checked;

        if (!block)
            return;

        if (is_position_of_element(event, check_element) && event.detail == 1) {
            block.visible = checked;
        }
        else if (event.type == 'click') {
            this.clear_user_selection();
            check_element.checked = !checked;
            block.visible = !checked;
        } else if (event.type == 'dblclick') {
            this.clear_user_selection();
            checked = !checked;
            let check_elements = buttons.map(button => button.querySelector('input'));
            let blocks = check_elements.map(check => this.log.get_block(check.className));
            check_elements.forEach(check => check.checked = !checked);
            blocks.forEach(block => block.visible = !checked);
            check_element.checked = checked;
            block.visible = checked;
        } else {
            return;
        }
        
        this.modified = true;
        this.render(true);

        event.stopPropagation();
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
        ['log_load_sensagram', 'input', this.log_load_input_sensagram],
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
    global_options = undefined;

    constructor() {
        this.events.forEach(function(event) {
            this.get_element(event[0]).addEventListener(event[1], event[2].bind(this));
        }.bind(this));
        this.log_load_input();
        this.load_engine_local();
        this.set_ui();
        this.global_options 
            = new Options(document.getElementById('global_log_opts'), 
                [
                    new OptionBase(
                        {
                            type:'input',
                            input_type:'number',
                            id:'atmospheric_pressure',
                            text:'Atmospheric Pressure (mbar)',
                        }, 1000, 0, 2000, 0.1),
                    new OptionSelection(
                        'tooltip_style',
                        'Tooltip Style',
                        'fixed',
                        {
                            'fixed':'Fixed',
                            'value':'Value',
                            'value_nooverlap':'Value without overlap',
                        },
                    ),
                    new OptionSelection(
                        'tooltip_region',
                        'Tooltip Region',
                        'auto',
                        {
                            'auto':'Auto',
                            'left':'Left',
                            'right':'Right',
                        },
                    ),
                    new OptionSelection(
                        'tooltip_position',
                        'Tooltip Position',
                        'cursor',
                        {
                            'cursor':'Cursor',
                            'fixed':'Fixed',
                            'vertical':'Above or below log',
                            'below':'Below log',
                            'above':'Above log',
                        },
                    ),
                ]);
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

    get_hovering_log(event) {
        return this.logs.find(log => is_position_of_element(event, log.element));
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
                str += `<input id="inline" class="${block.stub}" name="${p.log.name}" type="checkbox" checked /><div>`;
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
        str += `<a id='log_toggle' name='${log.name}'>-</a>`;
        str += `<p>${log.filename}</p>`;
        str += `<a id='log_close' name='${log.name}'>X</a>`;
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
        canvas_div += "</div><div class='horizontal_resize_bar resize_bar' id='canvas_table_resize_bar'></div><div id='log_view_container_div'></div><div id='log_view_engine'></div><div id='log_view_opts'></div>";

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

        let add_mouse_events = function(elem, func, ...extra) {
            ['mouseenter', 'mouseleave', 'mousedown', 'mouseup', 'mousemove', 'click', 'dblclick'].concat(extra).forEach(
                event => elem.addEventListener(event, func)
            );            
        };

        let add_events = function(elem, func, ...events) {
            [].concat(events).forEach(event => elem.addEventListener(event, func));
        };

        add_mouse_events(lce, params.mouse_input.bind(params));
        //add_events(params.get_button_div(), params.button_div_mouse_input.bind(params), ['mousedown', 'click', 'dblclick']);
        let bd = params.get_button_div();
        bd.onclick = params.button_div_mouse_input.bind(params);
        bd.ondblclick = params.button_div_mouse_input.bind(params);
        params.remove = function() {
            document.getElementById('log_body').removeChild(params.get_log_view_div());
            this.logs = this.logs.filter(v => v.log.name != params.log.name);
        }.bind(this);

        params.set_styles();
        params.options = this.global_options.inherit(params.get_log_options_div(), 'toggle');

        this.set_log(params);

        this.render_log(params);
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

    async log_load_input_sensagram(event) {
        let e = this.get_element('log_load_sensagram');
        if (!e || !e.files || !e.files.length)
            return;

        const text = await load_text_inputform(e);
        let log = new SensaGramLog(e.files[0].name, undefined, true, 10000);
        await log.parseText(text);
        this.add_log(log);
    }

    async log_export_range_input(event) {
        let p = this.get_parameters(event);
        let r = p.get_view_row_range();

        this.save_file(`${p.log.filename} range ${r.start} to ${r.end}.csv`, p.export_view_range(), false, 'text/csv');
    }
};

let vcds = new VCDS();