const http = require('http');
const bodyParser = require("body-parser");
const myIP = require('my-ip');
const express = require('express');
const helmet = require('helmet');
const METAPROC = require("metaproc");
const path = require('path');
const EventEmitter = require('events');

// MAIN PROCESS :: () -> SERVER
// Creates METAPROC interface for implementing an HTTP server leveraging Express.js
module.exports = () => METAPROC.init([
  METAPROC.standard,
  METAPROC.op("GET",(route, fn) => addRoute("get", route, fn)),
  METAPROC.op("POST", (route, fn) => addRoute("post", route, fn)),
  METAPROC.op("DELETE", (route, fn) => addRoute("delete", route, fn)),
  METAPROC.op("OPTIONS", (route, fn) => addRoute("options", route, fn)),
  METAPROC.op("PUT", (route, fn) => addRoute("put", route, fn)),
  METAPROC.op("when", (evt, fn) => addEventHandler(evt, fn))
], (STATE, fns) => {
  // Overridding standard run operation to set default config values and setup server:
  return METAPROC.init()
    .aptoifnot("postLimit", (STATE) => "10mb")      // Default postLimit of "10mb",
    .aptoifnot("port", (STATE) => 3000)             // Default port number of 3000
    .aptoifnot("CORS", STATE => [])                 // Default CORS
    .aptoifnot("address", (STATE) => undefined)     // Default address is undefined
    .apto("events", (STATE) => new EventEmitter())  // Handles events between requests)
    .apto("app", (STATE) => express())              // Initalize instance of express to operate on
    .apto("app", setupServer)                       // Setup server using config
    .chain(fns)                                     // Chain functions from instance
    .apto("app", startServer)                       // Start server using config
    .run(STATE || {})                               // Apply config to instance
    .then((STATE) => {
      return {
        "postLimit":STATE.postLimit,
        "port":STATE.port,
        "CORS":STATE.CORS
      }
    })
})

/**
 *
 *  Subprocesses
 *
 */

// :: (express, STATE) -> express
// Setup express server stored in STATE:
function setupServer(app, STATE) {

  // Initialize "helmet" for standard security:
  // https://expressjs.com/en/advanced/best-practice-security.html
  app.use(helmet());

  // Here we are configuring express to use body-parser as middle-ware:
  app.use(bodyParser.urlencoded({limit: STATE.postLimit, extended: true}));
  app.use(bodyParser.json({limit: STATE.postLimit, extended: true}));

  // Here we are configuring CORS:
  app.use((req, res, next) => {
    if (STATE.CORS.length > 0) {
      if (STATE.CORS.includes(req.headers.origin)) {
        res.header("Access-Control-Allow-Origin", req.headers.origin)
        res.header("Access-Control-Allow-Headers", "*");
        res.header("Access-Control-Allow-Methods", "*");
      } else {
        res.status(401)
      }
    }
    next();
  });

  return app;

}

// :: (express, STATE) -> express
// Start Express server:
function startServer(app, STATE) {

  // File not found route:
  app.use("*", (req, res, next) => {
    res.status(404).send("Route Does Not Exist")
  })

  // Catch all error handler:
  // NOTE: This is triggered by next(err):
  app.use((err, req, res, next) => {
    console.error(err);
    console.error(`UNCAUGHT ERROR: ${err}`);
    res.status(500).send("Internal Server Error");
  });

  // Start listening....
  http.Server(app).listen(STATE.port, STATE.address, () => {
    console.log(`Running @ http://${STATE.address||myIP()}:${STATE.port}`)
  });

  return app;

}

/**
 *
 *  Support Functions
 *
 */

// :: (STRING, STRING, (STATE, REQUEST, RESPONSE, NEXT) -> VOID) -> STATE -> VOID
// Binds function to route of express instance:
function addRoute(method, route, fn) {
  return (STATE) => {
    STATE.app[method](route, (req, res, next) =>{
      fn(STATE, req, res, next);
    })
  }
}

// :: (STRING, (evt, *) -> VOID) -> VOID
// Binds event handlers to event emitter stored in STATE.evente:
// NOTE:  First argument of any handler is always STATE:
function addEventHandler(evt, fn) {
  return (STATE) => {
    STATE.events.on(evt, (...vals) => {
      fn.apply(null, [STATE].concat(vals));
    });
  }
}
