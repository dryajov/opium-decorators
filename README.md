# Opium Decorators

> Typescript based decorators for opium. Please refer to [Opium](https://github.com/dryajov/opium) documentation before continuing.

## What is this?

> A simple yet powerful set of decorators to enable using Opium in a more convenient and cleaner way.

[Opium](https://github.com/dryajov/opium) is an IoC container that allows asynchronous dependency injection. It exposes a programmatic API that can be utilized to build applications using IoC and dependency injection (DI) patterns. However, the programmatic api is tedious and introduces unnecessary cognitive overload.

Typescript (and possibly ES7/ES8), have varying support for [decorators](https://www.typescriptlang.org/docs/handbook/decorators.html), which allow annotating code to augment objects with metainformation that can be inspected at runtime. This framework uses this metainformation to register dependencies in place, which hopefully leads to cleaner and more ergonomic code and a better overall programming experience.

## Why I made this?

DI is a powerful technique that allows decoupling an object's dependencies and their lifecycle from the consuming object, this has clear benefits when it comes to testability and leads to overall cleaner and more maintainable code. 

One of the most tedious and error prone parts of building complex applications is _what/where_ is an object created? DI removes this dilemma altogether and simply says "all dependencies are external to the consuming object". This is nice, but _what_ really creates and manages this dependencies? This is where IoC comes in handy - it enables DI in a more straightforward and cleaner way. Without it, doing DI becomes and exercise in building complex initialization sequences - IoC is te bit of magic that makes DI "just work".

I wanted a flexible and powerful IoC container, that allowed complex injection cycles and supported asynchronous dependency resolution. At the time, there was nothing like it so I built [Opium](https://github.com/dryajov/opium). Over time it has prooven useful to me, however, it's programattic nature made it a bit of a kludge to use. Dependencies still have to be registered and assembled in a "central place", or worse the container has to be carried around everywhere. With Typescript and its decorator support, it is now possible to masquerade the programattic nature of Opium and instead expose a consisten and simple set of decorators that allow registering a dependency right where it's being declared.

### But isn't magic wrong? I WANT NO MAGIC IN MY CODE!!!!

IoC is an established technique. Countles projects - including high profile ones in the Javascript/Typescript echosystem, rely on it. Its usefulness and convenience has a prooven track record. At this point it becomes a matter of preference, either you embrace it or you don't.

## Supported dependency types

[Opium](https://github.com/dryajov/opium) supports three dependency types - `Factory`, `Type` and `Instance`. In Javascript/Typescript this maps to `Factory` - static and instance methods; `Type` - classes and otherwise "newable" objects; `Instance` - instance or simple types such as strings, numbers, etc. Refer to the Opium documentation for a broader explanation.

Since Opium supports a broad set of dependency types, it allows this set of decorators to inject _anything_ that can be decorated. This means that it supports constructor injection, argument injection and property injection. In other words, dependencies can be injected to constructors, static and instance methods, static properties and instance properties and accessors (getters/setters).

In addition, since Opium supports asynchronous DI it is possible to inject `Promises` and other `async` methods, in which case the result of the asynchronous operation is going to be injected.

### Usage

> implicit injection

```ts
import { register, inject } from './src'

(async () => {
  @register()
  class MyName {
    get lastFirst (): string {
      return `${this.name} ${this.last}`
    }

    constructor (@register('first') public name: string,
                 @register('last') public last: string) {
    }
  }

  class Dependencies {
    @register('first')
    static nameFactory (): string {
      return 'Bob'
    }

    @register('last')
    static lastFactory (): string {
      return 'Smith'
    }
  }

  @inject()
  class App {
    myName: MyName
    constructor (@register() myName: MyName) {
      this.myName = myName
      console.log(this.myName.lastFirst)
    }
  }
})()
```

> explicit injection

```ts
import { register, injectableFactory } from './src'

(async () => {
  @register()
  class MyName {
    get lastFirst (): string {
      return `${this.name} ${this.last}`
    }

    constructor (@register('first') public name: string,
                 @register('last') public last: string) {
    }
  }

  class Dependencies {
    @register('first')
    static nameFactory (): string {
      return 'Bob'
    }

    @register('last')
    static lastFactory (): string {
      return 'Smith'
    }
  }

  @register()
  class App {
    myName: MyName
    constructor (@register() myName: MyName) {
      this.myName = myName
    }
  }

  const dep: any = injectableFactory('MyContainerName')(App)
  try {
    // inject() will throw/reject on error
    const myApp: App = await dep.inject()
    console.log(myApp.myName.lastFirst)
  } catch(e) {
    console.error(e)
    return
  }
})()
```

### `explicit` vs `implicit` injection

There are two ways to initiate the injection flow - explicit and implicit. The former allows using a programmatic entry point to initiate the injection flow

```ts
const dep: any = injectableFactory()(App)
const myApp: App = await dep.inject()
```

The later allows using a decorator (`@inject()`), to initiate the injection flow.

> implicit

```ts
  @inject()
  class App {
    myName: MyName
    constructor (@register() myName: MyName) {
      this.myName = myName
      console.log(this.myName.lastFirst)
    }
  }
```

#### Why have two different way of initiating the injection flow? 

In most cases, using the `implicit` flow is preferred. With an IoC container all injection and dependencies should be managed by the container itself, that includes determining when the injection cycle begins. This is convenient and reduces complex entry points setup and maintenance.

The `explicit` mode, on the other hand, is there to allow precicely controlling when the cycle begins. This is useful in situations where there is already a clear entry point, for example a server application that only injects newly incoming connections but leaves the rest out of the domain of the IoC container. In other words, this is here merely to cover for those edge cases where using the `implicit` flow is not possible.

## WARNING: Unhandled Promise rejections

There is no agreed way to handle unhandled Promise rejections across different runtimes. Node will print a warning, but otherwise continue execution (although future versions of Node will terminate the process on unhandled rejections). Browsers will log the error to console but most will continue execution as well. 

Given the async nature of Opium, it is easy to run into situations where an error in the injection cycle will throw/reject, Opium itself catches the error and properly logs it with the `debug` module under the `*opium*` namespace, as well as propagates it further down so that the application can continue handling it appropriately.

However, as it stands today (May 2019), without a proper global rejection handler in your respective runtime, your application might simply appear to hang! The consensus across runtimes seems to move thowards the "immediately terminate execution" direction, which I fully support, but right now this is not yet the case. 

To prevent wasted time and a possible loss of bodily hair, please register a **global rejection handler** as well as enable Opium logging with `DEBUG='*opium*'`.

Please refer to your runtime documentation on how to handle unhandled rejections, but for your convenience here are some links to popular runtimes that illustrate how to do just that:

- Browsers 
  - https://developer.mozilla.org/en-US/docs/Web/API/Window/unhandledrejection_event
- Node 
  - https://nodejs.org/api/process.html#process_event_unhandledrejection

But YMMW...

## Api

- *`@register(id?: string | Symbol, lifeCycle?: LifeCycle)`* - The register method is a decorator (factory) that either registers any dependency with the container or tells it to lookup it up in the container. Weather the dependency is being registered or looked up is *context based*, for example annotating a class with a `@register()` decorator, would register it with the container, however annotating it with `@register()` in a parameter list, would signal the container that the dependency is being injected into the method.
  - `id: string | symbol` - an optional id to give to the dependency. 
    - *NOTE: all primitive types should have an id, there is no way of telling them apart otherwise and the container will throw if no id is provided* 
  - `lifeCycle: LifeCycle` - the lifecycle of the dependency (only applies when registering the dependency). Refer to [Opium](https://github.com/dryajov/opium) for an explanation of dependency lifecycle.

- *`@inject(id: any, name: string, lifeCycle: LifeCycle)`* - Decorate a class or a static method to be the initiator of the dependency cycle, in many cases this would be the entry point of the application.
  - `id: any` - the id of the injected dependency (passed to `@register()`)
  - `name: string` - the name of the container  
  - `lifeCycle: LifeCycle` - the default lifecycle of the container 
    - all dependencies will be created with this default lifecycle unless explicitly told otherwise by `@register()`. The default container lifecycle is `SINGLETON`. Refer to [Opium](https://github.com/dryajov/opium) for an explanation of dependency lifecycles.

> *NOTE: Use this style only in cases where `explicit` injection is preferred, use `inject()` in all other cases.*

- *`injectableFactory(name: string, lifeCycle: LifeCycle) => (target: any, key?: any) => Dependency`* - Create a factory that allows retrieving an Opium `Dependency`. This dependency can then be injected by calling its `.inject()` method. Usually this will be the top level dependency, or entry point of the application.
  - `name: string` - the name of the container (same functionality as in the case of `@inject()`)
  - `lifeCycle: LifeCycle` - the default lifecycle of the container (same functionality as in the case of `@inject()`)
  - `(target: any, key?: any) => Dependency` - the factory to retrieve an Opium injectable `Dependency` object.
    - `target: any` - the target object to inject, can be either a class or static/instance method.
    - `key?: string` - an optional `key` used to lookup the dependency, only needed in the case of methods - this should be the method name itself.

## Examples

> Registration

```ts
class BaseClass {
}

// register a type
@register()
class MyClass {
}

// register with a different id
@register('my-class')
class MyClass {
}

// register under a different type 
// NOTE: The id type should at least have a similar shape to the registered type!
@register(BaseClass)
class MyClass extends BaseClass {
}

// register MyOtherClass constructor with a dependency on MyClass
@register()
class MyOtherClass {
  constructor(myClass: MyClass) {
  }
}

// use factory methods to register dependencies
class Dependencies {
  // register static properties
  @register('first')
  static first: string = 'Bob'
  @register('last')
  static last: string = 'Smith'

  // register static method that registers a type MyClass
  @register()
  static myClassFactory(): MyClass {
    return new MyClass()
  }

  // register static method that registers a type MyClass under a different id
  @register('my-class')
  static myClassFactory(): MyClass {
    return new MyClass()
  }
}
```

> resolutions/injections

```ts
@inject()
class App {
  myBaseClass: BaseClass

  // instance property - would be injected with 'Bob'
  @register('first')
  first: string

  // instance property - would be injected with 'Smith'
  @register('last')
  last: string

  // constructor get invoked with the MyClass dependency registered as 'my-class'
  // which gets assigned to the baseClass parameter during object construction
  constructor(@register('my-class') baseClass: BaseClass) {
    this.myBaseClass = baseClass
  }
}
```

# Licence 
## **MIT**
