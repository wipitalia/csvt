const { helpText } = require('../lib/utils');

const helpCmd = () => {
    console.log(helpText(`
        USAGE:
            csvt -h|--help
            csvt help
            csvt [-l|--langs LANGS] OPERATION [CSVFILE [DIR]]

        OPERATIONS:
            help: show this help
            export: reads DIR and writes to CSVFILE
            import: deletes DIR content and creates a new structure reading CSVFILE
            update: reads CSVFILE and updates DIR without deletion
            check: (WIP) checks CSVFILE correctness and reports not found strings

        FLAGS:
            -l/--langs: comma separated list of languages dictating the order
                        of the columns in CSVFILE (applies only to export operation)

        ARGUMENTS:
            OPERATION: see OPERATIONS
            CSVFILE: csv file containing structure informations. defaults to $PWD/i18n.csv
            DIR: directory containing filesystem structure. defaults to $PWD
    `));
}

module.exports = helpCmd;