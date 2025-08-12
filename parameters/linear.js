class Vector {
    columns = 0;

    constructor(columns) {
        this.columns = columns;
    }

    set(scalar) {
        for (let i = 0; i < this.columns; ++i) {
            this[this.keyOf(i)] = scalar;
        }
    }

    at(index) {
        return this[this.keyOf(index)];
    }

    keyOf(index) {
        return "xyzwuv"[index];
    }

    toarray() {
        let ret = [];
        for (let i = 0; i < this.columns; ++i)
            ret.push(this.at(i));
        return ret;
    }

    copy() {
        let r = new Vector(this.columns);
        r.all_keys(k => this[k]);
        return r;
    }

    copy_op(callback) {
        let r = new Vector(this.columns);
        r.all_keys(k => callback(this[k]));
        return r;
    }

    all_keys(callback) {
        for (let i = 0; i < this.columns; ++i) {
            this[key] = callback(this.keyOf(i));
        }
        return this;
    }

    all_values(callback) {
        for (let i = 0; i < this.columns; ++i) {
            const key = this.keyOf(i);
            this[key] = callback(this[key]);
        }
        return this;
    }

    each_value(callback) {
        for (let i = 0; i < this.columns; ++i) {
            const key = this.keyOf(i);
            callback(this[key]);
        }
    }

    pairwise_values(vector_other, callback) {
        for (let i = 0; i < this.columns && i < vector_other.columns; ++i) {
            const key = this.keyOf(i);
            this[key] = callback(this[key], vector_other[key]);
        }
        return this;
    }

    reduce(callback, initial=0) {
        let acc = initial;
        this.each_value(v => acc = callback(acc, v));
        return acc;
    }

    reduce_right(callback) {
        let acc = this[this.keyOf(0)];
        for (let i = 1; i < this.columns; ++i) {
            const key = this.keyOf(i);
            acc = callback(acc, this[key]);
        }
        return acc;
    }

    muls = (scalar) => this.all_values(v => v * scalar);
    adds = (scalar) => this.all_values(v => v + scalar);
    divs = (scalar) => this.all_values(v => v / scalar);
    subs = (scalar) => this.all_values(v => v - scalar);

    mulv = (vector) => this.pairwise_values(vector, (a,b) => a * b);
    addv = (vector) => this.pairwise_values(vector, (a,b) => a + b);
    divv = (vector) => this.pairwise_values(vector, (a,b) => a / b);
    subv = (vector) => this.pairwise_values(vector, (a,b) => a - b);

    sum = () => this.reduce((acc, v) => acc + v);
    length2 = () => this.copy().mulv(this).sum();
    length = () => Math.sqrt(this.length2());
    abs = () => this.copy_op(Math.abs);
    product = () => this.reduce_right((acc, v) => acc * v);
    normalized = () => this.copy().divs(this.length());

};

class Matrix {
    rows = 0;

    constructor(columns, rows) {

    }

};