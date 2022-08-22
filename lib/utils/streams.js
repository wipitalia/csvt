const stream = require('stream');

const logger = prefix => {
    return new stream.Transform({
        objectMode: true,
        transform(data, enc, done) {
            if (prefix) console.log(prefix, data);
            console.log(data);
            this.push(data);
            done();
        }
    });
}

const fanIn = (streams = []) => {
    const instrms = streams.map(s => s);

    const pipeNext = () => {
        const nextStream = instrms.shift();
        if (!nextStream) return out.end();
        nextStream.pipe(out, { end: false });
        nextStream.on('end', pipeNext);
    }

    const out = new stream.PassThrough({ objectMode: true });
    pipeNext();

    return out;
}

module.exports = {
    logger,
    fanIn,
}