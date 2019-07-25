const winston   = require('winston');
const fsp       = require('fs').promises;
const path      = require('path');
const Requester = require('./requester');
const Queue     = require('./queue');

class Handler {
    /**
     *
     * @param {WebSocket} socket
     */
    constructor(socket) {
        winston.debug('Connection via Websocket established.');

        this.queue     = new Queue({
            on: {
                add:      () => this.sendQueueUpdate(),
                start:    () => this.sendQueueUpdate(),
                complete: () => this.sendQueueUpdate(),
            }
        });
        this.socket    = socket;
        this.onClose   = this.onClose.bind(this);
        this.onMessage = this.onMessage.bind(this);
        this.onError   = this.onError.bind(this);

        this.socket.on('message', this.onMessage)
            .on('error', this.onError)
            .on('close', this.onClose);

        this.sendQueueUpdate();
    }

    /**
     *
     * @param {string} root
     * @param {string} dir
     * @param {string} file
     * @return {Handler}
     */
    handleFile(root, dir, file) {
        const requester = new Requester({
            root,
            dir,
            file,
            on: {
                created:  (file) => this.send({
                    type:   'file',
                    status: 'waiting',
                    ...file,
                }),
                start:    (file) => this.send({
                    type:   'file',
                    status: 'requesting',
                    ...file,
                }),
                metadata: (file, data) => this.send({
                    type:     'file',
                    status:   'requesting',
                    ...file,
                    metadata: data,
                }),
                success:  (file, data) => this.send({
                    type:   'file',
                    status: 'success',
                    ...file,
                    movies: data
                }),
                error:    (file, error) => this.send({
                    type:    'file',
                    status:  'error',
                    message: error.message || error,
                    ...file,
                }),
            }
        });

        this.queue.add(requester);

        return this;
    }

    /**
     *
     * @return {this}
     */
    onClose() {
        this.socket.off('message', this.onMessage)
            .off('error', this.onError)
            .off('close', this.onClose);

        return this;
    }

    /**
     *
     * @param {Error} error
     * @return {this}
     */
    onError(error) {
        winston.error(error);
        this.socket.close(500);

        return this;
    }

    /**
     *
     * @param {string} data
     * @return {Promise<this>}
     */
    async onMessage(data) {
        try {
            const message = JSON.parse(data);

            if ((message instanceof Object) === false || message.type === undefined) {
                throw new Error('Invalid message structure.');
            }

            winston.debug('receive message', message);

            switch (message.type) {
                /** @example {"type": "scan", "path": "/Volumes/Media/Movies"} */
                case 'scan':
                    await this.scan(message.path);
                    break;

                /** @example {"type": "files"} */
                case 'files':
                    this.send({
                        type:  'files',
                        files: this.queue.queue.map((entry) => ({
                            status: entry.status,
                            ...entry.requester.file,
                        }))
                    });
                    break;

                default:
                    throw new Error('Unknown message type: ' + message.type);
            }
        }
        catch (error) {
            winston.error(error, {
                data,
                trace: error.stack
            });
            this.send({
                error:   true,
                message: error.message || error,
            });
        }

        return this;
    }

    /**
     *
     * @param {string} dir
     * @param {string} root
     * @return {Promise<Handler>}
     */
    async scan(dir, root = dir) {
        const files = await fsp.readdir(dir);

        files.forEach(async (file) => {
            const pathFull = path.join(dir, file);
            const stats    = await fsp.stat(pathFull);

            if (stats.isDirectory() === true) {
                this.scan(pathFull, root);
            }
            else if (file.includes('._') === false) {
                this.handleFile(root, dir, file);
            }
        });

        return this;
    }

    /**
     *
     * @param {*} data
     * @return {this}
     */
    send(data) {
        this.socket.send(JSON.stringify(data));

        return this;
    }

    /**
     *
     * @return {Handler}
     */
    sendQueueUpdate() {
        const counts = this.queue.counts;
        this.send({
            type:       'queue',
            waiting:    counts.waiting,
            requesting: counts.requesting,
            requested:  counts.requested,
            requestIn:  counts.inInterval >= this.queue.maxPerInterval ? counts.requestIn : -1,
        });

        return this;
    }
}

module.exports = Handler;
