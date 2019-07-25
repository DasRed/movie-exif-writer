const ffmetadata = require("ffmetadata");

/**
 * @typedef {Object} MetadataEntry
 * @property {string} [title]
 * @property {string} [disc]
 * @property {string} [date]
 */

class Metadata {
    /**
     *
     * @param {string} file
     * @return {Promise<MetadataEntry, *>}
     */
    static read(file) {
        return new Promise((resolve, reject) => ffmetadata.read(file, (err, data) => err ? reject(err) : resolve(data)));
    }

    /**
     *
     * @param {string} file
     * @param {MetadataEntry} data
     * @return {Promise<undefined, *>}
     */
    static write(file, data) {
        return new Promise((resolve, reject) => ffmetadata.write(file, data, (err, data) => err ? reject(err) : resolve()));
    }
}

module.exports = Metadata;
