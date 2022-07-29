const path = require('path');
const fs = require('fs/promises');
const { createReadStream, createWriteStream } = require('fs');
const { finished } = require('stream/promises');

const csv = require('csv');

const {
    groupBy,
    omit,
    mapObject,
    reduceObject,
    degroup,
    mergeDeep,
} = require('./utils');
const { Stream } = require('stream');

const COMMENT_LANG = 'COMMENT';
const FILE_COLUMN_NAME = 'FILE';
const PATH_COLUMN_NAME = 'PATH';
const PATH_DELIMITER = '.';
const CSV_DELIMITER = ',';

const walkFiles = async rootDir => {
    const entries = await fs.readdir(rootDir, { withFileTypes: true });

    const files = entries
        .filter(e => e.isFile())
        .map(e => path.join(rootDir, e.name));

    const dirs = entries
        .filter(e => e.isDirectory())
        .map(d => walkFiles(path.join(rootDir, d.name)));

    const recurStep = (await Promise.all(dirs)).flat();
    return [...files, ...recurStep];
}

const sortLanguages = (headerLangs = []) => (a, b) => {
    // comment is always first
    if (a === COMMENT_LANG) return -1;
    if (b === COMMENT_LANG) return 1;
    for (let lang of headerLangs) {
        if (a === lang) return -1;
        if (b === lang) return 1;
    }
    return a.localeCompare(b);
}

const sortRecords = (a, b) => {
    const afile = a[FILE_COLUMN_NAME];
    const bfile = b[FILE_COLUMN_NAME];
    const apath = a[PATH_COLUMN_NAME];
    const bpath = b[PATH_COLUMN_NAME];
    const fileOrd = afile.localeCompare(bfile);
    const pathOrd = apath.localeCompare(bpath);
    if (fileOrd === 0) return pathOrd;
    return fileOrd;
};

const readCSV = async filename => {
    const toObject = (() => {
        let header = null;

        const mapper = (col, data) => {
            if (col === FILE_COLUMN_NAME && !data.endsWith('.json')) {
                return `${data}.json`;
            }
            return data;
        }

        return data => {
            if (!header) {
                header = data;
                return null;
            }
            return header.reduce((r, h, i) => {
                return { ...r, [h]: mapper(h, data[i]) };
            }, {})
        }
    })();

    const parser = createReadStream(filename, { encoding: 'UTF-8' })
        .pipe(csv.parse({ delimiter: CSV_DELIMITER }))
        .pipe(csv.transform(toObject));

    const records = [];
    parser.on('readable', () => {
        let record; while ((record = parser.read()) !== null) {
            records.push(record);
        }
    })

    await finished(parser);

    const langs = Object.keys(omit([
        FILE_COLUMN_NAME, PATH_COLUMN_NAME
    ], records[0]));

    return [langs, records];
}

const readDir = async directory => {
    const isoLangRx = /[a-z]{2}(_[A-Z]{2})?/;
    const langs = (await fs.readdir(directory, { withFileTypes: true }))
        .filter(de => (
            de.isDirectory()
            && (de.name === COMMENT_LANG || isoLangRx.exec(de.name))
        ))
        .map(de => de.name)

    const langMap = Object.fromEntries(await Promise.all(langs.map(async lang => {
        const langPath = path.join(directory, lang)
        const files = (await walkFiles(langPath)).filter(f => f.endsWith('.json'));

        const fileEntries = await Promise.all(files.map(async f => {
            const content = await fs.readFile(f, { encoding: 'UTF-8' });
            return [
                f.replace(langPath, ''),
                foldPaths(JSON.parse(content))
            ];
        }));

        return [lang, Object.fromEntries(fileEntries)];
    })));

    const mapping = langs.reduce((r, lang) => {
        return mergeDeep(r, langMap[lang]);
    }, {});

    const ret = mapObject(mapping, (fk) => {
        const r = {};
        langs.forEach(lang => {
            const lobj = langMap[lang][fk];
            Object.entries(lobj || []).forEach(([k, v]) => {
                if (!r[k]) r[k] = { [lang]: v };
                r[k] = {...r[k], [lang]: v};
            });
        });
        return r;
    });

    return [langs, ret];
}

const foldPaths = records => {
    const result = {};
    for (const i in records) {
        if (typeof records[i] === 'object') {
            const temp = foldPaths(records[i]);
            for (const j in temp) {
                result[i + '.' + j] = temp[j];
            }
        } else {
            result[i] = records[i];
        }
    }
    return result;
}

const unfoldPaths = records => {
    return reduceObject(records, (obj, k, v) => {
        if (!k.includes('.')) return {...obj, [k]: v}

        const segs = k.split(PATH_DELIMITER);
        const last = segs[segs.length - 1];
        if (!obj[segs[0]]) obj[segs[0]] = {};

        const ret = omit(k, obj);
        let cur = ret
        segs.slice(0, -1).forEach(s => {
            if (!cur[s]) cur[s] = {};
            cur = cur[s];
        });
        cur[last] = v;

        return {...obj, ...ret}
    }, {})
};

const parseRecords = async records => {
    const groupByFilePath = records => {
        const aux = groupBy(
            records,
            r => r[FILE_COLUMN_NAME],
            r => omit(FILE_COLUMN_NAME, r),
        );

        return reduceObject(aux, (obj, p, rec) => {
            const g = groupBy(
                rec,
                r => r[PATH_COLUMN_NAME],
                r => omit(PATH_COLUMN_NAME, r),
            );
            const r = mapObject(g, (k, v) => v[0]); // unwrap singleton lists
            return {...obj, [p]: r};
        }, {});
    }

    const parsedRecords = [...records].sort(sortRecords);
    const grouped = groupByFilePath(parsedRecords);
    return grouped;
};

const toRows = records => {
    const d1 = mapObject(records, (k, v) => {
        const nv = mapObject(v, (_, e) => [e]);
        return degroup(nv, PATH_COLUMN_NAME);
    });
    const ret = degroup(d1, FILE_COLUMN_NAME);
    return ret;
}

const getOutputStream = filename => {
    if (filename === '-') return process.stdout;
    return createWriteStream(filename, { encoding: 'UTF-8'})
}


const writeCsv = async (langs, records, filename) => {
    const header = [
        FILE_COLUMN_NAME,
        PATH_COLUMN_NAME,
        ...langs
    ];

    const headerMap = header.reduce((r, col, i) => ({...r, [col]: i}), {});

    const toArray = data => {
        if (Array.isArray(data)) return data;

        const ret = [];
        Object.entries(data).forEach(([k, v]) => {
            ret[headerMap[k]] = v;
        });
        return ret;
    };

    const recordStream = (header, records) => {
        let headerPushed = false
        let recordIdx = 0;
        const dataStrm = Stream.Readable({ objectMode: true, read() {
            if (!headerPushed) {
                this.push(header);
                headerPushed = true;
                return;
            }
            if (recordIdx < records.length) {
                this.push(records[recordIdx]);
                recordIdx++;
            }
        } });
        return dataStrm;
    };

    records.sort(sortRecords);
    const dataStrm = recordStream(header, records);

    const outputStrm = getOutputStream(filename);

    const strm = dataStrm
        .pipe(csv.transform(toArray))
        .pipe(csv.stringify())
        .pipe(outputStrm);

    await finished(strm);
}

module.exports = {
    FILE_COLUMN_NAME,
    PATH_COLUMN_NAME,
    COMMENT_LANG,
    PATH_DELIMITER,
    CSV_DELIMITER,

    sortLanguages,

    readDir,
    readCSV,
    parseRecords,
    unfoldPaths,
    toRows,
    writeCsv,
}