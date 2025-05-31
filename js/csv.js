import * as Data from "data.js";

class CSV {
    parseText(text) {
        this.parseStream(Data.get_text_stream(text));
    }

    parseStream(text_stream) {
        for await (const chunk of text_stream) {
            
        }
    }
};