'use strict'

const {
  TYPE,
  FACTORY,
  INSTANCE,
  SINGLETON
} = require('opium-ioc')

/**
 * A resolver is an abstract helper class that allows specifying
 * your own wiring logic. For example, you might want to have a
 * JSON or an XML document describe how dependencies are wired,
 * and bypass the programmatic API altogether.
 *
 * There are two phases, register and resolve.
 *
 * By default, register maps a register* method to a type of
 * dependency.
 *
 * The dependency types are - TYPE, FACTORY, INSTANCE and are
 * looked up in the option's object type property that is passed
 * to register. Register will call resolve just before performing
 * registration of the dependency, and it expects an array of
 * dependency names to be returned by it.
 *
 * This model should be flexible enough to allow writing resolvers
 * for different needs ans scenarios. The api has been intentionally
 * left open to allow extensibility, and cater to as many different
 * needs as possible.
 */
class Resolver {
  /**
   * Construct a resolver
   *
   * @param {Injector} injector - an instance of opium-ioc compatible object
   */
  constructor (injector) {
    this._injector = injector
  }

  get injector () {
    return this._injector
  }

  /**
   * Register a dependency
   *
   * @param {string} name - dependency name
   * @param {Dependency} dep - the dependency to be registered
   * @param {object} options - options object, by default expects
   * type=[TYPE|FACTORY|INSTANCE] and lifeCycle=[SINGLETON|PROTOTYPE]
   * to be defined. Both are defaulted to INSTANCE and SINGLETON respectively.
   */
  register (name, dep, options = { type: INSTANCE, lifeCycle: SINGLETON }) {
    const deps = this.resolve(dep)
    const type = options.type
    const lifeCycle = options.lifeCycle
    switch (type) {
      case TYPE: {
        this._injector.registerType(name, dep, deps, lifeCycle)
        break
      }

      case FACTORY: {
        this._injector.registerFactory(name, dep, deps, lifeCycle)
        break
      }

      case INSTANCE: {
        this._injector.registerInstance(name, dep, deps, lifeCycle)
        break
      }

      default:
        throw new Error(`Unknown type ${type}`)
    }
  }

  /**
   * Resolve dependency names from the passed in dependency.
   * By default, its called right before registering a dependency
   * by the register method.
   *
   * @param {Dependency} dep
   */
  resolve (dep) {
    throw new Error('method unimplemented!')
  }
}

module.exports = Resolver