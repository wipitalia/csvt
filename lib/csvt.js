const fs = require('fs');
const fsp = require('fs/promises');
const stream = require('stream');
const path = require('path');
const csv = require('csv');

const CLIError = require('./CliError');
const JSONFileWriter = require('./JSONFileWriter');
const EntryRecordBuffer = require('./EntryRecordBuffer');
const StrPathValidator = require('./StrPathValidator');

const { fromStrPath } = require('./utils/strpath');
const { walkFiles, fileExists } = require('./utils');
const { fanIn } = require('./utils/streams');

const {
    FILE_PATH_COL,
    STR_PATH_COL,
    CSV_DELIMITER,
    COMMENT_LANG,
} = require('./consts');

const getLangsFromRecord = rec => {
    return Object.keys(rec).filter(k => ![FILE_PATH_COL, STR_PATH_COL].includes(k));
}

const getLangsFromDir = async directory => {
    const regex = /[a-z]{2}(_[A-Z]{2})?/;
    const langs = (await fsp.readdir(directory, { withFileTypes: true }))
        .filter(e => e.isDirectory() && regex.test(e.name))
        .map(e => e.name);
    return [COMMENT_LANG, ...langs];
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

const langFileFilter = () => f => {
    const regex = new RegExp(`/([a-z]{2}(_[A-Z]{2})?|${COMMENT_LANG})/.*\.json$`)
    return regex.test(f);
}

const walkJsonFiles = async directory => {
    const files = await walkFiles(directory)
    return files.filter(langFileFilter());
}

// translate csv rows to records
const csvAsRecord = () => {
    let header = [];

    const mapper = (col, data) => {
        if (col === FILE_PATH_COL && !data.endsWith('.json')) {
            return `${data}.json`;
        }
        return data;
    }

    const toObject = data => {
        return header.reduce((r, h, i) => {
            return { ...r, [h]: mapper(h, data[i]) };
        }, {});
    }

    const tstrm = new stream.Transform({
        objectMode: true,
        transform(data, enc, done) {
            if (header.length === 0) {
                header = data;
                return done();
            }
            this.push(toObject(data));
            done();
        }
    });

    return tstrm;
}

// read records from csv
const csvReader = filename => {
    return fs.createReadStream(filename, { encoding: 'utf-8' })
        .pipe(csv.parse({ delimiter: CSV_DELIMITER }))
        .pipe(csvAsRecord());
}

// write to csv
const csvWriter = (filename, langs) => {
    const strm = csv.stringify({
        header: true,
        columns: [
            { key: FILE_PATH_COL, value: FILE_PATH_COL },
            { key: STR_PATH_COL, value: STR_PATH_COL },
            ...langs.map(lang => ({ key: lang, value: lang }))
        ]
    });
    const ostrm = fs.createWriteStream(filename, { encoding: 'utf-8' })

    strm.pipe(ostrm);

    return strm;
}

const jsonFlattened = () => {
    const flatKeys = (val, path = []) => {
        if (typeof val !== 'object') {
            return [{ path: fromStrPath(path), string: val }];
        }
        return Object.entries(val).flatMap(([k, v]) => {
            return flatKeys(v, [...path, k]).flat();
        });
    }

    const sortByKey = (a, b) => {
        return a.path.localeCompare(b.path);
    }

    const tstrm = new stream.Transform({
        objectMode: true,
        transform({ filename, data }, enc, done) {
            flatKeys(data).sort(sortByKey).forEach(({ path, string }) => {
                this.push({ filename, path, string });
            });
            done();
        }
    });

    return tstrm;
}

// read parsed JSON from file as stream
const jsonReader = filename => {
    const rstrm = new stream.Readable({
        objectMode: true,
        async read(n) {
            const content = await fsp.readFile(filename, 'utf-8');
            try {
                const data = JSON.parse(content);
                this.push({ filename, data });
                this.push(null);
            } catch (err) {
                if (err.name === SyntaxError.name) {
                    throw CLIError.IO(`error parsing file: ${filename}`, { cause: err });
                }
            }
        }
    })
    return rstrm.pipe(jsonFlattened());
}

// collect records and write to filesystem
const langFileCollector = (directory, preload = false) => {
    const fileMap = {};

    const strm = new stream.Writable({
        objectMode: true,
        async write(rec, enc, done) {
            const ps = getLangsFromRecord(rec).map(async lang => {
                const fname = path.join(directory, lang, rec[FILE_PATH_COL]);
                if (!fileMap[fname]) {
                    fileMap[fname] = new JSONFileWriter(fname, preload);
                    await fileMap[fname].init();
                }
                fileMap[fname].setData(rec[STR_PATH_COL], rec[lang]);
            });
            await Promise.all(ps);
            done();
        },
        async final(done) {
            const ps = Object.entries(fileMap).map(async ([fname, jsonfile]) => {
                await jsonfile.write();
            });
            await Promise.all(ps);
            done();
        }
    });

    return strm;
}

// collect entries from filesystem and return a stream of records
const collectEntries = entryStrm => new Promise(resolve => {
    const erb = new EntryRecordBuffer();

    const rstrm = new stream.Readable({
        objectMode: true,
        read() {
            erb.toArray().forEach(rec => this.push(rec));
            this.push(null);
        }
    })

    entryStrm.on('data', entry => {
        const { lang, fileId } = entry;
        erb.insert(lang, fileId, entry);
    });

    entryStrm.on('end', () => {
        resolve(rstrm);
    });
});

// read filesystem and return stream of records
const langFileReader = async (langs, directory) => {
    const withDetails = (lang, fileId) => {
        return new stream.Transform({
            objectMode: true,
            transform(obj, enc, done) {
                this.push({ lang, fileId, ...obj});
                done();
            }
        });
    };

    const strms = (await Promise.all(langs.map(async lang => {
        const langdir = path.join(directory, lang);
        const files = await walkJsonFiles(langdir);
        return files.map(fname => {
            return jsonReader(fname)
                .pipe(withDetails(lang, fname.replace(langdir, '')))
        });
    }))).flat();
    return collectEntries(fanIn(strms));
}

// remove files not found in csv
const fileCleaner = directory => {
    const fileMap = {};

    const strm = new stream.Writable({
        objectMode: true,
        write(rec, enc, done) {
            getLangsFromRecord(rec).forEach(lang => {
                const fname = path.join(directory, lang, rec[FILE_PATH_COL]);
                fileMap[fname] = true;
            });
            done();
        },
        async final(done) {
            const files = await walkJsonFiles(directory);
            await Promise.all(files.map(async f => {
                const cond = !fileMap[f] && (await fileExists(f));
                if (cond) await fsp.rm(f);
            }));
            done();
        }
    });

    return strm;
}

// check record correctness
const checkRecords = async recordStrm => new Promise(resolve => {
    const validator = new StrPathValidator();

    recordStrm.on('data', rec => {
        validator.validate(rec[STR_PATH_COL]);
    });

    recordStrm.on('end', () => {
        resolve(validator.invalidPaths);
    })
});

module.exports = {
    csvReader,
    csvWriter,
    langFileCollector,
    langFileReader,
    fileCleaner,
    getLangsFromDir,
    jsonReader,
    sortLanguages,
    checkRecords,
}