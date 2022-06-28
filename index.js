const counties = {};
const GeoJsonGeometriesLookup = require('geojson-geometries-lookup');
const async = require('async');
const geohash = require('ngeohash');
const localCache = {};

exports.handler = (event, context, callback) => {

    const now = new Date().getTime();
    let filesRead = 0;


    const done = (err, res) => {
        const later = new Date().getTime();
        const time = (later - now);
        if (err) {
            err.responseTimeMs = time;
            err.filesRead = filesRead;
        } else {
            res.responseTimeMs = time;
            res.filesRead = filesRead;
        }
        const returnObj = {
            statusCode: err ? '400' : '200',
            body: err ? JSON.stringify(err) : JSON.stringify(res),
            headers:
            {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        };
        console.log('Returning object ' + JSON.stringify(returnObj));

        return callback(null, returnObj);
    };



    console.log(event);


    if (!event.queryStringParameters) {
        return done(null, {});
    }
    const lat = Number(event.queryStringParameters.lat);
    const long = Number(event.queryStringParameters.long);
    
    if (!lat || !long) {
        return done({ error: 'lat/long not specified' });
    }
    
    const bigHash = geohash.encode(lat, long, 6);

    if (localCache[bigHash]) {
        console.log('Returning from cache');
        return done(null, localCache[bigHash]);
    }

    //Assuming our results are not in the in-memory cache, we need to geohash the lat & long:

    const hash = geohash.encode(lat, long, 3);

    //We not only cache direct results in memory, but we also cache the geohash files.

    if (!counties[hash]) {
        console.log('Reading geohash-' + hash + ' into memory');
        try {
            filesRead++;
            counties[hash] = JSON.parse(require('fs').readFileSync('./geohash-' + hash + '.json'));
        } catch (e) {
            console.log('File not found, skipping');
        }
    }



    async.series([
        (cb) => {
            if (counties[hash]) {
                const glookup = new GeoJsonGeometriesLookup(counties[hash]);
                const point1 = { type: 'Point', coordinates: [long, lat] };
                const final = glookup.getContainers(point1);
                console.log('Trying ' + hash);
                
                if (final.features && final.features[0] && final.features[0].properties) {
                    const returnObj = { county: final.features[0].properties.name };
                    localCache[bigHash] = returnObj;
                    return done(null, returnObj);
                } else {
                    console.log('Results not in this hash file.');
                    return cb();
                }
            } else {
                console.log('Could not read hash file.');
                return cb();
            }
        },
        (cb) => {
            //find neighbors
            const neighbors = geohash.neighbors(hash);
            async.eachSeries(neighbors, (it, cb) => {
                if (!counties[it]) {
                    console.log('Reading geohash-' + it + ' into memory');
                    try {
                        counties[it] = JSON.parse(require('fs').readFileSync('./geohash-' + it + '.json'));
                        filesRead++;
                    } catch (e) {
                        console.log('File not found, skipping');
                    }
                }
                if (counties[it]) {
                    const glookup = new GeoJsonGeometriesLookup(counties[it]);
                    const point1 = { type: 'Point', coordinates: [long, lat] };
                    const final = glookup.getContainers(point1);
                    console.log('Trying ' + it);
                    if (final.features && final.features[0] && final.features[0].properties) {
                        const returnObj = { county: final.features[0].properties.name };
                        localCache[bigHash] = returnObj;
                        return done(null, returnObj);
                    }
                }
                return cb();
            }, () => {
                console.log('Returning error, county not found');
                return done({ error: 'county not found' });
            });
        }
    ]);
};