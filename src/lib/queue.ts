export class Queue<T> {
    _store: T[] = [];

    isEmpty(): boolean {
        return this._store.length == 0
    }

    push(val: T): void {
      this._store.push(val)
    }

    pop(): T | undefined {
      return this._store.shift()
    }

    pushAll(vals: T[]): void {
        vals.forEach((elem) => {
            this._store.push(elem)
        })
    }
  }