import Atom from './Atom';
import Popup from './Popup';
import { numberWithCommas, secondsToAppropriateTime, createLink, capitaliseString, nicifyNull, RADIOACTIVE_SYMBOL, decayModeToString, getIsotopeDecayInfo, round, analyseString, INFO_SYMBOL, analyseElementName } from './utils';
import elementData from '../data/elements.json';
import ptableData from '../data/ptable.json';
import globals from './globals';
import { IAnalysisResult, IDecayInfo, IGeneratedInfo, ILegendItem, LegendOptionValues } from './InterfaceEnum';

export function generateAtomInfo(string: string): IGeneratedInfo {
  const table = document.createElement("table"), data = analyseString(string), body = document.createElement("div");
  body.classList.add('atom-info');
  body.dataset.isotope = data.isotopeSymbol;

  let plaque = generateElementPlaque(data.name || data.IUPACName);
  body.appendChild(plaque);
  body.insertAdjacentHTML('beforeend', '<br>');
  let insertLink = createLink('Insert into Sample');
  insertLink.addEventListener('click', () => {
    let added = globals.manager.addAtomToSample(new Atom(data));
    if (added) {
      // Close all popups
      while (Popup.popupsOpen() !== 0) Popup.getTopmostPopup().hide();
    } else {
      new Popup("Unable to Add Atom").insertAdjacentText('beforeend', `Unable to add ${data.isotopeSymbol} to sample. Make sure that the simulation is not running.`).show();
    }
  });
  body.appendChild(insertLink);
  body.insertAdjacentHTML('beforeend', '<hr>');
  body.appendChild(table);

  if (!data.exists) table.insertAdjacentHTML('beforeend', `<tr><td colspan='2'>${INFO_SYMBOL}<em><abbr title='Isotope is not known to exist.'>Theoretical Isotope</abbr></em>${INFO_SYMBOL}</td></tr>`);
  table.insertAdjacentHTML('beforeend', `<tr><th>Protons</th><td>${data.protons}</td></tr>`);
  table.insertAdjacentHTML('beforeend', `<tr><th>Neutrons</th><td>${data.neutrons}</td></tr>`);

  let tr = document.createElement('tr'), th = document.createElement('th');
  table.appendChild(tr);
  tr.appendChild(th);
  th.innerText = "Element";
  let td = document.createElement("td");
  tr.appendChild(td);
  let link = createLink(`${data.name || data.IUPACName} (${data.symbol || data.IUPACSymbol})`);
  td.appendChild(link);
  link.addEventListener('click', () => {
    const { title, body } = generateElementInfo(data.name || data.IUPACName);
    let popup = new Popup(title);
    popup.insertAdjacentElement("beforeend", body);
    popup.show();
  });


  if (data.isStable === true) {
    table.insertAdjacentHTML('beforeend', `<tr><th>Halflife</th><td><em>Stable</em></td></tr>`);
  } else if (data.isStable === false) {
    let idata = elementData[data.name].isotopes[data.isotopeSymbol];

    let { unit, time } = secondsToAppropriateTime(idata.halflife);
    let halflife = idata.halflife == undefined ? nicifyNull(null) : numberWithCommas(idata.halflife);
    table.insertAdjacentHTML('beforeend', `<tr><th>Halflife</th><td><abbr title='${halflife} s'>${numberWithCommas(time)} ${unit}</abbr></td></tr>`);

    let tr = document.createElement("tr"), th = document.createElement("th");
    table.appendChild(tr);
    tr.appendChild(th);
    th.innerText = "Decay";
    let td = document.createElement("td");
    tr.appendChild(td);
    let itable = document.createElement("table"), itbody = document.createElement("tbody");
    itable.insertAdjacentHTML('afterbegin', `<thead><tr><th>Daughter</th><th>Mode</th><th>Percent</th></tr></thead>`);
    itable.appendChild(itbody);
    td.appendChild(itable);

    for (let decayInfo of idata.decay) {
      let tr = document.createElement("tr");
      itbody.appendChild(tr);

      // Daughter Isotope
      let td = document.createElement("td");
      tr.appendChild(td);
      if (decayInfo.daughter) {
        let link = createLink(nicifyNull(decayInfo.daughter));
        td.appendChild(link);
        link.addEventListener('click', () => {
          const { title, body } = generateAtomInfo(decayInfo.daughter);
          let popup = new Popup(title);
          popup.insertAdjacentElement("beforeend", body);
          popup.show();
        });
      } else {
        td.innerHTML = nicifyNull(decayInfo.daughter);
      }

      // Decay Mode
      td = document.createElement("td");
      td.insertAdjacentHTML("beforeend", `<abbr title='${decayModeToString(decayInfo.mode)}'>${nicifyNull(decayInfo.mode)}</abbr>`);
      tr.appendChild(td);

      // Percentage
      td = document.createElement("td");
      td.innerHTML = nicifyNull(decayInfo.percentage) + ' %';
      tr.appendChild(td);
    }

    // Decay chain
    tr = document.createElement("tr");
    table.appendChild(tr);
    td = document.createElement("td");
    td.setAttribute("colspan", "2");
    tr.appendChild(td);
    let link = createLink(`View ${data.isotopeSymbol}'s decay chain`);
    link.addEventListener('click', () => {
      const { title, body } = generateDecayChain(data.isotopeSymbol);
      new Popup(title).insertAdjacentElement('beforeend', body).show();
    });
    td.appendChild(link);
  } else {
    table.insertAdjacentHTML('beforeend', `<tr><th>Halflife</th><td><em>Unknown</em></td></tr>`);

  }

  let title = data.isotopeSymbol;
  if (data.isStable === false) title += ' ' + RADIOACTIVE_SYMBOL; // Radioactivity sign
  return { title, body };
}

