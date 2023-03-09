export default class Thenable {
    #value;
    constructor(value) {
        this.#value = value;
    }
    then(f, ...rest) {
        if (this.#value?.then) {
            return this.#value.then(f, ...rest);
        } else {
            return new Thenable(f(this.#value));
        }
    }
}
