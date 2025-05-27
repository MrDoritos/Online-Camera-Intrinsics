async function load_csv(url) {
	let csv = [];
	let r = await fetch(url)
	let text = await r.text();
	let lines = text.trim().split('\n');
	lines.forEach(n => {
		let parts = n.trim().split(',');
		csv.push(parts);
	});
	//console.log("csv:", csv);
	return csv;
}

async function load_file(url) {
    let csv = await load_csv(url);

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

async function load_button() {

}

function on_load(element) {
    const params = new Proxy(new URLSearchParams(window.location.search), {
        get: (searchParams, prop) => searchParams.get(prop)
    });

    load_file(params.csv);
}