export default class Popup {
  private static _openPopups: Popup[] = [];

  public static popupsOpen() { return Popup._openPopups.length; }
  /** Get top-most popup */
  public static getTopmostPopup() { return Popup._openPopups.length == 0 ? undefined : Popup._openPopups[Popup._openPopups.length - 1]; }

  private _title: string;
  private _htmlContent: HTMLElement;
  private _onCloseCallback: (popup: Popup) => boolean;
  private _popupDiv: HTMLDivElement | null = null;
  private _popupBg: HTMLDivElement | null = null; // Background element which blocks interactions to page

  constructor(title) {
    this._title = title;
  }

  getTitle() { return this._title; }
  setTitle(title: string) {
    this._title = title.toString();
    return this;
  }

  getContent() { return this._htmlContent; }
  setContent(content: HTMLElement) {
    this._htmlContent = content
    return this;
  }

  insertAdjacentElement(position: InsertPosition, child: HTMLElement) {
    if (!this._htmlContent) this._htmlContent = document.createElement('div');
    this._htmlContent.insertAdjacentElement(position, child);
    return this;
  }

  insertAdjacentText(position: InsertPosition, text: string) {
    if (!this._htmlContent) this._htmlContent = document.createElement('div');
    this._htmlContent.insertAdjacentText(position, text);
    return this;
  }

  setCloseCallback(callback: (popup: Popup) => boolean) {
    this._onCloseCallback = callback;
    return this;
  }

  isOpen() {
    return this._popupDiv !== null
  }

  show() {
    if (!this.isOpen()) {
      // Create backdrop
      this._popupBg = document.createElement("div");
      this._popupBg.classList.add("popup-bg");
      this._popupBg.addEventListener('click', () => this.hide());
      document.body.insertAdjacentElement('beforeend', this._popupBg);

      // Create popups
      let container = document.createElement('div');
      container.classList.add("popup-container");
      this._popupDiv = container;
      let body = document.createElement("div");
      body.classList.add("popup-body");
      container.appendChild(body);
      body.insertAdjacentHTML('beforeend', `<h2>${this._title}</h2>`);
      if (this._htmlContent == undefined) this._htmlContent = document.createElement('div');
      this._htmlContent.classList.add('popup-dynamic-content');
      body.insertAdjacentElement('beforeend', this._htmlContent);

      let btn = document.createElement('button');
      btn.classList.add('popup-close');
      btn.innerText = 'Close';
      btn.addEventListener('click', () => {
        let close = typeof this._onCloseCallback == 'function' ? this._onCloseCallback(this) !== false : true;
        if (close) this.hide();
      });
      body.insertAdjacentHTML('beforeend', '<br>');
      body.insertAdjacentElement('beforeend', btn);

      document.body.insertAdjacentElement('beforeend', container);

      Popup._openPopups.push(this);
      return this;
    }
  }

  hide() {
    if (this.isOpen()) {
      this._popupDiv.remove();
      this._popupDiv = null;

      let i = Popup._openPopups.indexOf(this);
      Popup._openPopups.splice(i, 1);

      this._popupBg.remove();
      this._popupBg = null;
    }
    return this;
  }
}