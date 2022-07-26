#!/usr/bin/env node
const { parseArgs } = require('./lib/utils/args');
const CLIError = require('./lib/CliError');


const {
    helpCmd,
    checkCmd,
    diffCmd,
    exportCmd,
    importCmd,
    updateCmd,
} = require('./cmd');


const main = async () => {
    try {
        const opts = parseArgs(process.argv.slice(2));
        // console.debug("OPTIONS", opts);
        switch (opts.operation) {
            case 'help':
                helpCmd();
                break;
            case 'check':
                await checkCmd(opts.filename, opts.directory);
                break;
            case 'diff':
                await diffCmd(opts.filename, opts.directory);
                break;
            case 'export':
                await exportCmd(opts.filename, opts.directory, {
                    headerLangs: opts.langs
                });
                break;
            case 'import':
                await importCmd(opts.filename, opts.directory);
                break;
            case 'update':
                await updateCmd(opts.filename, opts.directory)
                break;
        }
    } catch (err) {
        if (err.name === CLIError.name) {
            if (err.message) console.error(err.message);
            process.exit(err.exitCode);
        }
        throw err;
    }
}

main();