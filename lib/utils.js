const fs = require('fs/promises');
const path = require('path');

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

const fileExists = async path => {
    try {
        await fs.access(path);
        return true;
    } catch {
        return false;
    }
}

module.exports = {
    walkFiles,
    fileExists,
}