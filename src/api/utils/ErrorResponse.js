module.exports = class ErrorResponse extends Error {
    #httpCode;
    #error;

    constructor(httpCode, message, error = null) {
        super(message);
        this.name = "ErrorResponse";
        this.#httpCode = httpCode;
        this.#error = error;
    }

    get httpCode() {
        return this.#httpCode;
    }

    get error() {
        return this.#error;
    }
};
