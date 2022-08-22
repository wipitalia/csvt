const { pipeline } = require('stream/promises');
const csvt = require('../lib/csvt');

const importCmd = async (csvFilename, directory) => {
    const csvReader = csvt.csvReader(csvFilename)
        // .pipe(require('../lib/utils/streams').logger('ciaone'))

    const ps = [
        pipeline(
            csvReader,
            csvt.langFileCollector(directory, false),
        ),
        pipeline(
            csvReader,
            csvt.fileCleaner(directory),
        ),
    ];

    await Promise.all(ps);
}

module.exports = importCmd;
