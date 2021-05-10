import Atom from './Atom';
import Popup from './Popup';
import { numberWithCommas, secondsToAppropriateTime, createLink, capitaliseString, nicifyNull, RADIOACTIVE_SYMBOL, decaySymbolToEnumValue, getIsotopeDecayInfo, round, analyseString, INFO_SYMBOL, analyseElementName, getAtomInfo, spaceBetweenCaps, randomInt } from './utils';
import elementData from '../data/elements.json';
import ptableData from '../data/ptable.json';
import globals from './globals';
import { DecayMode, DecayModeDescription, EnumDecayMode, IAnalysisResult, IDecayInfo, IGeneratedInfo, ILegendItem, LegendOptionValues } from './InterfaceEnum';

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

  // What element are we?
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

  // Metastable?
  if (!isNaN(data.metastableIsotopeNumber)) {
    table.insertAdjacentHTML('beforeend', `<tr><th><a href='https://en.wikipedia.org/wiki/Nuclear_isomer' target='_blank'>Metastable Isomer</a> No.</th><td>${data.metastableIsotopeNumber}</td></tr>`);
    table.insertAdjacentHTML('beforeend', `<tr><th>Non-metastable State</th><td>${data.metastableIsotopeParent}</td></tr>`);
  }

  if (data.isStable === true) {
    table.insertAdjacentHTML('beforeend', `<tr><th>Halflife</th><td><em>Stable</em></td></tr>`);
  } else if (data.isStable === false) {
    let idata = elementData[data.name.toLowerCase()].isotopes[data.isotopeSymbol];

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
      let decayValue = decaySymbolToEnumValue(decayInfo.mode);
      td.insertAdjacentHTML("beforeend", `<abbr title='${decayValue == null ? '<unknown>' : EnumDecayMode[decayValue]}'>${nicifyNull(decayInfo.mode)}</abbr>`);
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
export function generateDecayHistory(atom: Atom): IGeneratedInfo {
  const body = document.createElement('div'), history = atom.getHistory();
  body.classList.add('decay-history');

  for (let i = 0; i < history.length; i++) {
    let current: IDecayInfo = history[i];

    if (typeof current.mode === 'number') {
      body.insertAdjacentHTML('beforeend', '&nbsp;&nbsp;&rarr;&nbsp;');
      let symbol = DecayMode[EnumDecayMode[current.mode]];
      body.insertAdjacentHTML('beforeend', `<abbr title='${spaceBetweenCaps(EnumDecayMode[current.mode])}'>(${nicifyNull(symbol)})</abbr> &rarr;&nbsp;&nbsp;`);
    }

    let link = createLink(current.daughter);
    link.addEventListener('click', () => {
      const { title, body } = generateAtomInfo(current.daughter);
      new Popup(title).insertAdjacentElement('beforeend', body).show();
    });
    body.insertAdjacentElement('beforeend', link);
  }

  return { title: `Decay of ${history[0].daughter}`, body };
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

export function generateEditProtonNeutronCount(protons: number, neutrons: number, callback: (protons: number, neutrons: number) => void): IGeneratedInfo {
  const body = document.createElement('div');
  body.classList.add('edit-pn-numbers');

  // Protons
  body.insertAdjacentHTML('beforeend', `<span class="heading">Protons</span>`);
  body.insertAdjacentHTML('beforeend', `<p>Started at ${protons} protons</p>`);
  let inputProtons = document.createElement("input");
  inputProtons.type = "number";
  inputProtons.min = "1";
  inputProtons.value = protons.toString();
  body.appendChild(inputProtons);

  // Neutrons
  body.insertAdjacentHTML('beforeend', `<br><br><span class="heading">Neutrons</span>`);
  body.insertAdjacentHTML('beforeend', `<p>Started at ${neutrons} neutrons</p>`);
  let inputNeutrons = document.createElement("input");
  inputNeutrons.type = "number";
  inputNeutrons.min = "0";
  inputNeutrons.value = neutrons.toString();
  body.appendChild(inputNeutrons);

  // Button
  body.insertAdjacentHTML('beforeend', '<hr>');
  let btn = document.createElement('button');
  btn.innerText = 'Make Changes';
  btn.addEventListener('click', () => callback(parseInt(inputProtons.value), parseInt(inputNeutrons.value)));
  body.appendChild(btn);

  return { title: "Edit Nucleons", body };
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
    case LegendOptionValues.Main: {
      let text = `Any atom which ` + (string == 'Main' ? `does` : `does not`) + ` identify as ${globals.manager.getMainAtom().value}`;
      new Popup(`Category: ${string}`)
        .insertAdjacentText('beforeend', text)
        .show();
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

type ForceDecayCallback = (mode: EnumDecayMode, neutrons?: number, protons?: number) => void;
export function generateForceDecayInterface(callback: ForceDecayCallback): IGeneratedInfo {
  const body = document.createElement('div');
  body.classList.add('force-decay-popup');
  body.classList.add('scroll-window');

  for (let mode in DecayMode) {
    if (DecayMode.hasOwnProperty(mode)) {
      const strMode = spaceBetweenCaps(mode), symbol = DecayMode[mode], desc = DecayModeDescription[mode];
      if (desc) {
        let inputNeutrons: HTMLInputElement, inputProtons: HTMLInputElement;

        if (EnumDecayMode[mode] === EnumDecayMode.NeutronEmission) {
          inputNeutrons = document.createElement('input');
          inputNeutrons.type = 'number';
          inputNeutrons.value = '1';
          inputNeutrons.min = '1';
          inputNeutrons.max = '999';
          body.insertAdjacentHTML('beforeend', `<abbr title='Number of neutrons to emit'>Neutron Count</abbr>: `);
          body.insertAdjacentElement('beforeend', inputNeutrons);
        } else if (EnumDecayMode[mode] === EnumDecayMode.ClusterDecay) {
          const spanCluster = document.createElement('span'), updateCluster = () => spanCluster.innerText = getAtomInfo(+inputProtons.value, +inputNeutrons.value).isotopeSymbol;

          inputProtons = document.createElement('input');
          inputProtons.type = 'number';
          inputProtons.value = '1';
          inputProtons.min = '1';
          inputProtons.max = '999';
          inputProtons.addEventListener('change', updateCluster);
          body.insertAdjacentHTML('beforeend', `<abbr title='Number of protons in emitted cluster'>Protons</abbr>: `);
          body.insertAdjacentElement('beforeend', inputProtons);

          inputNeutrons = document.createElement('input');
          inputNeutrons.type = 'number';
          inputNeutrons.value = '0';
          inputNeutrons.min = '0';
          inputNeutrons.max = '999';
          inputNeutrons.addEventListener('change', updateCluster);
          body.insertAdjacentHTML('beforeend', `&nbsp; &nbsp; <abbr title='Number of neutrons in emitted cluster'>Neutrons</abbr>: `);
          body.insertAdjacentElement('beforeend', inputNeutrons);

          updateCluster();
          body.insertAdjacentHTML('beforeend', `&nbsp; | <abbr title='Cluster we are ejecting'>Cluster</abbr>: `);
          body.insertAdjacentElement('beforeend', spanCluster);
        }
        if (inputNeutrons || inputProtons) body.insertAdjacentHTML('beforeend', '<br>')

        let btn = document.createElement('button');
        btn.innerText = `${strMode} (${symbol})`;
        btn.title = "Description: " + desc;
        body.appendChild(btn);

        btn.addEventListener('click', () => {
          callback(EnumDecayMode[mode], inputNeutrons ? +inputNeutrons.value : undefined, inputProtons ? +inputProtons.value : undefined);
        });

        body.insertAdjacentHTML('beforeend', '<hr>');
      }
    }
  }


  return { title: "Force Decay", body };
}

export function generateInsertPopup(custom: boolean, callback: (string: string, count: number) => void): IGeneratedInfo {
  const body = document.createElement("div");
  let p: HTMLParagraphElement;
  body.classList.add('insert-isotope');

  const populateSelectIsotope = () => {
    const element = selectElement.value, obj = elementData[element];
    while (selectIsotope.children.length !== 0) selectIsotope.removeChild(selectIsotope.children[0]);
    if (obj) {
      for (let isotope in obj.isotopes) {
        if (obj.isotopes.hasOwnProperty(isotope)) {
          let content = isotope;
          if (!obj.isotopes[isotope].is_stable) content += ' ' + RADIOACTIVE_SYMBOL;
          selectIsotope.insertAdjacentHTML('beforeend', `<option value='${isotope}'>${content}</option>`);
        }
      }
    }
  }

  /** Option to insert multiple isotopes */
  p = document.createElement('p');
  body.appendChild(p);
  p.insertAdjacentHTML('beforeend', `<abbr title='How many of the specified isotope to insert?'>Insert Count</abbr>: &nbsp;`);
  let inputInsertCount = document.createElement("input");
  inputInsertCount.type = "number";
  inputInsertCount.min = '1';
  inputInsertCount.value = '1';
  p.appendChild(inputInsertCount);

  /**
   * Default insert:
   * 1) Select element
   * 2) Select isotope
   */
  p = document.createElement("p");
  body.appendChild(p);
  p.insertAdjacentText('beforeend', 'Insert isotope ');
  let selectIsotope = document.createElement("select");
  p.insertAdjacentElement('beforeend', selectIsotope);

  p.insertAdjacentText('beforeend', ' of element ');
  let selectElement = document.createElement("select");
  for (let element of elementData.order) {
    selectElement.insertAdjacentHTML('beforeend', `<option value='${element}'>${elementData[element].name}</option>`);
  }
  selectElement.addEventListener('change', () => populateSelectIsotope());
  p.insertAdjacentElement('beforeend', selectElement);


  let btnDefaultInsert = document.createElement('button');
  btnDefaultInsert.innerText = 'Insert Isotope';
  btnDefaultInsert.addEventListener('click', () => {
    if (selectIsotope.value.length !== 0) {
      callback(selectIsotope.value, parseInt(inputInsertCount.value));
    }
  });
  body.appendChild(btnDefaultInsert);

  if (custom) {
    /**
     * Manual Override: custom isotopes
     * Option 1 - enter protons / neutrons in isotope
     * Option 2 - type in isotope
    */
    body.insertAdjacentHTML('beforeend', '<br><hr>');
    p = document.createElement('p');
    body.appendChild(p);

    p.insertAdjacentText('beforeend', 'Isotope with ')
    let inputProtons = document.createElement('input');
    inputProtons.type = 'number';
    inputProtons.min = '1';
    inputProtons.max = '999';
    p.appendChild(inputProtons);
    p.insertAdjacentText('beforeend', ' protons, ');
    let inputNeutrons = document.createElement("input");
    inputNeutrons.type = 'number';
    inputNeutrons.min = '0';
    inputNeutrons.max = '9999';
    p.appendChild(inputNeutrons);
    p.insertAdjacentText('beforeend', ' neutrons');

    let btnPNInsert = document.createElement('button');
    btnPNInsert.innerText = 'Insert Isotope';
    btnPNInsert.addEventListener('click', () => {
      const p = +inputProtons.value, n = +inputNeutrons.value;
      if (p < +inputProtons.min || n < +inputNeutrons.min) {
        new Popup("Invalid Isotope").insertAdjacentText('beforeend', `Protons must be >= ${inputProtons.min}. Neutrons must be >= ${inputNeutrons.min}`).show();
      } else {
        let info = getAtomInfo(+(inputProtons.value), +(inputNeutrons.value));
        callback(info.isotopeSymbol, parseInt(inputInsertCount.value));
      }
    });
    body.appendChild(btnPNInsert);
    body.insertAdjacentHTML('beforeend', '<br><hr>');

    p = document.createElement('p');
    body.appendChild(p);
    p.insertAdjacentText('beforeend', 'Insert isotope ');
    let inputIsotope = document.createElement('input');
    inputIsotope.type = "text";
    inputIsotope.placeholder = "U-238";
    p.appendChild(inputIsotope);
    let btnInsertIsotope = document.createElement('button');
    btnInsertIsotope.innerText = "Insert Isotope";
    btnInsertIsotope.addEventListener('click', () => {
      if (inputIsotope.value.length !== 0) {
        callback(inputIsotope.value, parseInt(inputInsertCount.value));
      }
    });
    body.appendChild(btnInsertIsotope);
  }

  populateSelectIsotope();
  return { title: 'Insert Isotope', body };
}