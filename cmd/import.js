const path = require('path');
const fs = require('fs/promises');
const core = require('../lib/core');
const { mapObject, fileExists } = require('../lib/utils');

const importCmd = async (csvFilename, directory) => {
    const [langs, csvContent] = await core.readCSV(csvFilename);
    const records = await core.parseRecords(csvContent);

    const dirs = (await fs.readdir(directory, { withFileTypes: true }))
        .filter(de => de.isDirectory())

    await Promise.all(dirs.map(async d => {
        const p = path.join(directory, d.name);
        if (await fileExists(p)) {
            await fs.rm(p, { recursive: true, force: true });
        }
    }));

    await Promise.all(langs.map(async lang => {
        await Promise.all(Object.keys(records).map(async fname => {
            const fpath = path.join(directory, lang, fname);

            const content = core.unfoldPaths(
                mapObject(records[fname], (k, v) => v[lang])
            );

            await fs.mkdir(path.dirname(fpath), { recursive: true })
            await fs.writeFile(
                fpath,
                JSON.stringify(content, null, 4),
                { encoding: 'UTF-8' }
            );
        }));
    }));
};

module.exports = importCmd;
