const { helpText } = require('../lib/utils');

const helpCmd = () => {
    console.log(helpText(`
        USAGE:
            csvt -h|--help
            csvt help
            csvt [-l|--langs LANGS] OPERATION [DIR [CSVFILE]]

        OPERATIONS:
            help: show this help
            export: reads DIR and writes to CSVFILE
            import: deletes DIR content and creates a new structure reading CSVFILE
            update: reads CSVFILE and updates DIR without deletion
            check: checks CSVFILE correctness
            diff: reports differences between CSVFILE and DIR

        FLAGS:
            -l/--langs: comma separated list of languages dictating the order
                        of the columns in CSVFILE (applies only to export operation)

        ARGUMENTS:
            OPERATION: see OPERATIONS
            DIR: directory containing filesystem structure. defaults to $PWD
            CSVFILE: csv file containing structure informations. defaults to DIR/i18n.csv
    `));
}

module.exports = helpCmd;