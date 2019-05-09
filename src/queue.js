const winston      = require('winston');
const EventEmitter = require('events');
const moment       = require('moment');

/**
 * @typedef {Object} QueueEntry
 * @property {Requester} requester
 * @property {moment.Moment} [start]
 * @property {moment.Moment} [end]
 * @property {string} status
 *
 */

/**
 * @fires Queue#add
 * @fires Queue#start
 * @fires Queue#complete
 */
class Queue extends EventEmitter {
    static STATUS = {
        WAITING:    'waiting',
        REQUESTING: 'requesting',
        REQUESTED:  'requested',
    };

    /**
     *
     * @return {{waitingEntries: QueueEntry[], waiting: number, requesting: number, requested: number, inInterval: number, inDay: number, requestIn: number}}
     */
    get counts() {
        const now = moment();
        return this.queue.reduce((acc, entry) => {
            if (entry.status === Queue.STATUS.WAITING) {
                acc.waitingEntries.push(entry);
                acc.waiting++;
            }

            acc.requesting += Number(entry.status === Queue.STATUS.REQUESTING);
            acc.requested += Number(entry.status === Queue.STATUS.REQUESTED);
            acc.inDay += Number(entry.start !== undefined && now.diff(entry.start, 'days') === 0);

            if (entry.end !== undefined) {
                const diff = now.diff(entry.end);
                if (diff <= this.interval) {
                    acc.inInterval++;
                    acc.requestIn = acc.requestIn === -1 || acc.requestIn > this.interval - diff ? this.interval - diff : acc.requestIn;
                }
            }

            return acc;
        }, {
            waitingEntries: [],
            waiting:        0,
            requesting:     0,
            requested:      0,
            inInterval:     0,
            inDay:          0,
            requestIn:      -1,
        });
    }

    /**
     *
     * @param {number} [maxPerDay = process.env.QUEUE_MAX_PER_DAY]
     * @param {number} [maxAtSameTime = process.env.QUEUE_MAX_AT_SAME_TIME]
     * @param {number} [maxPerInterval = process.env.QUEUE_MAX_PER_INTERVAL]
     * @param {number} [interval = process.env.QUEUE_INTERVAL]
     * @param {Object<string,Function>} [on = {}]
     * @param {Object<string,Function>} [once = {}]
     */
    constructor({
                    maxPerDay = process.env.QUEUE_MAX_PER_DAY,
                    maxAtSameTime = process.env.QUEUE_MAX_AT_SAME_TIME,
                    maxPerInterval = process.env.QUEUE_MAX_PER_INTERVAL,
                    interval = process.env.QUEUE_INTERVAL,
                    on = {},
                    once = {}
                } = {}) {
        super();

        this.maxPerDay      = maxPerDay;
        this.maxAtSameTime  = maxAtSameTime;
        this.maxPerInterval = maxPerInterval;
        this.interval       = interval;
        /** @type {Number} */
        this.timer = undefined;

        Object.entries(on).forEach(([name, listener]) => this.on(name, listener));
        Object.entries(once).forEach(([name, listener]) => this.once(name, listener));

        /** @type {QueueEntry[]} */
        this.queue = [];
    }

    /**
     *
     * @param {Requester} requester
     * @return {Queue}
     */
    add(requester) {
        /** @type {QueueEntry} */
        const entry = {
            requester,
            status: Queue.STATUS.WAITING,
        };
        this.queue.push(entry);

        requester.on('start', () => {
            entry.status = Queue.STATUS.REQUESTING;
            entry.start  = moment();

            /**
             * @event Queue#start
             * @param {Requester} requester
             */
            this.emit('start', requester);
        });

        requester.on('complete', () => {
            entry.status = Queue.STATUS.REQUESTED;
            entry.end    = moment();

            /**
             * @event Queue#complete
             * @param {Requester} requester
             */
            this.emit('complete', requester);

            this.run();
        });

        /**
         * @event Queue#add
         * @param {Requester} requester
         */
        this.emit('add', requester);

        this.run();

        return this;
    }

    /**
     *
     * @return {Queue}
     */
    run() {
        if (this.timer !== undefined) {
            clearTimeout(this.timer);
            this.timer = undefined;
        }

        const counts = this.counts;

        // max per day reached!
        if (counts.inDay >= this.maxPerDay) {
            const diff = moment().add(1, 'day').startOf('day').diff(moment());
            this.timer = setTimeout(() => this.run(), diff);

            winston.warn('max per day reached. Next run in ' + diff + 'ms.');

            return this;
        }

        // max per interval
        if (counts.inInterval >= this.maxPerInterval) {
            this.timer = setTimeout(() => this.run(), counts.requestIn);
            winston.warn('max per interval reached. Next run in ' + counts.requestIn + 'ms.');
            return this;
        }

        // max per requesting at same time
        if (counts.requesting >= this.maxAtSameTime) {
            // nothing to do!, finished requests will trigger automaticaly a new run
            return this;
        }

        // max per interval with current requesting
        if (counts.requesting + counts.inInterval >= this.maxPerInterval) {
            // nothing to do!, finished requests will trigger automaticaly a new run
            return this;
        }

        // run next
        counts.waitingEntries
              .slice(0, this.maxAtSameTime)
              .forEach((entry) => entry.requester.request());

        return this;
    }
}

module.exports = Queue;
