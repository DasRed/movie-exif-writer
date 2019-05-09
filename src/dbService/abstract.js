const fetch       = require('node-fetch');
const querystring = require('querystring');
const winston     = require('winston');

class DBServiceAbstract {
    /**
     *
     * @param {Requester} requester
     */
    constructor(requester) {
        this.requester = requester;
        this.file      = requester.file;
        this.url       = process.env.API_HOST;
    }

    /**
     * @return {Object}
     */
    createParameters() {
        throw new Error('createParameters must be overwritten');
    }

    /**
     *
     * @return {Promise<RequesterMovieData[]>}
     */
    async fetch() {
        const params = this.createParameters();

        winston.debug('fetching for ' + this.file.name);
        const response = await fetch(this.url + (this.url.includes('?') ? '&' : '?') + querystring.stringify(params));
        const data     = await response.json();

        if (data === undefined) {
            throw new Error('No data retrieved for ' + this.file.name);
        }

        const validateResult = this.validateData(data);
        if (validateResult === false) {
            throw new Error('invalid response for ' + this.file.name + ' : ' + JSON.stringify(data));
        }

        return this.parseData(data);
    }

    /**
     * @param {Object} data
     * @return {RequesterMovieData[]}
     */
    parseData(data) {
        throw new Error('parseData must be overwritten');
    }

    /**
     * @param {Object} data
     * @return {boolean}
     */
    validateData(data) {
        throw new Error('validateData must be overwritten');
    }
}

module.exports = DBServiceAbstract;
