const TMDB           = require('./TMDB');
const MyApiFilmsIMDB = require('./MyApiFilmsIMDB');
const MyApiFilmsTMDB = require('./MyApiFilmsTMDB');

/**
 *
 * @param {Requester} requester
 * @return {MyApiFilmsIMDB|MyApiFilmsTMDB|TMDB}
 */
module.exports = function factory(requester) {
    switch (process.env.API_TYPE) {
        case 'TMDB':
            return new TMDB(requester);

        case 'MyApiFilmsIMDB':
            return new MyApiFilmsIMDB(requester);

        case 'MyApiFilmsTMDB':
            return new MyApiFilmsTMDB(requester);

        default:
            throw new Error('Unknown Movie Database API Type: ' + process.env.API_TYPE);
    }
};
