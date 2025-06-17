function load_csv(csv) {
    if (!csv)
        return;

    let element = document.getElementById('csv');

    element.innerHTML = '';

    let row = csv[0];
    let p = 'beforeend';

    let table = element.insertAdjacentElement(p, document.createElement('table'));

    let e_row = table.insertAdjacentElement(p, document.createElement('tr'));
    for (let c = 0; c < row.length; c++) {
        e_row.innerHTML += `<th><p>${row[c]}</p></th>`;        
    }

    for (let r = 1; r < csv.length; r++) {
        row = csv[r];
        
        e_row = table.insertAdjacentElement(p, document.createElement('tr'));

        for (let c = 0; c < row.length; c++) {
            e_row.innerHTML += `<td><p>${row[c]}</p></td>`;
        }
    }
}

async function load_input(event) {
    load_csv(CSV.loadCSV(await load_text_inputform(event?.target)));
}

async function on_load() {
    let url = '/sensors/sensors.csv';
    
    const params = new Proxy(new URLSearchParams(window.location.search), {
        get: (searchParams, prop) => searchParams.get(prop)
    });

    if (params && params.csv)
        url = params.csv;
    
    load_csv(CSV.loadCSV(await load_text_url(url)));
}