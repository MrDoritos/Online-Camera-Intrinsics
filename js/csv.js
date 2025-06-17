class CSV {
    constructor(delimiters=[','],escapes=['\\'],comments=['#'],quotes=['"',"'"],trims=[' ','\r','\n']) {
        this.delimiters = delimiters;
        this.escapes = escapes;
        this.comments = comments;
        this.quotes = quotes;
        this.trims = trims;
        this.rows = [];
    }

    parseLine(line) {
        let escapes = this.escapes, delimiters = this.delimiters;
        let quotes = this.quotes, comments = this.comments;
        let trims = this.trims;
        let escaped = false, quoted = false, quoteChar = undefined;

        let ret = [];
        let field = '';

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

            if (trims && trims.includes(c)) {
                continue;
            }

            if (delimiters && delimiters.includes(c)) {
                if (!quoted) {
                    ret.push(field);
                    field = '';
                    continue;
                }
            }

            if (comments && comments.includes(c)) {
                break;
            }

            field += c;
        }

        ret.push(field);

        return ret;
    }

    parseText(text) {
        //this.parseStream(Data.get_text_stream(text));
        this.rows = [];

        for (const line of text.split('\n')) {
            this.rows.push(this.parseLine(line));
        }
    }

    forEachRow = (callback) => this.rows.forEach((row) => callback(row));

    async parseStream(text_stream) {
        for await (const chunk of text_stream) {
            
        }
    }
};