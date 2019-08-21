//
// Copyright (C) 2019 Dmitry Kolesnikov
//
// This pure.ts file may be modified and distributed under the terms
// of the MIT license.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
//   
import { Construct, App, Stack } from '@aws-cdk/core'

//
//
export type IaaC<T> = (parent: Construct) => T

interface Node<Prop, Type> {
  new (scope: Construct, id: string, props: Prop): Type
}

interface Wrap<Prop, TypeA, TypeB> {
  new (node: TypeA, props?: Prop): TypeB;
}

//
//
export function iaac<Prop, Type>(f: Node<Prop, Type>): (iaac: IaaC<Prop>) => IaaC<Type> {
  return (iaac) => (scope) => new f(scope, iaac.name, iaac(scope))
}

export function wrap<Prop, TypeA, TypeB>(f: Wrap<Prop, TypeA, TypeB>): (iaac: IaaC<TypeA>) => IaaC<TypeB> {
  return (iaac) => (node) => new f(iaac(node))
}

export function map<O extends { [key: string]: any }>(fn: (x: O) => void, iaac: IaaC<O>): IaaC<O> {
  return (node) => {
    const x = iaac(node)
    fn(x)
    return x
  }
}

// export function for2<O extends Record<keyof T, any>>(c: { [K in keyof O]: IaaC<O[K]> }): IaaC<O> {
//   return (node) => {
//     return Object.keys(c).reduce(
//       (acc, k) => {
//         // console.log(c[k](node))
//         acc[k] = c[k](node)
//         return acc
//       },
//       {} as O
//     )
//   }
// }

export function for2<T extends Record<keyof T, IaaC<any>>>(obj: T): IaaC<Record<keyof T, any>> {
  return (node) => {
    const objectClone = {} as T;

    const ownKeys = Reflect.ownKeys(obj) as (keyof T)[];
    for (const prop of ownKeys) {
      objectClone[prop] = obj[prop](node);
    }

    return objectClone;
  }
}

export function yield1<T extends { [key: string]: any }, K extends keyof T>(k: K, c: IaaC<T>): IaaC<T[K]> {
  return (node) => c(node)[k]
}


export function flat<T>(fn: IaaC<IaaC<T>>): IaaC<T> {
  return (node) => fn(node)(node)
}

export function join<T>(scope: Construct, fn: IaaC<T>): T {
  return fn(scope)
}

//
//
export function _<T>(parent: Construct, ...fns: Array<IaaC<T>>): Construct {
  fns.forEach(
    fn => {
      parent instanceof App 
        ? fn(new Stack(parent, fn.name))
        : fn(new Construct(parent, fn.name))
    }
  )
  return parent
}

export function add<T>(node: App, fn: IaaC<T>, name?: string): Construct {
  fn(new Stack(node, name || fn.name));
  return node;
}
