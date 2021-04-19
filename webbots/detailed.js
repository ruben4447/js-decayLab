const ISOTOPE_REGEX = /([0-9]+)([A-Z][a-z]*)/, MISOTOPE_REGEX = /([0-9]+m[0-9]*)([A-Z][a-z]*)/;
const CITE_REGEX = /\s*\[.*\]\s*/g, BRACKETS = /\s*\(.*\)\s*/g;
const LDASH = String.fromCharCode(8722);

function getText(el) {
  let text = el.innerText;
  text = text.replace(CITE_REGEX, "");
  text = text.replace(BRACKETS, "");
  text = text.replace(/\r|\n|\r\n/g, " ");
  text = text.replaceAll(LDASH, "-");
  text = text.replace(/(\s+$)|(^\s+)/g, ""); // Spaces at beginiing of end of line
  return text;
}

function extractIsotope(string) {
  string = string.replace(/(?<=[0-9])\s+(?=[A-Z])/, ""); // Remove spaces e.g. "4 H" -> "4H", "2 4 H" -> "2 4H"
  let data = { raw: string, is_isotope: false, };
  let matched = string.match(MISOTOPE_REGEX);
  if (matched) {
    data.m = true;
    data.is_isotope = true;
    let i = matched[1].indexOf('m');
    data.parent = matched[2] + '-' + matched[1].substring(0, i);
  } else {
    matched = string.match(ISOTOPE_REGEX);
    if (matched) {
      data.m = false;
      data.is_isotope = true;
    }
  }
  if (data.is_isotope) {
    data.symbol = matched[2];
    data.mass = matched[1];
    data.name = data.symbol + '-' + data.mass;
  }
  return data;
}

const cn_10pow = /^10(\-?[0-9]+)$/;
function complexNumber(string) {
  let n;
  string = string.replaceAll("×", "x");
  if (string.match(cn_10pow)) {
    let power = parseInt(string.match(cn_10pow)[1]);
    n = Math.pow(10, power);
  } else if (string.match("x10")) {
    let parts = string.split("x10");
    n = +parts[0] * Math.pow(10, parseInt(parts[1]));
  } else {
    n = +string;
  }

  return n;
}

function processDecayStrings(decayMode, daughter) {
  const arr = [];

  let daughter_isotope = extractIsotope(daughter);

  // Get percentage
  let percentage_string = decayMode.match(/\s*\(.*%\)\s*/), percentage;
  if (percentage_string) {
    decayMode = decayMode.replace(percentage_string, "");
    percentage = complexNumber(percentage_string[0].replace(/[\(\)%\s]/g, "").replaceAll(LDASH, '-'));
  }

  let modes = decayMode.split(", ");
  for (let mode of modes) {
    arr.push({ daughter: daughter_isotope.name, mode, percentage, });
  }

  return arr;
}

let _timeUnits = {
  min: 60, // Minute
  ms: 0.001, // Millisecond
  μs: 1e-6, // Microsecond
  ns: 1e-9, // Nanosecond
  ps: 1e-12, // Picosecond
  y: 3.154e+7, // Year
  a: 3.154e+7, // Year (annum)
  d: 86400, // Day
  h: 3600, // Hour
  s: 1, // Second
};
let _timeUnitArray = Object.keys(_timeUnits);

