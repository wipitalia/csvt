const path = require('path');

const OPERATIONS = [
    'help',
    'check',
    'export',
    'import',
    'update',
]

const normalizeDirPath = dir => {
    const ret = path.normalize(dir);
    if (ret.endsWith('/')) return ret;
    return ret + '/';
}

const splitArgs = argv => {
    const opts = {};
    const args = [];

    let i; // need later
    for (i = 0; i < argv.length; i++) {
        const cur = argv[i];
        const next = argv[i + 1];

        // opt stop
        if (cur === '--') { i++; break }

        // output to stdout. this is argument, stop parsing options
        if (cur === '-') { break }

        // flag opt
        if (
            (cur.startsWith('-') && !next) // opt is last argv
            || (cur.startsWith('-') && next.startsWith('-')) // opt + opt
        ) {
            const opt = cur.replace(/^--?/, '');
            opts[opt] = true;
            continue;
        }

        // opt with arg
        if (cur.startsWith('-')) {
            const opt = cur.replace(/^--?/, '');
            opts[opt] = next;
            i++; // skip opt's arg
            continue;
        }

        // is arg
        args.push(cur);
    }

    argv.slice(i).forEach(a => args.push(a));
    return [opts, args];
}

const parseArgs = argv => {
    const ret = {
        langs: [],
        operation: 'help',
        filename: 'i18n.csv',
        directory: './',
    };

    const [opts, args] = splitArgs(argv);

    if (opts['h'] || opts['help']) {
        ret.operation = 'help';
        return ret;
    }

    if (opts['l'] || opts['langs']) {
        ret.langs = (opts['langs'] || opts['l']).split(',');
    }

    if (!args[0]) {
        ret.operation = 'help';
    } else if (OPERATIONS.includes(args[0])) {
        ret.operation = args[0];
    } else {
        throw CLIError.BAD_ARG(`unknown operation: ${args[0]}`);
    }

    if (args[1]) ret.directory = normalizeDirPath(args[1]);
    ret.filename = args[2] || path.join(ret.directory, ret.filename);
    return ret;
}

const helpText = s => {
    return s
        .trim()
        .split('\n')
        .map(s => s.replace(/^\s{8}/, ''))
        .join('\n');
}

module.exports = {
    parseArgs,
    helpText,
}