const moment            = require('moment');
const DBServiceAbstract = require('./abstract');

class MyApiFilmsTMDB extends DBServiceAbstract {

    /**
     * @return {Object}
     */
    createParameters() {
        return {
            movieName:  this.file.possibleTitle,
            searchYear: this.file.possibleYear,
        };
    }

    /**
     * @param {Object} data
     * @return {RequesterMovieData[]}
     */
    parseData(data) {
        return data.data
                   .results
                   .map((movie) => ({
                       title: movie.title,
                       year:  moment(movie.release_date).year(),
                   }));
    }

    /**
     * @param {Object} data
     * @return {boolean}
     */
    validateData(data) {
        if (data.error !== undefined) {
            throw new Error(data.error.message);
        }

        return data.data !== undefined && data.data.results !== undefined;
    }
}

module.exports = MyApiFilmsTMDB;
