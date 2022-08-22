const { pipeline } = require('stream/promises');
const csvt = require('../lib/csvt');

const updateCmd = async (csvFilename, directory) => {
    await pipeline(
        csvt.csvReader(csvFilename),
        csvt.langFileCollector(directory, true),
    );
}

module.exports = updateCmd;
