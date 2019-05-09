import $ from './jquery.mjs';
import lodash from './lodash.mjs';

class Client {
    /**
     *
     * @param {string} url
     * @param {Object} element
     * @param {JQuery} element.list
     * @param {JQuery} element.waiting
     * @param {JQuery} element.requesting
     * @param {JQuery} element.requested
     * @param {JQuery} element.requestIn
     * @param {JQuery} element.input
     * @param {JQuery} element.button
     * @param {Object} template
     * @param {Object} template.line
     */
    constructor({url, element, template}) {
        this.socket   = new WebSocket(url);
        this.element  = element;
        this.template = template;

        this.element.button.on('click', () => this.send({
            type: 'scan',
            path: this.element.input.val()
        }));
        this.socket.addEventListener('open', () => this.send({type: 'files'}));
        this.socket.addEventListener('message', (event) => this.receive(event.data));
    }

    /**
     *
     * @param {string} data
     * @return {Client}
     */
    async receive(data) {
        try {
            const message = JSON.parse(data);

            if ((message instanceof Object) === false || message.type === undefined) {
                throw new Error('Invalid message structure.');
            }

            switch (message.type) {
                case 'queue':
                    this.renderQueue(message);
                    break;

                case 'file':
                    this.renderLine(message);
                    break;

                case 'files':
                    message.files.forEach((file) => this.renderLine(file));
                    break;

                default:
                    throw new Error('Unknown message type: ' + message.type);
            }
        }
        catch (error) {
            console.error(error, {
                data,
                trace: error.stack
            });
        }

        return this;
    }

    /**
     *
     * @param {RequesterFile|{status: string}} file
     * @return {Client}
     */
    renderLine(file) {
        const elementPrevious = $('#m-' + file.id);
        const html            = lodash.template(this.template.line)(file);

        if (elementPrevious.length !== 0) {
            elementPrevious.before(html);
            elementPrevious.detach();
        }
        else {
            this.element.list.append(html);
        }

        return this;
    }

    /**
     *
     * @param {Object} counts
     * @param {number} counts.waiting
     * @param {number} counts.requesting
     * @param {number} counts.requested
     * @param {number} counts.requestIn
     * @return {Client}
     */
    renderQueue(counts) {
        this.element.waiting.html(counts.waiting);
        this.element.requesting.html(counts.requesting);
        this.element.requested.html(counts.requested);
        this.element.requestIn.html(counts.requestIn === -1 ? 0 : counts.requestIn);

        clearInterval(this.interval);
        if (counts.requestIn) {
            let value     = counts.requestIn;
            this.interval = setInterval(() => {
                value -= 10;
                if (value <= 0) {
                    this.element.requestIn.html(0);
                }
                else {
                    this.element.requestIn.html(value);
                }
            }, 10);
        }

        return this;
    }

    /**
     *
     * @param {*} data
     * @return {Client}
     */
    send(data) {
        this.socket.send(JSON.stringify(data));

        return this;
    }
}

export default Client;

