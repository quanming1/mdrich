type ComposeCallback = (isComposing: boolean, data?: string) => void;

export class IMEManager {
  private _isComposing = false;
  private _lastResult: string | null = null;
  private callbacks: ComposeCallback[] = [];
  private element: HTMLElement;

  constructor(element: HTMLElement) {
    this.element = element;
    this.setupListeners();
  }

  get isComposing() {
    return this._isComposing;
  }

  get lastResult() {
    return this._lastResult;
  }

  getAndClearResult() {
    const result = this._lastResult;
    this._lastResult = null;
    return result;
  }

  onComposeChange(callback: ComposeCallback) {
    this.callbacks.push(callback);
    return () => {
      const index = this.callbacks.indexOf(callback);
      if (index > -1) this.callbacks.splice(index, 1);
    };
  }

  private setupListeners() {
    this.element.addEventListener("compositionstart", this.handleCompositionStart);
    this.element.addEventListener("compositionend", this.handleCompositionEnd, {
      capture: true,
    });
  }

  private handleCompositionStart = (event: CompositionEvent) => {
    this._isComposing = true;
    this._lastResult = null; // 清除上次的结果
    this.callbacks.forEach((cb) => cb(true));
  };

  private handleCompositionEnd = (event: CompositionEvent) => {
    console.log("组词结束");

    this._isComposing = false;
    this._lastResult = event.data || null;
    this.callbacks.forEach((cb) => cb(false, event.data));
  };

  destroy() {
    this.element.removeEventListener("compositionstart", this.handleCompositionStart);
    this.element.removeEventListener("compositionend", this.handleCompositionEnd);
    this.callbacks = [];
  }
}
