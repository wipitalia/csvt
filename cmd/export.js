const csvt = require('../lib/csvt');

const exportCmd = async (csvFilename, directory, { headerLangs }) => {
    const langs = await csvt.getLangsFromDir(directory);
    langs.sort(csvt.sortLanguages(headerLangs));

    const langFileReader = await csvt.langFileReader(langs, directory);

    langFileReader
        .pipe(csvt.csvWriter(csvFilename, langs));
}

module.exports = exportCmd;