class CSV {
    constructor(delimiters=[','],escapes=['\\'],comments=['#'],quotes=['"',"'"],trim=true) {
        this.delimiters = delimiters;
        this.escapes = escapes;
        this.comments = comments;
        this.quotes = quotes;
        this.trim = trim;
        this.rows = [];
    }

    parseLine(line) {
        const escapes = this.escapes, delimiters = this.delimiters;
        const quotes = this.quotes, comments = this.comments;
        const trim = this.trim;
        
        let escaped = false, quoted = false, quoteChar = undefined;

        let ret = [];
        let field = '';

        const push_field = (fd) => ret.push(trim ? fd.trim() : fd);

        for (const c of line) {
            if (escaped) {
                escaped = false;
                field += c;
                continue;
            }

            if (escapes && escapes.includes(c)) {
                escaped = true;
                continue;
            }

            if (quotes && quotes.includes(c)) {
                if (!quoted || c == quoteChar) {
                    quoted = !quoted;
                    quoteChar = c;
                    continue;
                }
            }

            if (quoted) {
                field += c;
                continue;
            }

            if (delimiters && delimiters.includes(c)) {
                if (!quoted) {
                    push_field(field);
                    field = '';
                    continue;
                }
            }

            if (comments && comments.includes(c)) {
                break;
            }

            field += c;
        }

        push_field(field);

        return ret;
    }

    parseText(text) {
        //this.parseStream(Data.get_text_stream(text));
        this.rows = [];

        for (const line of text.split('\n')) {
            const row = this.parseLine(line);
            if (this.trim && (!row.length || (row.length < 2 && !row[0].length)))
                continue;
            this.rows.push(row);
        }
    }

    static loadCSV(text) {
        const csv = new CSV();
        csv.parseText(text);
        return csv.rows;
    }

    static parseCSV(text) {
        const csv = new CSV();
        csv.parseText(text);
        return csv;
    }

    forEachRow = (callback) => this.rows.forEach((row) => callback(row));

    async parseStream(text_stream) {
        for await (const chunk of text_stream) {
            
        }
    }
};