const csvt = require('../lib/csvt');
const { toArray } = require('../lib/utils/streams');
const CLIError = require('../lib/CliError');

const {
    FILE_PATH_COL,
    STR_PATH_COL,
} = require('../lib/consts');

const sortRecords = (a, b) => {
    const fncmp = a[FILE_PATH_COL].localeCompare(b[FILE_PATH_COL]);
    if (fncmp) return fncmp;
    return a[STR_PATH_COL].localeCompare(b[STR_PATH_COL]);
}

// TODO: this is O(2NM) (O(2N^2) if N = M), see: https://stackoverflow.com/a/1313218
const diffRecords = (csvRecords, fsRecords) => {
    const eqRecords = (a, b) => {
        return a[FILE_PATH_COL] === b[FILE_PATH_COL]
            && a[STR_PATH_COL] === b[STR_PATH_COL];
    }

    const containsRecord = (lst, rec) => {
        for (let i = 0; i < lst.length; i++) {
            if (eqRecords(lst[i], rec)) return true
        }
        return false;
    }

    return {
        csvExtra: csvRecords.filter(r => !containsRecord(fsRecords, r)),
        fsExtra: fsRecords.filter(r => !containsRecord(csvRecords, r)),
    }
}

const printDiffReport = ({ csvExtra, fsExtra }) => {
    const printRecord = (prefix, rec) => {
        console.log(`${prefix}\t${rec[FILE_PATH_COL]} ${rec[STR_PATH_COL]}`);
    }

    if (csvExtra.length) console.log('records missing from fs:')
    csvExtra.forEach(r => printRecord('\tcsv:', r));

    if (fsExtra.length) console.log('records missing from csv:')
    fsExtra.forEach(r => printRecord('\tfs:', r));
}

const diffCmd = async (csvFilename, directory) => {
    const langs = await csvt.getLangsFromDir(directory);

    const fsRecords = await toArray(await csvt.langFileReader(langs, directory));
    const csvRecords = await toArray(csvt.csvReader(csvFilename));

    fsRecords.sort(sortRecords);
    csvRecords.sort(sortRecords);

    const diffReport = diffRecords(csvRecords, fsRecords);

    printDiffReport(diffReport);
    if (diffReport.csvExtra.length || diffReport.fsExtra.length) {
        throw CLIError.DIFF();
    }
}

module.exports = diffCmd;