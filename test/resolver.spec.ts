import 'reflect-metadata'

import * as chai from 'chai'
import dirtyChai = require('dirty-chai')
const expect: any = chai.expect
chai.use(dirtyChai)

import { register, inject, ResolverMeta, OPIUM_META, ResolverType } from '../src'
import { LifeCycle } from 'opium-ioc'

describe('metadata', () => {
  describe('constructor metadata', () => {
    it('should add default metadata to constructor', () => {
      @register()
      class MyClass {
      }

      const meta: ResolverMeta = Reflect.getMetadata(OPIUM_META, MyClass)
      expect(meta).to.exist()
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
      expect(meta).to.exist()
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
      expect(meta).to.exist()
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
      expect(meta).to.exist()
      expect(meta).to.be.instanceOf(ResolverMeta)

      expect(meta.id).to.deep.eq(id)
      expect(meta.target).to.instanceOf(MyClass.constructor)
      expect(meta.deps.length).to.eq(2)
      expect(meta.type).to.eq(ResolverType.TYPE)
      expect(meta.lifeCycle).to.eq(LifeCycle.SINGLETON)

      const [param1, param2] = meta.deps
      expect(param1).to.exist()
      expect(param1).to.be.instanceOf(ResolverMeta)

      expect(param1.id).to.deep.eq('name')

      expect(param2).to.exist()
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
      expect(meta).to.exist()
      expect(meta).to.be.instanceOf(ResolverMeta)

      expect(meta.id).to.deep.eq(MyReturnType)
      expect(meta.target).to.instanceOf(Function)
      expect(meta.deps.length).to.eq(0)
      expect(meta.type).to.eq(ResolverType.FACTORY)
      expect(meta.lifeCycle).to.eq(LifeCycle.SINGLETON)
    })

    it('should annotate method and register with alternate type', () => {
      class MyReturnType {}
      class MyOtherReturnType {}

      class MyClass {
        @register(MyOtherReturnType)
        method (): MyReturnType {
          return new MyReturnType()
        }
      }

      const meta: ResolverMeta = Reflect.getMetadata(OPIUM_META, MyClass.prototype, 'method')
      expect(meta).to.exist()
      expect(meta).to.be.instanceOf(ResolverMeta)

      expect(meta.id).to.deep.eq(MyOtherReturnType)
      expect(meta.target).to.instanceOf(Function)
      expect(meta.deps.length).to.eq(0)
      expect(meta.type).to.eq(ResolverType.FACTORY)
      expect(meta.lifeCycle).to.eq(LifeCycle.SINGLETON)
    })

    it('should annotate method and simple parameters', () => {
      class MyReturnType {}

      class MyClass {
        @register()
        method (@register('name') name: string): MyReturnType {
          return new MyReturnType()
        }
      }

      const meta: ResolverMeta = Reflect.getMetadata(OPIUM_META, MyClass.prototype, 'method')
      expect(meta).to.exist()
      expect(meta).to.be.instanceOf(ResolverMeta)

      expect(meta.id).to.deep.eq(MyReturnType)
      expect(meta.target).to.instanceOf(Function)
      expect(meta.deps.length).to.eq(1)
      expect(meta.type).to.eq(ResolverType.FACTORY)
      expect(meta.lifeCycle).to.eq(LifeCycle.SINGLETON)

      const [param1] = meta.deps

      expect(param1).to.exist()
      expect(param1).to.be.instanceOf(ResolverMeta)

      expect(param1.id).to.deep.eq('name')
    })

    it('should annotate method and register custom type param', () => {
      class MyReturnType {}
      class MyParam {}

      class MyClass {
        @register()
        method (param: MyParam): MyReturnType {
          return new MyReturnType()
        }
      }

      const meta: ResolverMeta = Reflect.getMetadata(OPIUM_META, MyClass.prototype, 'method')
      expect(meta).to.exist()
      expect(meta).to.be.instanceOf(ResolverMeta)

      expect(meta.id).to.deep.eq(MyReturnType)
      expect(meta.target).to.instanceOf(Function)
      expect(meta.deps.length).to.eq(1)
      expect(meta.type).to.eq(ResolverType.FACTORY)
      expect(meta.lifeCycle).to.eq(LifeCycle.SINGLETON)

      const [param1] = meta.deps

      expect(param1).to.exist()
      expect(param1).to.be.instanceOf(ResolverMeta)

      expect(param1.id).to.deep.eq(MyParam)
    })

    it('should annotate method and register custom and simple type param', () => {
      class MyReturnType {}
      class MyParam {}

      class MyClass {
        @register()
        method (param: MyParam, @register('name') name: string): MyReturnType {
          return new MyReturnType()
        }
      }

      const meta: ResolverMeta = Reflect.getMetadata(OPIUM_META, MyClass.prototype, 'method')
      expect(meta).to.exist()
      expect(meta).to.be.instanceOf(ResolverMeta)

      expect(meta.id).to.deep.eq(MyReturnType)
      expect(meta.target).to.instanceOf(Function)
      expect(meta.deps.length).to.eq(2)
      expect(meta.type).to.eq(ResolverType.FACTORY)
      expect(meta.lifeCycle).to.eq(LifeCycle.SINGLETON)

      const [param1, param2] = meta.deps

      expect(param1).to.exist()
      expect(param1).to.be.instanceOf(ResolverMeta)

      expect(param1.id).to.deep.eq(MyParam)

      expect(param2).to.exist()
      expect(param2).to.be.instanceOf(ResolverMeta)

      expect(param2.id).to.deep.eq('name')
    })
  })
})

describe('decorators', () => {
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

  it('should inject function', () => {
    class MyClass {
      @register()
      func (param1: string) {
        console.log(`this is my class`, param1)
      }
    }
  })
})
