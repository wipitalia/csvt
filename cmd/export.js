const core = require('../lib/core');

const exportCmd = async (csvFilename, directory) => {
    const [langs, records] = await core.readDir(directory);
    const rows = await core.toRows(records);
    await core.writeCsv(langs, rows, csvFilename);
}

module.exports = exportCmd;