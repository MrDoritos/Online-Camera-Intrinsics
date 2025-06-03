function uuidv4() {
    return "10000000100040008000100000000000".replace(/[018]/g, c =>
      (+c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> +c / 4).toString(16)
    );
}  

function get_file_count(input_element) {
    if (!input_element ||
        !input_element.files ||
        !input_element.files.length)
        return 0;

    return input_element.files.length;
}

function load_file_stream(input_element) {
    if (!get_file_count(input_element))
        return undefined;

    let file = input_element.files[0];
    
    return file.stream();
}

function load_json_file(input_element, object_prototype) {
    if (!get_file_count(input_element))
        return undefined;

    let form = input_element.files[0];
    let reader = new FileReader();
    let obj = undefined;

    reader.onload = function(e) {
        obj = Object.assign(object_prototype, JSON.parse(reader.result));
    };

    reader.readAsText(form);

    return obj;
}

function open_file() {
    const elem = window.document.createElement('input');
    elem.type = "file";
    elem.accept = "*";
    elem.click();
    if (!get_file_count(elem))
        return undefined;
    return elem.files[0];
}

function save_file(filename, blob, dialog=false) {
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

function save_json_file(filename, json_object, dialog=false) {
    const blob = new Blob([JSON.stringify(json_object, null, 2)], {type:'application/json'});
    save_file(filename, blob, dialog);
}

function save_local_json(key, object) {
    localStorage.setItem(key, object ? JSON.stringify(object) : null);
}

function load_local_json(key, object_prototype) {
    const data = localStorage.getItem(key);

    if (!data)
        return new object_prototype.constructor();

    return Object.assign(object_prototype, JSON.parse(data));
}

function get_text_stream(text) {
    return new ReadableStream({
        start(controller) {
            controller.enqueue(text);
            controller.close();
        },
    });
}

/*
export { 
    get_file_count,
    load_json_file,
    save_file,
    save_json_file,
    save_local_json,
    load_local_json,
    get_text_stream,
};
*/