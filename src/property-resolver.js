'use strict'

const Resolver = require('./resolver')

class PropResolver extends Resolver {
  /**
   * Construct property resolver
   *
   * @param {Injector} injector - Injector instance to be used
   * @param {string} propName - Property name
   */
  constructor (injector, propName = '$inject') {
    super(injector)

    this.propName = propName
  }

  /**
   * Resolve dependency names
   *
   * @param {object} obj - Object to resolve property for
   * @returns {*}
   */
  resolve (obj) {
    if (obj[this.propName]) {
      return obj[this.propName]
    }
  }
}

module.exports = PropResolver