export function generateDecayChain(string: string): IGeneratedInfo {
  const body = document.createElement('div'), data = analyseString(string), decayList: IDecayInfo[] = elementData[data.name].isotopes[data.isotopeSymbol].decay;
  body.classList.add('decay-chain');
  body.classList.add('scroll-window');
  body.dataset.isotope = data.isotopeSymbol;

  body.appendChild(_generateDecayChain({ daughter: data.isotopeSymbol }));

  return { title: `${data.isotopeSymbol} Decay Chain`, body };
}

function _generateDecayChain(decayInfo: IDecayInfo): HTMLDivElement {
  const div = document.createElement("div"), data = analyseString(decayInfo.daughter);
  div.classList.add('decay-chain');
  div.classList.add('indented-container');
  div.dataset.daughter = decayInfo.daughter;

  let decayList: IDecayInfo[] = elementData[data.name].isotopes[decayInfo.daughter].decay;
  if (decayList.length === 0) {
    div.innerHTML += `<em>[[stable]]</em>`;
  } else {
    for (let decayItem of decayList) {
      if (decayItem.daughter != undefined) {
        div.insertAdjacentHTML('beforeend', '&rarr;&nbsp;&nbsp;');
        let name = createLink(`<b>${decayItem.daughter}</b>`);
        name.addEventListener('click', () => {
          const { title, body } = generateAtomInfo(decayItem.daughter);
          new Popup(title).insertAdjacentElement('beforeend', body).show();
        });
        div.appendChild(name);
        div.insertAdjacentText('beforeend', ` (${decayItem.mode}) `);
        let toggle = document.createElement('button'), toggleShowOnClick = true;
        toggle.innerText = '+';
        toggle.addEventListener('click', () => {
          if (toggleShowOnClick) {
            toggle.innerText = '-';
            toggleShowOnClick = false;
            chain.style.display = 'block';
          } else {
            toggle.innerText = '+';
            toggleShowOnClick = true;
            chain.style.display = 'none';
          }
        });
        div.appendChild(toggle);
        let chain = _generateDecayChain(decayItem);
        chain.style.display = "none";
        div.appendChild(chain);
        div.insertAdjacentHTML('beforeend', '<br />');
      }
    }
  }

  return div;
}

/** Generate decay line from array of historical isotopes */
export function generateDecayHistory(history: string[]): IGeneratedInfo {
  const body = document.createElement('div');
  body.classList.add('decay-history');

  for (let i = 0; i < history.length; i++) {
    let current = history[i];

    let link = createLink(current);
    link.addEventListener('click', () => {
      const { title, body } = generateAtomInfo(current);
      new Popup(title).insertAdjacentElement('beforeend', body).show();
    });
    body.insertAdjacentElement('beforeend', link);

    if (i < history.length - 1) {
      body.insertAdjacentHTML('beforeend', '&nbsp;&nbsp;&rarr;&nbsp;');
      const decayInfo = getIsotopeDecayInfo(current, history[i + 1]);
      body.insertAdjacentHTML('beforeend', `(${nicifyNull(decayInfo.mode)}) &rarr;&nbsp;&nbsp;`);
    }
  }

  return { title: `Decay of ${history[0]}`, body };
}

