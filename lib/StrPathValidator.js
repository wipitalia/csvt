const { fromStrPath, toStrPath } = require('./utils/strpath');

const SEG_TYPE = {
    NODE: 'NODE',
    LEAF: 'LEAF',
};

const scanPath = pathLst => {
    return pathLst.reduce((r, s) => {
        const last = r[r.length - 1];
        const combined = last ? toStrPath(last, s) : s;
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

    _checkPath(type, strPath, path = strPath) {
        if (!this._mapping[path]) this._mapping[path] = {type, fullPath: strPath};
        return this._mapping[path].type === type;
    }

    _insertInvalid(testPath, conflictPath = testPath) {
        const { fullPath: conflict } = this._mapping[conflictPath];
        this._invalidPaths.push({ path: testPath, conflict })
    }

    validate(strPath) {
        const nodes = fromStrPath(strPath).slice(0, -1);

        // check nodes
        scanPath(nodes).forEach(p => {
            if (!this._checkPath(SEG_TYPE.NODE, strPath, p)) {
                this._insertInvalid(strPath, p);
            }
        });

        // check leaf
        if (!this._checkPath(SEG_TYPE.LEAF, strPath)) {
            this._insertInvalid(strPath);
        }
    }
}

module.exports = StrPathValidator;