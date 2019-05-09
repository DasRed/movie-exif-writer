const DBServiceAbstract = require('./abstract');

class MyApiFilmsIMDB extends DBServiceAbstract {

    /**
     * @return {Object}
     */
    createParameters() {
        return {
            title: this.file.possibleTitle,
            //year: this.file.possibleYear,
        };
    }

    /**
     * @param {Object} data
     * @return {RequesterMovieData[]}
     */
    parseData(data) {
        return data.data
                   .movies
                   .map((movie) => ({
                       title: movie.title,
                       year:  isNaN(Number(movie.year)) ? undefined : Number(movie.year),
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

        return data.data !== undefined && data.data.movies !== undefined;
    }
}

module.exports = MyApiFilmsIMDB;