/** ELement Plaque */
export function generateElementPlaque(element: string) {
  const div = document.createElement("div"),
    data = analyseElementName(element),
    exists = data.name !== undefined,
    category = exists ? elementData[data.name.toLowerCase()].category : 'unknown';

  if (data) {
    div.classList.add('element-plaque');
    div.classList.add('display-children-block');
    div.dataset.element = data.name || data.IUPACName;
    div.dataset.symbol = data.symbol || data.IUPACSymbol;
    div.dataset.category = category;

    div.innerHTML += `<span class='element-plaque-atomic-number'>${data.protons}</span>`;
    div.innerHTML += `<span class='element-plaque-symbol'>${data.symbol || data.IUPACSymbol}</span>`;
    div.innerHTML += `<span class='element-plaque-name'>${data.name || data.IUPACName}</span>`;
    div.innerHTML += `<span class='element-plaque-category'>${category}</span>`;
  } else {
    div.innerHTML = '<em>Unable to retrieve information for ' + element + '</em>';
  }

  return div;
}

export function generateElementInfo(name: string): IGeneratedInfo {
  const body = document.createElement("div"), data = analyseElementName(name), exists = data.name !== undefined;
  let title: string;
  body.classList.add('scroll-window');

  if (data) {
    if (exists) {
      const elData = elementData[data.name.toLowerCase()];

      let plaque = generateElementPlaque(name);
      body.appendChild(plaque);

      const wikipediaLink = 'https://en.wikipedia.org/wiki/' + elData.name;
      body.insertAdjacentHTML('beforeend', `<a href='${wikipediaLink}' target='_blank'>Wikipedia Link</a><hr>`);

      let table = document.createElement("table");
      let tbody = document.createElement("tbody");
      table.appendChild(tbody);
      title = `${name} (${data.symbol})`;
      body.appendChild(table);

      tbody.insertAdjacentHTML('beforeend', `<tr><th>Atomic Number</th><td>${elData.number}</td></tr>`);
      tbody.insertAdjacentHTML('beforeend', `<tr><th>Atomic Mass</th><td>${elData.atomic_mass}</td></tr>`);
      tbody.insertAdjacentHTML('beforeend', `<tr><th>Category</th><td>${elData.category} <small>(${elData.ypos}, ${elData.xpos})</small></td></tr>`);
      tbody.insertAdjacentHTML('beforeend', `<tr><th>Melting Point</th><td>${nicifyNull(elData.melt)} K</td></tr>`);
      tbody.insertAdjacentHTML('beforeend', `<tr><th>Boiling Point</th><td>${nicifyNull(elData.boil)} K</td></tr>`);
      tbody.insertAdjacentHTML('beforeend', `<tr><th>State</th><td>${nicifyNull(elData.phase)}</td></tr>`);
      tbody.insertAdjacentHTML('beforeend', `<tr><th>Appearance</th><td>${nicifyNull(elData.appearance)}</td></tr>`);
      tbody.insertAdjacentHTML('beforeend', `<tr><th>Electron Config</th><td>${nicifyNull(elData.electron_configuration_semantic)}</td></tr>`);
      if (elData.density) {
        let units = elData.phase == 'Gase' ? 'g/l' : 'g/cm³';
        tbody.insertAdjacentHTML('beforeend', `<tr><th>Density</th><td>${elData.density} ${units}</td></tr>`);
      }
      tbody.insertAdjacentHTML('beforeend', `<tr><th>IUPAC Name</th><td>${data.IUPACName}</td></tr>`);
      tbody.insertAdjacentHTML('beforeend', `<tr><th>IUPAC Symbol</th><td>${data.IUPACSymbol}</td></tr>`);

      let tr = document.createElement("tr");
      tbody.appendChild(tr);
      tr.insertAdjacentHTML('beforeend', '<th>Isotopes</th>');
      let td = document.createElement("td");
      tr.appendChild(td);
      let isotopes = Object.keys(elData.isotopes);
      for (let i = 0; i < isotopes.length; i++) {
        let span = createLink(isotopes[i]);
        if (!elData.isotopes[isotopes[i]].is_stable) span.innerHTML += ' ' + RADIOACTIVE_SYMBOL;
        span.addEventListener('click', () => {
          const { title, body } = generateAtomInfo(isotopes[i]);
          let popup = new Popup(title);
          popup.insertAdjacentElement("beforeend", body);
          popup.show();
        });
        td.insertAdjacentElement("beforeend", span);
        if (i < isotopes.length - 1) td.insertAdjacentText('beforeend', ', ');
      }
    } else {
      let plaque = generateElementPlaque(name);
      body.appendChild(plaque);

      body.insertAdjacentHTML('beforeend', `${INFO_SYMBOL} Theoretical Element ${INFO_SYMBOL}<hr>`);

      let table = document.createElement("table");
      let tbody = document.createElement("tbody");
      table.appendChild(tbody);
      title = `${name} (${data.IUPACSymbol})`;
      body.appendChild(table);

      tbody.insertAdjacentHTML('beforeend', `<tr><th>Atomic Number</th><td>${data.protons}</td></tr>`);
      tbody.insertAdjacentHTML('beforeend', `<tr><th>IUPAC Name</th><td>${data.IUPACName}</td></tr>`);
      tbody.insertAdjacentHTML('beforeend', `<tr><th>IUPAC Symbol</th><td>${data.IUPACSymbol}</td></tr>`);
    }
  } else {
    body.innerHTML = `Cannot retrieve data`;
    title = name;
  }

  return { title, body };
}

