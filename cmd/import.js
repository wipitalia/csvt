const { pipeline } = require('stream/promises');
const csvt = require('../lib/csvt');
const checkCmd = require('./check');

const importCmd = async (csvFilename, directory) => {
    await checkCmd(csvFilename);

    const csvReader = csvt.csvReader(csvFilename)
    await pipeline(
        csvReader,
        csvt.langFileCollector(directory, false),
    );
    await pipeline(
        csvReader,
        csvt.fileCleaner(directory),
    );
}

module.exports = importCmd;
