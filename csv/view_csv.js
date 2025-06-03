function parse_csv(text) {
	let csv = [];
	let lines = text.trim().split('\n');
	lines.forEach(n => {
		let parts = n.trim().split(',');
		csv.push(parts);
	});
	return csv;
}

async function load_file(url) {
	let r = await fetch(url)
	let text = await r.text();
    return parse_csv(text);
}

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
    let files = event?.target?.files;

    console.log(event);

    if (!files || !files[0])
        return;

    let reader = new FileReader();

    reader.onload = function(e) {
        load_csv(parse_csv(e.result));
    };

    reader.readAsText(files[0]);
}

async function on_load(element) {
    let url = '/sensors/sensors.csv';
    
    const params = new Proxy(new URLSearchParams(window.location.search), {
        get: (searchParams, prop) => searchParams.get(prop)
    });

    if (params && params.csv)
        url = params.csv;
    
    load_csv(await load_file(url));
}