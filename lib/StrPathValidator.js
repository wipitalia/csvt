const { fromStrPath, toStrPath } = require('./utils/strpath');

const SEG_TYPE = {
    NODE: 'NODE',
    LEAF: 'LEAF',
};

const scanPath = pathLst => {
    return pathLst.reduce((r, s) => {
        const last = r[r.length - 1];
        const combined = last ? fromStrPath([last, s]) : s;
        return [...r, combined];
    }, []);
}

class StrPathValidator {
    constructor() {
        this._invalidPaths = [];
        this._mapping = {};
    }

    get isValid() {
        return !this._invalidPaths.length;
    }

    get invalidPaths() {
        return this._invalidPaths.map(p => p);
    }

    _checkPath(type, filePath, strPath, path = strPath) {
        const key = `${filePath}:${path}`
        if (!this._mapping[key]) {
            this._mapping[key] = {type, fullPath: strPath};
        }
        return this._mapping[key].type === type;
    }

    _insertInvalid(filePath, testPath, conflictPath = testPath) {
        const { fullPath: conflict } = this._mapping[`${filePath}:${conflictPath}`];
        this._invalidPaths.push({ file: filePath, path: testPath, conflict })
    }

    validate(filePath, strPath) {
        const nodes = toStrPath(strPath).slice(0, -1);

        // check nodes
        scanPath(nodes).forEach(p => {
            if (!this._checkPath(SEG_TYPE.NODE, filePath, strPath, p)) {
                this._insertInvalid(filePath, strPath, p);
            }
        });

        // check leaf
        if (!this._checkPath(SEG_TYPE.LEAF, filePath, strPath)) {
            this._insertInvalid(filePath, strPath);
        }
    }
}

module.exports = StrPathValidator;