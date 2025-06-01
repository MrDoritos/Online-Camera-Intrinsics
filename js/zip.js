class Binary {
    static read_string(array, offset, size) {
        let s = '';
        for (let i = offset; i < offset + size; i++)
            s += String.fromCharCode(array[i]);
        return s;
    }

    static read_be(array, offset, size) {
        let n = 0;
        for (let i = 0; i < size; i++)
            n |= array[offset + i] << ((size - 1 - i) * 8);
        return n;
    }

    static read_le(array, offset, size) {
        let n = 0;
        for (let i = 0; i < size; i++)
            n |= array[offset + i] << (i * 8);
        return n;
    }

    static read_num(array, offset, size) {
        let n = 0;
        for (let i = 0; i < size; i++)
            n |= array[offset + i] << (i * 8);
        return n;
    }

    static read_short(array, offset) {
        return array[offset] | (array[offset + 1] << 8);
    }

    static read_int(array, offset) {
        return this.read_num(array, offset, 4);
    }
};

class ZipEntry {
    constructor() {
        this.header = new Array(30);
    }

    is_zip64() {
        return this.uncompressed_size == 0xFFFFFFFF;
    }

    zip32_size() {
        return this.compressed_size + 
               this.filename_length +
               this.extra_field_length;
    }

    zip64_size() {
        
    }

    entry_size() {
        return this.is_zip64() ? this.zip64_size() : this.zip32_size();
    }

    extract_header() {
        let v = this.header;
        this.signature = Binary.read_string(v, 0, 4);
        this.version = Binary.read_short(v, 4);
        this.flags = Binary.read_short(v, 6);
        this.method = Binary.read_short(v, 8);
        this.modified_time = Binary.read_short(v, 10);
        this.modified_date = Binary.read_short(v, 12);
        this.crc32 = Binary.read_int(v, 14);
        this.compressed_size = Binary.read_int(v, 18);
        this.uncompressed_size = Binary.read_int(v, 22);
        this.filename_length = Binary.read_short(v, 26);
        this.extra_field_length = Binary.read_short(v, 28);
        this.size = this.filename_length + 
                    this.extra_field_length +
                    this.compressed_size;
        this.payload = new Array(this.size);
    }

    offset = 0;
    size = 0;
    header_complete = false;
    header;
    payload;
    signature;
    version;
    method;
    flags;
    modified_time;
    modified_date;
    crc32;
    compressed_size;
    uncompressed_size;
    filename_length;
    extra_field_length;
    filename;
};

class ZipLocs {
    static header_locs = {
        offset: 0,
        0: ['signature', 4],
        4: ['version', 2],
        6: ['flags', 2],
        8: ['method', 2],
        10: ['modified_time', 2],
        12: ['modified_date', 2],
        14: ['crc32', 4],
        18: ['compressed_size', 4],
        22: ['uncompressed_size', 4],
        26: ['filename_length', 2],
        28: ['extra_field_length', 2],
        30: ['filename', 0],

    };

    static entry_locs = {
        0: ['signature', 4],
        4: ['version', 2],
        6: ['flags', 2],
        8: ['method', 2],
        10: ['modified_time', 2],
        12: ['modified_date', 2],
        14: ['crc32', 4],
        18: ['compressed_size', 4],
        22: ['uncompressed_size', 4],
        26: ['filename_length', 2],
        28: ['extra_field_length', 2]
    };
};

class ZipFile {
    constructor() {

    }

    entries;

    parse_entry_header(entry, rel_offset, data, data_offset) {
        let count = entry.header.length - rel_offset;

        if (count >= data.length + data_offset)
            count = data.length - data_offset;

        for (let i = 0; i < count; i++)
            entry.header[i + rel_offset] = data[i + data_offset];

        return count;
    }

    parse_entry_data(entry, rel_offset, data, data_offset) {
        let offset = entry.header.length;
        let count = entry.size - rel_offset;

        if (count >= data.length + data_offset)
            count = data.length - data_offset;

        for (let i = 0; i < count; i++)
            entry.payload[i + rel_offset] = data[i + data_offset];

        return count;
    }

    parse_entry(entry, rel_offset, data, data_offset) {
        let count = 0;

        if (!entry.header_complete &&
            rel_offset < entry.header.length)
            count += this.parse_entry_header(entry, rel_offset, data, data_offset);

        if (!entry.header_complete &&
            rel_offset + count >= entry.header.length) {
            entry.header_complete = true;
            entry.extract_header();
        }

        rel_offset += entry.header.length;

        if (entry.header_complete)
            count += this.parse_entry_data(entry, rel_offset, data, data_offset + count);

        return count;
    }

    async open(readable_stream) {
        console.log('open', readable_stream);
        const reader = await readable_stream.getReader();
        console.log('reader', reader);
        this.entries = [];

        let last_index = function(entries) {
            if (this.entries.length < 1)
                return 0;
            let entry = this.entries.at(-1);
            return entry.offset + entry.entry_size();
        }.bind(this);

        let rel_offset = 0;
        let staged_entry = new ZipEntry();

        console.log('enter loop', rel_offset, staged_entry);

        while (true) {
            const {done, value} = await reader.read();

            console.log('get value');
            if (done)
                break;

            console.log(done, value, value.length);

            let remaining = value.length;
            let data_offset = 0;

            while (remaining >= 0) {
                let prev_offset = last_index(this.entries);
                console.log(prev_offset, remaining);
                staged_entry.offset = prev_offset;
                
                let count = this.parse_entry(staged_entry, rel_offset, value, data_offset);

                rel_offset += count;
                data_offset += count;

                if (value.length >= data_offset) {
                    console.log('push');
                    this.entries.push(staged_entry);
                    staged_entry = new ZipEntry();
                    rel_offset = 0;
                }

                if (count == 0)
                    break;

                console.log(count, rel_offset);

                remaining -= count;
            }
        }
        console.log('done');
    }

    static async from_stream(readable_stream) {
        console.log('from stream');
        let z = new ZipFile();
        console.log('create object', z);
        await z.open(readable_stream);
        console.log('return object', z);
        return z;
    }
};

async function zip_from_stream(readable_stream) {
    console.log('zfs');
    let z = new ZipFile();
    console.log('create object', z);
    await z.open(readable_stream);
    console.log('return object', z);
    return z;
}

//export { ZipFile, ZipEntry };