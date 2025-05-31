function get_file_count(input_element) {
    if (!input_element ||
        !input_element.files ||
        !input_element.files.length)
        return 0;

    return input_element.files.length;
}

async function load_json_file(input_element, object_prototype) {
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

async function save_file(filename, blob, dialog=false) {
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

async function save_json_file(filename, json_object, dialog=false) {
    const blob = new Blob([JSON.stringify(json_object, null, 2)], {type:'application/json'});
    save_file(filename, blob, dialog);
}

async function save_local_json(key, object) {
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

export { 
    get_file_count,
    load_json_file,
    save_file,
    save_json_file,
    save_local_json,
    load_local_json,
    get_text_stream,
};