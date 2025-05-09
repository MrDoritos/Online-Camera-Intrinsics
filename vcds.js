function uuidv4() {
    return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c =>
      (+c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> +c / 4).toString(16)
    );
}  

class Log {
    filename = undefined;
    text = undefined;
    name = undefined;

    constructor(filename, text) {
        this.filename = filename;
        this.text = text;
        this.name = uuidv4();
    }
};

class VCDS {
    get_element(name) {
        return document.getElementById(name);
    }

    events = [
        ['log_load', 'input', this.log_load_input],
    ];

    logs = {};

    constructor() {
        this.events.forEach(function(event) {
            this.get_element(event[0]).addEventListener(event[1], event[2].bind(this));
        }.bind(this));
        this.log_load_input();
    }

    add_log(log) {
        this.logs[log.name] = log;

        let body = this.get_element('log_body');

        let e = document.createElement('div');
        e.setAttribute('id', 'log_view_div');
        e.setAttribute('name', log.name);

        e.innerHTML = "";
        let str = `<div id='log_view_header_div'>`;
        str += `<a id='log_toggle' name='${log.name}' onclick='vcds.log_toggle_click(this)'>-</a>`;
        str += `<p>${log.filename}</p>`;
        str += `<a id='log_close' name='${log.name}' onclick='vcds.log_close_click(this)'>X</a>`;
        str += `</div>`;
        e.innerHTML += str;

        e.innerHTML += `<div id='log_view_container_div'><p>${log.text}</p></div>`;

        body.insertBefore(e, this.get_element('log_load_div'));
    }

    log_close_click(event) {
        this.get_element('log_body').removeChild(event.parentElement.parentElement);
    }

    log_toggle_click(event) {
        //let e = event.parentElement.getElementById('log_view_container_div');
        let name = event.getAttribute('name');
        let e = document.querySelector(`div#log_view_div[name='${name}'] div#log_view_container_div`);
        if (event.innerText.includes('-')) {
            e.style.setProperty('display', 'none');
            event.innerText = '+';
        } else {
            e.style.setProperty('display', "");
            event.innerText = '-';
        }
    }

    log_load_input(event) {
        console.log('log_load_input', this, event);

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
};

let vcds = new VCDS();