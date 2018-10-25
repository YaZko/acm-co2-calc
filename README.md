# co2-web

> ACM CO2 footprint calculator

This project was made possible by the Association for Computing Machinery. 

Some of this project is in need of refactoring.

## About

This project uses [Feathers](http://feathersjs.com). An open source web framework for building modern real-time applications.

## Getting Started

Getting up and running is as easy as 1, 2, 3.

1. Make sure you have [NodeJS](https://nodejs.org/) and [npm](https://www.npmjs.com/) installed.
2. Install your dependencies

    ```
    cd path/to/co2-web; npm install
    ```
    (Recommended): install foreverjs
    ```
    npm install -g forever
    ```
3. Configure
    (Recommended): create a new secret and save in config/default.json
    ```
    feathers generate secret
    ```
    Add SSL certs to the cert/ directory and add configuration details in config/production.json

 4. Start the app

    ```
    export NODE_ENV=production
    npm start
    ```
    (Recommended) Or start with foreverjs (or another NodeJS service manager like PM2) :
    ```
    forever src/
    ```
5. After launching, import airports into the new database:
    ```
    mongoimport --db co_2_web --collection airports --drop --file airport-data/mongo-airport-dump.json
    ```

## Testing

Simply run `npm test` and all your tests in the `test/` directory will be run.

## Changelog

__1.1.0__
- Update interface on the CSV upload page to be more conference focused.
  * Add associated back-end logic
- Updates to the FAQ.
- Maintain original CSV ordering in CO2 results.

__1.0.0__

- Initial release

## License

Copyright (c) Gregory Bekher 2017

Licensed under the [MIT license](LICENSE).
