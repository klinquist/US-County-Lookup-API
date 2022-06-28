## USA County Lookup API

This API is designed to be used as a Lambda accessed as an HTTP GET with query string parametrs of `lat` and `long`.

First, install dependencies via `npm install`.

Then, obtain the us-county-boundaries.geojson file.   As of this typing, this file is 200mb.

```
curl "https://public.opendatasoft.com/explore/dataset/us-county-boundaries/download/?format=geojson&timezone=America/Los_Angeles&lang=en" --output us-county-boundaries.geojson
```


Next, run
```
node chunk.js
```

This goes through each county and adds it to a file based on the geohash of its center point.  Each geohash is then written to an individual json file (about 500 of them).

You now have all pre-requisites.

The API (`index.js`) attempts to lazily cache results *and* contents of these files.

When you look up a county, it will first see if it's in the file that matches the geohash.  It might not be, because a specific lat/long may be in a different geohash than the county center point.  Therefore, if it's not found in the geohash, it interrogates the neighboring geohashes.

Run `node localTest.js` to see it work.