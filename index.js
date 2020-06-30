const http = require('http');               // Creates the HTTP server
const bodyParser = require("body-parser");  // Handles data from POST requests
const myIP = require('my-ip');              // Shows IP of where server is running
const express = require('express');         // Handles HTTP routes, requests, and responses
const helmet = require('helmet');           // Basic server security
const EventEmitter = require('events');     // To help process requests without blocking the event loop
const METAPROC = require("/home/mastergray/dev/metaproc-js/index.js");       // How this all gets structured

// SERVER :: (STATE, OPS) -> SERVER
// HTTP Server implmentation using METAPROC and EXPRESS
module.exports = SERVER = (FNS, OPS) => METAPROC.Standard(FNS, OPS)

  /**
   *
   *  Route Operations
   *
   */

  // addRoute :: (STRING, STRING, (STATE, EXPRESS.REQ, EXPRESS.RES, EXPRSS.NEXT) -> VOID) -> METAPROC
  // Binds route to EXPRESS instance stored in STATE:
  .augment("addRoute", (method, route, fn) => (metaproc) => metaproc.apto("app", (app, state) => {
    app[method](route, (req, res, next) => {
      fn(state, req, res, next)
    });
    return app;
  }))

  // GET :: ((STRING, (STATE, EXPRESS.REQ, EXPRESS.RES, EXPRESS.NEXT) -> VOID) -> METAPROC
  // Binds "GET" route to EXPRESS instance stored in STATE:
  .augment("GET", (route, fn) => (metaproc) => metaproc.addRoute("get", route, fn))

  // POST :: ((STRING, (STATE, EXPRESS.REQ, EXPRESS.RES, EXPRESS.NEXT) -> VOID) -> METAPROC
  // Binds "POST" route to EXPRESS instance stored in STATE:
  .augment("POST", (route, fn) => (metaproc) => metaproc.addRoute("post", route, fn))

  // PUT :: ((STRING, (STATE, EXPRESS.REQ, EXPRESS.RES, EXPRESS.NEXT) -> VOID) -> METAPROC
  // Binds "PUT" route to EXPRESS instance stored in STATE:
  .augment("PUT", (route, fn) => (metaproc) => metaproc.addRoute("put", route, fn))

  // DELETE :: ((STRING, (STATE, EXPRESS.REQ, EXPRESS.RES, EXPRESS.NEXT) -> VOID) -> METAPROC
  // Binds "DELETE" route to EXPRESS instance stored in STATE:
  .augment("DELETE", (route, fn) => (metaproc) => metaproc.addRoute("delete", route, fn))

  // OPTIONS :: ((STRING, (STATE, EXPRESS.REQ, EXPRESS.RES, EXPRESS.NEXT) -> VOID) -> METAPROC
  // Binds "OPTIONS" route to EXPRESS instance stored in STATE:
  .augment("OPTIONS", (route, fn) => (metaproc) => metaproc.addRoute("options", route, fn))

  // use :: (STATE, EXPRESS.REQ, EXPRESS.RES, EXPRESS.NEXT) -> VOID) -> METAPROC
  // Binds "middleware" to EXPRSS instance stored in STATE:
  // addRoute :: (STRING, STRING, (STATE, EXPRESS.REQ, EXPRESS.RES, EXPRSS.NEXT) -> VOID) -> METAPROC
  // Binds route to EXPRESS instance stored in STATE:
  .augment("use", (method, route, fn) => (metaproc) => metaproc.apto("app", (app, state) => {
    app.use((req, res, next) => {
      fn(state, req, res, next)
    });
    return app;
  }))

  /**
   *
   *  Event Operations
   *
   */

  // when :: (STRING, (EVENT) -> VOID) -> METAPROC
  // Creates an event listener for instance of EVENTEMITTER stored in STATE:
  .augment("when", (evt, fn) => (metaproc) =>  metaproc.apto("events", (events, state) => {
    events.on(evt, (...vals) => {
      fn.apply(null, [state].concat(vals));
    })
    return events;
  }))

  /**
   *
   *  Server Initialization Operations
   *
   */

  // :: (VOID) -> (METAPROC) -> METAPROC
  // Setup express server stored in STATE:
  // NOTE: If this needs to be modified, it can be overwrriten before applied by "init" OP:
  .augment("setup", () => (metaproc) => metaproc.apto("app", (app, state) => {

    // Initialize "helmet" for standard security:
    // https://expressjs.com/en/advanced/best-practice-security.html
    app.use(helmet());

    // Here we are configuring express to use body-parser as middle-ware:
    app.use(bodyParser.urlencoded({limit: state.postLimit, extended: true}));
    app.use(bodyParser.json({limit: state.postLimit, extended: true}));

    // Here we are configuring CORS:
    app.use((req, res, next) => {
      if (state.CORS.length > 0) {
        if (state.CORS.includes(req.headers.origin)) {
          res.header("Access-Control-Allow-Origin", req.headers.origin)
          res.header("Access-Control-Allow-Headers", "*");
          res.header("Access-Control-Allow-Methods", "*");
        } else {
          res.status(401)
        }
      }
      next();
    });

    // Return app
    return app;

  }))

  // :: (VOID) -> (METAPROC) -> METAPROC
  // Start Express server:
  // NOTE: If this needs to be modified, it can be overwrriten before applied by "create" OP:
  .augment("start", (banner) => (metaproc) => metaproc.apto("app", (app, state) => {

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
    http.Server(app).listen(state.port, state.address);

    // Returns app to be bound to STATE:
    return app;

  }))

  // create :: (OBJECT, (STATE) -> VOID) -> METAPROC
  // Initializes EXPRESS server with given CONFIG object ,
  // supports optional banner METHOD for printing message to console  once server is running
  .augment("create", (config, banner) => (metaproc) => {
    return SERVER()
      .asifnot("postLimit", "10mb")           // Default postLimit of "10mb",
      .asifnot("port", 3000)                  // Default port of "3000"
      .asifnot("CORS", [])                    // Default CORS
      .asifnot("address", undefined)          // Default address
      .asifnot("app", express())              // Initalize instance of express to operate on
      .asifnot("events", new EventEmitter())  // Handles events between requests)
      .setup()                                // Initialze server
      .chain(() => metaproc)                  // Initialize routes
      .start()                                // Start server
      .run(config)
    .then((state) => {
      state.address = state.address || myIP(); // So IP can be referenced from routes
      console.log(banner !== undefined ? banner(state) : `Running @ http://${state.address}:${state.port}`)
      return state;
    })
  })
