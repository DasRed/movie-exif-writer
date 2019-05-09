const EventEmitter = require('events');
const path         = require('path');
const md5          = require('md5');
const winston      = require('winston');
const factory      = require('./dbService/factory');

/**
 * @typedef {Object} RequesterFile
 * @property {string} id
 * @property {string} root
 * @property {string} path
 * @property {string} name
 * @property {string} ext
 * @property {string} possibleTitle
 * @property {string|undefined} possibleYear
 */

/**
 * @typedef {Object} RequesterMovieData
 * @property {string} title
 * @property {string} year
 */

/**
 *
 * @param {string} root
 * @param {string} dir
 * @param {string} file
 * @return {RequesterFile}
 */
function createFile({root, dir, file: fileName}) {
    const file = {
        id:   md5(dir.substr(root.length + 1) + fileName),
        root,
        path: dir.substr(root.length + 1),
        name: path.basename(fileName, path.extname(fileName)),
        ext:  path.extname(fileName).substr(1),

        possibleTitle: path.basename(fileName, path.extname(fileName)),
        possibleYear:  undefined,

        metaTitle: undefined,
        metaYear: undefined,
    };

    // find matching year
    let possibleYear = root.match(/\d{4}/);
    if (possibleYear === null || possibleYear.length === 0) {
        possibleYear = dir.match(/\d{4}/);
    }
    if (possibleYear !== null && possibleYear.length >= 1) {
        file.possibleYear = isNaN(Number(possibleYear[0])) ? undefined : Number(possibleYear[0]);
    }

    // remove some "(2018)" year from title
    let possibleTitle = file.possibleTitle.match(/(.*?)\(\d{4}\)/);
    if (possibleTitle !== null && possibleTitle.length >= 2) {
        file.possibleTitle = possibleTitle[1].trim();
    }

    // remove "(CD 1)" from title
    possibleTitle = file.possibleTitle.match(/(.*?)\(CD \d{1}\)/);
    if (possibleTitle !== null && possibleTitle.length >= 2) {
        file.possibleTitle = possibleTitle[1].trim();
    }

    // remove "(Directors Cut)" from title
    possibleTitle = file.possibleTitle.match(/(.*?)\(Directors Cut\)/);
    if (possibleTitle !== null && possibleTitle.length >= 2) {
        file.possibleTitle = possibleTitle[1].trim();
    }

    return file;
}

/**
 * @fires Requester#created
 * @fires Requester#start
 * @fires Requester#success
 * @fires Requester#error
 * @fires Requester#complete
 */
class Requester extends EventEmitter {
    /**
     *
     * @param {string} root
     * @param {string} dir
     * @param {string} file
     * @param {Object<string,Function>} [on = {}]
     * @param {Object<string,Function>} [once = {}]
     */
    constructor({root, dir, file, on = {}, once = {}}) {
        super();

        /** @type {RequesterMovieData[]} */
        this.data = undefined;
        this.file = createFile({
            root,
            dir,
            file
        });

        this.dbService = factory(this);

        Object.entries(on).forEach(([name, listener]) => this.on(name, listener));
        Object.entries(once).forEach(([name, listener]) => this.once(name, listener));

        /**
         * @event Requester#created
         * @param {RequesterFile} file
         */
        this.emit('created', this.file);
    }

    /**
     *
     * @return {Promise<Requester>}
     */
    async request() {
        /**
         * @event Requester#start
         * @param {RequesterFile} file
         */
        this.emit('start', this.file);
        winston.debug('start request for ' + this.file.name);

        try {
            const data = await this.dbService.fetch();
            this.data  = data.sort((entryA, entryB) => {
                if (entryA.title !== entryB.title && entryA.title === this.file.possibleTitle) {
                    return -1;
                }

                if (entryA.title !== entryB.title && entryB.title === this.file.possibleTitle) {
                    return 1;
                }

                if (this.file.possibleYear === undefined) {
                    return 0;
                }

                if (entryA.year !== undefined && entryB.year === undefined) {
                    return -1;
                }

                if (entryA.year === undefined && entryB.year !== undefined) {
                    return 1;
                }

                const yearA = Math.abs(entryA.year - this.file.possibleYear);
                const yearB = Math.abs(entryB.year - this.file.possibleYear);

                if (yearA < yearB) {
                    return -1;
                }

                if (yearA > yearB) {
                    return 1;
                }

                return 0;
            });

            /**
             * @event Requester#success
             * @param {RequesterFile} file
             * @param {RequesterMovieData[]} data
             */
            this.emit('success', this.file, this.data);
        }
        catch (error) {
            winston.error('error for ' + this.file.name + ' ' + (error ? error.merge : error));

            /**
             * @event Requester#error
             * @param {RequesterFile} file
             * @param {Error} error
             */
            this.emit('error', this.file, error);
        }

        /**
         * @event Requester#complete
         * @param {RequesterFile} file
         */
        this.emit('complete', this.file);
        winston.debug('done for ' + this.file.name);

        return this;
    }
}

module.exports = Requester;
