const SERVER = require("../index2.js")

SERVER_A =  (STATE) => SERVER(STATE).GET("/", (STATE, req, res, next) => {
  let html = Object.keys(STATE.visits).reduce((html, link) => {
    html += `<li><a href="${link}">${link}</a></li>`;
    return html;
  }, "<h1>WELCOME!!!!111</h1><ul>") + "</ul>";
  res.send(html);
});


SERVER_B =  (STATE) => SERVER(STATE).GET("/test", (STATE, req, res, next) => {
  res.send("test!");
});

SERVER_C =  (STATE) => SERVER(STATE).GET("/hello", (STATE, req, res, next) => {
  res.send("hello world!");
});

ECHO_SERVER = (STATE) => SERVER(STATE)
  .augment("echo", (route) => (metaproc) =>  {
    return metaproc.GET(route, async (STATE, req, res, next) => {
      res.send(`http://${STATE.address}:${STATE.port}`)
    })
  })
  .echo("/echo")

WATCHER = (STATE) => SERVER(STATE)
.asifnot("visits", {"/":0, "/test":0, "/echo":0, "/visits":0})
.GET("/visits", (STATE, req, res, next) => {
  let html = Object.keys(STATE.visits).reduce((html, whereFrom) => {
    html += `<tr><td align="center">${whereFrom}</td><td align="center">${STATE.visits[whereFrom]}</td></tr>`;
    return html;
  }, `<table width="100%" border="1"><tr><th>Page Name</th><th>Number of Visits</th></tr>`) + "</table>";
  res.send(html);
})
.when("visit", (STATE, whereFrom) => {
  if (STATE.visits[whereFrom] !== undefined) {
    STATE.visits[whereFrom] += 1;
  } else {
    console.log(`Visit not counted for ${whereFrom}`)
  }

})

/*

SERVER()
  .GET("/*", (STATE, req, res, next) => {
    console.log(req.originalUrl, req.connection.remoteAddress)
    next();
  })
  .chain(SERVER_A)
  .chain(SERVER_B)
  .start({"port":3005})
.then(SERVER.showAddress)
.catch((err) => console.log(err))

*/

SERVER()
.GET("/*", (STATE, req, res, next) => {
  console.log(req.originalUrl, req.connection.remoteAddress)
  STATE.events.emit("visit", req.originalUrl);
  next();
})
.chain(SERVER_A)
.chain(SERVER_B)
.chain(SERVER_C)
.chain(ECHO_SERVER)
.chain(WATCHER)
.create({"port":3005})
.catch((err) => {
  console.log(err.msg)
})
