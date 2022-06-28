const counties = JSON.parse(require('fs').readFileSync('./us-county-boundaries.geojson'));

const final = {};

const geohash = require('ngeohash');
for (let i = 0; i < counties.features.length; i++){
    const [lat, long] = counties.features[i].properties.geo_point_2d;
    const hash = geohash.encode(lat, long, 3);
    if (!final[hash]) {
        final[hash] = {
            features: [],
            type: counties.type
        };
    }
    final[hash].features.push(counties.features[i]);
}

const async = require('async');

async.each(Object.keys(final), (coll, cb) => {
    const fn = './geohash-' + coll + '.json';
    console.log(fn);
    require('fs').writeFileSync(fn, JSON.stringify(final[coll]), 'utf-8');
    return cb();
});