const csvt = require('../lib/csvt');
const CLIError = require('../lib/CliError');

const checkCmd = async (csvFilename) => {
    const csvRecords = csvt.csvReader(csvFilename);
    const invalidPaths = await csvt.checkRecords(csvRecords);

    if (invalidPaths.length) {
        console.error('found invalid paths:');
        invalidPaths.forEach(({ path, conflict }) => {
            console.error(`\t${path} (conflict: ${conflict})`);
        });
        throw CLIError.INVALID_STR_PATH();
    }
}

module.exports = checkCmd;