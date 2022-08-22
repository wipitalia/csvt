const {
    STR_PATH_SEP,
} = require('../consts');

const toStrPath = str => str.split(STR_PATH_SEP);

const fromStrPath = sp => sp.join(STR_PATH_SEP);

const getPropByPath = (obj, segments) => {
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

module.exports = {
    toStrPath,
    fromStrPath,
    getPropByPath,
    setPropByPath,
}