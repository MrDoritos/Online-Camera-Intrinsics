class WordList {
    constructor() {

    }

    async read_from_url(url) {
        const data = await fetch(url);
        this.read_from_text(await data.text());
    }

    read_from_text(text) {
        this.words = text.trim().split('\n');
    }

    shuffle() { // Durstenfield shuffle
        for (let i = this.words.length - 1, temp = undefined; i > 0; i--) {
            let j = Math.floor(Math.random() * (i + 1));
            temp = this.words[i];
            this.words[i] = this.words[j];
            this.words[j] = temp;
        }
    }

    get_distributed_random() {
        let r = Math.random();
        r = 1-Math.sqrt(r);
        let i = Math.floor(r * this.words.length);
        return i >= this.words.length ? this.words.length - 1 : i;
    }

    get_word() {
        let r = Math.random()
        r = 1-Math.sqrt(r);
        let i = Math.floor(r * this.words.length);
        i = i >= this.words.length ? this.words.length - 1 : i;
        let word = this.words[i];
        this.words.splice(i,1);
        this.words.push(word);
        return word;
    }
};

class Typing {
    default_lists = {
        "Programming keywords":"wordlists/programming.txt",
        "Computer Science":"wordlists/programming_extra.txt",
    };

    fill_wordlist_select(dict) {
        let get_option = function(opt,disabled=false,selected=false) {
            return `<option id='${opt}' ${disabled?'disabled':''} ${selected?'selected':''}>${opt}</option>`;
        }

        let e = this.wordlist_select_element;

        e.innerHTML = '';

        e.innerHTML += get_option('Select Word List', true, true);

        for (const [key, value] of Object.entries(dict)) {
            e.innerHTML += get_option(key);
        }
    }

    push_word(word) {
        let previews = this.typing_preview_container.querySelectorAll('p');
        let len = previews.length;
        for (let i = 0; i < len - 1; i++) {
            previews[i].innerText = previews[i+1].innerText;
        }
        previews[len-1].innerText = word;
        this.word_queue.push(word);
    }

    next_word() {
        this.active_word = this.word_queue[0];
        this.word_queue.splice(0,1);
        return this.active_word;
    }

    set_next_word() {
        this.push_word(this.wordlist.get_word());
        this.next_word();
        this.typing_input_element.value = "";
    }

    clear_queue() {
        this.word_queue = [];
        let previews = this.typing_preview_container.querySelectorAll('p');
        for (let i = 0; i < previews.length; i++)
            previews[i].innerText = '';
    }

    set_wordlist(wordlist) {
        this.wordlist = wordlist;
        this.wordlist.shuffle();

        this.clear_queue();

        this.push_word(this.wordlist.get_word());
        this.push_word(this.wordlist.get_word());
        this.next_word();
    }

    set_wordlist_by_name(name) {
        this.set_wordlist_url(this.default_lists[name]);
    }

    async set_wordlist_url(url) {
        let wordlist = new WordList();
        await wordlist.read_from_url(url);
        this.set_wordlist(wordlist);
    }

    format_time(ms) {
        if (!ms)
            return '0s';
        return `${(ms*0.001).toFixed(3)}s`
    }

    set_stats() {
        let e = this.typing_stats_element;
        let str = '';
        str += `Pass: ${this.stats.pass} `;
        str += `Fail: ${this.stats.fail} `;
        str += `Streak: ${this.stats.streak} `;
        str += `Longest Streak: ${this.stats.longest_streak} `;
        if (this.stats.previous_times.length)
            str += `WPM: ${(60/((this.stats.previous_times.reduce((x,s)=>x+s,0)*0.001)/this.stats.previous_times.length)).toFixed(1)} `;
        else
            str += `WPM: 0 `;
        str += `CPS: ${this.stats.previous_cps.toFixed(1)} `;
        str += `Latency: ${this.format_time(this.stats.latency)} `;
        str += `Last time: ${this.format_time(this.stats.previous_time)} `;
        str += `Average time: ${this.format_time(this.stats.previous_times.length ? this.stats.previous_times.reduce((x,s)=>x+s,0)/this.stats.previous_times.length:0)}`
        e.innerText = str;
    }

    wordlist_select(event) {
        let key = this.wordlist_select_element.value;
        if (!key in this.default_lists)
            return;
        this.set_wordlist_url(this.default_lists[key]);
    }

    submit_input() {
        this.stats.end_time = Date.now();
        if (this.typing_input_element.value)
            this.typing_input_element.value = this.typing_input_element.value.trim();
        if (!this.typing_input_element.value || this.typing_input_element.value.length < 1) {
            return false;
        }
        if (this.typing_input_element.value == this.active_word) {
            this.stats.pass++;
            this.stats.streak++;
        } else {
            this.stats.fail++;
            this.stats.streak = 0;
        }
        if (this.stats.streak > this.stats.longest_streak)
            this.stats.longest_streak = this.stats.streak;
        this.stats.previous_time = this.stats.end_time - this.stats.start_time;
        this.stats.previous_times.push(this.stats.previous_time);
        this.stats.previous_cps = 1/((this.stats.previous_time / this.active_word.length)*0.001);
        this.stats.previous_cpses.push(this.stats.previous_cps);
        this.stats.start_time = undefined;
        this.set_next_word();
        this.set_stats();
    }

    textbox_input(event) {
        if (event.type == "click") {
            this.stats.start_latency = this.stats.end_time;
            this.submit_input();
            return false;
        }

        if (event.type == "input") {
            let e = this.typing_input_element;
            if (e.value && e.value.length && !this.stats.start_time) {
                this.stats.start_time = Date.now();
                if (this.stats.start_latency)
                    this.stats.latency = this.stats.start_time - this.stats.start_latency;
            }
            if (event.data == ' ') {
                this.submit_input();
                return false;
            }
        }
        
        return false;
    }

    constructor() {
        this.typing_input_element = document.querySelector('input#textbox');
        this.typing_preview_container = document.querySelector('div#preview');
        this.wordlist_select_element = document.querySelector('select#wordlist');
        this.typing_enter_element = document.querySelector('button#textbox_enter');
        this.typing_stats_element = document.querySelector('div#wordlist p#stats');

        this.wordlist = undefined;
        this.active_word = undefined;
        this.word_queue = [];
        this.stats = { 
            fail:0,
            pass:0,
            streak:0,
            longest_streak:0,
            latency:0,
            start_time:0,
            start_latency:0,
            end_time:0,
            previous_time:0,
            previous_times:[],
            previous_cps:0,
            previous_cpses:[],
        };

        this.set_wordlist_by_name('Programming keywords');
        this.set_stats();

        this.fill_wordlist_select(this.default_lists);
        this.typing_input_element.value = "Start typing...";
        this.typing_input_element.onfocus = function(e) {e.target.value='';e.target.onfocus=undefined;};
        this.typing_input_element.oninput = this.textbox_input.bind(this);
        this.typing_enter_element.onclick = this.textbox_input.bind(this);
        this.wordlist_select_element.oninput = this.wordlist_select.bind(this);
    }
};

let typing = new Typing();