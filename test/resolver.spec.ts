import 'reflect-metadata'

import 'mocha'
import { expect } from 'chai'

import {
  register,
  inject,
  ResolverMeta,
  OPIUM_META,
  ResolverType,
  LifeCycle,
  injectableFactory
} from '../src'
import { Dependency } from 'opium-ioc'

describe('metadata', () => {
  describe('constructor metadata', () => {
    it('should add default metadata to constructor', () => {
      @register()
      class MyClass {
      }

      const meta: ResolverMeta = Reflect.getMetadata(OPIUM_META, MyClass)
      expect(meta).to.be.instanceOf(ResolverMeta)

      expect(meta.id).to.eq(MyClass)
      expect(meta.target).to.instanceOf(MyClass.constructor)
      expect(meta.deps.length).to.eq(0)
      expect(meta.type).to.eq(ResolverType.TYPE)
      expect(meta.lifeCycle).to.eq(LifeCycle.SINGLETON)
    })

    it('should allow changing dependency id in constructor injection', () => {
      const id: Symbol = Symbol.for('my-class')
      @register(id)
      class MyClass {
      }

      const meta: ResolverMeta = Reflect.getMetadata(OPIUM_META, MyClass)
      expect(meta).to.be.instanceOf(ResolverMeta)

      expect(meta.id).to.deep.eq(id)
      expect(meta.target).to.instanceOf(MyClass.constructor)
      expect(meta.deps.length).to.eq(0)
      expect(meta.type).to.eq(ResolverType.TYPE)
      expect(meta.lifeCycle).to.eq(LifeCycle.SINGLETON)
    })

    it('should allow changing dependency life cycle in constructor injection', () => {
      const id: Symbol = Symbol.for('my-class')
      @register(id, LifeCycle.PROTOTYPE)
      class MyClass {
      }

      const meta: ResolverMeta = Reflect.getMetadata(OPIUM_META, MyClass)
      expect(meta).to.be.instanceOf(ResolverMeta)

      expect(meta.id).to.deep.eq(id)
      expect(meta.target).to.instanceOf(MyClass.constructor)
      expect(meta.deps.length).to.eq(0)
      expect(meta.type).to.eq(ResolverType.TYPE)
      expect(meta.lifeCycle).to.eq(LifeCycle.PROTOTYPE)
    })

    it('should register constructor dependencies', () => {
      const id: Symbol = Symbol.for('my-class')
      @register(id)
      class MyClass {
        public name: string
        public id: number
        constructor (
          @register('name') name: string,
          @register('id') id: number) {
          this.name = name
          this.id = id
        }
      }

      const meta: ResolverMeta = Reflect.getMetadata(OPIUM_META, MyClass)
      expect(meta).to.be.instanceOf(ResolverMeta)

      expect(meta.id).to.deep.eq(id)
      expect(meta.target).to.instanceOf(MyClass.constructor)
      expect(meta.deps.length).to.eq(2)
      expect(meta.type).to.eq(ResolverType.TYPE)
      expect(meta.lifeCycle).to.eq(LifeCycle.SINGLETON)

      const [param1, param2] = meta.deps
      expect(param1).to.be.instanceOf(ResolverMeta)
      expect(param1.id).to.deep.eq('name')

      expect(param2).to.be.instanceOf(ResolverMeta)
      expect(param2.id).to.deep.eq('id')
    })
  })

  describe('method metadata', () => {
    it('should annotate method', () => {
      class MyReturnType { }

      class MyClass {
        @register()
        method (): MyReturnType {
          return new MyReturnType()
        }
      }

      const meta: ResolverMeta = Reflect.getMetadata(OPIUM_META, MyClass.prototype, 'method')
      expect(meta).to.be.instanceOf(ResolverMeta)

      expect(meta.id).to.deep.eq(MyReturnType)
      expect(meta.target).to.instanceOf(Function)
      expect(meta.deps.length).to.eq(0)
      expect(meta.type).to.eq(ResolverType.FACTORY)
      expect(meta.lifeCycle).to.eq(LifeCycle.SINGLETON)
    })

    it('should annotate method and register with alternate type', () => {
      class MyReturnType { }
      class MyOtherReturnType { }

      class MyClass {
        @register(MyOtherReturnType)
        method (): MyReturnType {
          return new MyReturnType()
        }
      }

      const meta: ResolverMeta = Reflect.getMetadata(OPIUM_META, MyClass.prototype, 'method')
      expect(meta).to.be.instanceOf(ResolverMeta)

      expect(meta.id).to.deep.eq(MyOtherReturnType)
      expect(meta.target).to.instanceOf(Function)
      expect(meta.deps.length).to.eq(0)
      expect(meta.type).to.eq(ResolverType.FACTORY)
      expect(meta.lifeCycle).to.eq(LifeCycle.SINGLETON)
    })

    it('should annotate method and simple parameters', () => {
      class MyReturnType { }

      class MyClass {
        @register()
        method (@register('name') name: string): MyReturnType {
          return new MyReturnType()
        }
      }

      const meta: ResolverMeta = Reflect.getMetadata(OPIUM_META, MyClass.prototype, 'method')
      expect(meta).to.be.instanceOf(ResolverMeta)

      expect(meta.id).to.deep.eq(MyReturnType)
      expect(meta.target).to.instanceOf(Function)
      expect(meta.deps.length).to.eq(1)
      expect(meta.type).to.eq(ResolverType.FACTORY)
      expect(meta.lifeCycle).to.eq(LifeCycle.SINGLETON)

      const [param1] = meta.deps

      expect(param1).to.be.instanceOf(ResolverMeta)
      expect(param1.id).to.deep.eq('name')
    })

    it('should annotate method and register custom type param', () => {
      class MyReturnType { }
      class MyParam { }

      class MyClass {
        @register()
        method (param: MyParam): MyReturnType {
          return new MyReturnType()
        }
      }

      const meta: ResolverMeta = Reflect.getMetadata(OPIUM_META, MyClass.prototype, 'method')
      expect(meta).to.be.instanceOf(ResolverMeta)

      expect(meta.id).to.deep.eq(MyReturnType)
      expect(meta.target).to.instanceOf(Function)
      expect(meta.deps.length).to.eq(1)
      expect(meta.type).to.eq(ResolverType.FACTORY)
      expect(meta.lifeCycle).to.eq(LifeCycle.SINGLETON)

      const [param1] = meta.deps

      expect(param1).to.be.instanceOf(ResolverMeta)
      expect(param1.id).to.deep.eq(MyParam)
    })

    it('should annotate method and register custom and simple type param', () => {
      class MyReturnType { }
      class MyParam { }

      class MyClass {
        @register()
        method (param: MyParam, @register('name') name: string): MyReturnType {
          return new MyReturnType()
        }
      }

      const meta: ResolverMeta = Reflect.getMetadata(OPIUM_META, MyClass.prototype, 'method')
      expect(meta).to.be.instanceOf(ResolverMeta)

      expect(meta.id).to.deep.eq(MyReturnType)
      expect(meta.target).to.instanceOf(Function)
      expect(meta.deps.length).to.eq(2)
      expect(meta.type).to.eq(ResolverType.FACTORY)
      expect(meta.lifeCycle).to.eq(LifeCycle.SINGLETON)

      const [param1, param2] = meta.deps

      expect(param1).to.be.instanceOf(ResolverMeta)
      expect(param1.id).to.deep.eq(MyParam)

      expect(param2).to.be.instanceOf(ResolverMeta)
      expect(param2.id).to.deep.eq('name')
    })
  })
})

