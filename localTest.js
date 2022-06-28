const index = require('./index');


index.handler({ queryStringParameters: { lat:41.045642, long: -95.745960 } }, null, (err, res) => {
    console.log(res);
});
