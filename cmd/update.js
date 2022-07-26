const path = require('path');
const fs = require('fs/promises');
const core = require('../lib/core');
const { mapObject, fileExists, setPropByPath } = require('../lib/utils');

const updateCmd = async (csvFilename, directory) => {
    const [langs, csvContent] = await core.readCSV(csvFilename);
    const records = await core.parseRecords(csvContent);

    await Promise.all(langs.map(async lang => {
        await Promise.all(Object.keys(records).map(async fname => {
            const fpath = path.join(directory, lang, fname);

            const content = (await fileExists(fpath))
                ? JSON.parse(await fs.readFile(fpath, { encoding: 'UTF-8' }))
                : {};
            const newContentFolded = mapObject(records[fname], (k, v) => v[lang]);

            Object.keys(newContentFolded).forEach(p => {
                const ps = p.split(core.PATH_DELIMITER);
                if (newContentFolded[p]) {
                    setPropByPath(content, ps, newContentFolded[p]);
                }
            });

            await fs.mkdir(path.dirname(fpath), { recursive: true })
            await fs.writeFile(
                fpath,
                JSON.stringify(content, null, 4),
                { encoding: 'UTF-8' }
            );
        }));
    }));
};

module.exports = updateCmd;
