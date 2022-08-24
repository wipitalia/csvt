const fs = require('fs/promises');
const path = require('path');
const { setPropByPath, toStrPath } = require('./utils/strpath');
const { fileExists } = require('./utils');

class JSONFileWriter {
    constructor(filename, preload = false) {
        this.filename = filename;
        this.preload = preload;
        this.data = {};
    }

    async init() {
        if (this.preload && (await fileExists(this.filename))) {
            const content = await fs.readFile(this.filename, 'utf-8');
            this.data = JSON.parse(content || '{}');
        }
    }

    setData(path, value) {
        if (typeof path === 'string') {
            path = toStrPath(path);
        }
        if (this.preload && !value) return;
        setPropByPath(this.data, path, value);
    }

    async write() {
        const content = JSON.stringify(this.data, null, 4);
        await fs.mkdir(path.dirname(this.filename), { recursive: true });
        await fs.writeFile(this.filename, content, 'utf-8');
    }
}

module.exports = JSONFileWriter;