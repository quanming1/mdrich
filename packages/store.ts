type ListenerCallback<T> = (newValue: T, oldValue: T) => void;

export class Store<T extends object> {
  private data: T;
  private listeners: {
    [K in keyof T]?: Array<ListenerCallback<T[K]>>;
  } = {};

  constructor(initialData: T) {
    this.data = this.createReactiveData(initialData);
  }

  private createReactiveData(initialData: T): T {
    const self = this;
    return new Proxy(initialData, {
      set(target: T, property: string | symbol, value: any, receiver: any): boolean {
        const oldValue = (target as any)[property];
        const success = Reflect.set(target, property, value, receiver);
        if (success) {
          if (property in self.listeners) {
            const propListeners = self.listeners[property as keyof T];
            if (propListeners) {
              propListeners.forEach((callback) => callback(value, oldValue));
            }
          }
        }
        return success;
      },
    });
  }

  public get state(): T {
    return this.data;
  }

  public setState(newData: Partial<T>): void {
    for (const key in newData) {
      if (Object.prototype.hasOwnProperty.call(newData, key)) {
        (this.data as any)[key] = newData[key];
      }
    }
  }

  public onDataChange<K extends keyof T>(key: K, callback: ListenerCallback<T[K]>): () => void {
    if (!this.listeners[key]) {
      this.listeners[key] = [];
    }
    this.listeners[key]?.push(callback);

    return () => {
      if (this.listeners[key]) {
        this.listeners[key] = this.listeners[key]?.filter((cb) => cb !== callback) as Array<
          ListenerCallback<T[K]>
        >;
      }
    };
  }
}
