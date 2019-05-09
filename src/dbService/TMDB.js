const moment            = require('moment');
const DBServiceAbstract = require('./abstract');

class TMDB extends DBServiceAbstract {

    /**
     * @return {Object}
     */
    createParameters() {
        return {
            query: this.file.possibleTitle,
            //year: this.file.possibleYear,
        };
    }

    /**
     * @param {Object} data
     * @return {RequesterMovieData[]}
     */
    parseData(data) {
        return data.results
                   .map((movie) => ({
                       title: movie.title,
                       year:  moment(movie.release_date).year(),
                   }));
    }

    /**
     * @param {Object} data
     * @return {boolean|string}
     */
    validateData(data) {
        if (data.status_message !== undefined) {
            throw new Error(data.status_message);
        }

        return data.results !== undefined;
    }
}

module.exports = TMDB;
