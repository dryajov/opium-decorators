/* eslint-env mocha */

'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)

const { Opium, PropResolver, TYPE } = require('../src')

describe('resolver', () => {
  let resolver

  class MyClass {
    constructor (param1, param2) {
      this.param1 = param1
      this.param2 = param2
    }

    static get $inject () {
      return ['param1', 'param2']
    }
  }

  beforeEach(() => {
    resolver = new PropResolver(new Opium())
    resolver.register('param1', 'param 1')
    resolver.register('param2', 'param 2')
    resolver.register('myclass', MyClass, { type: TYPE })
  })

  it('should register deps correctly', () => {
    const deps = resolver.resolve(MyClass)
    expect(deps).to.be.an('array')
    expect(deps).to.deep.eql(['param1', 'param2'])
  })

  it('should resolve deps correctly', async () => {
    const dep = resolver.injector.getDep('myclass')
    const myclass = await dep.inject()

    expect(myclass.param1).to.eql('param 1')
    expect(myclass.param2).to.eql('param 2')
  })
})