describe('decorators', () => {
  it('should fail injecting', (done) => {
    process.once('unhandledRejection', (event: any) => {
      expect(event).to.be.instanceOf(Error)
      expect(event.message).to.match(/no dependency with name "name" found!/)
      done()
    })

    @register()
    class MyClass {
      public greet: string
      constructor () {
        this.greet = 'hello world!'
      }
    }

    class MyApp {
      @inject('factory')
      // tslint:disable-next-line: no-empty
      static factory (param1: MyClass, @register('name') name: string) {
      }
    }
  })

  it('should inject constructor', (done) => {
    @register()
    class MyClass {
      public greet: string
      constructor () {
        this.greet = 'hello world!'
      }
    }

    @inject()
    class MyApp {
      constructor (param1: MyClass) {
        expect(param1.greet).to.be.eq('hello world!')
        done()
      }
    }
  })

  it('should inject constructor with mixed params', (done) => {
    @register()
    class MyClass {
      public greet: string
      constructor () {
        this.greet = 'hello world!'
      }
    }

    class Name {
      @register('name')
      name (): string {
        return 'bob'
      }
    }

    @inject()
    class MyApp {
      constructor (param1: MyClass, @register('name') name: string) {
        expect(param1.greet).to.be.eq('hello world!')
        expect(name).to.be.eq('bob')
        done()
      }
    }
  })

  it('should inject method', (done) => {
    @register()
    class MyClass {
      public greet: string
      constructor () {
        this.greet = 'hello world!'
      }
    }

    class Name {
      @register('name')
      name (): string {
        return 'bob'
      }
    }

    class MyApp {
      @inject('factory')
      factory (param1: MyClass, @register('name') name: string) {
        expect(param1.greet).to.be.eq('hello world!')
        expect(name).to.be.eq('bob')
        done()
      }
    }
  })

  it('should inject property', (done) => {
    @register()
    class MyClass {
      @register('first')
      first!: string

      @register('last')
      last!: string

      nameC: string
      constructor () {
        this.nameC = 'ohMy!!'
      }
    }

    class Name {
      @register('first')
      name (): string {
        return 'bob'
      }

      @register('last')
      last (): string {
        return 'smith'
      }
    }

    class MyApp {
      @inject('factory')
      factory (param1: MyClass) {
        expect(param1.first).to.be.eq('bob')
        expect(param1.last).to.be.eq('smith')
        done()
      }
    }
  })

  it('should inject static property', (done) => {
    @register()
    class MyClass {
      @register('first')
      first!: string

      @register('last')
      last!: string

      nameC: string
      constructor () {
        this.nameC = 'js instance prop'
      }
    }

    class Name {
      @register('first')
      static first: string = 'bob'

      @register('last')
      static last: string = 'smith'
    }

    class MyApp {
      @inject('factory')
      factory (param1: MyClass) {
        expect(param1.first).to.be.eq('bob')
        expect(param1.last).to.be.eq('smith')
        done()
      }
    }
  })

  it('should inject accesors', (done) => {
    @register()
    class MyClass {
      _first!: string
      _last!: string

      @register('first')
      set first (s) {
        this._first = s
      }

      get first (): string {
        return this._first
      }

      @register('last')
      set last (s) {
        this._last = s
      }

      get last (): string {
        return this._last
      }

      nameC: string
      constructor () {
        this.nameC = 'js instance prop'
      }
    }

    class Name {
      @register('first')
      get first (): string {
        return 'bob'
      }

      @register('last')
      get last (): string {
        return 'smith'
      }
    }

    class MyApp {
      @inject('factory')
      factory (param1: MyClass) {
        expect(param1.first).to.be.eq('bob')
        expect(param1.last).to.be.eq('smith')
        done()
      }
    }
  })

  it('should inject static method', (done) => {
    @register()
    class MyClass {
      public greet: string
      constructor () {
        this.greet = 'hello world!'
      }
    }

    class Name {
      @register('name')
      name (): string {
        return 'bob'
      }
    }

    class MyApp {
      @inject('factory')
      static factory (param1: MyClass, @register('name') name: string) {
        expect(param1.greet).to.be.eq('hello world!')
        expect(name).to.be.eq('bob')
        done()
      }
    }
  })

  it('shoudl allow explicit injects on constructors', async () => {
    @register()
    class MyClass {
      public greet: string
      constructor () {
        this.greet = 'hello world!'
      }
    }

    @register()
    class MyApp {
      greet!: string
      constructor (myClass: MyClass) {
        expect(myClass.greet).to.be.eq('hello world!')
        this.greet = myClass.greet
      }
    }

    const injectable = injectableFactory()(MyApp)
    expect(injectable).to.be.instanceOf(Dependency)
    const myApp: MyApp = await injectable.inject()
    expect(myApp).to.be.instanceOf(MyApp)
    expect(myApp.greet).to.be.eq('hello world!')
  })

  it('shoudl allow explicit injects on static methods', async () => {
    @register()
    class MyClass {
      public greet: string
      constructor () {
        this.greet = 'hello world!'
      }
    }

    class MyApp {
      greet!: string

      constructor (myClass: MyClass) {
        expect(myClass.greet).to.be.eq('hello world!')
        this.greet = myClass.greet
      }

      @register()
      static factory (myClass: MyClass): MyApp {
        return new MyApp(myClass)
      }
    }

    const injectable = injectableFactory()(MyApp, 'factory')
    expect(injectable).to.be.instanceOf(Dependency)
    const myApp: MyApp = await injectable.inject()
    expect(myApp).to.be.instanceOf(MyApp)
    expect(myApp.greet).to.be.eq('hello world!')
  })

  it('shoudl allow explicit injects on methods', async () => {
    @register()
    class MyClass {
      public greet: string
      constructor () {
        this.greet = 'hello world!'
      }
    }

    class MyApp {
      greet!: string

      constructor () {
        this.greet = 'ahoy!!'
      }

      @register('factory')
      factory (myClass: MyClass): void {
        expect(myClass.greet).to.be.eq('hello world!')
        this.greet = myClass.greet
      }
    }

    const myApp: MyApp = new MyApp()
    const injectable = injectableFactory()(myApp, 'factory')
    expect(injectable).to.be.instanceOf(Dependency)
    // no way of telling what instance this method need to be injected to
    injectable.dep = injectable.dep.bind(myApp)
    await injectable.inject()
    expect(myApp.greet).to.be.eq('hello world!')
  })
})