export function generatePeriodicTable(clickElementCallback: (name: string) => void): IGeneratedInfo {
  const body = document.createElement("div");
  body.classList.add('periodic-table-wrapper');

  let table = document.createElement("table"), tbody = document.createElement("tbody");
  table.appendChild(tbody);
  body.appendChild(table);
  table.classList.add("periodic-table");

  for (const row of ptableData) {
    let tr = document.createElement("tr");
    tbody.appendChild(tr);

    for (const atomic_number of row) {
      if (atomic_number === 0) {
        tr.insertAdjacentHTML("beforeend", "<td class='ptable-cell ptable-empty'></td>");
      } else if (typeof atomic_number === 'number') {
        let td = document.createElement("td");
        td.classList.add('ptable-cell');
        td.classList.add('ptable-element');
        let plaque = generatePTablePlaque(atomic_number);
        plaque.addEventListener('click', () => clickElementCallback(elementData.order[atomic_number - 1]));
        td.insertAdjacentElement('beforeend', plaque);
        tr.appendChild(td);
      } else {
        tr.insertAdjacentHTML("beforeend", "<td class='ptable-cell ptable-fixed'>" + atomic_number + "</td>");
      }
    }
  }

  if (globals.manager.sampleConfig.manualOverride) {
    // Custom Isotope
    body.insertAdjacentHTML("beforeend", "<br>");
    let btn = document.createElement('button');
    btn.innerText = 'Custom Isotope';
    btn.addEventListener('click', () => {
      const { title, body } = generateCustomIsotopePopup(data => console.log(data));
      new Popup(title).insertAdjacentElement('beforeend', body).show();
    });
    body.insertAdjacentElement('beforeend', btn);
  }

  return { title: 'Periodic Table of the Elements', body, };
}

export function generatePTablePlaque(atomic_number: number): HTMLDivElement {
  let name = elementData.order[atomic_number - 1], data = elementData[name];
  const CLASS_NAME = 'ptable-element-plaque';
  let div = document.createElement("div");
  div.classList.add(CLASS_NAME);
  div.classList.add('display-children-block');
  div.dataset.category = data.category;
  div.innerHTML += `<span class='${CLASS_NAME}-number'>${data.number}</span>`;
  div.innerHTML += `<span class='${CLASS_NAME}-symbol'>${data.symbol}</span>`;
  // div.innerHTML += `<span class='${CLASS_NAME}-name'>${data.name}</span>`;
  return div;
}

export function generateCustomIsotopePopup(callback: (data: IAnalysisResult) => void): IGeneratedInfo {
  const body = document.createElement('div');
  body.classList.add('generate-isotope');

  // TODO: Implement this :)
  body.insertAdjacentHTML('beforeend', `<em>Not Implemented</em>`);

  return { title: "Custom Isotope", body };
}

