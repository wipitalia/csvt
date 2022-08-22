const { FILE_PATH_COL, STR_PATH_COL } = require('./consts');

class EntryRecordBuffer {
    constructor() {
        this.entryMap = {};
    }

    insert(language, filename, entry) {
        if (!this.entryMap[filename]) {
            this.entryMap[filename] = {};
        }

        if (!this.entryMap[filename][entry.path]) {
            this.entryMap[filename][entry.path] = {
                [FILE_PATH_COL]: filename,
                [STR_PATH_COL]: entry.path,
            };
        }

        this.entryMap[filename][entry.path] = {
            ...this.entryMap[filename][entry.path],
            [language]: entry.string,
        }
    }

    toArray(sort) {
        const arr = Object.values(this.entryMap).reduce((r, e) => {
            return [ ...r, ...Object.values(e)].flat();
        }, []);

        if (sort) arr.sort(sort);

        return arr;
    }
}

module.exports = EntryRecordBuffer;