function evalTimeExpr(string) {
  let seconds, rstring = string;
  string = string.replaceAll("µ", "μ"); // Trust me, they're not the same...
  string = string.replace(/\(.*\)/g, "");
  string = string.replace(/\[.*\]/g, "");
  string = string.replace(/[\s#\>\<+≪=,~≥]/g, "");

  let time_unit;
  for (let unit of _timeUnitArray) {
    let i = string.indexOf(unit);
    if (i !== -1) {
      time_unit = unit;
      string = string.substring(0, i + unit.length);
      break;
    }
  }
  if (time_unit == undefined) throw new Error(`Unknown time unit in time "${rstring}" (processed as "${string}")`);

  let number = string.replace(time_unit, "");
  seconds = complexNumber(number) * _timeUnits[time_unit];
  if (isNaN(seconds)) throw new Error(`NaN time from input "${rstring}" : "${number}" "${time_unit}"`);
  // console.log(`"${rstring}" --> "${string}" --> "${number}" "${time_unit}" --> ${seconds}`);
  return seconds;
}

async function process(element) {
  const url = "https://en.wikipedia.org/wiki/Isotopes_of_" + element;
  let request = await fetch(`./get_webdata.php?url=${url}`);
  let html = await request.text();
  document.body.innerHTML = `<mark>Processing ${url}...</mark> <div>${html}</div>`;

  let tables = document.querySelectorAll("table"), isotope_tables = [];
  for (let table of tables) {
    try {
      let cell_data = table.children[0].children[0].children[0];
      if (cell_data && cell_data.innerText.match("Nuclide")) {
        isotope_tables.push(table);
      }
    } catch (e) {
      console.log(table);
      continue;
    }
  }

  if (isotope_tables.length == 0) {
    console.log(`Element ${element} has no isotope table`);
    return {};
  }

  document.body.innerHTML = `<mark>Processing ${url}...</mark>`;
  document.body.appendChild(isotope_tables[0]);
  let DATA = {}, rows = isotope_tables[0].children[0].children;

  const HEADER_INDEXES = {};
  for (let i = 0; i < rows[0].children.length; i++) {
    let text = getText(rows[0].children[i]);
    if (text.match("abundance")) text = "abundance";
    HEADER_INDEXES[text] = i;
  }

  for (let i = 1; i < rows.length; i++) {
    if (rows[i].children[0].tagName === "TD") {
      let name = rows[i].children[0].innerText.replace(/\r|\n|\s|\r\n|\t/g, "");
      let info = extractIsotope(name);
      if (info.is_isotope) {
        let isotope = {
          Z: undefined, // Proton number
          N: undefined, // Neutron number
          halflife: undefined, // Halflife
          is_stable: undefined,
          decay: [],
          abundance: undefined,
        };
        let header_indexes = { ...HEADER_INDEXES };
        name = info.name;

        if (info.m) {
          let parent_info = DATA[info.parent];
          isotope.Z = parent_info.Z;
          isotope.N = parent_info.N;
          // isotope.mass = parent_info.mass;
          for (let key in header_indexes) header_indexes[key] -= 2;
        } else {
          isotope.Z = +getText(rows[i].children[header_indexes['Z']]);
          isotope.N = +getText(rows[i].children[header_indexes['N']]);
          // isotope.mass = getText(rows[i].children[header_indexes['Isotopic mass']]);
        }


        // Stable?
        if (rows[i].children[header_indexes['Half-life']].innerText.toLowerCase().match("stable")) {
          isotope.is_stable = true;
          for (let key in header_indexes) header_indexes[key] -= 3;
        } else {
          isotope.is_stable = false;

          // Find half-life
          isotope.halflife_str = getText(rows[i].children[header_indexes['Half-life']]);
          // SPECIAL CASES
          if (name === 'Ca-48') isotope.halflife_str = "6.4×1019 y"; // Bracketed number, which disappears leaving invalid number
          else if (name === "Kr-78") isotope.halflife_str = "9.2×1021 y"; // Wierd plus or minus complex
          else if (name === "Md-244") isotope.halflife_str = "0.4s"; // Plus or minus complex

          if (isotope.halflife_str.length == 0 || isotope.halflife_str === 'unknown') {
            console.log(`Half-life for ${name} is UNKNOWN ("${isotope.halflife_str}")`);
          } else {
            try {
              isotope.halflife = evalTimeExpr(isotope.halflife_str);
            } catch (e) {
              console.clear();
              console.log(`Error evalTimeExpr for isotope ${name} ...`);
              throw e;
            }
          }

          // Are there multiple?
          let number = rows[i].children[0].getAttribute('rowspan');
          number = number == null ? 1 : +number;

          let x = processDecayStrings(rows[i].children[header_indexes['Decay mode']].innerText, rows[i].children[header_indexes['Daughter isotope']].innerText);
          isotope.decay.push(...x);

          try {
            let last_daughter = "";
            for (let k = i + 1; k < i + number; k++) {
              if (rows[k].children[1]) last_daughter = rows[k].children[1].innerText;
              x = processDecayStrings(rows[k].children[0].innerText, last_daughter);
              isotope.decay.push(...x);
            }
          } catch (e) {
            console.log(`Isotope ${name}`);
            throw e;
          }
        }

        if (rows[i].children[header_indexes['abundance']]) {
          isotope.abundance = getText(rows[i].children[header_indexes['abundance']]);
        }

        DATA[name] = isotope;
      }
    }
  }

  document.body.innerHTML = `<mark>Processed ${url} (${Object.keys(DATA).length} isotopes).</mark>`;
  return DATA;
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

async function main() {
  let request = await fetch('data/$all.json');
  globalThis.ISOTOPE_HALFLIFES = await request.json();

  request = await fetch('data/$elements.json');
  globalThis.ELEMENTS = await request.json();

  let count = 0;

  let tstart = Date.now();

  // const elements = ELEMENTS.order.slice(ELEMENTS.curium.number - 1);
  const elements = ELEMENTS.order;
  for (const element of elements) {
    let idata = await process(element);
    count += Object.keys(idata).length;
    ELEMENTS[element].isotopes = idata;
  }

  let tend = Date.now();

  document.body.innerHTML = `<mark>Processing Finished</mark><br><mark>${elements.length} elements, ${count} isotopes in ${tend - tstart} milliseconds</mark><br><br><code>${JSON.stringify(elements)}</code>`;

  save("data/data.json", ELEMENTS);

  console.log("DONE");
}

main();