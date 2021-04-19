const DATA = {};
const LDASH = String.fromCharCode(8722);
const URL = "https://en.wikipedia.org/wiki/List_of_radioactive_nuclides_by_half-life";
const FILE = "data/$all.json";

fetch(`./get_webdata.php?url=` + URL)
  .then(req => req.text())
  .then(text => {
    document.body.innerHTML = text;
    process();
    document.body.innerHTML = `<h1>DONE! Data: ${Object.keys(DATA).length} items extracted.</h1>`;
    save(FILE, DATA);
    document.body.innerHTML += `<br><br><pre>${JSON.stringify(DATA)}</pre>`;
  });

function process() {
  const headlines = document.querySelectorAll("span.mw-headline");
  let halflife_headers = [];

  for (const headline of headlines) {
    if (headline.innerText.match("seconds")) {
      let time = headline.innerText, i = time.indexOf("(");
      if (i !== -1) time = time.substring(0, i);
      time = time.replace(/\s*(seconds)\s*/g, "");
      time = time.replace(LDASH, "-");
      halflife_headers.push(time);
    }
  }

  const tables = document.querySelectorAll("table");

  for (let i = 0; i < tables.length; i++) {
    let time = halflife_headers[i];
    let power = parseInt(time.substr(2));
    let base = Math.pow(10, power);

    if (time.match())

      if (isNaN(power)) {
        console.log(`NaN base for time "${time}": "${time.substr(2)}"`);
        continue;
      }

    let rows = tables[i].querySelectorAll("tr");
    for (let r = 1; r < rows.length; r++) {
      let row = rows[r];
      if (row.children[0] instanceof HTMLTableCellElement && row.children[0].children[0] instanceof HTMLAnchorElement) {
        let isotope_name = row.children[0].children[0].innerText;

        let isotope_time = row.children[row.children.length - 1].innerText.replace(/[^0-9\.e]/, "");
        let halflife = parseInt(isotope_time) * base;
        DATA[isotope_name] = halflife;
        if (isNaN(halflife)) {
          console.log(`NaN Halflife for ${isotope_name} : "${isotope_time}" * ${base}`);
        }
      }
    }
  }

  console.log("%cDONE", "font-weight:bolder;color:goldenrod;");
}

function save(file, data) {
  var xhr = new XMLHttpRequest();
  xhr.open('POST', 'save.php', true);
  xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
  xhr.onload = function () {
    // do something to response
    console.log(this.responseText);
  };
  xhr.send(`file=${file}&data=${encodeURIComponent(JSON.stringify(data))}`);
}