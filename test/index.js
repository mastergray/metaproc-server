const SERVER = require("../index.js");
const UTIL = require("common-fn-js");
sitemap = {"/":0, "/test":0, "/echo":0, "/visits":0, "/form":0};

SERVER_A = (CONFIG) => SERVER.of(CONFIG)
.asifnot("visits", sitemap)
.GET("/", (STATE, req, res, next) => {
  let html = Object.keys(STATE.visits).reduce((html, link) => {
    html += `<li><a href="${link}">${link}</a></li>`;
    return html;
  }, "<h1>WELCOME!!!!111</h1><ul>") + "</ul>";
  res.send(html);
});


SERVER_B = (CONFIG) => SERVER.of(CONFIG).GET("/test", (STATE, req, res, next) => {
  res.send("test!");
});

SERVER_C = (CONFIG) => SERVER.of(CONFIG).GET("/hello", (STATE, req, res, next) => {
  res.send("hello world!");
});

ECHO_SERVER = (CONFIG) => SERVER.of(CONFIG).augment("echo", (route) => (metaproc) =>  {
  return metaproc.GET(route, async (STATE, req, res, next) => {
    res.send(`http://${STATE.address}:${STATE.port}`)
  })
}).echo("/echo")

FORM_SERVER = (CONFIG) => SERVER.of(CONFIG)
  .GET("/form", (STATE, req, res, next) => {
    let html = `
      <h2>TeSt FoRm</h2>
      <hr />
      <form action="/form" method="POST">
        <input type="text" placeholder="Random String" name="test_str" />
        <input type="date" placholder="Random Date" name="test_date" />
        <input type="number" placeholder="Random Number" name="tes_num" />
        <input type="submit" value="Test" />
      </form>
    `;
    res.send(html);
  })
  .POST("/form", (STATE, req, res, next) => {
    console.log(req.body);
    res.send("Submitted, now go away.");
  })

BREAK_SERVER = (CONFIG) => SERVER.of(CONFIG)
  .GET("/break", (STATE, req, res, next) => {
    next("I done broke it");
  })

WATCHER = (CONFIG) => SERVER.of(CONFIG)
.asifnot("visits", sitemap)
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


SERVER.of({"port":3005})
.GET("*", (STATE, req, res, next) => {
  console.log(`${UTIL.timestamp()} ${req.originalUrl} => ${req.connection.remoteAddress}`)
  STATE.events.emit("visit", req.originalUrl);
  next();
})
.chain(SERVER_A)
.chain(SERVER_B)
.chain(SERVER_C)
.chain(ECHO_SERVER)
.chain(FORM_SERVER)
.chain(BREAK_SERVER)
.chain(WATCHER)
.launch()
.fail((err) => {
  console.log(err.msg)
})
