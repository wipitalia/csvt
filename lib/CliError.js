class CLIError extends Error {
    constructor(exitCode, msg, options) {
        super(msg, options);
        this.name = this.constructor.name;
        this.exitCode = exitCode;
    }
}

CLIError.exitCodes = {
    GENERIC: 1,
    BAD_ARG: 2,
    IO: 3,
    TODO: -1,
}

Object.entries(CLIError.exitCodes).forEach(([k, v]) => {
    CLIError[k] = (msg, options) => new CLIError(v, msg, options);
});

module.exports = CLIError;