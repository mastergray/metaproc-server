const http = require('http');               // Creates the HTTP server
const bodyParser = require("body-parser");  // Handles data from POST requests
const myIP = require('my-ip');              // Shows IP of where server is running
const express = require('express');         // Handles HTTP routes, requests, and responses
const helmet = require('helmet');           // Basic server security
const EventEmitter = require('events');     // To help process requests without blocking the event loop
const METAPROC = require("metaproc");       // How this all gets structured

// MAIN PROCESS :: () -> SERVER
// Creates METAPROC interface for implementing an HTTP server leveraging Express.j
module.exports = SERVER = (fns) => METAPROC.init([
  METAPROC.ops,
  SERVER.ops,
  SERVER.methods
])

/**
 *
 *  "Static" Methods
 *
 */

// OBJECT -> OBJECT
// Consoles out address of server with port number:
// NOTE: This can only be applied after "start" has been called:
SERVER.showAddress = (STATE) => {
  console.log(`http://${STATE.address}:${STATE.port}`);
  return STATE;
}


/**
 *
 *  Operations
 *
 */

SERVER.ops = [

  // GET :: (STRING, (STATE, REQUEST, RESPONSE, NEXT)) -> PROMISE(STATE)
  // Binds "GET" route to EXPRESS instance stored in STATE:
  METAPROC.OP("GET",(route, fn) => addRoute("get", route, fn)),

  // POST :: (STRING, (STATE, REQUEST, RESPONSE, NEXT)) -> PROMISE(STATE)
  // Binds "POST" route to EXPRESS instance stored in STATE:
  METAPROC.OP("POST", (route, fn) => addRoute("post", route, fn)),

  // DELETE :: (STRING, (STATE, REQUEST, RESPONSE, NEXT)) -> PROMISE(STATE)
  // Binds "DELETE" route to EXPRESS instance stored in STATE:
  METAPROC.OP("DELETE", (route, fn) => addRoute("delete", route, fn)),

  // OPTIONS :: (STRING, (STATE, REQUEST, RESPONSE, NEXT)) -> PROMISE(STATE)
  // Binds "OPTIONS" route to EXPRESS instance stored in STATE:
  METAPROC.OP("OPTIONS", (route, fn) => addRoute("options", route, fn)),

  // PUT :: (STRING, (STATE, REQUEST, RESPONSE, NEXT)) -> PROMISE(STATE)
  // Binds "PUT" route to EXPRESS instance stored in STATE:
  METAPROC.OP("PUT", (route, fn) => addRoute("put", route, fn)),

  // when :: (STRING, (EVENT) -> VOID) -> PROMISE(STATE)
  // Create event listener using instance of EVENTEMITTER  stored in STATE:
  METAPROC.OP("when", (evt, fn) => addEventHandler(evt, fn)),
]

/**
 *
 *  Methods
 *
 */

 SERVER.methods = [

   // Takes functions created from SERVER operations and chains them to a "standard" instance of metaproc,
   // this is so the order of functions applied to STATE include running server setup and start at the right time:
   // NOTE: Config passed to "start" method WILL be mutated by this new instance:
   METAPROC.METHOD("start", (config) => (metaproc) => {
     return METAPROC.Standard()
       .aptoifnot("postLimit", (STATE) => "10mb")      // Default postLimit of "10mb",
       .aptoifnot("port", (STATE) => 3000)             // Default port number of 3000
       .aptoifnot("CORS", STATE => [])                 // Default CORS
       .aptoifnot("address", (STATE) => undefined)     // Default address is undefined
       .apto("events", (STATE) => new EventEmitter())  // Handles events between requests)
       .apto("app", (STATE) => express())              // Initalize instance of express to operate on
       .apto("app", setupServer)                       // Setup server using config
       .chain(metaproc)                                // Chain functions from instance
       .apto("app", startServer)                       // Start server using config
       .run(config)
     .then((STATE) => ({                               // Returns intialized config
       "postLimit":STATE.postLimit,
       "port":STATE.port,
       "CORS":STATE.CORS,
       "address":STATE.address||myIP()
     }))
   })

 ]

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
  http.Server(app).listen(STATE.port, STATE.address);

  // Returns app to be bound to STATE:
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
    return STATE;
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
    return STATE;
  }
}