/** Click on legend link; Return: was a popup opened? */
export function clickLegendLink(legend: LegendOptionValues, string: string) {
  let info: IGeneratedInfo;
  switch (legend) {
    case LegendOptionValues.Isotopes:
      info = generateAtomInfo(string)
      break;
    case LegendOptionValues.Elements:
      info = generateElementInfo(string);
      break;
    case LegendOptionValues.Radioactive:
    case LegendOptionValues.Decayed:
    case LegendOptionValues.DecayedTimes: {
      let atoms: string[] = [], title = string + ' Isotopes';
      if (legend === LegendOptionValues.DecayedTimes) title = `Decayed ${string} Times`;
      globals.sample.forEachAtom(atom => globals.manager.getLegendString(atom, legend) === string && atoms.push(atom.getIsotopeSymbol()));
      info = generateIsotopeInfoList(title, atoms);
      break;
    }
    default:
      console.log(`click legend link '${legend}' string '${string}' -- no action`);
  }

  if (info) {
    info.body.classList.add('from-legend-link');
    new Popup(info.title).insertAdjacentElement('beforeend', info.body).show();
    return true;
  } else {
    return false;
  }
}

/** Take array, and transform into HTML list */
export function generateIsotopeInfoList(title: string, isotopes: string[]): IGeneratedInfo {
  const body = document.createElement("div");
  body.classList.add('scroll-window');
  body.classList.add('generated-list');
  const listEl = document.createElement("ul");
  body.appendChild(listEl);

  for (const isotope of isotopes) {
    let itemEl = document.createElement("li");
    let link = createLink(isotope);
    link.addEventListener('click', () => {
      const { title, body } = generateAtomInfo(isotope);
      new Popup(title).insertAdjacentElement('beforeend', body).show();
    });
    itemEl.appendChild(link);
    listEl.appendChild(itemEl);
  }

  return { title, body };
}

/**
 * 
 * @param total Total number of things which { .count } properties should add to
 * @param legendData Data for legend
 * @param showLimit Number, how many entries to show
 */
export function generateFullLegend(total: number, legendData: { [item: string]: ILegendItem }, showLimit: number = Infinity): HTMLDivElement {
  const div = document.createElement("div");
  div.classList.add('full-legend');
  div.dataset.limit = showLimit.toString();
  if (isFinite(showLimit)) {
    let btnAll = document.createElement("button");
    btnAll.innerText = 'View All';
    btnAll.addEventListener('click', () => {
      const body = generateFullLegend(total, legendData, Infinity);
      body.classList.add('scroll-window');
      new Popup(`Full Legend`).insertAdjacentElement('beforeend', body).show();
    });
    div.appendChild(btnAll);
    div.insertAdjacentText('beforeend', ' | ');
  }
  div.insertAdjacentHTML('beforeend', ` <em>Total: ${total}</em> &nbsp;`);

  let n = 0, entries = Object.entries(legendData);
  for (let entry of entries) {
    if (n >= showLimit) break;
    const data = entry[1];
    let percent = round(data.percent, 2), percentString = percent === 0 ? 'trace' : percent.toString() + '%', span = document.createElement("span");
    div.appendChild(span);

    span.insertAdjacentHTML('beforeend', `<span class='legend-colour' style='background-color:${data.colour}'></span> `);

    let spanLabel = createLink(entry[0]);
    spanLabel.addEventListener('click', () => clickLegendLink(globals.manager.sampleConfig.legend, entry[0]));
    span.appendChild(spanLabel);
    span.insertAdjacentHTML('beforeend', ` <small title='${data.count} / ${total} atoms, ${percent}%'>(${percentString})</small>`);
    div.insertAdjacentText('beforeend', ' | ');

    n++;
  }

  if (n < entries.length) {
    let other: string[] = [], count = 0, thing = globals.manager.sampleConfig.legend === LegendOptionValues.Elements ? 'elements' : 'isotopes';
    for (let i = n; i < entries.length; i++) {
      other.push(entries[i][0]);
      count += entries[i][1].count;
    }

    let span = document.createElement("span");
    div.appendChild(span);
    let spanLabel = document.createElement('span');
    spanLabel.innerHTML = `Other (${other.length} ${thing}) -`;
    span.appendChild(spanLabel);
    let percent = (count / total) * 100, percentString = round(percent, 2).toString() + '%';
    span.insertAdjacentHTML('beforeend', ` <small title='${count} / ${total} atoms, ${percent}%'>${percentString}</small>`);
  }

  return div;
}

export function generateForceDecayInterface(callback: (mode: string) => void): IGeneratedInfo {
  const body = document.createElement('div');
  body.classList.add('force-decay-popup');

  // TODO: Implement this :)
  // https://en.wikipedia.org/wiki/Radioactive_decay
  body.insertAdjacentHTML('beforeend', `<em>Not Implemented</em>`);

  return { title: "Force Decay", body };
}