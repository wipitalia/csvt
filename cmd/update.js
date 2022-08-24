const { pipeline } = require('stream/promises');
const csvt = require('../lib/csvt');
const checkCmd = require('./check');

const updateCmd = async (csvFilename, directory) => {
    await checkCmd(csvFilename);
    await pipeline(
        csvt.csvReader(csvFilename),
        csvt.langFileCollector(directory, true),
    );
}

module.exports = updateCmd;
