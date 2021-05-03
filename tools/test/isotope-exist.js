fetch('../../data/elements.json')
    .then(data => data.json())
    .then(json => {
        window.data = json;
        json.symbol_map = {};
        for (let element of json.order) {
            json.symbol_map[json[element].symbol] = element;
        }

        test(json);
    });

var unknownIsotopesArr = []; // Just the unknown isotopes.
var testedIsotopesArr = [];
let n = 0, un = 0;
const testingElement = document.getElementById('testing-element');
const testingIsotope = document.getElementById('testing-isotope');
const testingCount = document.getElementById('tested-count');
const unknownCount = document.getElementById('unknown-count');
const unknownDiv = document.getElementById('unknown');

function test(data) {
    for (let element of data.order) {
        let isotopes = data[element].isotopes;
        testingElement.innerText = element;
        for (let isotope in isotopes) {
            if (isotopes.hasOwnProperty(isotope)) {
                _test(isotope, 0, [isotope]);
            }
        }
        testingIsotope.innerText = '-';
    }

    save('unknown-isotopes.json', unknownIsotopesArr);
}

function _test(isotope) {
    let stack = [isotope], tested = [];
    while (stack.length !== 0) {
        let isotope = stack.peek();
        if (tested.indexOf(isotope) === -1) {
            n++;
            tested.push(isotope);
            let data = getIsotopeData(isotope);
            if (data) {
                for (let obj of data.decay) {
                    if (obj.daughter && testedIsotopesArr.indexOf(obj.daughter) === -1) {
                        stack.push(obj.daughter);
                        testedIsotopesArr.push(obj.daughter);
                    }
                }
            } else {
                if (unknownIsotopesArr.indexOf(isotope) === -1) {
                    un++;
                    unknownIsotopesArr.push(isotope);
                    unknownCount.innerText = un;
                    let chain = stack.slice(0, -1);
                    unknownDiv.insertAdjacentHTML('beforeend', `<p>&bull; <b>${isotope}</b> : <code>${chain.join(' &rarr; ')} &rarr; <mark><u>${isotope}</u></mark></code></p>`);
                }
            }
        } else {
            stack.pop();
        }
    }
    testingCount.innerText = n;
}

Array.prototype.peek = function (n = 1) {
    return this[this.length - n];
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

function save(file, data) {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', '../webbots/save.php', true);
    xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
    xhr.onload = function () {
        // do something to response
        console.log(this.responseText);
    };
    xhr.send(`file=../test/${file}&data=${encodeURIComponent(JSON.stringify(data))}`);
}