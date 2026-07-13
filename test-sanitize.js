import mongoSanitize from 'express-mongo-sanitize';

const obj = { "$where": "sleep(1000)" };
mongoSanitize.sanitize(obj);
console.log(obj);
