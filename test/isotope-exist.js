fetch('../data/elements.json')
    .then(data => data.json())
    .then(json => {
        window.data = json;
        json.symbol_map = {};
        for (let element of json.order) {
            json.symbol_map[json[element].symbol] = element;
        }

        test(json);
    });

var unknownIsotopes = []; // { isotope: string, parent: string }[]
var unknownIsotopesArr = []; // Just the unknown isotopes.
let n = 0, un = 0;
const testingElement = document.getElementById('testing-element');
const testingIsotope = document.getElementById('testing-isotope');
const testingCount = document.getElementById('tested-count');
const unknownCount = document.getElementById('unknown-count');
const unknownTextarea = document.getElementById('unknown-textarea');

function test(data) {
    for (let element of data.order) {
        let isotopes = data[element].isotopes;
        testingElement.innerText = element;
        for (let isotope in isotopes) {
            if (isotopes.hasOwnProperty(isotope)) {
                _test(isotope);
            }
        }
        testingIsotope.innerText = '-';
    }
}

function _test(isotope, level = 0) {
    n++;
    testingCount.innerText = n;
    testingIsotope.innerText = `${isotope} [depth=${level}]`;

    let data = getIsotopeData(isotope);
    if (data) {
        for (let obj of data.decay) {
            if (obj.daughter) {
                _test(obj.daughter, level + 1);
            }
        }
    } else {
        if (unknownIsotopesArr.indexOf(isotope) === -1) {
            un++;
            unknownIsotopesArr.push(isotope);
            unknownCount.innerText = un;
            unknownTextarea.value = unknownIsotopesArr.join(', ');
        }
    }
}

function getIsotopeData(str) {
    let [symbol, mass] = str.split('-');
    let name = data.symbol_map[symbol];
    if (name) {
        return data[name].isotopes[str];
    } else {
        return undefined;
    }
}