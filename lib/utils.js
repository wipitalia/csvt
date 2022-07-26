const path = require('path');
const fs = require('fs/promises');
const {readdirSync} = require('fs');

const OPERATIONS = [
    'help',
    'check',
    'export',
    'import',
    'update',
]

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

const propByPath = (obj, segments) => {
    return segments.reduce((r, s) => {
        if (r !== undefined) return r[s];
        return r;
    }, obj);
}

const setPropByPath = (obj, segments, val) => {
    const last = segments[segments.length - 1];
    let cur = obj;
    segments.slice(0, -1).forEach(s => {
        if (!cur[s]) cur[s] = {};
        cur = cur[s];
    });
    cur[last] = val;
}

const reduceObject = (obj, fn, init) => {
    return Object.entries(obj).reduce((r, [k, v]) => {
        return fn(r, k, v);
    }, init);
}

const mapObject = (obj, fn) => {
    return reduceObject(obj, (r, k, v) => {
        return {...r, [k]: fn(k, v)};
    }, {});
}

const mergeDeep = (target, ...sources) => {
    if (!sources.length) return target;
    const source = sources.shift();

    if (typeof target === 'object' && typeof source === 'object') {
        for (const key in source) {
            if (typeof source[key] === 'object') {
                if (!target[key]) Object.assign(target, {
                    [key]: {}
                });
                mergeDeep(target[key], source[key]);
            } else {
                Object.assign(target, {
                    [key]: source[key]
                });
            }
        }
    }

    return mergeDeep(target, ...sources);
}

const groupBy = (lst, getter, mapper = id => id) => {
    return lst.reduce((r, e) => {
        const v = getter(e);
        if (!v) return r;
        if (!r[v]) return {...r, [v]: [mapper(e)]}
        return {...r, [v]: [...r[v], mapper(e)]};
    }, {});
}

const degroup = (obj, keyname) => {
    return reduceObject(obj, (r, k, lst) => {
        const nlst = lst.map(v => ({...v, [keyname]: k}));
        return [...r, nlst]
    }, []).flat();
}

const omit = (fields, obj) => {
    if (!Array.isArray(fields)) fields = [fields];
    return Object.fromEntries(Object.entries(obj).filter(([k]) => !fields.includes(k)));
}

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

    if (args[1]) ret.filename = args[1];
    if (args[2]) ret.directory = normalizeDirPath(args[2]);
    return ret;
}

const helpText = s => {
    return s
        .trim()
        .split('\n')
        .map(s => s.replace(/^\s{8}/, ''))
        .join('\n');
}

const fileExists = async path => {
    try {
        await fs.access(path);
        return true;
    } catch {
        return false;
    }
}

module.exports = {
    CLIError,
    reduceObject,
    mapObject,
    propByPath,
    setPropByPath,
    mergeDeep,
    groupBy,
    degroup,
    omit,
    parseArgs,
    helpText,
    fileExists,
}